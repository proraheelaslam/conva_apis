const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const auth = require('../middlewares/auth');
const User = require('../models/User');
const Swipe = require('../models/Swipe');
const Match = require('../models/Match');
const UserPreference = require('../models/UserPreference');
const Gender = require('../models/Gender');
const { sendNotification } = require('../helpers/notificationHelper');

// Middleware to check swipe limits
const checkSwipeLimit = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    // Only check limits for free plan users
    if (user.plan?.planType === 'free') {
      if (user.plan?.remainingSwipes <= 0) {
        return res.status(403).json({
          status: 403,
          message: 'Daily swipe limit reached. Upgrade to premium for unlimited swipes.',
          data: null
        });
      }
    }
    // For all other plans (premium, vip, etc.), allow unlimited swipes
    
    next();
  } catch (error) {
    console.error('Error in checkSwipeLimit:', error);
    return res.status(500).json({ status: 500, message: 'Server error', data: error.message });
  }
};

// Middleware to update swipe count
const updateSwipeCount = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    // Only decrement for free plan users with remaining swipes
    // Other plans (premium, vip, etc.) have unlimited swipes
    if (user.plan?.planType === 'free' && user.plan?.remainingSwipes > 0) {
      user.plan.remainingSwipes -= 1;
      await user.save();
    }
    
    next();
  } catch (error) {
    console.error('Error in updateSwipeCount:', error);
    return res.status(500).json({ status: 500, message: 'Server error', data: error.message });
  }
};
// Helpers for absolute image URLs
function getProfileImageUrl(u, req) {
  const proto = (req && req.headers && req.headers['x-forwarded-proto'])
    || (req && req.protocol)
    || 'http';
  const host = (req && req.headers && req.headers.host)
    ? req.headers.host
    : 'localhost';
  const baseUrl = `${proto}://${host}`;
  const uploadsPrefix = '/uploads/profile-photos/';
  const defaultUrl = `${baseUrl}/public/default_profile_image.png`;

  // Prefer explicit profileImage, fallback to first photo
  let raw = u?.profileImage || (Array.isArray(u?.photos) && u.photos.length > 0 ? u.photos[0] : null);
  if (!raw) return defaultUrl;

  // If already absolute URL
  if (typeof raw === 'string' && (raw.startsWith('http://') || raw.startsWith('https://'))) {
    // Normalize to local filename if it's pointing to uploads or a mobile path, then verify existence
    let filename = raw.substring(raw.lastIndexOf('/') + 1);
    if (raw.includes(uploadsPrefix) || raw.includes('file:///') || filename) {
      const localPath = path.join(process.cwd(), 'uploads', 'profile-photos', filename);
      if (filename && fs.existsSync(localPath)) {
        return `${baseUrl}${uploadsPrefix}${filename}`;
      }
      return defaultUrl;
    }
    // If absolute external URL not under our uploads, return as-is
    return raw;
  }

  // If raw contains uploads path twice or nested, keep only filename after last uploadsPrefix
  if (raw.includes(uploadsPrefix)) {
    raw = raw.substring(raw.lastIndexOf(uploadsPrefix) + uploadsPrefix.length);
  }

  // If raw is a local mobile path like file:///..., keep only the basename
  if (typeof raw === 'string' && raw.includes('file:///')) {
    raw = raw.substring(raw.lastIndexOf('/') + 1);
  }

  // Ensure we only append filename to uploads path
  const filename = String(raw).substring(String(raw).lastIndexOf('/') + 1);
  const localPath = path.join(process.cwd(), 'uploads', 'profile-photos', filename);
  if (filename && fs.existsSync(localPath)) {
    return `${baseUrl}${uploadsPrefix}${filename}`;
  }
  return defaultUrl;
}

// Helpers for absolute portfolio image URLs (array)
function getPortfolioImageUrls(u, req) {
  const photos = Array.isArray(u?.photos) ? u.photos : [];
  return photos.map(p => getProfileImageUrl({ profileImage: p }, req));
}

// Small helper: reduce user to a public card
function toCard(u, req) {
  if (!u) return null;
  return {
    id: u._id,
    name: u.name,
    age: calculateAge(u.birthday),
    currentCity: u.currentCity || null,
    profileType: u.profileType || 'personal',
    distance: u.distance || '2 miles away',
    profileImage: getProfileImageUrl(u, req),
    portfolioImages: getPortfolioImageUrls(u, req)
  };
}

