// server/models/Like.js
import mongoose from 'mongoose';

const likeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tweet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tweet',
    required: true
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate likes
likeSchema.index({ user: 1, tweet: 1 }, { unique: true });
likeSchema.index({ tweet: 1, createdAt: -1 });
likeSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model('Like', likeSchema);
