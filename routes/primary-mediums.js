const express = require('express');
const router = express.Router();
const PrimaryMediums = require('../models/PrimaryMediums');

// Create primary medium
router.post('/', async (req, res) => {
	try {
		const { name, category, isActive } = req.body;
		if (!name || !String(name).trim()) {
			return res.status(400).json({ status: 400, message: 'name is required', data: null });
		}
		if (!category || !String(category).trim()) {
			return res.status(400).json({ status: 400, message: 'category is required', data: null });
		}
		const primaryMedium = new PrimaryMediums({ name, category, isActive });
		await primaryMedium.save();
		res.status(201).json({ status: 201, message: 'Primary medium created', data: primaryMedium });
	} catch (error) {
		if (error.code === 11000) {
			return res.status(409).json({ status: 409, message: 'Primary medium already exists in this category', data: null });
		}
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// List primary mediums
router.get('/', async (req, res) => {
	try {
		const { q, active, category } = req.query;
		const filter = {};
		if (q) filter.name = { $regex: String(q).trim().toLowerCase(), $options: 'i' };
		if (active === 'true') filter.isActive = true;
		if (active === 'false') filter.isActive = false;
		if (category) filter.category = { $regex: String(category).trim(), $options: 'i' };
		
		const primaryMediums = await PrimaryMediums.find(filter).sort({ category: 1, name: 1 });
		
		// Group by category
		const grouped = {};
		primaryMediums.forEach(item => {
			const cat = item.category || 'General';
			if (!grouped[cat]) grouped[cat] = [];
			grouped[cat].push({ id: item._id, name: item.name });
		});
		
		res.status(200).json({ status: 200, message: 'Primary mediums fetched', data: grouped });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Get primary mediums by category
router.get('/category/:category', async (req, res) => {
	try {
		const { category } = req.params;
		const primaryMediums = await PrimaryMediums.find({ 
			category: { $regex: category, $options: 'i' }, 
			isActive: true 
		}).sort({ name: 1 });
		res.status(200).json({ status: 200, message: 'Primary mediums by category fetched', data: primaryMediums });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Get all categories
router.get('/categories', async (req, res) => {
	try {
		const categories = await PrimaryMediums.distinct('category');
		res.status(200).json({ status: 200, message: 'Categories fetched', data: categories });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Get single primary medium
router.get('/:id', async (req, res) => {
	try {
		const item = await PrimaryMediums.findById(req.params.id);
		if (!item) return res.status(404).json({ status: 404, message: 'Primary medium not found', data: null });
		res.status(200).json({ status: 200, message: 'Primary medium fetched', data: item });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Update primary medium
router.put('/:id', async (req, res) => {
	try {
		const updates = {};
		['name', 'category', 'isActive'].forEach(k => {
			if (req.body[k] !== undefined) updates[k] = req.body[k];
		});
		if (updates.name) updates.name = String(updates.name).trim();
		if (updates.category) updates.category = String(updates.category).trim();
		
		const item = await PrimaryMediums.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
		if (!item) return res.status(404).json({ status: 404, message: 'Primary medium not found', data: null });
		res.status(200).json({ status: 200, message: 'Primary medium updated', data: item });
	} catch (error) {
		if (error.code === 11000) {
			return res.status(409).json({ status: 409, message: 'Primary medium already exists in this category', data: null });
		}
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Delete primary medium
router.delete('/:id', async (req, res) => {
	try {
		const del = await PrimaryMediums.findByIdAndDelete(req.params.id);
		if (!del) return res.status(404).json({ status: 404, message: 'Primary medium not found', data: null });
		res.status(200).json({ status: 200, message: 'Primary medium deleted', data: del });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

module.exports = router;