function calculateAge(birthday) {
  if (!birthday) return null;
  const today = new Date();
  const birth = new Date(birthday);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function haversineMiles(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 3958.8; // miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Escape regex special chars for safe dynamic patterns
function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Build query for discovery feed
async function buildFeedQuery(currentUserId) {
  // Exclude: self, already swiped targets (use ObjectIds to match _id type)
  const swiped = await Swipe.find({ swiper: currentUserId }).select('target').lean();
  const excludedIds = [currentUserId, ...swiped.map(s => s.target)].map(v => new mongoose.Types.ObjectId(String(v)));

  // Try to load saved preferences
  const me = await User.findById(currentUserId).select('genderId profileType birthday latitude longitude');
  const prefs = await UserPreference.findOne({ user: currentUserId }).lean();

  const filter = { _id: { $nin: excludedIds } };

  // Profile type
  filter.profileType = prefs?.profileType || 'personal';

  // Gender filter: explicit preferences override fallback
  if (prefs?.showMeGenders && prefs.showMeGenders.length > 0) {
    filter.genderId = { $in: prefs.showMeGenders };
  } else if (me?.genderId) {
    // fallback: anyone except me
    filter.genderId = { $ne: me.genderId };
  }

  // Interests overlap
  if (prefs?.interests && prefs.interests.length > 0) {
    filter.interests = { $in: prefs.interests };
  }

  // Age filter -> convert ages to birthday range
  if (prefs?.minAge != null || prefs?.maxAge != null) {
    const now = new Date();
    const min = prefs.minAge ?? 18;
    const max = prefs.maxAge ?? 99;
    const maxDob = new Date(now.getFullYear() - min, now.getMonth(), now.getDate()); // youngest allowed birthdate
    const minDob = new Date(now.getFullYear() - max - 1, now.getMonth(), now.getDate() + 1); // oldest allowed birthdate
    filter.birthday = { $gte: minDob, $lte: maxDob };
  }

  return { filter, prefs, me };
}

// POST /api/matches/like
router.post('/like', auth, checkSwipeLimit, updateSwipeCount, async (req, res) => {
  try {
    const userId = req.user.id;
    const { targetUserId } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ status: 400, message: 'targetUserId is required', data: null });
    }
    if (userId === targetUserId) {
      return res.status(400).json({ status: 400, message: 'Cannot like yourself', data: null });
    }

    // Validate ObjectId and existence to avoid cast errors
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ status: 400, message: 'Invalid targetUserId', data: null });
    }
    const likeTargetExists = await User.exists({ _id: targetUserId });
    if (!likeTargetExists) {
      return res.status(404).json({ status: 404, message: 'Target user not found', data: null });
    }

    // Upsert swipe
    const swipe = await Swipe.findOneAndUpdate(
      { swiper: userId, target: targetUserId },
      { $set: { action: 'like' } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Increment likes count for swiper (optional UI metric)
    await User.findByIdAndUpdate(userId, { $inc: { likes: 1 } }).lean();

    // Check if target already liked me
    const reciprocal = await Swipe.findOne({ swiper: targetUserId, target: userId, action: { $in: ['like', 'superlike'] } });

    let match = null;
    let isMatch = false;

    if (reciprocal) {
      // Create match if not exists
      const a = userId;
      const b = targetUserId;
      const [user1, user2] = String(a) < String(b) ? [a, b] : [b, a];
      match = await Match.findOneAndUpdate(
        { user1, user2 },
        { $setOnInsert: { isActive: true } },
        { upsert: true, new: true }
      );
      isMatch = true;
      // Increment matches counters
      await User.updateMany({ _id: { $in: [a, b] } }, { $inc: { matches: 1 } }).lean();
      
      // Send push notification to both users about the match
      try {
        const [currentUser, targetUser] = await Promise.all([
          User.findById(userId).select('name deviceToken'),
          User.findById(targetUserId).select('name deviceToken')
        ]);
        
        // Send notification to target user
        if (targetUser && targetUser.deviceToken) {
          await sendNotification(targetUser.deviceToken, {
            title: '🎉 Profile Match!',
            body: `You have a profile match with ${currentUser?.name || 'someone'}. Start chatting now!`,
            data: {
              type: 'match',
              matchId: String(match._id),
              userId: String(userId),
              userName: currentUser?.name || ''
            }
          });
        }
        
        // Send notification to current user
        if (currentUser && currentUser.deviceToken) {
          await sendNotification(currentUser.deviceToken, {
            title: '🎉 Profile Match!',
            body: `You have a profile match with ${targetUser?.name || 'someone'}. Start chatting now!`,
            data: {
              type: 'match',
              matchId: String(match._id),
              userId: String(targetUserId),
              userName: targetUser?.name || ''
            }
          });
        }
      } catch (notifError) {
        console.error('❌ Error sending match notification:', notifError);
        // Don't fail the request if notification fails
      }
    } else {
      // No match yet, but send notification to target user about the like
      try {
        const [currentUser, targetUser] = await Promise.all([
          User.findById(userId).select('name deviceToken'),
          User.findById(targetUserId).select('name deviceToken')
        ]);
        
        if (targetUser && targetUser.deviceToken) {
          await sendNotification(targetUser.deviceToken, {
            title: '💙 New Like!',
            body: `${currentUser?.name || 'Someone'} liked you!`,
            data: {
              type: 'like',
              userId: String(userId),
              userName: currentUser?.name || ''
            }
          });
        }
      } catch (notifError) {
        console.error('❌ Error sending like notification:', notifError);
        // Don't fail the request if notification fails
      }
    }

    return res.status(200).json({
      status: 200,
      message: isMatch ? 'It\'s a match!' : 'Liked successfully',
      data: { swipeId: swipe._id, isMatch, matchId: match?._id || null }
    });
  } catch (err) {
    return res.status(500).json({ status: 500, message: 'Server error', data: err.message || err });
  }
});

