const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  // User who created the post
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Posting Profile Type (Personal, Business, Collaboration)
  postingProfile: {
    type: String,
    enum: ['personal', 'business', 'collaboration'],
    required: true
  },
  
  // Post Content
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000 // Limit post length
  },
  
  // Date/Date Range for events
  eventDate: {
    type: Date
  },
  eventEndDate: {
    type: Date
  },
  isEvent: {
    type: Boolean,
    default: false
  },
  
  // Visibility Settings
  visibility: {
    type: String,
    enum: ['public', 'private', 'friends', 'all', 'premium', 'basic', 'vip'],
    default: 'public'
  },
  
  // Target Profile Type (who can see this post)
  targetProfileTypes: {
    type: String,
    enum: ['personal', 'business', 'collaboration']
  },
  
  // Hashtags
  hashtags: [{
    type: String,
    trim: true
  }],
  
  // Gender and Orientation Filtering (updated structure)
  targetGenders: {
    id: {
      type: String,
      trim: true
    },
    name: {
      type: String,
      trim: true
    }
  },
  targetOrientations: {
    id: {
      type: String,
      trim: true
    },
    name: {
      type: String,
      trim: true
    }
  },
  
  // Connection status
  isConnected: {
    type: Boolean,
    default: false
  },
  
  // Post Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Views tracking
  views: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, { timestamps: true });

// Indexes for better query performance
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ postingProfile: 1, createdAt: -1 });
postSchema.index({ targetProfileTypes: 1, createdAt: -1 });
postSchema.index({ topicTags: 1, createdAt: -1 });
postSchema.index({ isActive: 1, createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);
