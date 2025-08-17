const mongoose = require('mongoose');

const communicationStyleSchema = new mongoose.Schema({
	name: { type: String, required: true, trim: true, lowercase: true },
	isActive: { type: Boolean, default: true }
}, { timestamps: true });

communicationStyleSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model('CommunicationStyle', communicationStyleSchema);


