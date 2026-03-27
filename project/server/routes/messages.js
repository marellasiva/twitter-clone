import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth.js';
import { checkDMBlocking } from '../middleware/blocking.js';
import Conversation from '../models/Conversation.js';
import DirectMessage from '../models/DirectMessage.js';
import User from '../models/User.js';

const router = express.Router();

// List user's conversations
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const convos = await Conversation.find({ participants: userId, isActive: true })
      .sort({ lastMessageAt: -1 })
      .populate({ path: 'participants', select: 'username profile.displayName profile.avatarUrl' });
    res.json({ conversations: convos });
  } catch (e) {
    console.error('List conversations error:', e);
    res.status(500).json({ error: 'Failed to list conversations' });
  }
});

// Get single conversation by id
router.get('/conversations/:conversationId', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { conversationId } = req.params;
    const convo = await Conversation.findOne({ _id: conversationId, participants: userId, isActive: true })
      .populate({ path: 'participants', select: 'username profile.displayName profile.avatarUrl' });
    if (!convo) return res.status(404).json({ error: 'Conversation not found' });
    res.json({ conversation: convo });
  } catch (e) {
    console.error('Get conversation error:', e);
    res.status(500).json({ error: 'Failed to get conversation' });
  }
});

// Start (or get existing) conversation with another user
router.post('/conversations', authenticateToken, [
  body('userId').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const otherId = req.body.userId;
    const userId = req.userId?.toString();
    if (otherId === userId) return res.status(400).json({ error: 'Cannot start a conversation with yourself' });
    const other = await User.findById(otherId);
    if (!other || !other.isActive) return res.status(404).json({ error: 'User not found' });

    let convo = await Conversation.findOne({ participants: { $all: [userId, otherId] } });
    if (!convo) {
      convo = new Conversation({ participants: [userId, otherId] });
      await convo.save();
    }
    await convo.populate('participants', 'username profile');
    res.json({ conversation: convo });
  } catch (e) {
    console.error('Start conversation error:', e);
    res.status(500).json({ error: 'Failed to start conversation' });
  }
});

// Get messages in a conversation
router.get('/messages', authenticateToken, [
  query('conversationId').notEmpty(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { conversationId, limit = 50 } = req.query;
    const userId = req.userId?.toString();
    const convo = await Conversation.findById(conversationId);
    if (!convo || !convo.participants.some(p => p.toString() === userId)) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    const messages = await DirectMessage.find({ conversation: conversationId, isActive: true })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('from', 'username profile')
      .populate('to', 'username profile');
    res.json({ messages: messages.reverse() });
  } catch (e) {
    console.error('Get messages error:', e);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// Send a message
router.post('/messages', authenticateToken, checkDMBlocking, [
  body('conversationId').notEmpty(),
  body('text').isLength({ min: 1, max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { conversationId, text } = req.body;
    const userId = req.userId?.toString();
    const convo = await Conversation.findById(conversationId);
    if (!convo || !convo.participants.some(p => p.toString() === userId)) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    const otherId = convo.participants.find(p => p.toString() !== userId);
    const msg = new DirectMessage({ conversation: conversationId, from: userId, to: otherId, text });
    await msg.save();
    await msg.populate('from', 'username profile');
    await msg.populate('to', 'username profile');
    await Conversation.findByIdAndUpdate(conversationId, { lastMessageAt: new Date(), lastMessageText: text });

    const io = req.app.get('io');
    io.to(`user_${otherId}`).emit('dm_receive', {
      id: msg._id,
      conversationId,
      from: msg.from,
      to: msg.to,
      text: msg.text,
      timestamp: msg.createdAt
    });
    res.status(201).json({ message: msg });
  } catch (e) {
    console.error('Send message error:', e);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;

// Edit message text
router.patch('/messages/:messageId', authenticateToken, [
  body('text').isLength({ min: 1, max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { messageId } = req.params;
    const { text } = req.body;
    const userId = req.userId;
    const msg = await DirectMessage.findOne({ _id: messageId, from: userId, isActive: true });
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    msg.text = text;
    await msg.save();
    res.json({ message: msg });
  } catch (e) {
    console.error('Edit message error:', e);
    res.status(500).json({ error: 'Failed to edit message' });
  }
});

// Delete message
router.delete('/messages/:messageId', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.userId;
    const msg = await DirectMessage.findOne({ _id: messageId, from: userId, isActive: true });
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    msg.isActive = false;
    await msg.save();
    res.json({ success: true });
  } catch (e) {
    console.error('Delete message error:', e);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Delete conversation (soft)
router.delete('/conversations/:conversationId', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.userId;
    const convo = await Conversation.findOne({ _id: conversationId, participants: userId, isActive: true });
    if (!convo) return res.status(404).json({ error: 'Conversation not found' });
    convo.isActive = false;
    await convo.save();
    res.json({ success: true });
  } catch (e) {
    console.error('Delete conversation error:', e);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});


