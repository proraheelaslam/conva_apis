const express = require('express');
const router = express.Router();
const Gender = require('../models/Gender');

// Create gender
router.post('/', async (req, res) => {
	try {
		const { name, isActive } = req.body;
		if (!name || !String(name).trim()) {
			return res.status(400).json({ status: 400, message: 'name is required', data: null });
		}
		const gender = new Gender({ name, isActive });
		await gender.save();
		res.status(201).json({ status: 201, message: 'Gender created', data: gender });
	} catch (error) {
		if (error.code === 11000) {
			return res.status(409).json({ status: 409, message: 'Gender already exists', data: null });
		}
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// List genders
router.get('/', async (req, res) => {
	try {
		const { q, active } = req.query;
		const filter = {};
		if (q) filter.name = { $regex: String(q).trim().toLowerCase(), $options: 'i' };
		if (active === 'true') filter.isActive = true;
		if (active === 'false') filter.isActive = false;
		const genders = await Gender.find(filter).sort({ name: 1 });
		res.status(200).json({ status: 200, message: 'Genders fetched', data: genders });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Get single gender
router.get('/:id', async (req, res) => {
	try {
		const item = await Gender.findById(req.params.id);
		if (!item) return res.status(404).json({ status: 404, message: 'Gender not found', data: null });
		res.status(200).json({ status: 200, message: 'Gender fetched', data: item });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Update gender
router.put('/:id', async (req, res) => {
	try {
		const updates = {};
		['name', 'isActive'].forEach(k => {
			if (req.body[k] !== undefined) updates[k] = req.body[k];
		});
		if (updates.name) updates.name = String(updates.name).trim();
		const item = await Gender.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
		if (!item) return res.status(404).json({ status: 404, message: 'Gender not found', data: null });
		res.status(200).json({ status: 200, message: 'Gender updated', data: item });
	} catch (error) {
		if (error.code === 11000) {
			return res.status(409).json({ status: 409, message: 'Gender name already exists', data: null });
		}
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Delete gender
router.delete('/:id', async (req, res) => {
	try {
		const del = await Gender.findByIdAndDelete(req.params.id);
		if (!del) return res.status(404).json({ status: 404, message: 'Gender not found', data: null });
		res.status(200).json({ status: 200, message: 'Gender deleted', data: del });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

module.exports = router;
