const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User');

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
    await post.populate('author', 'name profileType profilePhoto photos distance isPremium');

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
      // Default: show all public posts
      filter.$or = [
        { targetProfileTypes: { $exists: false } },
        { targetProfileTypes: null },
        { visibility: 'public' }
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
      .populate('author', 'name profileType gender orientation profilePhoto photos distance isPremium')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

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
        posts,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalPosts: total,
          hasNextPage: skip + posts.length < total,
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
      .populate('author', 'name profileType gender orientation profilePhoto photos distance isPremium')
;

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
    ).populate('author', 'name profileType profilePhoto photos distance isPremium');

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
      .populate('author', 'name profileType profilePhoto photos distance isPremium')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

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
