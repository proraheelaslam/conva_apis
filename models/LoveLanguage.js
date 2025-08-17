const mongoose = require('mongoose');

const loveLanguageSchema = new mongoose.Schema({
	name: { type: String, required: true, trim: true, lowercase: true },
	isActive: { type: Boolean, default: true }
}, { timestamps: true });

loveLanguageSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model('LoveLanguage', loveLanguageSchema);


