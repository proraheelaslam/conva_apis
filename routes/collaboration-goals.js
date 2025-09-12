const express = require('express');
const router = express.Router();
const CollaborationGoals = require('../models/CollaborationGoals');

// Create collaboration goal
router.post('/', async (req, res) => {
	try {
		const { name, category, isActive } = req.body;
		if (!name || !String(name).trim()) {
			return res.status(400).json({ status: 400, message: 'name is required', data: null });
		}
		if (!category || !String(category).trim()) {
			return res.status(400).json({ status: 400, message: 'category is required', data: null });
		}
		const collaborationGoal = new CollaborationGoals({ name, category, isActive });
		await collaborationGoal.save();
		res.status(201).json({ status: 201, message: 'Collaboration goal created', data: collaborationGoal });
	} catch (error) {
		if (error.code === 11000) {
			return res.status(409).json({ status: 409, message: 'Collaboration goal already exists in this category', data: null });
		}
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// List collaboration goals
router.get('/', async (req, res) => {
	try {
		const { q, active, category } = req.query;
		const filter = {};
		if (q) filter.name = { $regex: String(q).trim().toLowerCase(), $options: 'i' };
		if (active === 'true') filter.isActive = true;
		if (active === 'false') filter.isActive = false;
		if (category) filter.category = { $regex: String(category).trim(), $options: 'i' };
		
		const collaborationGoals = await CollaborationGoals.find(filter).sort({ category: 1, name: 1 });
		
		// Group by category
		const grouped = {};
		collaborationGoals.forEach(item => {
			const cat = item.category || 'General';
			if (!grouped[cat]) grouped[cat] = [];
			grouped[cat].push({ id: item._id, name: item.name });
		});
		
		res.status(200).json({ status: 200, message: 'Collaboration goals fetched', data: grouped });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Get collaboration goals by category
router.get('/category/:category', async (req, res) => {
	try {
		const { category } = req.params;
		const collaborationGoals = await CollaborationGoals.find({ 
			category: { $regex: category, $options: 'i' }, 
			isActive: true 
		}).sort({ name: 1 });
		res.status(200).json({ status: 200, message: 'Collaboration goals by category fetched', data: collaborationGoals });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Get all categories
router.get('/categories', async (req, res) => {
	try {
		const categories = await CollaborationGoals.distinct('category');
		res.status(200).json({ status: 200, message: 'Categories fetched', data: categories });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Get single collaboration goal
router.get('/:id', async (req, res) => {
	try {
		const item = await CollaborationGoals.findById(req.params.id);
		if (!item) return res.status(404).json({ status: 404, message: 'Collaboration goal not found', data: null });
		res.status(200).json({ status: 200, message: 'Collaboration goal fetched', data: item });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Update collaboration goal
router.put('/:id', async (req, res) => {
	try {
		const updates = {};
		['name', 'category', 'isActive'].forEach(k => {
			if (req.body[k] !== undefined) updates[k] = req.body[k];
		});
		if (updates.name) updates.name = String(updates.name).trim();
		if (updates.category) updates.category = String(updates.category).trim();
		
		const item = await CollaborationGoals.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
		if (!item) return res.status(404).json({ status: 404, message: 'Collaboration goal not found', data: null });
		res.status(200).json({ status: 200, message: 'Collaboration goal updated', data: item });
	} catch (error) {
		if (error.code === 11000) {
			return res.status(409).json({ status: 409, message: 'Collaboration goal already exists in this category', data: null });
		}
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Delete collaboration goal
router.delete('/:id', async (req, res) => {
	try {
		const del = await CollaborationGoals.findByIdAndDelete(req.params.id);
		if (!del) return res.status(404).json({ status: 404, message: 'Collaboration goal not found', data: null });
		res.status(200).json({ status: 200, message: 'Collaboration goal deleted', data: del });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

module.exports = router;
