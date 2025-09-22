const express = require('express');
const router = express.Router();
const Industry = require('../models/Industry');

// Create industry
router.post('/', async (req, res) => {
	try {
		const { name, category, isActive } = req.body;
		if (!name || !String(name).trim()) {
			return res.status(400).json({ status: 400, message: 'name is required', data: null });
		}
		if (!category || !String(category).trim()) {
			return res.status(400).json({ status: 400, message: 'category is required', data: null });
		}
		const industry = new Industry({ name, category, isActive });
		await industry.save();
		res.status(201).json({ status: 201, message: 'Industry created', data: industry });
	} catch (error) {
		if (error.code === 11000) {
			return res.status(409).json({ status: 409, message: 'Industry already exists in this category', data: null });
		}
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// List industries
router.get('/', async (req, res) => {
	try {
		const { q, active, category } = req.query;
		const filter = {};
		if (q) filter.name = { $regex: String(q).trim().toLowerCase(), $options: 'i' };
		if (active === 'true') filter.isActive = true;
		if (active === 'false') filter.isActive = false;
		if (category) filter.category = { $regex: String(category).trim(), $options: 'i' };
		
		const industries = await Industry.find(filter).sort({ category: 1, name: 1 });

		// Group by category to match /api/artistic-identities response structure
		const grouped = {};
		industries.forEach(item => {
			const cat = item.category || 'General';
			if (!grouped[cat]) grouped[cat] = [];
			grouped[cat].push({ id: item._id, name: item.name });
		});

		res.status(200).json({ status: 200, message: 'Industries fetched', data: grouped });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Get industries by category
router.get('/category/:category', async (req, res) => {
	try {
		const { category } = req.params;
		const industries = await Industry.find({ 
			category: { $regex: category, $options: 'i' }, 
			isActive: true 
		}).sort({ name: 1 });
		res.status(200).json({ status: 200, message: 'Industries by category fetched', data: industries });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Get all categories
router.get('/categories', async (req, res) => {
	try {
		const categories = await Industry.distinct('category');
		res.status(200).json({ status: 200, message: 'Categories fetched', data: categories });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Get single industry
router.get('/:id', async (req, res) => {
	try {
		const item = await Industry.findById(req.params.id);
		if (!item) return res.status(404).json({ status: 404, message: 'Industry not found', data: null });
		res.status(200).json({ status: 200, message: 'Industry fetched', data: item });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Update industry
router.put('/:id', async (req, res) => {
	try {
		const updates = {};
		['name', 'category', 'isActive'].forEach(k => {
			if (req.body[k] !== undefined) updates[k] = req.body[k];
		});
		if (updates.name) updates.name = String(updates.name).trim();
		if (updates.category) updates.category = String(updates.category).trim();
		
		const item = await Industry.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
		if (!item) return res.status(404).json({ status: 404, message: 'Industry not found', data: null });
		res.status(200).json({ status: 200, message: 'Industry updated', data: item });
	} catch (error) {
		if (error.code === 11000) {
			return res.status(409).json({ status: 409, message: 'Industry already exists in this category', data: null });
		}
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Delete industry
router.delete('/:id', async (req, res) => {
	try {
		const del = await Industry.findByIdAndDelete(req.params.id);
		if (!del) return res.status(404).json({ status: 404, message: 'Industry not found', data: null });
		res.status(200).json({ status: 200, message: 'Industry deleted', data: del });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

module.exports = router;
