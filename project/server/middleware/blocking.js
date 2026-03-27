import Block from '../models/Block.js';

// Middleware to check if user is blocked by another user
export const checkBlocked = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user?.userId;

    if (!currentUserId || !userId) {
      return next();
    }

    // Check if current user is blocked by the target user
    const isBlocked = await Block.findOne({ 
      blocker: userId, 
      blocked: currentUserId 
    });

    if (isBlocked) {
      return res.status(403).json({ error: 'You are blocked by this user' });
    }

    // Check if current user has blocked the target user
    const hasBlocked = await Block.findOne({ 
      blocker: currentUserId, 
      blocked: userId 
    });

    if (hasBlocked) {
      return res.status(403).json({ error: 'You have blocked this user' });
    }

    next();
  } catch (error) {
    console.error('Block check error:', error);
    next();
  }
};

// Middleware to check if users can interact in DMs
export const checkDMBlocking = async (req, res, next) => {
  try {
    const currentUserId = req.user?.userId;
    const { conversationId } = req.body;

    if (!currentUserId || !conversationId) {
      return next();
    }

    // Get conversation participants
    const Conversation = (await import('../models/Conversation.js')).default;
    const conversation = await Conversation.findById(conversationId)
      .populate('participants', '_id');

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const otherParticipant = conversation.participants.find(
      p => p._id.toString() !== currentUserId
    );

    if (!otherParticipant) {
      return next();
    }

    // Check if either user has blocked the other
    const blockExists = await Block.findOne({
      $or: [
        { blocker: currentUserId, blocked: otherParticipant._id },
        { blocker: otherParticipant._id, blocked: currentUserId }
      ]
    });

    if (blockExists) {
      return res.status(403).json({ error: 'Cannot send message - user is blocked' });
    }

    next();
  } catch (error) {
    console.error('DM block check error:', error);
    next();
  }
};

// Socket middleware to check blocking
export const checkSocketBlocking = async (socket, next) => {
  try {
    const userId = socket.userId;
    const { to, conversationId } = socket.handshake.query;

    if (!userId) {
      return next();
    }

    // For direct user targeting
    if (to && to !== userId) {
      const blockExists = await Block.findOne({
        $or: [
          { blocker: userId, blocked: to },
          { blocker: to, blocked: userId }
        ]
      });

      if (blockExists) {
        return next(new Error('User is blocked'));
      }
    }

    // For conversation-based messaging
    if (conversationId) {
      const Conversation = (await import('../models/Conversation.js')).default;
      const conversation = await Conversation.findById(conversationId)
        .populate('participants', '_id');

      if (conversation) {
        const otherParticipant = conversation.participants.find(
          p => p._id.toString() !== userId
        );

        if (otherParticipant) {
          const blockExists = await Block.findOne({
            $or: [
              { blocker: userId, blocked: otherParticipant._id },
              { blocker: otherParticipant._id, blocked: userId }
            ]
          });

          if (blockExists) {
            return next(new Error('User is blocked'));
          }
        }
      }
    }

    next();
  } catch (error) {
    console.error('Socket block check error:', error);
    next();
  }
};
