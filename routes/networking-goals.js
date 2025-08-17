const express = require('express');
const router = express.Router();
const NetworkingGoals = require('../models/NetworkingGoals');

// Create networking goal
router.post('/', async (req, res) => {
	try {
		const { name, isActive } = req.body;
		if (!name || !String(name).trim()) {
			return res.status(400).json({ status: 400, message: 'name is required', data: null });
		}
		const networkingGoal = new NetworkingGoals({ name, isActive });
		await networkingGoal.save();
		res.status(201).json({ status: 201, message: 'Networking goal created', data: networkingGoal });
	} catch (error) {
		if (error.code === 11000) {
			return res.status(409).json({ status: 409, message: 'Networking goal already exists', data: null });
		}
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// List networking goals
router.get('/', async (req, res) => {
	try {
		const { q, active } = req.query;
		const filter = {};
		if (q) filter.name = { $regex: String(q).trim().toLowerCase(), $options: 'i' };
		if (active === 'true') filter.isActive = true;
		if (active === 'false') filter.isActive = false;
		const networkingGoals = await NetworkingGoals.find(filter).sort({ name: 1 });
		res.status(200).json({ status: 200, message: 'Networking goals fetched', data: networkingGoals });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Get single networking goal
router.get('/:id', async (req, res) => {
	try {
		const item = await NetworkingGoals.findById(req.params.id);
		if (!item) return res.status(404).json({ status: 404, message: 'Networking goal not found', data: null });
		res.status(200).json({ status: 200, message: 'Networking goal fetched', data: item });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Update networking goal
router.put('/:id', async (req, res) => {
	try {
		const updates = {};
		['name', 'isActive'].forEach(k => {
			if (req.body[k] !== undefined) updates[k] = req.body[k];
		});
		if (updates.name) updates.name = String(updates.name).trim();
		const item = await NetworkingGoals.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
		if (!item) return res.status(404).json({ status: 404, message: 'Networking goal not found', data: null });
		res.status(200).json({ status: 200, message: 'Networking goal updated', data: item });
	} catch (error) {
		if (error.code === 11000) {
			return res.status(409).json({ status: 409, message: 'Networking goal name already exists', data: null });
		}
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Delete networking goal
router.delete('/:id', async (req, res) => {
	try {
		const del = await NetworkingGoals.findByIdAndDelete(req.params.id);
		if (!del) return res.status(404).json({ status: 404, message: 'Networking goal not found', data: null });
		res.status(200).json({ status: 200, message: 'Networking goal deleted', data: del });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

module.exports = router;
