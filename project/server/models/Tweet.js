// server/models/Tweet.js
import mongoose from 'mongoose';

const tweetSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    text: {
      type: String,
      required: true,
      maxlength: 280
    },
    hashtags: [{
      type: String,
      match: /^#[a-zA-Z0-9_]+$/
    }],
    mentions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    mediaUrls: [{
      type: String
    }],
    location: {
      lat: Number,
      lng: Number
    }
  },
  engagement: {
    likesCount: {
      type: Number,
      default: 0
    },
    retweetsCount: {
      type: Number,
      default: 0
    },
    repliesCount: {
      type: Number,
      default: 0
    },
    quoteTweetsCount: {
      type: Number,
      default: 0
    }
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tweet',
    default: null
  },
  retweetOf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tweet',
    default: null
  },
  quoteTweetOf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tweet',
    default: null
  },
  visibility: {
    type: String,
    enum: ['public', 'followers', 'mentioned'],
    default: 'public'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPinned: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for performance
tweetSchema.index({ author: 1, createdAt: -1 });
tweetSchema.index({ createdAt: -1 });
tweetSchema.index({ 'content.hashtags': 1, createdAt: -1 });
tweetSchema.index({ replyTo: 1, createdAt: -1 });
tweetSchema.index({ retweetOf: 1 });
tweetSchema.index({ quoteTweetOf: 1 });

// Text search index
tweetSchema.index({ 
  'content.text': 'text',
  'content.hashtags': 'text'
});

// Extract hashtags and mentions before saving
tweetSchema.pre('save', function(next) {
  if (this.isModified('content.text')) {
    // Extract hashtags
    const hashtagRegex = /#[a-zA-Z0-9_]+/g;
    const hashtags = this.content.text.match(hashtagRegex) || [];
    this.content.hashtags = [...new Set(hashtags)]; // Remove duplicates
    
    // Extract mentions (would need user lookup in real implementation)
    const mentionRegex = /@[a-zA-Z0-9_]+/g;
    const mentions = this.content.text.match(mentionRegex) || [];
    // For production, convert mention strings to ObjectIds of users (not implemented here)
  }
  next();
});

export default mongoose.model('Tweet', tweetSchema);