// POST /api/matches/dislike
router.post('/dislike', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { targetUserId } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ status: 400, message: 'targetUserId is required', data: null });
    }
    if (userId === targetUserId) {
      return res.status(400).json({ status: 400, message: 'Cannot dislike yourself', data: null });
    }

    // Validate ObjectId and existence to avoid cast errors
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ status: 400, message: 'Invalid targetUserId', data: null });
    }
    const dislikeTargetExists = await User.exists({ _id: targetUserId });
    if (!dislikeTargetExists) {
      return res.status(404).json({ status: 404, message: 'Target user not found', data: null });
    }

    const swipe = await Swipe.findOneAndUpdate(
      { swiper: userId, target: targetUserId },
      { $set: { action: 'dislike' } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({ status: 200, message: 'Disliked successfully', data: { swipeId: swipe._id } });
  } catch (err) {
    return res.status(500).json({ status: 500, message: 'Server error', data: err.message || err });
  }
});

// POST /api/matches/superlike
router.post('/superlike', auth, checkSwipeLimit, updateSwipeCount, async (req, res) => {
  try {
    const userId = req.user.id;
    const { targetUserId } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ status: 400, message: 'targetUserId is required', data: null });
    }
    if (userId === targetUserId) {
      return res.status(400).json({ status: 400, message: 'Cannot superlike yourself', data: null });
    }

    // Validate ObjectId and existence to avoid cast errors
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ status: 400, message: 'Invalid targetUserId', data: null });
    }
    const superlikeTargetExists = await User.exists({ _id: targetUserId });
    if (!superlikeTargetExists) {
      return res.status(404).json({ status: 404, message: 'Target user not found', data: null });
    }

    // Upsert swipe with action 'superlike'
    const swipe = await Swipe.findOneAndUpdate(
      { swiper: userId, target: targetUserId },
      { $set: { action: 'superlike' } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Increment superLikes count for swiper (optional UI metric)
    await User.findByIdAndUpdate(userId, { $inc: { superLikes: 1 } }).lean();

    // Check if target already liked or superliked me
    const reciprocal = await Swipe.findOne({ swiper: targetUserId, target: userId, action: { $in: ['like', 'superlike'] } });

    let match = null;
    let isMatch = false;

    if (reciprocal) {
      // Create match if not exists
      const a = userId;
      const b = targetUserId;
      const [user1, user2] = String(a) < String(b) ? [a, b] : [b, a];
      match = await Match.findOneAndUpdate(
        { user1, user2 },
        { $setOnInsert: { isActive: true } },
        { upsert: true, new: true }
      );
      isMatch = true;
      // Increment matches counters
      await User.updateMany({ _id: { $in: [a, b] } }, { $inc: { matches: 1 } }).lean();
      
      // Send push notification to both users about the match
      try {
        const [currentUser, targetUser] = await Promise.all([
          User.findById(userId).select('name deviceToken'),
          User.findById(targetUserId).select('name deviceToken')
        ]);
        
        // Send notification to target user
        if (targetUser && targetUser.deviceToken) {
          await sendNotification(targetUser.deviceToken, {
            title: '🎉 Profile Match!',
            body: `You have a profile match with ${currentUser?.name || 'someone'}. Start chatting now!`,
            data: {
              type: 'match',
              matchId: String(match._id),
              userId: String(userId),
              userName: currentUser?.name || ''
            }
          });
        }
        
        // Send notification to current user
        if (currentUser && currentUser.deviceToken) {
          await sendNotification(currentUser.deviceToken, {
            title: '🎉 Profile Match!',
            body: `You have a profile match with ${targetUser?.name || 'someone'}. Start chatting now!`,
            data: {
              type: 'match',
              matchId: String(match._id),
              userId: String(targetUserId),
              userName: targetUser?.name || ''
            }
          });
        }
      } catch (notifError) {
        console.error('❌ Error sending match notification:', notifError);
        // Don't fail the request if notification fails
      }
    } else {
      // No match yet, but send notification to target user about the superlike
      try {
        const [currentUser, targetUser] = await Promise.all([
          User.findById(userId).select('name deviceToken'),
          User.findById(targetUserId).select('name deviceToken')
        ]);
        
        if (targetUser && targetUser.deviceToken) {
          await sendNotification(targetUser.deviceToken, {
            title: '⭐ Super Like!',
            body: `${currentUser?.name || 'Someone'} super liked you!`,
            data: {
              type: 'superlike',
              userId: String(userId),
              userName: currentUser?.name || ''
            }
          });
        }
      } catch (notifError) {
        console.error('❌ Error sending superlike notification:', notifError);
        // Don't fail the request if notification fails
      }
    }

    return res.status(200).json({
      status: 200,
      message: isMatch ? "It's a match!" : 'Superliked successfully',
      data: { swipeId: swipe._id, isMatch, matchId: match?._id || null }
    });
  } catch (err) {
    return res.status(500).json({ status: 500, message: 'Server error', data: err.message || err });
  }
});


