// server/models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    // Removed `unique: true` here to avoid duplicate index warning
    trim: true,
    minlength: 3,
    maxlength: 15,
    match: /^[a-zA-Z0-9_]+$/
  },
  email: {
    type: String,
    required: true,
    // Removed `unique: true` here to avoid duplicate index warning
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  profile: {
    displayName: {
      type: String,
      required: true,
      maxlength: 50
    },
    bio: {
      type: String,
      maxlength: 160,
      default: ''
    },
    location: {
      type: String,
      maxlength: 30,
      default: ''
    },
    website: {
      type: String,
      maxlength: 100,
      default: ''
    },
    avatarUrl: {
      type: String,
      default: ''
    },
    bannerUrl: {
      type: String,
      default: ''
    },
    verified: {
      type: Boolean,
      default: false
    }
  },
  stats: {
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    tweetsCount: { type: Number, default: 0 },
    likesCount: { type: Number, default: 0 }
  },
  settings: {
    isPrivate: { type: Boolean, default: false },
    allowDMs: {
      type: String,
      enum: ['everyone', 'followers', 'none'],
      default: 'everyone'
    },
    emailNotifications: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true }
  },
  isActive: { type: Boolean, default: true },
  lastActiveAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Indexes for performance - keep these to create unique indexes
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ createdAt: -1 });
userSchema.index({ 'stats.followersCount': -1 });

// Password hashing before save and other methods unchanged...
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

export default mongoose.model('User', userSchema);
