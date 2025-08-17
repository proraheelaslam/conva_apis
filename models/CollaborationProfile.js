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
    type: String,
    enum: [
      // Visual Arts
      'Painter', 'Illustrator', 'Sculptor', 'Photographer', 'Printmaker', 'Mixed Media Artist',
      // Performing Arts
      'Musician', 'Dancer', 'Actor', 'Singer', 'Composer', 'Choreographer', 'Theater Director',
      // Literary Arts
      'Writer', 'Poet', 'Screenwriter', 'Novelist', 'Playwright', 'Journalist', 'Copywriter',
      // Digital & Media Arts
      'Filmmaker', 'Animator', 'Graphic Designer', 'Digital Artist', 'Video Editor', 'Motion Designer',
      // Design & Applied Arts
      'Fashion Designer', 'Architect', 'Interior Designer', 'Product Designer', 'Industrial Designer'
    ]
  }],
  
  primaryMediums: [{
    type: String,
    enum: [
      // Visual Arts Mediums
      'Oil Paint', 'Acrylic', 'Watercolor', 'Clay', 'Bronze', 'Marble', 'Wood', 'Canvas', 'Paper', 'Charcoal', 'Pencil',
      // Performing Arts Mediums
      'Voice', 'Guitar', 'Piano', 'Drums', 'Violin', 'Body/Movement', 'Dance', 'Theater',
      // Literary Arts Mediums
      'Prose', 'Poetry', 'Script', 'Digital Text', 'Novel', 'Short Story', 'Play',
      // Design & Applied Arts Mediums
      'Textiles/Fabric', 'Metals', 'Wood', 'Glass', 'Ceramics', 'Leather', 'Plastic'
    ]
  }],
  
  skillsAndTechniques: [{
    type: String,
    enum: [
      // General Skills
      'Storytelling', 'Improvisation', 'Brainstorming', 'Creative Problem Solving', 'Collaboration', 'Communication',
      // Visual Arts Skills
      'Life Drawing', 'Color Theory', 'Welding', 'Sculpting', 'Printmaking', 'Photography', 'Composition',
      // Performing Arts Skills
      'Choreography', 'Music Composition', 'Sound Mixing', 'Acting', 'Dance Technique', 'Vocal Training',
      // Literary Arts Skills
      'Character Development', 'World-Building', 'Dialogue', 'Plot Structure', 'Editing', 'Research',
      // Digital & Media Arts Skills
      'UI/UX Principles', '3D Modeling', 'Video Editing', 'Animation', 'Motion Graphics', 'Sound Design',
      // Design & Applied Arts Skills
      'Pattern Making', 'Draping', 'Sewing', 'Sketching', 'Technical Drawing', 'Prototyping'
    ]
  }],
  
  toolsAndSoftware: [{
    type: String,
    enum: [
      // Digital Art & Design
      'Adobe Photoshop', 'Adobe Illustrator', 'Adobe InDesign', 'Procreate', 'Figma', 'Sketch', 'Blender', 'Maya', 'Cinema 4D',
      // Music Production
      'Ableton Live', 'Logic Pro X', 'FL Studio', 'Pro Tools', 'GarageBand', 'Reaper', 'Cubase',
      // Video & Film
      'Adobe Premiere Pro', 'Final Cut Pro', 'DaVinci Resolve', 'After Effects', 'Blender', 'Cinema 4D',
      // Writing
      'Scrivener', 'Final Draft', 'Google Docs', 'Microsoft Word', 'Notion', 'Ulysses',
      // Traditional Tools
      'Paint Brushes', 'Canvas', 'Clay Tools', 'Sewing Machine', 'Camera', 'Musical Instruments'
    ]
  }],
  
  // Step 3: Collaboration Goals
  collaborationGoals: [{
    type: String,
    enum: [
      // Project-Based Goals
      'Short Film', 'Music Video', 'Song', 'Mural', 'Art Installation', 'Photography Series', 'Animation',
      'Fashion Collection', 'Architectural Project', 'Book/Publication', 'Performance Piece',
      // Exhibition/Performance Goals
      'Gallery Show', 'Live Performance', 'Concert', 'Theater Production', 'Dance Performance', 'Art Exhibition',
      'Fashion Show', 'Design Exhibition', 'Film Festival', 'Music Festival',
      // Long-Term Goals
      'Forming a Band', 'Launching a Brand', 'Starting a Studio', 'Creating a Collective', 'Building a Portfolio',
      'Developing a Style', 'Establishing a Practice', 'Creating a Series', 'Building a Following'
    ]
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
