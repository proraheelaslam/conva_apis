const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const CollaborationProfile = require('../models/CollaborationProfile');
const User = require('../models/User');

// JWT Secret (should be in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ status: 401, message: 'Access denied. No token provided.', data: null });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ status: 400, message: 'Invalid token.', data: null });
  }
};

// Configure multer for collaboration portfolio photo uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'collaboration-portfolio');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Upload collaboration portfolio photos (multiple images)
router.post('/portfolio-upload-photos', upload.any(), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        status: 400, 
        message: 'No photo files uploaded', 
        data: null 
      });
    }

    // Process all uploaded files
    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      size: file.size
    }));

    // Return the uploaded file names
    res.status(200).json({
      status: 200,
      message: `${req.files.length} collaboration portfolio photo(s) uploaded successfully`,
      data: {
        files: uploadedFiles,
        totalFiles: req.files.length
      }
    });

  } catch (error) {
    res.status(500).json({ 
      status: 500, 
      message: 'Server error', 
      data: error.message || error 
    });
  }
});

// Alias: POST / (same as /create)
router.post('/', async (req, res) => {
  // Use the same logic as /create
  try {
    const {
      userId,
      artisticDisciplines,
      primaryMediums,
      skillsAndTechniques,
      toolsAndSoftware,
      collaborationGoals,
      portfolioPhotos
    } = req.body;
    // NOTE: Temporarily ignoring extra params for creation as per design discussion:
    // jobTitle, company, portfolioBio, experience, portfolioLinks
    // If sent, they will be ignored and not persisted for now.
    if (!userId) {
      return res.status(400).json({ status: 400, message: 'User ID is required.', data: null });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: 404, message: 'User not found.', data: null });
    }
    const existingProfile = await CollaborationProfile.findOne({ user: userId, isActive: true });
    if (existingProfile) {
      return res.status(400).json({ status: 400, message: 'Collaboration profile already exists for this user.', data: null });
    }
    if (!artisticDisciplines || !Array.isArray(artisticDisciplines) || artisticDisciplines.length === 0) {
      return res.status(400).json({ status: 400, message: 'At least one artistic discipline is required.', data: null });
    }
    if (!primaryMediums || !Array.isArray(primaryMediums) || primaryMediums.length === 0) {
      return res.status(400).json({ status: 400, message: 'At least one primary medium is required.', data: null });
    }
    if (!skillsAndTechniques || !Array.isArray(skillsAndTechniques) || skillsAndTechniques.length === 0) {
      return res.status(400).json({ status: 400, message: 'At least one skill/technique is required.', data: null });
    }
    if (!toolsAndSoftware || !Array.isArray(toolsAndSoftware) || toolsAndSoftware.length === 0) {
      return res.status(400).json({ status: 400, message: 'At least one tool/software is required.', data: null });
    }
    if (!collaborationGoals || !Array.isArray(collaborationGoals) || collaborationGoals.length === 0) {
      return res.status(400).json({ status: 400, message: 'At least one collaboration goal is required.', data: null });
    }
    if (!portfolioPhotos || !Array.isArray(portfolioPhotos) || portfolioPhotos.length === 0) {
      return res.status(400).json({ status: 400, message: 'At least one portfolio photo is required.', data: null });
    }
    const collaborationProfile = new CollaborationProfile({
      user: userId,
      artisticDisciplines,
      primaryMediums,
      skillsAndTechniques,
      toolsAndSoftware,
      collaborationGoals,
      portfolioPhotos,
      isComplete: true,
      currentStep: 5
    });
    await collaborationProfile.save();
    user.profileType = 'collaboration';
    await user.save();
    
    const populatedProfile = await CollaborationProfile.findById(collaborationProfile._id)
      .populate('user', 'name email profileType profilePhoto')
      .populate('artisticDisciplines', 'name')
      .populate('primaryMediums', 'name')
      .populate('skillsAndTechniques', 'name')
      .populate('toolsAndSoftware', 'name')
      .populate('collaborationGoals', 'name');
    
    // Add complete photo URLs if portfolioPhotos exist
    if (populatedProfile.portfolioPhotos && populatedProfile.portfolioPhotos.length > 0) {
      populatedProfile.portfolioPhotos = populatedProfile.portfolioPhotos.map(photo => 
        `${req.protocol}://${req.get('host')}/uploads/collaboration-portfolio/${photo}`
      );
    }
    
    // Generate JWT token (non-expiring)
    const token = jwt.sign(
      { userId: populatedProfile.user._id, profileType: 'collaboration' },
      JWT_SECRET
    );
    
    res.status(200).json({
      status: 200,
      message: 'Collaboration profile created successfully.',
      data: populatedProfile,
      token: token
    });
  } catch (error) {
    console.error('Create collaboration profile error:', error);
    res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

// Get user's collaboration profile (token-based)
router.get('/my-profile', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const collaborationProfile = await CollaborationProfile.findOne({ user: userId, isActive: true })
      .populate('user', 'name email profileType profilePhoto')
      .populate('artisticDisciplines', 'name')
      .populate('primaryMediums', 'name')
      .populate('skillsAndTechniques', 'name')
      .populate('toolsAndSoftware', 'name')
      .populate('collaborationGoals', 'name');

    if (!collaborationProfile) {
      return res.status(404).json({ status: 404, message: 'Collaboration profile not found.', data: null });
    }

    // Add complete photo URLs if portfolioPhotos exist
    if (collaborationProfile.portfolioPhotos && collaborationProfile.portfolioPhotos.length > 0) {
      collaborationProfile.portfolioPhotos = collaborationProfile.portfolioPhotos.map(photo => 
        `${req.protocol}://${req.get('host')}/uploads/collaboration-portfolio/${photo}`
      );
    }

    res.status(200).json({
      status: 200,
      message: 'Collaboration profile fetched successfully.',
      data: collaborationProfile
    });
  } catch (error) {
    console.error('Get collaboration profile error:', error);
    res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

// Update collaboration profile
router.put('/update/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      jobTitle,
      company,
      artisticDisciplines,
      primaryMediums,
      skillsAndTechniques,
      toolsAndSoftware,
      collaborationGoals,
      portfolioBio,
      experience,
      portfolioLinks,
      portfolioPhotos
    } = req.body;

    const collaborationProfile = await CollaborationProfile.findOne({ user: userId, isActive: true });
    if (!collaborationProfile) {
      return res.status(404).json({ status: 404, message: 'Collaboration profile not found.', data: null });
    }

    // Update fields
    const updates = {};
    if (jobTitle !== undefined) updates.jobTitle = jobTitle;
    if (company !== undefined) updates.company = company;
    if (artisticDisciplines !== undefined) updates.artisticDisciplines = Array.isArray(artisticDisciplines) ? artisticDisciplines : [];
    if (primaryMediums !== undefined) updates.primaryMediums = Array.isArray(primaryMediums) ? primaryMediums : [];
    if (skillsAndTechniques !== undefined) updates.skillsAndTechniques = Array.isArray(skillsAndTechniques) ? skillsAndTechniques : [];
    if (toolsAndSoftware !== undefined) updates.toolsAndSoftware = Array.isArray(toolsAndSoftware) ? toolsAndSoftware : [];
    if (collaborationGoals !== undefined) updates.collaborationGoals = Array.isArray(collaborationGoals) ? collaborationGoals : [];
    if (portfolioBio !== undefined) updates.portfolioBio = portfolioBio;
    if (experience !== undefined) updates.experience = experience;
    if (portfolioLinks !== undefined) updates.portfolioLinks = Array.isArray(portfolioLinks) ? portfolioLinks : [];
    if (portfolioPhotos !== undefined) updates.portfolioPhotos = Array.isArray(portfolioPhotos) ? portfolioPhotos : [];

    const updatedProfile = await CollaborationProfile.findByIdAndUpdate(
      collaborationProfile._id,
      updates,
      { new: true }
    ).populate('user', 'name email profileType profilePhoto');

    res.status(200).json({
      status: 200,
      message: 'Collaboration profile updated successfully.',
      data: updatedProfile
    });
  } catch (error) {
    console.error('Update collaboration profile error:', error);
    res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

// Delete collaboration profile (soft delete)
router.delete('/delete/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const collaborationProfile = await CollaborationProfile.findOne({ user: userId, isActive: true });
    if (!collaborationProfile) {
      return res.status(404).json({ status: 404, message: 'Collaboration profile not found.', data: null });
    }

    collaborationProfile.isActive = false;
    await collaborationProfile.save();

    res.status(200).json({
      status: 200,
      message: 'Collaboration profile deleted successfully.',
      data: null
    });
  } catch (error) {
    console.error('Delete collaboration profile error:', error);
    res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

// Get all collaboration profiles (for discovery/search)
router.get('/discover', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      artisticDiscipline,
      primaryMedium,
      skill,
      tool,
      collaborationGoal
    } = req.query;

    const filter = { isActive: true, isComplete: true };

    // Apply filters
    if (artisticDiscipline) {
      filter.artisticDisciplines = { $in: [artisticDiscipline] };
    }
    if (primaryMedium) {
      filter.primaryMediums = { $in: [primaryMedium] };
    }
    if (skill) {
      filter.skillsAndTechniques = { $in: [skill] };
    }
    if (tool) {
      filter.toolsAndSoftware = { $in: [tool] };
    }
    if (collaborationGoal) {
      filter.collaborationGoals = { $in: [collaborationGoal] };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const collaborationProfiles = await CollaborationProfile.find(filter)
      .populate('user', 'name email profileType profilePhoto')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await CollaborationProfile.countDocuments(filter);

    res.status(200).json({
      status: 200,
      message: 'Collaboration profiles fetched successfully.',
      data: {
        collaborationProfiles,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalProfiles: total,
          hasNextPage: skip + collaborationProfiles.length < total,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Discover collaboration profiles error:', error);
    res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

// Get collaboration profile by ID (public view)
router.get('/:id', async (req, res) => {
  try {
    const collaborationProfile = await CollaborationProfile.findById(req.params.id)
      .populate('user', 'name email profileType profilePhoto');

    if (!collaborationProfile || !collaborationProfile.isActive) {
      return res.status(404).json({ status: 404, message: 'Collaboration profile not found.', data: null });
    }

    res.status(200).json({
      status: 200,
      message: 'Collaboration profile fetched successfully.',
      data: collaborationProfile
    });
  } catch (error) {
    console.error('Get collaboration profile by ID error:', error);
    res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

module.exports = router;
