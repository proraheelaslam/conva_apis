const express = require('express');
const router = express.Router();
const TermsAndConditions = require('../models/TermsAndConditions');

// Helper to format date as 'january 2025'
function formatMonthYear(d) {
  if (!d) return null;
  const dt = new Date(d);
  if (isNaN(dt)) return null;
  const month = dt.toLocaleString('en-US', { month: 'long' }).toLowerCase();
  const year = dt.getFullYear();
  return `${month} ${year}`;
}

// POST /api/terms-and-conditions - create
router.post('/', async (req, res) => {
  try {
    const { title, content, lastUpdated } = req.body;
    if (!title || !String(title).trim()) {
      return res.status(400).json({ status: 400, message: 'title is required', data: null });
    }
    if (!content || !String(content).trim()) {
      return res.status(400).json({ status: 400, message: 'content is required', data: null });
    }

    const payload = { title: String(title).trim(), content: String(content) };
    if (lastUpdated) payload.lastUpdated = new Date(lastUpdated);

    const doc = new TermsAndConditions(payload);
    await doc.save();

    const data = { id: doc._id, title: doc.title, content: doc.content, last_update: formatMonthYear(doc.lastUpdated) };
    return res.status(200).json({ status: 200, message: 'Terms and conditions created', data });
  } catch (error) {
    return res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

// GET /api/terms-and-conditions - list all (latest first)
router.get('/', async (req, res) => {
  try {
    const items = await TermsAndConditions.find({}).sort({ lastUpdated: -1, createdAt: -1 });
    const data = items.map(doc => ({ id: doc._id, title: doc.title, content: doc.content, last_update: formatMonthYear(doc.lastUpdated) }));
    return res.status(200).json({ status: 200, message: 'Terms and conditions fetched', data });
  } catch (error) {
    return res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

// PUT /api/terms-and-conditions/:id - update
router.put('/:id', async (req, res) => {
  try {
    const { title, content, lastUpdated } = req.body;
    const updates = {};
    if (title !== undefined) {
      if (!String(title).trim()) {
        return res.status(400).json({ status: 400, message: 'title cannot be empty', data: null });
      }
      updates.title = String(title).trim();
    }
    if (content !== undefined) {
      if (!String(content).trim()) {
        return res.status(400).json({ status: 400, message: 'content cannot be empty', data: null });
      }
      updates.content = String(content);
    }
    if (lastUpdated !== undefined) {
      const d = new Date(lastUpdated);
      if (isNaN(d)) {
        return res.status(400).json({ status: 400, message: 'lastUpdated must be a valid date', data: null });
      }
      updates.lastUpdated = d;
    }

    const doc = await TermsAndConditions.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!doc) return res.status(404).json({ status: 404, message: 'Terms and conditions not found', data: null });

    const data = { id: doc._id, title: doc.title, content: doc.content, last_update: formatMonthYear(doc.lastUpdated) };
    return res.status(200).json({ status: 200, message: 'Terms and conditions updated', data });
  } catch (error) {
    return res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

module.exports = router;
