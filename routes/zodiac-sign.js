const express = require('express');
const router = express.Router();
const ZodiacSign = require('../models/ZodiacSign');

// Create zodiac sign
router.post('/', async (req, res) => {
	try {
		const { name, isActive } = req.body;
		if (!name || !String(name).trim()) {
			return res.status(400).json({ status: 400, message: 'name is required', data: null });
		}
		const zodiacSign = new ZodiacSign({ name, isActive });
		await zodiacSign.save();
		res.status(201).json({ status: 201, message: 'Zodiac sign created', data: zodiacSign });
	} catch (error) {
		if (error.code === 11000) {
			return res.status(409).json({ status: 409, message: 'Zodiac sign already exists', data: null });
		}
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// List zodiac signs
router.get('/', async (req, res) => {
	try {
		const { q, active } = req.query;
		const filter = {};
		if (q) filter.name = { $regex: String(q).trim().toLowerCase(), $options: 'i' };
		if (active === 'true') filter.isActive = true;
		if (active === 'false') filter.isActive = false;
		const zodiacSigns = await ZodiacSign.find(filter).sort({ name: 1 });
		res.status(200).json({ status: 200, message: 'Zodiac signs fetched', data: zodiacSigns });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Get single zodiac sign
router.get('/:id', async (req, res) => {
	try {
		const item = await ZodiacSign.findById(req.params.id);
		if (!item) return res.status(404).json({ status: 404, message: 'Zodiac sign not found', data: null });
		res.status(200).json({ status: 200, message: 'Zodiac sign fetched', data: item });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Update zodiac sign
router.put('/:id', async (req, res) => {
	try {
		const updates = {};
		['name', 'isActive'].forEach(k => {
			if (req.body[k] !== undefined) updates[k] = req.body[k];
		});
		if (updates.name) updates.name = String(updates.name).trim();
		const item = await ZodiacSign.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
		if (!item) return res.status(404).json({ status: 404, message: 'Zodiac sign not found', data: null });
		res.status(200).json({ status: 200, message: 'Zodiac sign updated', data: item });
	} catch (error) {
		if (error.code === 11000) {
			return res.status(409).json({ status: 409, message: 'Zodiac sign name already exists', data: null });
		}
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Delete zodiac sign
router.delete('/:id', async (req, res) => {
	try {
		const del = await ZodiacSign.findByIdAndDelete(req.params.id);
		if (!del) return res.status(404).json({ status: 404, message: 'Zodiac sign not found', data: null });
		res.status(200).json({ status: 200, message: 'Zodiac sign deleted', data: del });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

module.exports = router;
