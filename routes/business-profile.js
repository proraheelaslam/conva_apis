const express = require('express');
const router = express.Router();
const BusinessProfile = require('../models/BusinessProfile');
const User = require('../models/User');

// Create business profile
router.post('/create', async (req, res) => {
  try {
    const {
      userId, // User ID passed in request body instead of from token
      jobTitle,
      company,
      industry,
      networkingGoals,
      professionalBio,
      skillsAndExpertise,
      professionalPhoto
    } = req.body;

    if (!userId) {
      return res.status(400).json({ status: 400, message: 'User ID is required.', data: null });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: 404, message: 'User not found.', data: null });
    }

    // Check if business profile already exists
    const existingProfile = await BusinessProfile.findOne({ user: userId, isActive: true });
    if (existingProfile) {
      return res.status(400).json({ status: 400, message: 'Business profile already exists for this user.', data: null });
    }

    // Validate required fields
    if (!jobTitle || !company) {
      return res.status(400).json({ status: 400, message: 'Job title and company are required.', data: null });
    }

    if (!networkingGoals || !Array.isArray(networkingGoals) || networkingGoals.length === 0) {
      return res.status(400).json({ status: 400, message: 'At least one networking goal is required.', data: null });
    }

    if (!professionalBio || professionalBio.length < 20) {
      return res.status(400).json({ status: 400, message: 'Professional bio must be at least 20 characters.', data: null });
    }

    if (!skillsAndExpertise || !Array.isArray(skillsAndExpertise) || skillsAndExpertise.length === 0) {
      return res.status(400).json({ status: 400, message: 'At least one skill/expertise is required.', data: null });
    }

    // Create business profile
    const businessProfile = new BusinessProfile({
      user: userId,
      jobTitle,
      company,
      industry,
      networkingGoals,
      professionalBio,
      skillsAndExpertise,
      professionalPhoto: professionalPhoto || '',
      isComplete: true,
      currentStep: 5
    });

    await businessProfile.save();

    // Update user's profileType to 'business'
    user.profileType = 'business';
    await user.save();

    // Populate user details
    await businessProfile.populate('user', 'name email profileType profilePhoto');

    res.status(201).json({
      status: 201,
      message: 'Business profile created successfully.',
      data: businessProfile
    });
  } catch (error) {
    console.error('Create business profile error:', error);
    res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

// Get user's business profile
router.get('/my-profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const businessProfile = await BusinessProfile.findOne({ user: userId, isActive: true })
      .populate('user', 'name email profileType profilePhoto');

    if (!businessProfile) {
      return res.status(404).json({ status: 404, message: 'Business profile not found.', data: null });
    }

    res.status(200).json({
      status: 200,
      message: 'Business profile fetched successfully.',
      data: businessProfile
    });
  } catch (error) {
    console.error('Get business profile error:', error);
    res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

// Update business profile
router.put('/update/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      jobTitle,
      company,
      industry,
      networkingGoals,
      professionalBio,
      skillsAndExpertise,
      professionalPhoto
    } = req.body;

    const businessProfile = await BusinessProfile.findOne({ user: userId, isActive: true });
    if (!businessProfile) {
      return res.status(404).json({ status: 404, message: 'Business profile not found.', data: null });
    }

    // Update fields
    const updates = {};
    if (jobTitle !== undefined) updates.jobTitle = jobTitle;
    if (company !== undefined) updates.company = company;
    if (industry !== undefined) updates.industry = industry;
    if (networkingGoals !== undefined) updates.networkingGoals = Array.isArray(networkingGoals) ? networkingGoals : [];
    if (professionalBio !== undefined) updates.professionalBio = professionalBio;
    if (skillsAndExpertise !== undefined) updates.skillsAndExpertise = Array.isArray(skillsAndExpertise) ? skillsAndExpertise : [];
    if (professionalPhoto !== undefined) updates.professionalPhoto = professionalPhoto;

    const updatedProfile = await BusinessProfile.findByIdAndUpdate(
      businessProfile._id,
      updates,
      { new: true }
    ).populate('user', 'name email profileType profilePhoto');

    res.status(200).json({
      status: 200,
      message: 'Business profile updated successfully.',
      data: updatedProfile
    });
  } catch (error) {
    console.error('Update business profile error:', error);
    res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

// Delete business profile (soft delete)
router.delete('/delete/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const businessProfile = await BusinessProfile.findOne({ user: userId, isActive: true });
    if (!businessProfile) {
      return res.status(404).json({ status: 404, message: 'Business profile not found.', data: null });
    }

    businessProfile.isActive = false;
    await businessProfile.save();

    res.status(200).json({
      status: 200,
      message: 'Business profile deleted successfully.',
      data: null
    });
  } catch (error) {
    console.error('Delete business profile error:', error);
    res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

// Get all business profiles (for discovery/search)
router.get('/discover', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      industry,
      networkingGoal,
      skill
    } = req.query;

    const filter = { isActive: true, isComplete: true };

    // Apply filters
    if (industry) {
      filter.industry = { $regex: new RegExp(industry, 'i') };
    }
    if (networkingGoal) {
      filter.networkingGoals = { $in: [new RegExp(networkingGoal, 'i')] };
    }
    if (skill) {
      filter.skillsAndExpertise = { $in: [new RegExp(skill, 'i')] };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const businessProfiles = await BusinessProfile.find(filter)
      .populate('user', 'name profileType profilePhoto')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await BusinessProfile.countDocuments(filter);

    res.status(200).json({
      status: 200,
      message: 'Business profiles fetched successfully.',
      data: {
        businessProfiles,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalProfiles: total,
          hasNextPage: skip + businessProfiles.length < total,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Discover business profiles error:', error);
    res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

// Get business profile by ID (public view)
router.get('/:id', async (req, res) => {
  try {
    const businessProfile = await BusinessProfile.findById(req.params.id)
      .populate('user', 'name profileType profilePhoto');

    if (!businessProfile || !businessProfile.isActive) {
      return res.status(404).json({ status: 404, message: 'Business profile not found.', data: null });
    }

    res.status(200).json({
      status: 200,
      message: 'Business profile fetched successfully.',
      data: businessProfile
    });
  } catch (error) {
    console.error('Get business profile by ID error:', error);
    res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

module.exports = router;
