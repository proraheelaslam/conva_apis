const express = require('express');
const router = express.Router();
const CollaborationProfile = require('../models/CollaborationProfile');
const User = require('../models/User');

// Alias: POST / (same as /create)
router.post('/', async (req, res) => {
  // Use the same logic as /create
  try {
    const {
      userId,
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
    if (!portfolioBio || portfolioBio.length < 20) {
      return res.status(400).json({ status: 400, message: 'Portfolio bio must be at least 20 characters.', data: null });
    }
    if (!portfolioPhotos || !Array.isArray(portfolioPhotos) || portfolioPhotos.length === 0) {
      return res.status(400).json({ status: 400, message: 'At least one portfolio photo is required.', data: null });
    }
    const collaborationProfile = new CollaborationProfile({
      user: userId,
      jobTitle,
      company,
      artisticDisciplines,
      primaryMediums,
      skillsAndTechniques,
      toolsAndSoftware,
      collaborationGoals,
      portfolioBio,
      experience,
      portfolioLinks: portfolioLinks || [],
      portfolioPhotos,
      isComplete: true,
      currentStep: 5
    });
    await collaborationProfile.save();
    user.profileType = 'collaboration';
    await user.save();
    await collaborationProfile.populate('user', 'name email profileType profilePhoto');
    res.status(201).json({
      status: 201,
      message: 'Collaboration profile created successfully.',
      data: collaborationProfile
    });
  } catch (error) {
    console.error('Create collaboration profile error:', error);
    res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

// Get user's collaboration profile
router.get('/my-profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const collaborationProfile = await CollaborationProfile.findOne({ user: userId, isActive: true })
      .populate('user', 'name email profileType profilePhoto');

    if (!collaborationProfile) {
      return res.status(404).json({ status: 404, message: 'Collaboration profile not found.', data: null });
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
