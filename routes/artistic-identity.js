const express = require('express');
const router = express.Router();
const ArtisticIdentity = require('../models/ArtisticIdentity');

// Create artistic identity
router.post('/', async (req, res) => {
	try {
		const { name, category, isActive } = req.body;
		if (!name || !String(name).trim()) {
			return res.status(400).json({ status: 400, message: 'name is required', data: null });
		}
		if (!category || !String(category).trim()) {
			return res.status(400).json({ status: 400, message: 'category is required', data: null });
		}
		const artisticIdentity = new ArtisticIdentity({ name, category, isActive });
		await artisticIdentity.save();
		res.status(201).json({ status: 201, message: 'Artistic identity created', data: artisticIdentity });
	} catch (error) {
		if (error.code === 11000) {
			return res.status(409).json({ status: 409, message: 'Artistic identity already exists in this category', data: null });
		}
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// List artistic identities
router.get('/', async (req, res) => {
	try {
		const { q, active, category } = req.query;
		const filter = {};
		if (q) filter.name = { $regex: String(q).trim().toLowerCase(), $options: 'i' };
		if (active === 'true') filter.isActive = true;
		if (active === 'false') filter.isActive = false;
		if (category) filter.category = { $regex: String(category).trim(), $options: 'i' };
		
		const artisticIdentities = await ArtisticIdentity.find(filter).sort({ category: 1, name: 1 });
		res.status(200).json({ status: 200, message: 'Artistic identities fetched', data: artisticIdentities });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Get artistic identities by category
router.get('/category/:category', async (req, res) => {
	try {
		const { category } = req.params;
		const artisticIdentities = await ArtisticIdentity.find({ 
			category: { $regex: category, $options: 'i' }, 
			isActive: true 
		}).sort({ name: 1 });
		res.status(200).json({ status: 200, message: 'Artistic identities by category fetched', data: artisticIdentities });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Get all categories
router.get('/categories', async (req, res) => {
	try {
		const categories = await ArtisticIdentity.distinct('category');
		res.status(200).json({ status: 200, message: 'Categories fetched', data: categories });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Get single artistic identity
router.get('/:id', async (req, res) => {
	try {
		const item = await ArtisticIdentity.findById(req.params.id);
		if (!item) return res.status(404).json({ status: 404, message: 'Artistic identity not found', data: null });
		res.status(200).json({ status: 200, message: 'Artistic identity fetched', data: item });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Update artistic identity
router.put('/:id', async (req, res) => {
	try {
		const updates = {};
		['name', 'category', 'isActive'].forEach(k => {
			if (req.body[k] !== undefined) updates[k] = req.body[k];
		});
		if (updates.name) updates.name = String(updates.name).trim();
		if (updates.category) updates.category = String(updates.category).trim();
		
		const item = await ArtisticIdentity.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
		if (!item) return res.status(404).json({ status: 404, message: 'Artistic identity not found', data: null });
		res.status(200).json({ status: 200, message: 'Artistic identity updated', data: item });
	} catch (error) {
		if (error.code === 11000) {
			return res.status(409).json({ status: 409, message: 'Artistic identity already exists in this category', data: null });
		}
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Delete artistic identity
router.delete('/:id', async (req, res) => {
	try {
		const del = await ArtisticIdentity.findByIdAndDelete(req.params.id);
		if (!del) return res.status(404).json({ status: 404, message: 'Artistic identity not found', data: null });
		res.status(200).json({ status: 200, message: 'Artistic identity deleted', data: del });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

module.exports = router;
