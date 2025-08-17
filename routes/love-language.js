const express = require('express');
const router = express.Router();
const LoveLanguage = require('../models/LoveLanguage');

// Create love language
router.post('/', async (req, res) => {
	try {
		const { name, isActive } = req.body;
		if (!name || !String(name).trim()) {
			return res.status(400).json({ status: 400, message: 'name is required', data: null });
		}
		const loveLanguage = new LoveLanguage({ name, isActive });
		await loveLanguage.save();
		res.status(201).json({ status: 201, message: 'Love language created', data: loveLanguage });
	} catch (error) {
		if (error.code === 11000) {
			return res.status(409).json({ status: 409, message: 'Love language already exists', data: null });
		}
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// List love languages
router.get('/', async (req, res) => {
	try {
		const { q, active } = req.query;
		const filter = {};
		if (q) filter.name = { $regex: String(q).trim().toLowerCase(), $options: 'i' };
		if (active === 'true') filter.isActive = true;
		if (active === 'false') filter.isActive = false;
		const loveLanguages = await LoveLanguage.find(filter).sort({ name: 1 });
		res.status(200).json({ status: 200, message: 'Love languages fetched', data: loveLanguages });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Get single love language
router.get('/:id', async (req, res) => {
	try {
		const item = await LoveLanguage.findById(req.params.id);
		if (!item) return res.status(404).json({ status: 404, message: 'Love language not found', data: null });
		res.status(200).json({ status: 200, message: 'Love language fetched', data: item });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Update love language
router.put('/:id', async (req, res) => {
	try {
		const updates = {};
		['name', 'isActive'].forEach(k => {
			if (req.body[k] !== undefined) updates[k] = req.body[k];
		});
		if (updates.name) updates.name = String(updates.name).trim();
		const item = await LoveLanguage.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
		if (!item) return res.status(404).json({ status: 404, message: 'Love language not found', data: null });
		res.status(200).json({ status: 200, message: 'Love language updated', data: item });
	} catch (error) {
		if (error.code === 11000) {
			return res.status(409).json({ status: 409, message: 'Love language name already exists', data: null });
		}
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Delete love language
router.delete('/:id', async (req, res) => {
	try {
		const del = await LoveLanguage.findByIdAndDelete(req.params.id);
		if (!del) return res.status(404).json({ status: 404, message: 'Love language not found', data: null });
		res.status(200).json({ status: 200, message: 'Love language deleted', data: del });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

module.exports = router;


