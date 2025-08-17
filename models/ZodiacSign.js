const mongoose = require('mongoose');

const zodiacSignSchema = new mongoose.Schema({
	name: { type: String, required: true, trim: true, lowercase: true },
	isActive: { type: Boolean, default: true }
}, { timestamps: true });

zodiacSignSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model('ZodiacSign', zodiacSignSchema);
