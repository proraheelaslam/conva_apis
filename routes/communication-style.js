const express = require('express');
const router = express.Router();
const CommunicationStyle = require('../models/CommunicationStyle');

// Create communication style
router.post('/', async (req, res) => {
	try {
		const { name, isActive } = req.body;
		if (!name || !String(name).trim()) {
			return res.status(400).json({ status: 400, message: 'name is required', data: null });
		}
		const communicationStyle = new CommunicationStyle({ name, isActive });
		await communicationStyle.save();
		res.status(201).json({ status: 201, message: 'Communication style created', data: communicationStyle });
	} catch (error) {
		if (error.code === 11000) {
			return res.status(409).json({ status: 409, message: 'Communication style already exists', data: null });
		}
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// List communication styles
router.get('/', async (req, res) => {
	try {
		const { q, active } = req.query;
		const filter = {};
		if (q) filter.name = { $regex: String(q).trim().toLowerCase(), $options: 'i' };
		if (active === 'true') filter.isActive = true;
		if (active === 'false') filter.isActive = false;
		const communicationStyles = await CommunicationStyle.find(filter).sort({ name: 1 });
		res.status(200).json({ status: 200, message: 'Communication styles fetched', data: communicationStyles });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Get single communication style
router.get('/:id', async (req, res) => {
	try {
		const item = await CommunicationStyle.findById(req.params.id);
		if (!item) return res.status(404).json({ status: 404, message: 'Communication style not found', data: null });
		res.status(200).json({ status: 200, message: 'Communication style fetched', data: item });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Update communication style
router.put('/:id', async (req, res) => {
	try {
		const updates = {};
		['name', 'isActive'].forEach(k => {
			if (req.body[k] !== undefined) updates[k] = req.body[k];
		});
		if (updates.name) updates.name = String(updates.name).trim();
		const item = await CommunicationStyle.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
		if (!item) return res.status(404).json({ status: 404, message: 'Communication style not found', data: null });
		res.status(200).json({ status: 200, message: 'Communication style updated', data: item });
	} catch (error) {
		if (error.code === 11000) {
			return res.status(409).json({ status: 409, message: 'Communication style name already exists', data: null });
		}
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Delete communication style
router.delete('/:id', async (req, res) => {
	try {
		const del = await CommunicationStyle.findByIdAndDelete(req.params.id);
		if (!del) return res.status(404).json({ status: 404, message: 'Communication style not found', data: null });
		res.status(200).json({ status: 200, message: 'Communication style deleted', data: del });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

module.exports = router;


