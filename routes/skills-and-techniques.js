const express = require('express');
const router = express.Router();
const SkillsAndTechniques = require('../models/SkillsAndTechniques');

// Create skill and technique
router.post('/', async (req, res) => {
	try {
		const { name, category, isActive } = req.body;
		if (!name || !String(name).trim()) {
			return res.status(400).json({ status: 400, message: 'name is required', data: null });
		}
		if (!category || !String(category).trim()) {
			return res.status(400).json({ status: 400, message: 'category is required', data: null });
		}
		const skillAndTechnique = new SkillsAndTechniques({ name, category, isActive });
		await skillAndTechnique.save();
		res.status(201).json({ status: 201, message: 'Skill and technique created', data: skillAndTechnique });
	} catch (error) {
		if (error.code === 11000) {
			return res.status(409).json({ status: 409, message: 'Skill and technique already exists in this category', data: null });
		}
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// List skills and techniques
router.get('/', async (req, res) => {
	try {
		const { q, active, category } = req.query;
		const filter = {};
		if (q) filter.name = { $regex: String(q).trim().toLowerCase(), $options: 'i' };
		if (active === 'true') filter.isActive = true;
		if (active === 'false') filter.isActive = false;
		if (category) filter.category = { $regex: String(category).trim(), $options: 'i' };
		
		const skillsAndTechniques = await SkillsAndTechniques.find(filter).sort({ category: 1, name: 1 });
		
		// Group by category
		const grouped = {};
		skillsAndTechniques.forEach(item => {
			const cat = item.category || 'General';
			if (!grouped[cat]) grouped[cat] = [];
			grouped[cat].push({ id: item._id, name: item.name });
		});
		
		res.status(200).json({ status: 200, message: 'Skills and techniques fetched', data: grouped });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Get skills and techniques by category
router.get('/category/:category', async (req, res) => {
	try {
		const { category } = req.params;
		const skillsAndTechniques = await SkillsAndTechniques.find({ 
			category: { $regex: category, $options: 'i' }, 
			isActive: true 
		}).sort({ name: 1 });
		res.status(200).json({ status: 200, message: 'Skills and techniques by category fetched', data: skillsAndTechniques });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Get all categories
router.get('/categories', async (req, res) => {
	try {
		const categories = await SkillsAndTechniques.distinct('category');
		res.status(200).json({ status: 200, message: 'Categories fetched', data: categories });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Get single skill and technique
router.get('/:id', async (req, res) => {
	try {
		const item = await SkillsAndTechniques.findById(req.params.id);
		if (!item) return res.status(404).json({ status: 404, message: 'Skill and technique not found', data: null });
		res.status(200).json({ status: 200, message: 'Skill and technique fetched', data: item });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Update skill and technique
router.put('/:id', async (req, res) => {
	try {
		const updates = {};
		['name', 'category', 'isActive'].forEach(k => {
			if (req.body[k] !== undefined) updates[k] = req.body[k];
		});
		if (updates.name) updates.name = String(updates.name).trim();
		if (updates.category) updates.category = String(updates.category).trim();
		
		const item = await SkillsAndTechniques.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
		if (!item) return res.status(404).json({ status: 404, message: 'Skill and technique not found', data: null });
		res.status(200).json({ status: 200, message: 'Skill and technique updated', data: item });
	} catch (error) {
		if (error.code === 11000) {
			return res.status(409).json({ status: 409, message: 'Skill and technique already exists in this category', data: null });
		}
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Delete skill and technique
router.delete('/:id', async (req, res) => {
	try {
		const del = await SkillsAndTechniques.findByIdAndDelete(req.params.id);
		if (!del) return res.status(404).json({ status: 404, message: 'Skill and technique not found', data: null });
		res.status(200).json({ status: 200, message: 'Skill and technique deleted', data: del });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

module.exports = router;
