// server/routes/follows.js
import express from 'express';
import Follow from '../models/Follow.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Follow a user
router.post('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    if (userId === req.userId.toString()) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser || !targetUser.isActive) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already following
    const existingFollow = await Follow.findOne({
      follower: req.userId,
      following: userId
    });

    if (existingFollow) {
      return res.status(400).json({ error: 'Already following this user' });
    }

    // Create follow relationship
    const follow = new Follow({
      follower: req.userId,
      following: userId,
      status: targetUser.settings.isPrivate ? 'pending' : 'approved'
    });

    await follow.save();

    // Update follower/following counts if approved
    if (follow.status === 'approved') {
      await Promise.all([
        User.findByIdAndUpdate(req.userId, {
          $inc: { 'stats.followingCount': 1 }
        }),
        User.findByIdAndUpdate(userId, {
          $inc: { 'stats.followersCount': 1 }
        })
      ]);
      
      // Create notification for follow
      await Notification.create({
        type: 'follow',
        actor: req.userId,
        recipient: userId
      });
    }

    // Send real-time notification
    const io = req.app.get('io');
    io.to(`user_${userId}`).emit('notification', {
      type: 'follow',
      message: `${req.user.username} ${follow.status === 'pending' ? 'requested to follow' : 'started following'} you`,
      from: {
        id: req.userId,
        username: req.user.username,
        avatar: req.user.profile.avatarUrl
      },
      timestamp: new Date()
    });

    res.json({ 
      message: follow.status === 'pending' ? 'Follow request sent' : 'Successfully followed user',
      status: follow.status
    });
  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({ error: 'Failed to follow user' });
  }
});

// Unfollow a user
router.delete('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    const follow = await Follow.findOne({
      follower: req.userId,
      following: userId
    });

    if (!follow) {
      return res.status(404).json({ error: 'Not following this user' });
    }

    await Follow.deleteOne({ _id: follow._id });

    // Update follower/following counts if was approved
    if (follow.status === 'approved') {
      await Promise.all([
        User.findByIdAndUpdate(req.userId, {
          $inc: { 'stats.followingCount': -1 }
        }),
        User.findByIdAndUpdate(userId, {
          $inc: { 'stats.followersCount': -1 }
        })
      ]);
    }

    res.json({ message: 'Successfully unfollowed user' });
  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
});

// Get follow requests (for private accounts)
router.get('/requests', authenticateToken, async (req, res) => {
  try {
    const requests = await Follow.find({
      following: req.userId,
      status: 'pending'
    })
    .populate('follower', 'username profile')
    .sort({ createdAt: -1 });

    res.json({ requests });
  } catch (error) {
    console.error('Get follow requests error:', error);
    res.status(500).json({ error: 'Failed to get follow requests' });
  }
});

// Approve/reject follow request
router.put('/requests/:requestId', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action } = req.body; // 'approve' or 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const followRequest = await Follow.findOne({
      _id: requestId,
      following: req.userId,
      status: 'pending'
    });

    if (!followRequest) {
      return res.status(404).json({ error: 'Follow request not found' });
    }

    if (action === 'approve') {
      followRequest.status = 'approved';
      await followRequest.save();

      // Update follower/following counts
      await Promise.all([
        User.findByIdAndUpdate(followRequest.follower, {
          $inc: { 'stats.followingCount': 1 }
        }),
        User.findByIdAndUpdate(req.userId, {
          $inc: { 'stats.followersCount': 1 }
        })
      ]);

      // Send notification
      const io = req.app.get('io');
      io.to(`user_${followRequest.follower}`).emit('notification', {
        type: 'follow_approved',
        message: `${req.user.username} approved your follow request`,
        from: {
          id: req.userId,
          username: req.user.username,
          avatar: req.user.profile.avatarUrl
        },
        timestamp: new Date()
      });

      res.json({ message: 'Follow request approved' });
    } else {
      await Follow.deleteOne({ _id: followRequest._id });
      res.json({ message: 'Follow request rejected' });
    }
  } catch (error) {
    console.error('Handle follow request error:', error);
    res.status(500).json({ error: 'Failed to handle follow request' });
  }
});

export default router;
