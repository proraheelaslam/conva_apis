const mongoose = require('mongoose');

const ACTIVITIES = [
  'coffee_date',
  'dinner',
  'phone_call',
  'video_call',
  'messaging',
  'other_activity'
];

const MOODS = [
  'amazing',
  'great',
  'good',
  'okay',
  'meh',
  'bad'
];

const diaryEntrySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  aboutUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  activity: { type: String, enum: ACTIVITIES, required: true },
  mood: { type: String, enum: MOODS, required: true },

  notes: { type: String, required: true, trim: true },
  location: { type: String, default: '' },
  photos: { type: [String], default: [] },

  isImportant: { type: Boolean, default: false },
  happenedAt: { type: Date, default: Date.now, index: true }
}, {
  timestamps: true
});

// Optional indexes for search and sorting
// Text index for notes search
try {
  diaryEntrySchema.index({ notes: 'text' });
} catch (e) {}

module.exports = mongoose.model('DiaryEntry', diaryEntrySchema);
