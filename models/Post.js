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
    enum: ['public', 'private', 'friends'],
    default: 'public'
  },
  
  // Target Profile Types (who can see this post)
  targetProfileTypes: [{
    type: String,
    enum: ['personal', 'business', 'collaboration']
  }],
  
  // Topic Tags
  topicTags: [{
    type: String,
    trim: true
  }],
  
  // Gender and Orientation Filtering
  targetGender: {
    type: String,
    trim: true
  },
  targetOrientation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Orientation'
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
