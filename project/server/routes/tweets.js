// server/routes/tweets.js
import express from 'express';
import { body, validationResult, query } from 'express-validator';
import Tweet from '../models/Tweet.js';
import Like from '../models/Like.js';
import Follow from '../models/Follow.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Create tweet
router.post('/', authenticateToken, [
  body('text')
    .isLength({ min: 1, max: 280 })
    .withMessage('Tweet must be 1-280 characters'),
  body('replyTo').optional().isMongoId(),
  body('quoteTweetOf').optional().isMongoId(),
  body('location').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { text, replyTo, quoteTweetOf, mediaUrls, location } = req.body;

    const tweet = new Tweet({
      author: req.userId,
      content: {
        text,
        mediaUrls: mediaUrls || [],
        location: location || null
      },
      replyTo: replyTo || null,
      quoteTweetOf: quoteTweetOf || null
    });

    await tweet.save();
    await tweet.populate('author', 'username profile');

    // Update user's tweet count
    await User.findByIdAndUpdate(req.userId, {
      $inc: { 'stats.tweetsCount': 1 }
    });

    // Update reply count if this is a reply
    if (replyTo) {
      await Tweet.findByIdAndUpdate(replyTo, {
        $inc: { 'engagement.repliesCount': 1 }
      });
      
      // Create notification for reply
      const originalTweet = await Tweet.findById(replyTo).populate('author');
      if (originalTweet && originalTweet.author._id.toString() !== req.userId.toString()) {
        await Notification.create({
          type: 'reply',
          actor: req.userId,
          recipient: originalTweet.author._id,
          tweet: tweet._id
        });
      }
    }

    // Update quote tweet count
    if (quoteTweetOf) {
      await Tweet.findByIdAndUpdate(quoteTweetOf, {
        $inc: { 'engagement.quoteTweetsCount': 1 }
      });
    }

    // Broadcast to connected clients
    const io = req.app.get('io');
    io.emit('tweet_created', {
      tweet,
      author: tweet.author
    });

    res.status(201).json({ tweet });
  } catch (error) {
    console.error('Create tweet error:', error);
    res.status(500).json({ error: 'Failed to create tweet' });
  }
});

// Get timeline/feed
router.get('/timeline', authenticateToken, [
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  query('before').optional().isISO8601()
], async (req, res) => {
  try {
    const limit = req.query.limit || 20;
    const before = req.query.before ? new Date(req.query.before) : new Date();

    // Get users that the current user follows
    const following = await Follow.find({
      follower: req.userId,
      status: 'approved'
    }).select('following');

    const followingIds = following.map(f => f.following);
    followingIds.push(req.userId); // Include own tweets

    // Get tweets from followed users
    const tweets = await Tweet.find({
      author: { $in: followingIds },
      createdAt: { $lt: before },
      isActive: true
    })
    .populate('author', 'username profile')
    .populate('replyTo', 'content author')
    .populate('quoteTweetOf', 'content author')
    .sort({ createdAt: -1 })
    .limit(limit);

    // Get like status for current user
    const tweetIds = tweets.map(t => t._id);
    const userLikes = await Like.find({
      user: req.userId,
      tweet: { $in: tweetIds }
    }).select('tweet');

    const likedTweetIds = new Set(userLikes.map(like => like.tweet.toString()));

    const tweetsWithLikeStatus = tweets.map(tweet => ({
      ...tweet.toObject(),
      isLiked: likedTweetIds.has(tweet._id.toString())
    }));

    res.json({
      tweets: tweetsWithLikeStatus,
      hasMore: tweets.length === limit
    });
  } catch (error) {
    console.error('Timeline error:', error);
    res.status(500).json({ error: 'Failed to get timeline' });
  }
});

// Get public tweets (explore/discover)
router.get('/public', optionalAuth, [
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  query('before').optional().isISO8601()
], async (req, res) => {
  try {
    const limit = req.query.limit || 20;
    const before = req.query.before ? new Date(req.query.before) : new Date();

    const tweets = await Tweet.find({
      visibility: 'public',
      createdAt: { $lt: before },
      isActive: true,
      replyTo: null // Only show original tweets, not replies
    })
    .populate('author', 'username profile')
    .populate('quoteTweetOf', 'content author')
    .sort({ createdAt: -1 })
    .limit(limit);

    // Get like status if user is authenticated
    let tweetsWithLikeStatus = tweets;
    if (req.userId) {
      const tweetIds = tweets.map(t => t._id);
      const userLikes = await Like.find({
        user: req.userId,
        tweet: { $in: tweetIds }
      }).select('tweet');

      const likedTweetIds = new Set(userLikes.map(like => like.tweet.toString()));

      tweetsWithLikeStatus = tweets.map(tweet => ({
        ...tweet.toObject(),
        isLiked: likedTweetIds.has(tweet._id.toString())
      }));
    }

    res.json({
      tweets: tweetsWithLikeStatus,
      hasMore: tweets.length === limit
    });
  } catch (error) {
    console.error('Public tweets error:', error);
    res.status(500).json({ error: 'Failed to get public tweets' });
  }
});