// GET /api/matches/feed
router.get('/feed', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const { filter, prefs, me } = await buildFeedQuery(userId);

    const users = await User.find(filter)
      .select('name currentCity profileType distance profileImage photos createdAt birthday latitude longitude')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit) * 3);

    // Apply distance filtering if coordinates and preference available
    let filtered = users;
    if (prefs?.maxDistance && me?.latitude != null && me?.longitude != null) {
      filtered = users.filter(u => (
        u.latitude != null && u.longitude != null &&
        haversineMiles(me.latitude, me.longitude, u.latitude, u.longitude) <= prefs.maxDistance
      ));
    }

    const data = filtered.slice(0, Number(limit)).map(u => toCard(u, req));
    return res.status(200).json({ status: 200, message: 'Feed fetched', data });
  } catch (err) {
    return res.status(500).json({ status: 500, message: 'Server error', data: err.message || err });
  }
});

// GET current user preferences (with sensible defaults if not set)
router.get('/preferences', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    let prefs = await UserPreference.findOne({ user: userId })
      .populate('showMeGenders', 'name')
      .populate('interests', 'name')
      .lean();

    if (!prefs) {
      const me = await User.findById(userId).select('genderId profileType');
      const genders = await Gender.find({ isActive: true }).select('_id').lean();
      const showMeGenders = genders
        .map(g => g._id)
        .filter(id => !me?.genderId || String(id) !== String(me.genderId));
      prefs = {
        user: userId,
        profileType: me?.profileType || 'personal',
        showMeGenders,
        minAge: 18,
        maxAge: 99,
        maxDistance: 100,
        interests: []
      };
    }

    return res.status(200).json({ status: 200, message: 'Preferences fetched', data: prefs });
  } catch (err) {
    return res.status(500).json({ status: 500, message: 'Server error', data: err.message || err });
  }
});

