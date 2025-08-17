const express = require('express');
const router = express.Router();
const IcebreakerPrompt = require('../models/IcebreakerPrompt');

// Create icebreaker prompt
router.post('/', async (req, res) => {
	try {
		const { question, category, isActive } = req.body;
		if (!question || !String(question).trim()) {
			return res.status(400).json({ status: 400, message: 'question is required', data: null });
		}
		const icebreakerPrompt = new IcebreakerPrompt({ question, category, isActive });
		await icebreakerPrompt.save();
		res.status(201).json({ status: 201, message: 'Icebreaker prompt created', data: icebreakerPrompt });
	} catch (error) {
		if (error.code === 11000) {
			return res.status(409).json({ status: 409, message: 'Icebreaker prompt already exists', data: null });
		}
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// List icebreaker prompts
router.get('/', async (req, res) => {
	try {
		const { q, active, category } = req.query;
		const filter = {};
		if (q) filter.question = { $regex: String(q).trim().toLowerCase(), $options: 'i' };
		if (active === 'true') filter.isActive = true;
		if (active === 'false') filter.isActive = false;
		if (category) filter.category = category;
		const icebreakerPrompts = await IcebreakerPrompt.find(filter).sort({ question: 1 });
		res.status(200).json({ status: 200, message: 'Icebreaker prompts fetched', data: icebreakerPrompts });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Get single icebreaker prompt
router.get('/:id', async (req, res) => {
	try {
		const item = await IcebreakerPrompt.findById(req.params.id);
		if (!item) return res.status(404).json({ status: 404, message: 'Icebreaker prompt not found', data: null });
		res.status(200).json({ status: 200, message: 'Icebreaker prompt fetched', data: item });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Update icebreaker prompt
router.put('/:id', async (req, res) => {
	try {
		const updates = {};
		['question', 'category', 'isActive'].forEach(k => {
			if (req.body[k] !== undefined) updates[k] = req.body[k];
		});
		if (updates.question) updates.question = String(updates.question).trim();
		const item = await IcebreakerPrompt.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
		if (!item) return res.status(404).json({ status: 404, message: 'Icebreaker prompt not found', data: null });
		res.status(200).json({ status: 200, message: 'Icebreaker prompt updated', data: item });
	} catch (error) {
		if (error.code === 11000) {
			return res.status(409).json({ status: 409, message: 'Icebreaker prompt question already exists', data: null });
		}
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

// Delete icebreaker prompt
router.delete('/:id', async (req, res) => {
	try {
		const del = await IcebreakerPrompt.findByIdAndDelete(req.params.id);
		if (!del) return res.status(404).json({ status: 404, message: 'Icebreaker prompt not found', data: null });
		res.status(200).json({ status: 200, message: 'Icebreaker prompt deleted', data: del });
	} catch (error) {
		res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
	}
});

module.exports = router;
