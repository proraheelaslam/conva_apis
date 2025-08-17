const express = require('express');
const router = express.Router();
const Work = require('../models/Work');

// Create work
router.post('/', async (req, res) => {
	try {
		const { name, isActive } = req.body;
		if (!name || !String(name).trim()) {
			return res.status(400).json({ status: 400, message: 'name is required', data: null });
		}
		const work = new Work({ name, isActive });
		await work.save();
		res.status(201).json({ status: 201, message: 'Work created', data: work });
	} catch (error) {
		if (error.code === 11000) {
			return res.status(409).json({ status: 409, message: 'Work already exists', data: null });
		}
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// List works
router.get('/', async (req, res) => {
	try {
		const { q, active } = req.query;
		const filter = {};
		if (q) filter.name = { $regex: String(q).trim().toLowerCase(), $options: 'i' };
		if (active === 'true') filter.isActive = true;
		if (active === 'false') filter.isActive = false;
		const works = await Work.find(filter).sort({ name: 1 });
		res.status(200).json({ status: 200, message: 'Works fetched', data: works });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Get single work
router.get('/:id', async (req, res) => {
	try {
		const item = await Work.findById(req.params.id);
		if (!item) return res.status(404).json({ status: 404, message: 'Work not found', data: null });
		res.status(200).json({ status: 200, message: 'Work fetched', data: item });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Update work
router.put('/:id', async (req, res) => {
	try {
		const updates = {};
		['name', 'isActive'].forEach(k => {
			if (req.body[k] !== undefined) updates[k] = req.body[k];
		});
		if (updates.name) updates.name = String(updates.name).trim();
		const item = await Work.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
		if (!item) return res.status(404).json({ status: 404, message: 'Work not found', data: null });
		res.status(200).json({ status: 200, message: 'Work updated', data: item });
	} catch (error) {
		if (error.code === 11000) {
			return res.status(409).json({ status: 409, message: 'Work name already exists', data: null });
		}
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Delete work
router.delete('/:id', async (req, res) => {
	try {
		const del = await Work.findByIdAndDelete(req.params.id);
		if (!del) return res.status(404).json({ status: 404, message: 'Work not found', data: null });
		res.status(200).json({ status: 200, message: 'Work deleted', data: del });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

module.exports = router;


