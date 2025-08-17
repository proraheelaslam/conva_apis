const mongoose = require('mongoose');

const icebreakerPromptSchema = new mongoose.Schema({
	question: { type: String, required: true, trim: true },
	isActive: { type: Boolean, default: true }
}, { timestamps: true });

icebreakerPromptSchema.index({ question: 1 }, { unique: true });

module.exports = mongoose.model('IcebreakerPrompt', icebreakerPromptSchema);
