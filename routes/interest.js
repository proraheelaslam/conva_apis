const express = require('express');
const router = express.Router();
const Interest = require('../models/Interest');

// Create interest
router.post('/', async (req, res) => {
	try {
		const { name, category, isActive } = req.body;
		if (!name || !String(name).trim()) {
			return res.status(400).json({ status: 400, message: 'name is required', data: null });
		}
		const interest = new Interest({ name, category, isActive });
		await interest.save();
		res.status(201).json({ status: 201, message: 'Interest created', data: interest });
	} catch (error) {
		if (error.code === 11000) {
			return res.status(409).json({ status: 409, message: 'Interest already exists', data: null });
		}
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// List interests
router.get('/', async (req, res) => {
	try {
		const { q, active } = req.query;
		const filter = {};
		if (q) filter.name = { $regex: String(q).trim().toLowerCase(), $options: 'i' };
		if (active === 'true') filter.isActive = true;
		if (active === 'false') filter.isActive = false;
		const interests = await Interest.find(filter).sort({ name: 1 });
		res.status(200).json({ status: 200, message: 'Interests fetched', data: interests });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Get single interest
router.get('/:id', async (req, res) => {
	try {
		const item = await Interest.findById(req.params.id);
		if (!item) return res.status(404).json({ status: 404, message: 'Interest not found', data: null });
		res.status(200).json({ status: 200, message: 'Interest fetched', data: item });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Update interest
router.put('/:id', async (req, res) => {
	try {
		const updates = {};
		['name', 'category', 'isActive'].forEach(k => {
			if (req.body[k] !== undefined) updates[k] = req.body[k];
		});
		if (updates.name) updates.name = String(updates.name).trim();
		const item = await Interest.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
		if (!item) return res.status(404).json({ status: 404, message: 'Interest not found', data: null });
		res.status(200).json({ status: 200, message: 'Interest updated', data: item });
	} catch (error) {
		if (error.code === 11000) {
			return res.status(409).json({ status: 409, message: 'Interest name already exists', data: null });
		}
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Delete interest
router.delete('/:id', async (req, res) => {
	try {
		const del = await Interest.findByIdAndDelete(req.params.id);
		if (!del) return res.status(404).json({ status: 404, message: 'Interest not found', data: null });
		res.status(200).json({ status: 200, message: 'Interest deleted', data: del });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

module.exports = router;


