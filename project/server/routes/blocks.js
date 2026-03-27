import express from 'express';
import Block from '../models/Block.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Block a user
router.post('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const blockerId = req.user.userId;

    if (userId === blockerId) {
      return res.status(400).json({ error: 'Cannot block yourself' });
    }

    // Check if already blocked
    const existingBlock = await Block.findOne({ blocker: blockerId, blocked: userId });
    if (existingBlock) {
      return res.status(400).json({ error: 'User is already blocked' });
    }

    // Create block
    const block = new Block({
      blocker: blockerId,
      blocked: userId
    });

    await block.save();

    res.json({ message: 'User blocked successfully', block });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ error: 'Failed to block user' });
  }
});

// Unblock a user
router.delete('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const blockerId = req.user.userId;

    const block = await Block.findOneAndDelete({ blocker: blockerId, blocked: userId });
    
    if (!block) {
      return res.status(404).json({ error: 'User is not blocked' });
    }

    res.json({ message: 'User unblocked successfully' });
  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({ error: 'Failed to unblock user' });
  }
});

// Get blocked users list
router.get('/', authenticateToken, async (req, res) => {
  try {
    const blockerId = req.user.userId;

    const blocks = await Block.find({ blocker: blockerId })
      .populate('blocked', 'username displayName avatarUrl')
      .sort({ createdAt: -1 });

    res.json({ blocks });
  } catch (error) {
    console.error('Get blocked users error:', error);
    res.status(500).json({ error: 'Failed to get blocked users' });
  }
});

// Check if user is blocked
router.get('/check/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const blockerId = req.user.userId;

    const block = await Block.findOne({ blocker: blockerId, blocked: userId });
    
    res.json({ isBlocked: !!block });
  } catch (error) {
    console.error('Check block status error:', error);
    res.status(500).json({ error: 'Failed to check block status' });
  }
});

export default router;
