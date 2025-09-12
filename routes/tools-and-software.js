const express = require('express');
const router = express.Router();
const ToolsAndSoftware = require('../models/ToolsAndSoftware');

// Create tool and software
router.post('/', async (req, res) => {
	try {
		const { name, category, isActive } = req.body;
		if (!name || !String(name).trim()) {
			return res.status(400).json({ status: 400, message: 'name is required', data: null });
		}
		if (!category || !String(category).trim()) {
			return res.status(400).json({ status: 400, message: 'category is required', data: null });
		}
		const toolAndSoftware = new ToolsAndSoftware({ name, category, isActive });
		await toolAndSoftware.save();
		res.status(201).json({ status: 201, message: 'Tool and software created', data: toolAndSoftware });
	} catch (error) {
		if (error.code === 11000) {
			return res.status(409).json({ status: 409, message: 'Tool and software already exists in this category', data: null });
		}
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// List tools and software
router.get('/', async (req, res) => {
	try {
		const { q, active, category } = req.query;
		const filter = {};
		if (q) filter.name = { $regex: String(q).trim().toLowerCase(), $options: 'i' };
		if (active === 'true') filter.isActive = true;
		if (active === 'false') filter.isActive = false;
		if (category) filter.category = { $regex: String(category).trim(), $options: 'i' };
		
		const toolsAndSoftware = await ToolsAndSoftware.find(filter).sort({ category: 1, name: 1 });
		
		// Group by category
		const grouped = {};
		toolsAndSoftware.forEach(item => {
			const cat = item.category || 'General';
			if (!grouped[cat]) grouped[cat] = [];
			grouped[cat].push({ id: item._id, name: item.name });
		});
		
		res.status(200).json({ status: 200, message: 'Tools and software fetched', data: grouped });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Get tools and software by category
router.get('/category/:category', async (req, res) => {
	try {
		const { category } = req.params;
		const toolsAndSoftware = await ToolsAndSoftware.find({ 
			category: { $regex: category, $options: 'i' }, 
			isActive: true 
		}).sort({ name: 1 });
		res.status(200).json({ status: 200, message: 'Tools and software by category fetched', data: toolsAndSoftware });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Get all categories
router.get('/categories', async (req, res) => {
	try {
		const categories = await ToolsAndSoftware.distinct('category');
		res.status(200).json({ status: 200, message: 'Categories fetched', data: categories });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Get single tool and software
router.get('/:id', async (req, res) => {
	try {
		const item = await ToolsAndSoftware.findById(req.params.id);
		if (!item) return res.status(404).json({ status: 404, message: 'Tool and software not found', data: null });
		res.status(200).json({ status: 200, message: 'Tool and software fetched', data: item });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Update tool and software
router.put('/:id', async (req, res) => {
	try {
		const updates = {};
		['name', 'category', 'isActive'].forEach(k => {
			if (req.body[k] !== undefined) updates[k] = req.body[k];
		});
		if (updates.name) updates.name = String(updates.name).trim();
		if (updates.category) updates.category = String(updates.category).trim();
		
		const item = await ToolsAndSoftware.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
		if (!item) return res.status(404).json({ status: 404, message: 'Tool and software not found', data: null });
		res.status(200).json({ status: 200, message: 'Tool and software updated', data: item });
	} catch (error) {
		if (error.code === 11000) {
			return res.status(409).json({ status: 409, message: 'Tool and software already exists in this category', data: null });
		}
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Delete tool and software
router.delete('/:id', async (req, res) => {
	try {
		const del = await ToolsAndSoftware.findByIdAndDelete(req.params.id);
		if (!del) return res.status(404).json({ status: 404, message: 'Tool and software not found', data: null });
		res.status(200).json({ status: 200, message: 'Tool and software deleted', data: del });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

module.exports = router;
