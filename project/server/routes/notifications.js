import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import Notification from '../models/Notification.js';

const router = express.Router();

// List notifications
router.get('/', authenticateToken, async (req, res) => {
  try {
    const items = await Notification.find({ recipient: req.userId })
      .populate('actor', 'username profile')
      .populate('tweet', 'content author')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ notifications: items });
  } catch (e) {
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

// Mark all as read
router.post('/read', authenticateToken, async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.userId, isRead: false }, { $set: { isRead: true } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

export default router;


