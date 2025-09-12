const mongoose = require('mongoose');

const collaborationProfileSchema = new mongoose.Schema({
  // User who owns this collaboration profile
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Step 1: Basic Info
  jobTitle: {
    type: String,
    trim: true
  },
  company: {
    type: String,
    trim: true
  },
  
  // Step 2: Artistic Disciplines & Skills
  artisticDisciplines: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ArtisticIdentity'
  }],
  
  primaryMediums: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PrimaryMediums'
  }],
  
  skillsAndTechniques: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SkillsAndTechniques'
  }],
  
  toolsAndSoftware: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ToolsAndSoftware'
  }],
  
  // Step 3: Collaboration Goals
  collaborationGoals: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CollaborationGoals'
  }],
  
  // Step 4: Portfolio & Experience
  portfolioBio: {
    type: String,
    trim: true,
    maxlength: 500
  },
  experience: {
    type: String,
    trim: true
  },
  portfolioLinks: [{
    type: String,
    trim: true
  }],
  
  // Step 5: Portfolio Photos
  portfolioPhotos: [{
    type: String,
    trim: true
  }],
  
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
collaborationProfileSchema.index({ user: 1 });
collaborationProfileSchema.index({ isActive: 1 });
collaborationProfileSchema.index({ artisticDisciplines: 1 });
collaborationProfileSchema.index({ primaryMediums: 1 });
collaborationProfileSchema.index({ skillsAndTechniques: 1 });
collaborationProfileSchema.index({ toolsAndSoftware: 1 });
collaborationProfileSchema.index({ collaborationGoals: 1 });

module.exports = mongoose.model('CollaborationProfile', collaborationProfileSchema);
