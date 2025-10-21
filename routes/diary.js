const express = require('express');
const router = express.Router();
const DiaryEntry = require('../models/DiaryEntry');
const Activity = require('../models/Activity');
const User = require('../models/User');
const auth = require('../middlewares/auth');

// Helpers
function isValidObjectId(id) {
  return /^[a-f\d]{24}$/i.test(String(id));
}

function parseBoolean(val) {
  if (val === undefined) return undefined;
  if (typeof val === 'boolean') return val;
  const s = String(val).toLowerCase();
  if (['true', '1', 'yes'].includes(s)) return true;
  if (['false', '0', 'no'].includes(s)) return false;
  return undefined;
}

// Map activity codes to display labels
const ACTIVITY_LABELS = {
  coffee_date: 'Coffee Date',
  dinner: 'Dinner',
  phone_call: 'Call',
  video_call: 'Video Call',
  messaging: 'Messaging',
  other_activity: 'Other'
};

function activityLabel(code) {
  return ACTIVITY_LABELS[code] || code;
}

// Reverse map from label to code
const LABEL_TO_ACTIVITY = Object.fromEntries(Object.entries(ACTIVITY_LABELS).map(([k,v]) => [v.toLowerCase(), k]));
function normalizeActivity(input) {
  if (!input) return null;
  const s = String(input).trim();
  // if already a known code, return it
  if (ACTIVITY_LABELS[s]) return s;
  // try lowercase label mapping
  const byLabel = LABEL_TO_ACTIVITY[s.toLowerCase()];
  return byLabel || null;
}

// Format date as 'Jun 15, 2024'
function formatDisplayDate(d) {
  if (!d) return null;
  const dt = new Date(d);
  if (isNaN(dt)) return null;
  const month = dt.toLocaleString('en-US', { month: 'short' });
  const day = String(dt.getDate());
  const year = dt.getFullYear();
  return `${month} ${day}, ${year}`;
}

