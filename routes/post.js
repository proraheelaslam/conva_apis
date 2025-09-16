const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User');
const Connection = require('../models/Connection');

// Create a new post
router.post('/', async (req, res) => {
  try {
    const {
      authorId, // User ID passed in request body instead of from token
      postingProfile,
      content,
      eventDate,
      eventEndDate,
      isEvent,
      visibility,
      targetProfileTypes,
      hashtags,
      isVisibility,
      targetGenders,
      targetOrientations,
      isConnected
    } = req.body;

    // Validate required fields
    if (!authorId || !postingProfile || !content) {
      return res.status(400).json({ status: 400, message: 'Author ID, posting profile and content are required.', data: null });
    }

    // Validate posting profile
    if (!['personal', 'business', 'collaboration'].includes(postingProfile)) {
      return res.status(400).json({ status: 400, message: 'Invalid posting profile type.', data: null });
    }

    // Check if user has the posting profile type
    const user = await User.findById(authorId);
    if (!user) {
      return res.status(404).json({ status: 404, message: 'User not found.', data: null });
    }

    if (user.profileType !== postingProfile) {
      return res.status(400).json({ status: 400, message: 'You can only post from your current profile type.', data: null });
    }

    // Create post
    const post = new Post({
      author: authorId,
      postingProfile,
      content,
      eventDate: eventDate ? new Date(eventDate) : null,
      eventEndDate: eventEndDate ? new Date(eventEndDate) : null,
      isEvent: isEvent || false,
      visibility: visibility || 'public',
      targetProfileTypes: targetProfileTypes || null,
      hashtags: Array.isArray(hashtags) ? hashtags : [],
      targetGenders: targetGenders || null,
      targetOrientations: targetOrientations || null,
      isConnected: isConnected || false
    });

    await post.save();

    // Populate author details including photos
    await post.populate({
      path: 'author',
      select: 'name profileType profilePhoto photos distance isPremium orientation birthday',
      populate: {
        path: 'orientation',
        select: 'name'
      }
    });

    // Calculate age from birthday
    const calculateAge = (birthday) => {
      const today = new Date();
      const birthDate = new Date(birthday);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    };

    // Add calculated fields to post
    if (post.author && post.author.birthday) {
      post.author.age = calculateAge(post.author.birthday);
      // Remove birthday from response
      delete post.author.birthday;
    }
    
    // Add targetGenders from post to author object
    if (post.targetGenders) {
      post.author.targetGenders = post.targetGenders;
    }
    
    // Calculate days until event
    if (post.eventDate) {
      const today = new Date();
      const eventDate = new Date(post.eventDate);
      const timeDiff = eventDate.getTime() - today.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
      post.daysUntilEvent = daysDiff > 0 ? daysDiff : 0;
    }
    
    // Add connection requests count (placeholder - needs actual implementation)
    post.author.connectionRequests = 0;

    res.status(201).json({
      status: 201,
      message: 'Post created successfully.',
      data: post
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

// Get all posts (with filtering)
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      postingProfile,
      targetProfileType,
      topicTag,
      targetGender,
      targetOrientation,
      isEvent,
      author,
      userId // User ID for filtering posts visible to specific user
    } = req.query;

    // Build filter query
    const filter = { isActive: true };

    // Filter by posting profile
    if (postingProfile) {
      filter.postingProfile = postingProfile;
    }

    // Filter by target profile types
    if (targetProfileType) {
      filter.targetProfileTypes = targetProfileType;
    } else if (userId) {
      // If userId provided, filter posts visible to that user's profile type
      const user = await User.findById(userId);
      if (user) {
        filter.$or = [
          { targetProfileTypes: user.profileType },
          { targetProfileTypes: { $exists: false } }, // No target profile type means all profile types
          { targetProfileTypes: null }, // Null means all profile types
          { visibility: 'public' }
        ];
      }
    } else {
      // Default: show all posts (public and premium)
      filter.$or = [
        { targetProfileTypes: { $exists: false } },
        { targetProfileTypes: null },
        { visibility: 'public' },
        { visibility: 'premium' }
      ];
    }

    // Filter by topic tag
    if (topicTag) {
      filter.topicTags = { $in: [topicTag] };
    }

    // Filter by gender and orientation
    if (targetGender) {
      filter.targetGender = targetGender;
    } else if (userId) {
      // If userId provided, filter posts targeting that user's gender
      const user = await User.findById(userId);
      if (user && user.gender) {
        filter.$or = filter.$or || [];
        filter.$or.push(
          { targetGender: user.gender },
          { targetGender: { $exists: false } },
          { targetGender: null }
        );
      }
    }

    if (targetOrientation) {
      filter.targetOrientation = targetOrientation;
    } else if (userId) {
      // If userId provided, filter posts targeting that user's orientation
      const user = await User.findById(userId);
      if (user && user.orientation) {
        filter.$or = filter.$or || [];
        filter.$or.push(
          { targetOrientation: user.orientation },
          { targetOrientation: { $exists: false } },
          { targetOrientation: null }
        );
      }
    }

    // Filter by event posts
    if (isEvent !== undefined) {
      filter.isEvent = isEvent === 'true';
    }

    // Filter by author
    if (author) {
      filter.author = author;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const posts = await Post.find(filter)
      .populate({
        path: 'author',
        select: 'name profileType gender orientation profilePhoto photos distance isPremium birthday',
        populate: {
          path: 'orientation',
          select: 'name'
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Calculate age and add missing fields for each post
    const calculateAge = (birthday) => {
      const today = new Date();
      const birthDate = new Date(birthday);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    };

    // Helper function to format date
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    };

    // Convert to plain objects and process each post
    const processedPosts = await Promise.all(posts.map(async (post) => {
      const postObj = post.toObject();
      
      if (postObj.author && postObj.author.birthday) {
        postObj.author.age = calculateAge(postObj.author.birthday);
        // Remove birthday from response
        delete postObj.author.birthday;
      }
      
      // Add targetGenders from post to author object
      if (postObj.targetGenders) {
        postObj.author.targetGenders = postObj.targetGenders;
      }
      
      // Add complete profile image URL
      if (postObj.author && postObj.author.photos && postObj.author.photos.length > 0) {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        postObj.author.profilePhoto = `${baseUrl}/uploads/profile-photos/${postObj.author.photos[0]}`;
      }
      
      // Calculate days until event (before formatting)
      if (postObj.eventDate) {
        const today = new Date();
        const eventDate = new Date(postObj.eventDate);
        const timeDiff = eventDate.getTime() - today.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        postObj.daysUntilEvent = daysDiff > 0 ? daysDiff : 0;
      }
      
      // Format event dates
      if (postObj.eventDate) {
        postObj.eventDate = formatDate(postObj.eventDate);
      }
      if (postObj.eventEndDate) {
        postObj.eventEndDate = formatDate(postObj.eventEndDate);
      }
      
      // Get actual connection requests count for this author
      if (postObj.author && postObj.author._id) {
        const connectionCount = await Connection.countDocuments({
          recipient: postObj.author._id,
          status: 'pending'
        });
        postObj.author.connectionRequests = connectionCount;
      } else {
        postObj.author.connectionRequests = 0;
      }
      
      return postObj;
    }));

    // Get total count for pagination
    const total = await Post.countDocuments(filter);

    // Track view if userId provided
    if (userId) {
      for (const post of posts) {
        const existingView = post.views.find(view => view.user.toString() === userId);
        if (!existingView) {
          post.views.push({ user: userId });
          await post.save();
        }
      }
    }

    res.status(200).json({
      status: 200,
      message: 'Posts fetched successfully.',
      data: {
        posts: processedPosts,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalPosts: total,
          hasNextPage: skip + processedPosts.length < total,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

// Get a specific post by ID
router.get('/:id', async (req, res) => {
  try {
    const { userId } = req.query; // Optional user ID for tracking views
    const post = await Post.findById(req.params.id)
      .populate({
        path: 'author',
        select: 'name profileType gender orientation profilePhoto photos distance isPremium birthday',
        populate: {
          path: 'orientation',
          select: 'name'
        }
      });

    // Calculate age from birthday
    const calculateAge = (birthday) => {
      const today = new Date();
      const birthDate = new Date(birthday);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    };

    if (post && post.author && post.author.birthday) {
      post.author.age = calculateAge(post.author.birthday);
      // Remove birthday from response
      delete post.author.birthday;
      
      // Add targetGenders from post to author object
      if (post.targetGenders) {
        post.author.targetGenders = post.targetGenders;
      }
      
      // Calculate days until event
      if (post.eventDate) {
        const today = new Date();
        const eventDate = new Date(post.eventDate);
        const timeDiff = eventDate.getTime() - today.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        post.daysUntilEvent = daysDiff > 0 ? daysDiff : 0;
      }
      
      // Add connection requests count (placeholder - needs actual implementation)
      post.author.connectionRequests = 0;
    }

    if (!post) {
      return res.status(404).json({ status: 404, message: 'Post not found.', data: null });
    }

    if (!post.isActive) {
      return res.status(404).json({ status: 404, message: 'Post not found.', data: null });
    }

    // Track view if userId provided
    if (userId) {
      const existingView = post.views.find(view => view.user.toString() === userId);
      if (!existingView) {
        post.views.push({ user: userId });
        await post.save();
      }
    }

    res.status(200).json({
      status: 200,
      message: 'Post fetched successfully.',
      data: post
    });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

// Update a post
router.put('/:id', async (req, res) => {
  try {
    const {
      authorId, // User ID to verify ownership
      content,
      eventDate,
      eventEndDate,
      isEvent,
      visibility,
      targetProfileTypes,
      hashtags,
      isVisibility,
      targetGenders,
      targetOrientations,
      isConnected
    } = req.body;

    if (!authorId) {
      return res.status(400).json({ status: 400, message: 'Author ID is required.', data: null });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ status: 404, message: 'Post not found.', data: null });
    }

    // Check if user is the author
    if (post.author.toString() !== authorId) {
      return res.status(403).json({ status: 403, message: 'You can only edit your own posts.', data: null });
    }

    // Update fields
    const updates = {};
    if (content !== undefined) updates.content = content;
    if (eventDate !== undefined) updates.eventDate = eventDate ? new Date(eventDate) : null;
    if (eventEndDate !== undefined) updates.eventEndDate = eventEndDate ? new Date(eventEndDate) : null;
    if (isEvent !== undefined) updates.isEvent = isEvent;
    if (visibility !== undefined) updates.visibility = visibility;
    if (targetProfileTypes !== undefined) updates.targetProfileTypes = targetProfileTypes;
    if (hashtags !== undefined) updates.hashtags = Array.isArray(hashtags) ? hashtags : [];
    if (targetGenders !== undefined) updates.targetGenders = targetGenders;
    if (targetOrientations !== undefined) updates.targetOrientations = targetOrientations;
    if (isConnected !== undefined) updates.isConnected = isConnected;

    const updatedPost = await Post.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    ).populate({
      path: 'author',
      select: 'name profileType profilePhoto photos distance isPremium orientation birthday',
      populate: {
        path: 'orientation',
        select: 'name'
      }
    });

    // Calculate age and add missing fields
    const calculateAge = (birthday) => {
      const today = new Date();
      const birthDate = new Date(birthday);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    };

    if (updatedPost && updatedPost.author && updatedPost.author.birthday) {
      updatedPost.author.age = calculateAge(updatedPost.author.birthday);
      // Remove birthday from response
      delete updatedPost.author.birthday;
      
      // Add targetGenders from post to author object
      if (updatedPost.targetGenders) {
        updatedPost.author.targetGenders = updatedPost.targetGenders;
      }
      
      // Calculate days until event
      if (updatedPost.eventDate) {
        const today = new Date();
        const eventDate = new Date(updatedPost.eventDate);
        const timeDiff = eventDate.getTime() - today.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        updatedPost.daysUntilEvent = daysDiff > 0 ? daysDiff : 0;
      }
      
      // Add connection requests count (placeholder - needs actual implementation)
      updatedPost.author.connectionRequests = 0;
    }

    res.status(200).json({
      status: 200,
      message: 'Post updated successfully.',
      data: updatedPost
    });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

// Delete a post (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { authorId } = req.body; // User ID to verify ownership

    if (!authorId) {
      return res.status(400).json({ status: 400, message: 'Author ID is required.', data: null });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ status: 404, message: 'Post not found.', data: null });
    }

    // Check if user is the author
    if (post.author.toString() !== authorId) {
      return res.status(403).json({ status: 403, message: 'You can only delete your own posts.', data: null });
    }

    // Soft delete
    post.isActive = false;
    await post.save();

    res.status(200).json({
      status: 200,
      message: 'Post deleted successfully.',
      data: null
    });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

// Get user's own posts
router.get('/user/:userId/posts', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const { userId } = req.params;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const posts = await Post.find({ author: userId, isActive: true })
      .populate({
        path: 'author',
        select: 'name profileType profilePhoto photos distance isPremium orientation birthday',
        populate: {
          path: 'orientation',
          select: 'name'
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Calculate age and add missing fields for each post
    const calculateAge = (birthday) => {
      const today = new Date();
      const birthDate = new Date(birthday);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    };

    posts.forEach(post => {
      if (post.author && post.author.birthday) {
        post.author.age = calculateAge(post.author.birthday);
        // Remove birthday from response
        delete post.author.birthday;
      }
      
      // Add targetGenders from post to author object
      if (post.targetGenders) {
        post.author.targetGenders = post.targetGenders;
      }
      
      // Calculate days until event
      if (post.eventDate) {
        const today = new Date();
        const eventDate = new Date(post.eventDate);
        const timeDiff = eventDate.getTime() - today.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        post.daysUntilEvent = daysDiff > 0 ? daysDiff : 0;
      }
      
      // Add connection requests count (placeholder - needs actual implementation)
      post.author.connectionRequests = 0;
    });

    const total = await Post.countDocuments({ author: userId, isActive: true });

    res.status(200).json({
      status: 200,
      message: 'User posts fetched successfully.',
      data: {
        posts,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalPosts: total
        }
      }
    });
  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

module.exports = router;