// PUT upsert preferences
router.put('/preferences', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { profileType, showMeGenders, minAge, maxAge, maxDistance, interests } = req.body;

    const update = {};
    if (profileType !== undefined) update.profileType = profileType;
    if (Array.isArray(showMeGenders)) update.showMeGenders = showMeGenders;
    if (minAge !== undefined) update.minAge = Number(minAge);
    if (maxAge !== undefined) update.maxAge = Number(maxAge);
    if (maxDistance !== undefined) update.maxDistance = Number(maxDistance);
    if (Array.isArray(interests)) update.interests = interests;

    const prefs = await UserPreference.findOneAndUpdate(
      { user: userId },
      { $set: update, $setOnInsert: { user: userId } },
      { upsert: true, new: true }
    );

    return res.status(200).json({ status: 200, message: 'Preferences saved', data: prefs });
  } catch (err) {
    return res.status(500).json({ status: 500, message: 'Server error', data: err.message || err });
  }
});

// Users list strictly based on saved preferences (home screen)
router.get('/preference/users', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    // Optional query overrides to align with filter UI
    const {
      profileType,
      minAge,
      maxAge,
      maxDistance,
      premiumOnly,
      genderIds,                 // comma-separated ids
      interests,                 // comma-separated ids
      loveLanguageIds,           // comma-separated ids
      zodiacSigns,               // comma-separated strings
      workIds,                   // comma-separated ids
      orientationIds,            // comma-separated ids
      communicationStyleIds      // comma-separated ids
    } = req.query;

    const { filter, prefs, me } = await buildFeedQuery(userId);

    // Auto-deactivate expired boosts (batch update)
    const now = new Date();
    try {
      await User.updateMany(
        {
          isBoostActive: true,
          boostEndTime: { $exists: true, $lt: now }
        },
        {
          $set: {
            isBoostActive: false,
            boostStartTime: null,
            boostEndTime: null
          }
        }
      );
    } catch (updateError) {
      console.error('Error deactivating expired boosts:', updateError);
      // Continue even if update fails
    }

    // Ensure we still exclude already-swiped and self
    const swiped = await Swipe.find({ swiper: userId }).select('target').lean();
    // Also exclude users who have disliked me
    const dislikedMe = await Swipe.find({ target: userId, action: 'dislike' }).select('swiper').lean();
    const exclude = new Set([
      String(userId),
      ...swiped.map(s => String(s.target)),
      ...dislikedMe.map(s => String(s.swiper))
    ]);
    filter._id = { $nin: Array.from(exclude) };

    // Apply query overrides onto base filter (from saved preferences)
    if (profileType) {
      filter.profileType = { $regex: new RegExp(`^${escapeRegex(profileType)}$`, 'i') };
    }

    // Age override -> convert ages to birthday range
    if (minAge != null || maxAge != null) {
      const now = new Date();
      const minA = minAge != null ? Number(minAge) : 18;
      const maxA = maxAge != null ? Number(maxAge) : 99;
      const maxDob = new Date(now.getFullYear() - minA, now.getMonth(), now.getDate());
      const minDob = new Date(now.getFullYear() - maxA - 1, now.getMonth(), now.getDate() + 1);
      filter.birthday = { $gte: minDob, $lte: maxDob };
    }

    // Gender override
    if (genderIds) {
      const set = String(genderIds).split(',').filter(Boolean);
      if (set.length) filter.genderId = { $in: set };
    }

    // Interests override (any overlap)
    if (interests) {
      const set = String(interests).split(',').filter(Boolean);
      if (set.length) filter.interests = { $in: set };
    }

    // Love language override
    if (loveLanguageIds) {
      const set = String(loveLanguageIds).split(',').filter(Boolean);
      if (set.length) filter.loveLanguage = { $in: set };
    }

    // Zodiac sign override (case-insensitive)
    if (zodiacSigns) {
      const set = String(zodiacSigns).split(',').filter(Boolean);
      if (set.length) {
        const patterns = set.map(v => new RegExp(`^${escapeRegex(v)}$`, 'i'));
        filter.zodiacSign = { $in: patterns };
      }
    }

    // Work override
    if (workIds) {
      const set = String(workIds).split(',').filter(Boolean);
      if (set.length) filter.workId = { $in: set };
    }

    // Orientation override
    if (orientationIds) {
      const set = String(orientationIds).split(',').filter(Boolean);
      if (set.length) filter.orientation = { $in: set };
    }

    // Communication style override
    if (communicationStyleIds) {
      const set = String(communicationStyleIds).split(',').filter(Boolean);
      if (set.length) filter.communicationStyle = { $in: set };
    }

    // Premium-only switch
    if (premiumOnly === '1' || premiumOnly === 'true' || premiumOnly === true) {
      filter.isPremium = true;
    }

    const users = await User.find(filter)
      .collation({ locale: 'en', strength: 2 })
      .select('name currentCity profileType distance profileImage photos createdAt birthday latitude longitude isPremium zodiacSign loveLanguage orientation communicationStyle workId interests genderId isBoostActive boostEndTime')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit) * 3);

    // For flags: who liked me and whom I liked (likes/superlikes)
    const [likesTowardMe, likesISent] = await Promise.all([
      Swipe.find({ target: userId, action: { $in: ['like', 'superlike'] } }).select('swiper').lean(),
      Swipe.find({ swiper: userId, action: { $in: ['like', 'superlike'] } }).select('target').lean(),
    ]);
    const likedMeSet = new Set(likesTowardMe.map(x => String(x.swiper)));
    const iLikedSet = new Set(likesISent.map(x => String(x.target)));

    let filtered = users;
    // Distance check: query override has priority over prefs
    const effectiveMaxDistance = (maxDistance != null && String(maxDistance).length)
      ? Number(maxDistance)
      : (prefs?.maxDistance || null);
    if (effectiveMaxDistance && me?.latitude != null && me?.longitude != null) {
      filtered = users.filter(u => (
        u.latitude != null && u.longitude != null &&
        haversineMiles(me.latitude, me.longitude, u.latitude, u.longitude) <= effectiveMaxDistance
      ));
    }

    // Separate boosted and non-boosted users
    const boostedUsers = [];
    const regularUsers = [];
    
    // Collect expired boost user IDs and separate boosted/regular users
    const expiredBoostUserIds = [];
    
    filtered.forEach(u => {
      // Check if boost is expired
      if (u.isBoostActive && u.boostEndTime && new Date(u.boostEndTime) <= now) {
        // Mark as expired for batch update
        expiredBoostUserIds.push(u._id);
        // Update local object for current response
        u.isBoostActive = false;
        u.boostStartTime = null;
        u.boostEndTime = null;
      }
      
      // Check if boost is active and not expired
      const isBoosted = u.isBoostActive && u.boostEndTime && new Date(u.boostEndTime) > now;
      
      if (isBoosted) {
        boostedUsers.push(u);
      } else {
        regularUsers.push(u);
      }
    });
    
    // Batch update expired boosts in database (async, don't wait)
    if (expiredBoostUserIds.length > 0) {
      User.updateMany(
        { _id: { $in: expiredBoostUserIds } },
        {
          $set: {
            isBoostActive: false,
            boostStartTime: null,
            boostEndTime: null
          }
        }
      ).catch(err => console.error('Error batch updating expired boosts:', err));
    }
    
    // Combine: boosted users first, then regular users
    const sortedUsers = [...boostedUsers, ...regularUsers];

    const data = sortedUsers.slice(0, Number(limit)).map(u => {
      const isBoosted = u.isBoostActive && u.boostEndTime && new Date(u.boostEndTime) > now;
      return {
      ...toCard(u, req),
      isLike: iLikedSet.has(String(u._id)) ? 1 : 0,
        isBoosted: isBoosted,
        boostEndTime: isBoosted ? u.boostEndTime : null
      };
    });
    
    return res.status(200).json({ status: 200, message: 'Preference users fetched', data });
  } catch (err) {
    return res.status(500).json({ status: 500, message: 'Server error', data: err.message || err });
  }
});

