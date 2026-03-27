import mongoose from 'mongoose';

const directMessageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, maxlength: 1000 },
  isRead: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

directMessageSchema.index({ conversation: 1, createdAt: -1 });
directMessageSchema.index({ to: 1, isRead: 1 });

export default mongoose.model('DirectMessage', directMessageSchema);


