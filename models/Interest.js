const mongoose = require('mongoose');

const interestSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
		trim: true,
		lowercase: true,
		minlength: 1
	},
	category: {
		type: String,
		trim: true,
		default: ''
	},
	isActive: { type: Boolean, default: true }
}, { timestamps: true });

interestSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model('Interest', interestSchema);