// GET /api/matches/user/:id - view full profile with absolute image URLs
router.get('/user/:id', auth, async (req, res) => {
  try {
    const userId = req.params.id;
    if (!userId) {
      return res.status(400).json({ status: 400, message: 'User ID is required', data: null });
    }

    const user = await User.findById(userId)
      .populate('interests', 'name')
      .populate('communicationStyle', 'name')
      .populate('loveLanguage', 'name')
      .populate('orientation', 'name')
      .populate('genderId', 'name')
      .populate('workId', 'name')
      .select('-password -__v');

    if (!user) {
      return res.status(404).json({ status: 404, message: 'User not found', data: null });
    }

    const profileImage = getProfileImageUrl(user, req);
    const photos = Array.isArray(user.photos)
      ? user.photos.map(p => getProfileImageUrl({ profileImage: p }, req))
      : [];

    const data = {
      id: user._id,
      name: user.name,
      age: calculateAge(user.birthday),
      work: user.workId ? { id: user.workId._id, name: user.workId.name } : null,
      currentCity: user.currentCity,
      homeTown: user.homeTown,
      latitude: user.latitude ?? null,
      longitude: user.longitude ?? null,
      pronounce: user.pronounce,
      gender: user.genderId ? { id: user.genderId._id, name: user.genderId.name } : null,
      orientation: user.orientation ? { id: user.orientation._id, name: user.orientation.name } : null,
      interests: user.interests?.map(i => ({ id: i._id, name: i.name })) || [],
      communicationStyle: user.communicationStyle ? { id: user.communicationStyle._id, name: user.communicationStyle.name } : null,
      loveLanguage: user.loveLanguage ? { id: user.loveLanguage._id, name: user.loveLanguage.name } : null,
      icebreakerPrompts: user.icebreakerPrompts,
      role: user.role,
      profileType: user.profileType,
      isPremium: user.isPremium,
      verificationStatus: user.verificationStatus,
      profileImage,
      photos,
      profileViews: user.profileViews,
      matches: user.matches,
      likes: user.likes,
      superLikes: user.superLikes
    };

    return res.status(200).json({ status: 200, message: 'User profile fetched', data });
  } catch (err) {
    return res.status(500).json({ status: 500, message: 'Server error', data: err.message || err });
  }
});

