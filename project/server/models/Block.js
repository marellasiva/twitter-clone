import mongoose from 'mongoose';

const blockSchema = new mongoose.Schema({
  blocker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  blocked: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Ensure a user can only block another user once
blockSchema.index({ blocker: 1, blocked: 1 }, { unique: true });

// Index for finding who blocked a user
blockSchema.index({ blocked: 1 });

// Index for finding who a user has blocked
blockSchema.index({ blocker: 1 });

export default mongoose.model('Block', blockSchema);