// Serialize a diary entry for client
function buildFileUrl(req, filePath) {
  if (!filePath) return '';
  const s = String(filePath);
  if (/^https?:\/\//i.test(s)) return s; // already absolute
  // ensure single uploads prefix
  const cleaned = s.replace(/^\/+/, '').replace(/^uploads\//i, '');
  return `${req.protocol}://${req.get('host')}/uploads/${cleaned}`;
}

// Ensure diary photo URLs resolve to /uploads/diary/<filename>
function buildDiaryFileUrl(req, filePath) {
  if (!filePath) return '';
  const s = String(filePath);
  if (/^https?:\/\//i.test(s)) return s; // already absolute
  // Normalize by removing any leading slashes and existing prefixes
  const cleaned = s
    .replace(/^\/+/, '')
    .replace(/^uploads\/diary\//i, '')
    .replace(/^uploads\//i, '')
    .replace(/^diary\//i, '');
  return `${req.protocol}://${req.get('host')}/uploads/diary/${cleaned}`;
}

// Ensure profile image URLs resolve to /uploads/profile-photos/<filename>
function buildProfileFileUrl(req, filePath) {
  if (!filePath) return '';
  const s = String(filePath);
  if (/^https?:\/\//i.test(s)) return s; // already absolute
  const cleaned = s
    .replace(/^\/+/, '')
    .replace(/^uploads\/profile-photos\//i, '')
    .replace(/^uploads\//i, '')
    .replace(/^profile-photos\//i, '');
  return `${req.protocol}://${req.get('host')}/uploads/profile-photos/${cleaned}`;
}

function serializeEntry(req, doc) {
  return {
    id: doc._id,
    activity: activityLabel(doc.activity),
    activityCode: doc.activity,
    mood: doc.mood,
    notes: doc.notes,
    location: doc.location,
    photos: Array.isArray(doc.photos) ? doc.photos.map(p => buildDiaryFileUrl(req, p)) : [],
    isImportant: doc.isImportant,
    happenedAt: formatDisplayDate(doc.happenedAt || doc.createdAt),
    aboutUser: doc.aboutUser ? {
      id: doc.aboutUser._id,
      name: doc.aboutUser.name,
      email: doc.aboutUser.email,
      profileImage: buildProfileFileUrl(req, doc.aboutUser.profileImage),
      profileType: doc.aboutUser.profileType
    } : null
  };
}

// Protect all diary routes
router.use(auth);

// Get list of available activities
router.get('/activities', async (req, res) => {
  try {
    // Try reading from collection first
    let items = await Activity.find({ isActive: true }).sort({ sortOrder: 1, label: 1 }).lean();

    // If empty, seed from ACTIVITY_LABELS and return
    if (!items || items.length === 0) {
      const defaults = Object.entries(ACTIVITY_LABELS).map(([code, label], idx) => ({ code, label, sortOrder: idx }));
      try {
        await Activity.insertMany(defaults, { ordered: true });
      } catch (_) { /* ignore races */ }
      items = await Activity.find({ isActive: true }).sort({ sortOrder: 1, label: 1 }).lean();
    }

    const data = items.map(it => ({ code: it.code, label: it.label }));
    return res.status(200).json({ status: 200, message: 'Activities fetched', data });
  } catch (error) {
    return res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

// Create a diary entry
router.post('/', async (req, res) => {
  try {
    const {
      aboutUserId,
      aboutUser, // allow client to send aboutUser directly as id
      activity,
      mood,
      notes,
      location,
      photos = [],
      isImportant = false,
      happenedAt
    } = req.body;

    const activityCode = normalizeActivity(activity);
    if (!activityCode || !DiaryEntry.schema.path('activity').enumValues.includes(activityCode)) {
      return res.status(400).json({ status: 400, message: 'activity is required and must be one of: ' + DiaryEntry.schema.path('activity').enumValues.join(', ') + ' (codes or labels accepted)', data: null });
    }
    if (!mood || !DiaryEntry.schema.path('mood').enumValues.includes(mood)) {
      return res.status(400).json({ status: 400, message: 'mood is required and must be one of: ' + DiaryEntry.schema.path('mood').enumValues.join(', '), data: null });
    }
    if (!notes || !String(notes).trim()) {
      return res.status(400).json({ status: 400, message: 'notes is required', data: null });
    }
    const resolvedAboutUserId = aboutUserId || aboutUser;
    if (resolvedAboutUserId && !isValidObjectId(resolvedAboutUserId)) {
      return res.status(400).json({ status: 400, message: 'aboutUserId must be a valid ObjectId', data: null });
    }
    if (resolvedAboutUserId) {
      const exists = await User.findById(resolvedAboutUserId).select('_id');
      if (!exists) {
        return res.status(404).json({ status: 404, message: 'aboutUser not found', data: null });
      }
    }

    const entry = new DiaryEntry({
      user: req.user.id,
      aboutUser: resolvedAboutUserId || null,
      activity: activityCode,
      mood,
      notes: String(notes).trim(),
      location: location ? String(location).trim() : '',
      photos: Array.isArray(photos) ? photos : [],
      isImportant: Boolean(isImportant),
      happenedAt: happenedAt ? new Date(happenedAt) : undefined
    });

    await entry.save();
    // Populate aboutUser for response
    const populated = await DiaryEntry.findById(entry._id).populate('aboutUser', 'name email profileImage profileType');
    return res.status(200).json({ status: 200, message: 'Diary entry created', data: serializeEntry(req, populated) });
  } catch (error) {
    return res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

// List diary entries with filters and pagination
router.get('/', async (req, res) => {
  try {
    const {
      q,
      activity,
      mood,
      important,
      aboutUserId,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sort = 'recent',
      includeSummary = 'true'
    } = req.query;

    const filter = { user: req.user.id };
    if (q) filter.$text = { $search: String(q).trim() };
    if (activity) filter.activity = activity;
    if (mood) filter.mood = mood;
    const imp = parseBoolean(important);
    if (imp !== undefined) filter.isImportant = imp;
    if (aboutUserId && isValidObjectId(aboutUserId)) filter.aboutUser = aboutUserId;
    if (startDate || endDate) {
      filter.happenedAt = {};
      if (startDate) filter.happenedAt.$gte = new Date(startDate);
      if (endDate) filter.happenedAt.$lte = new Date(endDate);
    }

    const sortObj = sort === 'recent' ? { happenedAt: -1, createdAt: -1 } : { happenedAt: 1, createdAt: 1 };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [items, totalCount, summaryAgg] = await Promise.all([
      DiaryEntry.find(filter)
        .populate('aboutUser', 'name email profileImage profileType')
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(limit)),
      DiaryEntry.countDocuments(filter),
      includeSummary === 'true'
        ? DiaryEntry.aggregate([
            { $match: { user: new (require('mongoose')).Types.ObjectId(req.user.id) } },
            { $group: {
                _id: null,
                totalEntries: { $sum: 1 },
                importantCount: { $sum: { $cond: ['$isImportant', 1, 0] } },
                peopleSet: { $addToSet: '$aboutUser' }
            }}
          ])
        : Promise.resolve([])
    ]);

    const pagination = {
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalCount / parseInt(limit)),
      totalCount,
      hasNext: skip + items.length < totalCount,
      hasPrev: parseInt(page) > 1
    };

    const data = { entries: items.map(doc => serializeEntry(req, doc)), pagination };
    if (includeSummary === 'true') {
      const summaryDoc = summaryAgg[0] || { totalEntries: 0, importantCount: 0, peopleSet: [] };
      data.summary = {
        totalEntries: summaryDoc.totalEntries || 0,
        important: summaryDoc.importantCount || 0,
        people: (summaryDoc.peopleSet || []).filter(Boolean).length
      };
    }

    return res.status(200).json({ status: 200, message: 'Diary entries fetched', data });
  } catch (error) {
    return res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

// Get single entry
router.get('/:id', async (req, res) => {
  try {
    const item = await DiaryEntry.findOne({ _id: req.params.id, user: req.user.id }).populate('aboutUser', 'name email profileImage profileType');
    if (!item) return res.status(404).json({ status: 404, message: 'Diary entry not found', data: null });
    return res.status(200).json({ status: 200, message: 'Diary entry fetched', data: serializeEntry(req, item) });
  } catch (error) {
    return res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

// Update entry
router.put('/:id', async (req, res) => {
  try {
    const allowed = ['aboutUserId','activity','mood','notes','location','photos','isImportant','happenedAt'];
    const updates = {};

    if (req.body.aboutUserId !== undefined) {
      if (req.body.aboutUserId && !isValidObjectId(req.body.aboutUserId)) {
        return res.status(400).json({ status: 400, message: 'aboutUserId must be a valid ObjectId', data: null });
      }
      if (req.body.aboutUserId) {
        const exists = await User.findById(req.body.aboutUserId).select('_id');
        if (!exists) return res.status(404).json({ status: 404, message: 'aboutUser not found', data: null });
      }
      updates.aboutUser = req.body.aboutUserId || null;
    }
    if (req.body.aboutUser !== undefined && updates.aboutUser === undefined) {
      if (req.body.aboutUser && !isValidObjectId(req.body.aboutUser)) {
        return res.status(400).json({ status: 400, message: 'aboutUser must be a valid ObjectId', data: null });
      }
      if (req.body.aboutUser) {
        const exists = await User.findById(req.body.aboutUser).select('_id');
        if (!exists) return res.status(404).json({ status: 404, message: 'aboutUser not found', data: null });
      }
      updates.aboutUser = req.body.aboutUser || null;
    }
    if (req.body.activity !== undefined) {
      const code = normalizeActivity(req.body.activity);
      if (!code || !DiaryEntry.schema.path('activity').enumValues.includes(code)) {
        return res.status(400).json({ status: 400, message: 'Invalid activity', data: null });
      }
      updates.activity = code;
    }
    if (req.body.mood !== undefined) {
      if (!DiaryEntry.schema.path('mood').enumValues.includes(req.body.mood)) {
        return res.status(400).json({ status: 400, message: 'Invalid mood', data: null });
      }
      updates.mood = req.body.mood;
    }
    if (req.body.notes !== undefined) {
      if (!String(req.body.notes).trim()) {
        return res.status(400).json({ status: 400, message: 'notes cannot be empty', data: null });
      }
      updates.notes = String(req.body.notes).trim();
    }
    if (req.body.location !== undefined) updates.location = String(req.body.location || '').trim();
    if (req.body.photos !== undefined) updates.photos = Array.isArray(req.body.photos) ? req.body.photos : [];
    if (req.body.isImportant !== undefined) updates.isImportant = Boolean(req.body.isImportant);
    if (req.body.happenedAt !== undefined) {
      const d = new Date(req.body.happenedAt);
      if (isNaN(d)) return res.status(400).json({ status: 400, message: 'happenedAt must be a valid date', data: null });
      updates.happenedAt = d;
    }

    const item = await DiaryEntry.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, updates, { new: true, runValidators: true })
      .populate('aboutUser', 'name email profileImage profileType');
    if (!item) return res.status(404).json({ status: 404, message: 'Diary entry not found', data: null });

    return res.status(200).json({ status: 200, message: 'Diary entry updated', data: serializeEntry(req, item) });
  } catch (error) {
    return res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

// Delete entry
router.delete('/:id', async (req, res) => {
  try {
    const del = await DiaryEntry.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!del) return res.status(404).json({ status: 404, message: 'Diary entry not found', data: null });
    return res.status(200).json({ status: 200, message: 'Diary entry deleted', data: del });
  } catch (error) {
    return res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

module.exports = router;
