const mongoose = require('mongoose');

const orientationSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
		trim: true,
		lowercase: true,
		minlength: 1
	},
	isActive: { type: Boolean, default: true }
}, { timestamps: true });

orientationSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model('Orientation', orientationSchema);


