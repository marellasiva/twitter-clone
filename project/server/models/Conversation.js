import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  lastMessageAt: { type: Date, default: Date.now },
  lastMessageText: { type: String, default: '' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1, lastMessageAt: -1 });

export default mongoose.model('Conversation', conversationSchema);