// GET /api/matches/likes/received
router.get('/likes/received', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, profileType, maxDistance, genderIds, minAge, maxAge, interests } = req.query;

    const pipeline = [
      { $match: { target: new mongoose.Types.ObjectId(userId), action: { $in: ['like', 'superlike'] } } },
      { $lookup: { from: 'users', localField: 'swiper', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { _id: 0, user: { _id: '$user._id', name: '$user.name', currentCity: '$user.currentCity', profileType: '$user.profileType', distance: '$user.distance', profileImage: '$user.profileImage', photos: '$user.photos', genderId: '$user.genderId', birthday: '$user.birthday', latitude: '$user.latitude', longitude: '$user.longitude', interests: '$user.interests' }, createdAt: 1 } },
      { $sort: { createdAt: -1 } },
      { $skip: (Number(page) - 1) * Number(limit) },
      { $limit: Number(limit) }
    ];

    let results = await Swipe.aggregate(pipeline);

    // Optional filtering on returned users
    const me = await User.findById(userId).select('latitude longitude');
    const genderSet = genderIds ? new Set(String(genderIds).split(',').filter(Boolean)) : null;
    const interestSet = interests ? new Set(String(interests).split(',').filter(Boolean)) : null;

    const now = new Date();
    const minA = minAge != null ? Number(minAge) : null;
    const maxA = maxAge != null ? Number(maxAge) : null;
    const maxMiles = maxDistance != null ? Number(maxDistance) : null;

    const filtered = [];
    for (const r of results) {
      const u = r.user;
      if (profileType && u.profileType !== profileType) continue;
      if (genderSet && !genderSet.has(String(u.genderId || ''))) continue;
      if (minA != null || maxA != null) {
        const age = calculateAge(u.birthday);
        if (minA != null && (age == null || age < minA)) continue;
        if (maxA != null && (age == null || age > maxA)) continue;
      }
      if (maxMiles != null && me?.latitude != null && me?.longitude != null && u.latitude != null && u.longitude != null) {
        const miles = haversineMiles(me.latitude, me.longitude, u.latitude, u.longitude);
        if (miles > maxMiles) continue;
      }
      if (interestSet) {
        const ui = (u.interests || []).map(x => String(x));
        if (!ui.some(id => interestSet.has(id))) continue;
      }
      filtered.push(toCard(u, req));
    }
    const data = filtered;
    return res.status(200).json({ status: 200, message: 'Likes received fetched', data });
  } catch (err) {
    return res.status(500).json({ status: 500, message: 'Server error', data: err.message || err });
  }
});

