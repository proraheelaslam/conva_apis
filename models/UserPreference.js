const mongoose = require('mongoose');

const userPreferenceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
  profileType: { type: String, enum: ['personal', 'business', 'collaboration'], default: 'personal' },
  showMeGenders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Gender' }],
  minAge: { type: Number, default: 18 },
  maxAge: { type: Number, default: 99 },
  maxDistance: { type: Number, default: 100 },
  interests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Interest' }],
}, { timestamps: true });

module.exports = mongoose.model('UserPreference', userPreferenceSchema);
