const express = require('express');
const router = express.Router();
const Orientation = require('../models/Orientation');

// Create orientation
router.post('/', async (req, res) => {
	try {
		const { name, isActive } = req.body;
		if (!name || !String(name).trim()) {
			return res.status(400).json({ status: 400, message: 'name is required', data: null });
		}
		const orientation = new Orientation({ name, isActive });
		await orientation.save();
		res.status(201).json({ status: 201, message: 'Orientation created', data: orientation });
	} catch (error) {
		if (error.code === 11000) {
			return res.status(409).json({ status: 409, message: 'Orientation already exists', data: null });
		}
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// List orientations
router.get('/', async (req, res) => {
	try {
		const { q, active } = req.query;
		const filter = {};
		if (q) filter.name = { $regex: String(q).trim().toLowerCase(), $options: 'i' };
		if (active === 'true') filter.isActive = true;
		if (active === 'false') filter.isActive = false;
		const orientations = await Orientation.find(filter).sort({ name: 1 });
		res.status(200).json({ status: 200, message: 'Orientations fetched', data: orientations });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Get single orientation
router.get('/:id', async (req, res) => {
	try {
		const item = await Orientation.findById(req.params.id);
		if (!item) return res.status(404).json({ status: 404, message: 'Orientation not found', data: null });
		res.status(200).json({ status: 200, message: 'Orientation fetched', data: item });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Update orientation
router.put('/:id', async (req, res) => {
	try {
		const updates = {};
		['name', 'isActive'].forEach(k => {
			if (req.body[k] !== undefined) updates[k] = req.body[k];
		});
		if (updates.name) updates.name = String(updates.name).trim();
		const item = await Orientation.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
		if (!item) return res.status(404).json({ status: 404, message: 'Orientation not found', data: null });
		res.status(200).json({ status: 200, message: 'Orientation updated', data: item });
	} catch (error) {
		if (error.code === 11000) {
			return res.status(409).json({ status: 409, message: 'Orientation name already exists', data: null });
		}
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Delete orientation
router.delete('/:id', async (req, res) => {
	try {
		const del = await Orientation.findByIdAndDelete(req.params.id);
		if (!del) return res.status(404).json({ status: 404, message: 'Orientation not found', data: null });
		res.status(200).json({ status: 200, message: 'Orientation deleted', data: del });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

module.exports = router;