// GET /api/matches/likes/sent
router.get('/likes/sent', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, profileType, maxDistance, genderIds, minAge, maxAge, interests } = req.query;

    const pipeline = [
      { $match: { swiper: new mongoose.Types.ObjectId(userId), action: { $in: ['like', 'superlike'] } } },
      { $lookup: { from: 'users', localField: 'target', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { _id: 0, user: { _id: '$user._id', name: '$user.name', currentCity: '$user.currentCity', profileType: '$user.profileType', distance: '$user.distance', profileImage: '$user.profileImage', photos: '$user.photos', genderId: '$user.genderId', birthday: '$user.birthday', latitude: '$user.latitude', longitude: '$user.longitude', interests: '$user.interests' }, createdAt: 1 } },
      { $sort: { createdAt: -1 } },
      { $skip: (Number(page) - 1) * Number(limit) },
      { $limit: Number(limit) }
    ];

    let results = await Swipe.aggregate(pipeline);
    const me = await User.findById(userId).select('latitude longitude');
    const genderSet = genderIds ? new Set(String(genderIds).split(',').filter(Boolean)) : null;
    const interestSet = interests ? new Set(String(interests).split(',').filter(Boolean)) : null;
    const minA = minAge != null ? Number(minAge) : null;
    const maxA = maxAge != null ? Number(maxAge) : null;
    const maxMiles = maxDistance != null ? Number(maxDistance) : null;

    const filtered = [];
    for (const r of results) {
      const u = r.user;
      if (profileType && u.profileType !== profileType) continue;
      if (genderSet && !genderSet.has(String(u.genderId || ''))) continue;
      if (minA != null || maxA != null) {
        const age = calculateAge(u.birthday);
        if (minA != null && (age == null || age < minA)) continue;
        if (maxA != null && (age == null || age > maxA)) continue;
      }
      if (maxMiles != null && me?.latitude != null && me?.longitude != null && u.latitude != null && u.longitude != null) {
        const miles = haversineMiles(me.latitude, me.longitude, u.latitude, u.longitude);
        if (miles > maxMiles) continue;
      }
      if (interestSet) {
        const ui = (u.interests || []).map(x => String(x));
        if (!ui.some(id => interestSet.has(id))) continue;
      }
      filtered.push(toCard(u, req));
    }
    const data = filtered;
    return res.status(200).json({ status: 200, message: 'Likes sent fetched', data });
  } catch (err) {
    return res.status(500).json({ status: 500, message: 'Server error', data: err.message || err });
  }
});

// GET /api/matches
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, profileType, maxDistance, genderIds, minAge, maxAge, interests } = req.query;

    const matches = await Match.find({ $or: [{ user1: userId }, { user2: userId }], isActive: true })
      .sort({ updatedAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate('user1', 'name currentCity profileType distance profileImage photos genderId birthday latitude longitude interests')
      .populate('user2', 'name currentCity profileType distance profileImage photos genderId birthday latitude longitude interests');

    const me = await User.findById(userId).select('latitude longitude');
    const genderSet = genderIds ? new Set(String(genderIds).split(',').filter(Boolean)) : null;
    const interestSet = interests ? new Set(String(interests).split(',').filter(Boolean)) : null;
    const minA = minAge != null ? Number(minAge) : null;
    const maxA = maxAge != null ? Number(maxAge) : null;
    const maxMiles = maxDistance != null ? Number(maxDistance) : null;

    const data = matches.map(m => {
      const other = String(m.user1._id) === String(userId) ? m.user2 : m.user1;
      // Apply optional filters
      if (profileType && other.profileType !== profileType) return null;
      if (genderSet && !genderSet.has(String(other.genderId || ''))) return null;
      if (minA != null || maxA != null) {
        const age = calculateAge(other.birthday);
        if (minA != null && (age == null || age < minA)) return null;
        if (maxA != null && (age == null || age > maxA)) return null;
      }
      if (maxMiles != null && me?.latitude != null && me?.longitude != null && other.latitude != null && other.longitude != null) {
        const miles = haversineMiles(me.latitude, me.longitude, other.latitude, other.longitude);
        if (miles > maxMiles) return null;
      }
      if (interestSet) {
        const ui = (other.interests || []).map(x => String(x));
        if (!ui.some(id => interestSet.has(id))) return null;
      }
      // Return same shape as preference card; include isLike:1
      const card = toCard(other, req);
      return { ...card, isLike: 1 };
    }).filter(Boolean);

    return res.status(200).json({ status: 200, message: 'Matches fetched', data });
  } catch (err) {
    return res.status(500).json({ status: 500, message: 'Server error', data: err.message || err });
  }
});

module.exports = router;
