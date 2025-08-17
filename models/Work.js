const mongoose = require('mongoose');

const workSchema = new mongoose.Schema({
	name: { type: String, required: true, trim: true, lowercase: true },
	isActive: { type: Boolean, default: true }
}, { timestamps: true });

workSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model('Work', workSchema);


