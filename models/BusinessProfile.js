const mongoose = require('mongoose');

const businessProfileSchema = new mongoose.Schema({
  // User who owns this business profile
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Step 1: Professional Info
  jobTitle: {
    type: String,
    required: true,
    trim: true
  },
  company: {
    type: String,
    required: true,
    trim: true
  },
  
  // Step 2: Industry (from profile summary)
  industry: {
    type: String,
    trim: true
  },
  
  // Step 3: Networking Goals
  networkingGoals: [{
    type: String,
    enum: [
      'A Mentor',
      'To Mentor Others', 
      'New Career Opportunities',
      'To Hire Employees',
      'To Find Clients',
      'New Projects',
      'A Co-Founder',
      'A Business Partner',
      'General Networking',
      'Other'
    ]
  }],
  
  // Step 4: Professional Details
  professionalBio: {
    type: String,
    trim: true,
    maxlength: 300,
    minlength: 20
  },
  skillsAndExpertise: [{
    type: String,
    trim: true
  }],
  
  // Step 5: Professional Photo
  professionalPhoto: {
    type: String,
    default: ''
  },
  
  // Profile Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Completion Status
  isComplete: {
    type: Boolean,
    default: false
  },
  
  // Current step (1-5)
  currentStep: {
    type: Number,
    default: 1,
    min: 1,
    max: 5
  }
}, { timestamps: true });

// Indexes for better query performance
businessProfileSchema.index({ user: 1 });
businessProfileSchema.index({ isActive: 1 });
businessProfileSchema.index({ networkingGoals: 1 });
businessProfileSchema.index({ industry: 1 });

module.exports = mongoose.model('BusinessProfile', businessProfileSchema);
