const express = require('express');
const router = express.Router();
const User = require('../models/User');
const BusinessProfile = require('../models/BusinessProfile');
const CollaborationProfile = require('../models/CollaborationProfile');
const Post = require('../models/Post');

// Admin Dashboard Stats API
router.get('/dashboard-stats', async (req, res) => {
  try {
    // Get all stats in parallel for better performance
    const [
      totalUsers,
      totalBusinessUsers,
      totalCollaborationUsers,
      totalPosts
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      BusinessProfile.countDocuments({ isActive: true }),
      CollaborationProfile.countDocuments({ isActive: true }),
      Post.countDocuments({ isActive: true })
    ]);

    // Calculate additional stats
    const totalProfileUsers = totalBusinessUsers + totalCollaborationUsers;

    const stats = {
      totalUsers,
      totalBusinessUsers,
      totalCollaborationUsers,
      totalPosts,
      totalProfileUsers,
      businessUserPercentage: totalUsers > 0 ? ((totalBusinessUsers / totalUsers) * 100).toFixed(2) : 0,
      collaborationUserPercentage: totalUsers > 0 ? ((totalCollaborationUsers / totalUsers) * 100).toFixed(2) : 0
    };

    res.status(200).json({
      status: 200,
      message: 'Dashboard stats fetched successfully',
      data: stats
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ 
      status: 500, 
      message: 'Server error', 
      data: error.message || error 
    });
  }
});

// Get detailed user stats by profile type
router.get('/user-stats-detailed', async (req, res) => {
  try {
    const [
      businessProfiles,
      collaborationProfiles,
      totalActiveUsers,
      totalInactiveUsers
    ] = await Promise.all([
      BusinessProfile.countDocuments({ isActive: true }),
      CollaborationProfile.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: false })
    ]);

    const detailedStats = {
      profiles: {
        totalBusinessProfiles: businessProfiles,
        totalCollaborationProfiles: collaborationProfiles,
        totalProfiles: businessProfiles + collaborationProfiles
      },
      users: {
        totalActiveUsers,
        totalInactiveUsers,
        totalUsers: totalActiveUsers + totalInactiveUsers
      }
    };

    res.status(200).json({
      status: 200,
      message: 'Detailed user stats fetched successfully',
      data: detailedStats
    });

  } catch (error) {
    console.error('Detailed user stats error:', error);
    res.status(500).json({ 
      status: 500, 
      message: 'Server error', 
      data: error.message || error 
    });
  }
});

module.exports = router;
