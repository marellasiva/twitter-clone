// server/routes/users.js
import express from 'express';
import { query, body, validationResult } from 'express-validator';
import User from '../models/User.js';
import Tweet from '../models/Tweet.js';
import Follow from '../models/Follow.js';
import Like from '../models/Like.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Get user profile
router.get('/:username', optionalAuth, async (req, res) => {
  try {
    const { username } = req.params;

    const user = await User.findOne({ 
      username: username,
      isActive: true 
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if current user follows this user
    let isFollowing = false;
    let isFollowedBy = false;

    if (req.userId) {
      const followRelation = await Follow.findOne({
        follower: req.userId,
        following: user._id,
        status: 'approved'
      });
      isFollowing = !!followRelation;

      const followedByRelation = await Follow.findOne({
        follower: user._id,
        following: req.userId,
        status: 'approved'
      });
      isFollowedBy = !!followedByRelation;
    }

    res.json({
      user,
      isFollowing,
      isFollowedBy,
      isOwnProfile: req.userId && req.userId.toString() === user._id.toString()
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

// Get user's tweets
router.get('/:username/tweets', optionalAuth, [
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  query('before').optional().isISO8601()
], async (req, res) => {
  try {
    const { username } = req.params;
    const limit = req.query.limit || 20;
    const before = req.query.before ? new Date(req.query.before) : new Date();

    const user = await User.findOne({ 
      username: username,
      isActive: true 
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if profile is private and user is not following
    if (user.settings.isPrivate && req.userId) {
      const isFollowing = await Follow.findOne({
        follower: req.userId,
        following: user._id,
        status: 'approved'
      });

      if (!isFollowing && req.userId.toString() !== user._id.toString()) {
        return res.status(403).json({ error: 'This account is private' });
      }
    }

    const tweets = await Tweet.find({
      author: user._id,
      createdAt: { $lt: before },
      isActive: true,
      replyTo: null // Only original tweets, not replies
    })
    .populate('author', 'username profile')
    .populate('quoteTweetOf', 'content author')
    .sort({ createdAt: -1 })
    .limit(limit);

    res.json({
      tweets,
      hasMore: tweets.length === limit
    });
  } catch (error) {
    console.error('Get user tweets error:', error);
    res.status(500).json({ error: 'Failed to get user tweets' });
  }
});

// Get user's replies
router.get('/:username/replies', optionalAuth, [
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  query('before').optional().isISO8601()
], async (req, res) => {
  try {
    const { username } = req.params;
    const limit = req.query.limit || 20;
    const before = req.query.before ? new Date(req.query.before) : new Date();

    const user = await User.findOne({ 
      username: username,
      isActive: true 
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const tweets = await Tweet.find({
      author: user._id,
      replyTo: { $ne: null },
      createdAt: { $lt: before },
      isActive: true
    })
    .populate('author', 'username profile')
    .populate('replyTo', 'content author')
    .populate('quoteTweetOf', 'content author')
    .sort({ createdAt: -1 })
    .limit(limit);

    res.json({ tweets, hasMore: tweets.length === limit });
  } catch (error) {
    console.error('Get user replies error:', error);
    res.status(500).json({ error: 'Failed to get user replies' });
  }
});

// Get user's liked tweets
router.get('/:username/likes', optionalAuth, [
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  query('before').optional().isISO8601()
], async (req, res) => {
  try {
    const { username } = req.params;
    const limit = req.query.limit || 20;
    const before = req.query.before ? new Date(req.query.before) : new Date();

    const user = await User.findOne({ 
      username: username,
      isActive: true 
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const likes = await Like.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(200);

    const tweetIds = likes.map(l => l.tweet);

    const tweets = await Tweet.find({
      _id: { $in: tweetIds },
      createdAt: { $lt: before },
      isActive: true
    })
    .populate('author', 'username profile')
    .populate('replyTo', 'content author')
    .populate('quoteTweetOf', 'content author')
    .sort({ createdAt: -1 })
    .limit(limit);

    res.json({ tweets, hasMore: tweets.length === limit });
  } catch (error) {
    console.error('Get user likes error:', error);
    res.status(500).json({ error: 'Failed to get user likes' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, [
  body('displayName').optional().isLength({ min: 1, max: 50 }),
  body('bio').optional().isLength({ max: 160 }),
  body('location').optional().isLength({ max: 30 }),
  body('website').optional().isLength({ max: 200 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Profile validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { displayName, bio, location, website, avatarUrl, bannerUrl } = req.body;

    const updateData = {};
    if (displayName !== undefined) updateData['profile.displayName'] = displayName;
    if (bio !== undefined) updateData['profile.bio'] = bio;
    if (location !== undefined) updateData['profile.location'] = location;
    if (website !== undefined) updateData['profile.website'] = website;
    if (avatarUrl !== undefined) updateData['profile.avatarUrl'] = avatarUrl;
    if (bannerUrl !== undefined) updateData['profile.bannerUrl'] = bannerUrl;

    console.log('Updating profile for user:', req.userId, 'with data:', updateData);

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: updateData },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Search users
router.get('/search/users', [
  query('q').notEmpty().withMessage('Search query required'),
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { q, limit = 20 } = req.query;

    const users = await User.find({
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { 'profile.displayName': { $regex: q, $options: 'i' } }
      ],
      isActive: true
    })
    .select('username profile stats')
    .limit(limit);

    res.json({ users });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// Get user's followers
router.get('/:username/followers', optionalAuth, [
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt()
], async (req, res) => {
  try {
    const { username } = req.params;
    const limit = req.query.limit || 20;

    const user = await User.findOne({ 
      username: username,
      isActive: true 
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const followers = await Follow.find({
      following: user._id,
      status: 'approved'
    })
    .populate('follower', 'username profile stats')
    .sort({ createdAt: -1 })
    .limit(limit);

    const followerUsers = followers.map(f => f.follower);

    res.json({ users: followerUsers });
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ error: 'Failed to get followers' });
  }
});

// Get user's following
router.get('/:username/following', optionalAuth, [
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt()
], async (req, res) => {
  try {
    const { username } = req.params;
    const limit = req.query.limit || 20;

    const user = await User.findOne({ 
      username: username,
      isActive: true 
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const following = await Follow.find({
      follower: user._id,
      status: 'approved'
    })
    .populate('following', 'username profile stats')
    .sort({ createdAt: -1 })
    .limit(limit);

    const followingUsers = following.map(f => f.following);

    res.json({ users: followingUsers });
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ error: 'Failed to get following' });
  }
});

export default router;