// Get single tweet with replies
router.get('/:tweetId', optionalAuth, async (req, res) => {
  try {
    const { tweetId } = req.params;

    const tweet = await Tweet.findById(tweetId)
      .populate('author', 'username profile')
      .populate('replyTo', 'content author')
      .populate('quoteTweetOf', 'content author');

    if (!tweet || !tweet.isActive) {
      return res.status(404).json({ error: 'Tweet not found' });
    }

    // Get replies
    const replies = await Tweet.find({
      replyTo: tweetId,
      isActive: true
    })
    .populate('author', 'username profile')
    .sort({ createdAt: 1 });

    // Check if user liked the tweet
    let isLiked = false;
    if (req.userId) {
      const like = await Like.findOne({
        user: req.userId,
        tweet: tweetId
      });
      isLiked = !!like;
    }

    res.json({
      tweet: {
        ...tweet.toObject(),
        isLiked
      },
      replies
    });
  } catch (error) {
    console.error('Get tweet error:', error);
    res.status(500).json({ error: 'Failed to get tweet' });
  }
});

// Like/unlike tweet
router.post('/:tweetId/like', authenticateToken, async (req, res) => {
  try {
    const { tweetId } = req.params;

    const tweet = await Tweet.findById(tweetId);
    if (!tweet || !tweet.isActive) {
      return res.status(404).json({ error: 'Tweet not found' });
    }

    // Check if already liked
    const existingLike = await Like.findOne({
      user: req.userId,
      tweet: tweetId
    });

    if (existingLike) {
      // Unlike
      await Like.deleteOne({ _id: existingLike._id });
      await Tweet.findByIdAndUpdate(tweetId, {
        $inc: { 'engagement.likesCount': -1 }
      });

      res.json({ liked: false, likesCount: tweet.engagement.likesCount - 1 });
    } else {
      // Like
      const like = new Like({
        user: req.userId,
        tweet: tweetId
      });
      await like.save();

      await Tweet.findByIdAndUpdate(tweetId, {
        $inc: { 'engagement.likesCount': 1 }
      });

      // Create notification for like
      const tweetAuthor = await User.findById(tweet.author);
      if (tweetAuthor && tweetAuthor._id.toString() !== req.userId.toString()) {
        await Notification.create({
          type: 'like',
          actor: req.userId,
          recipient: tweetAuthor._id,
          tweet: tweetId
        });
      }

      res.json({ liked: true, likesCount: tweet.engagement.likesCount + 1 });
    }
  } catch (error) {
    console.error('Like tweet error:', error);
    res.status(500).json({ error: 'Failed to like tweet' });
  }
});

// Delete tweet
router.delete('/:tweetId', authenticateToken, async (req, res) => {
  try {
    const { tweetId } = req.params;

    const tweet = await Tweet.findOne({
      _id: tweetId,
      author: req.userId,
      isActive: true
    });

    if (!tweet) {
      return res.status(404).json({ error: 'Tweet not found or unauthorized' });
    }

    // Soft delete
    tweet.isActive = false;
    await tweet.save();

    // Update user's tweet count
    await User.findByIdAndUpdate(req.userId, {
      $inc: { 'stats.tweetsCount': -1 }
    });

    res.json({ message: 'Tweet deleted successfully' });
  } catch (error) {
    console.error('Delete tweet error:', error);
    res.status(500).json({ error: 'Failed to delete tweet' });
  }
});

// Search tweets
router.get('/search/tweets', [
  query('q').notEmpty().withMessage('Search query required'),
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { q, limit = 20 } = req.query;

    const tweets = await Tweet.find({
      $text: { $search: q },
      isActive: true,
      visibility: 'public'
    })
    .populate('author', 'username profile')
    .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
    .limit(limit);

    res.json({ tweets });
  } catch (error) {
    console.error('Search tweets error:', error);
    res.status(500).json({ error: 'Failed to search tweets' });
  }
});

export default router;
