const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Step 1: Email or Phone
  email: { type: String, unique: true, sparse: true },
  phoneNumber: { type: String, unique: true, sparse: true },
  
  // Step 2: Name
  name: { type: String, required: true, trim: true },
  
  // Step 3: Birthday
  birthday: { type: Date, required: true },
  
  // Step 4: Work
  workId: { type: mongoose.Schema.Types.ObjectId, ref: 'Work' },
  
  // Step 5: Location
  currentCity: { type: String, trim: true },
  homeTown: { type: String, trim: true },
  
  // Step 6: Pronounce
  pronounce: { type: String, trim: true },
  
  // Step 7: Gender
  genderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gender' },
  
  // Step 8: Orientation
  orientation: { type: mongoose.Schema.Types.ObjectId, ref: 'Orientation' },
  
  // Step 9: Interests (multiple selection)
  interests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Interest' }],
  
  // Step 10: Communication Style
  communicationStyle: { type: mongoose.Schema.Types.ObjectId, ref: 'CommunicationStyle' },
  
  // Step 11: Love Language
  loveLanguage: { type: mongoose.Schema.Types.ObjectId, ref: 'LoveLanguage' },
  
  // Step 12: Zodiac Sign
  zodiacSign: { type: String, trim: true },
  
  // Step 13: Icebreaker Prompts (2-3 rotating questions)
  icebreakerPrompts: [{
    question: { type: String, required: true },
    answer: { type: String, required: true }
  }],
  
  // Step 14: Photos (multiple uploads)
  photos: [{ type: String }],
  
  // Additional fields
  role: {
    type: String,
    enum: ['admin', 'moderator', 'user'],
    default: 'user'
  },
  // Profile Type
  profileType: {
    type: String,
    enum: ['personal', 'business', 'collaboration'],
    default: 'personal'
  },
  profilePhoto: { type: String, default: '' },
  notificationsEnabled: { type: Boolean, default: true },
  snoozeMode: { type: Boolean, default: false },
  profileVisibility: { type: String, enum: ['public', 'private', 'friends'], default: 'public' },
  
  // Registration completion status
  registrationStep: { type: Number, default: 1 },
  isRegistrationComplete: { type: Boolean, default: false },
  
  // Premium status
  isPremium: { type: Boolean, default: false },
 
  // Subscription/Plan info (default: free)
  plan: {
    planType: { type: String, enum: ['free', 'basic', 'premium', 'vip'], default: 'free' },
    name: { type: String, default: 'Free' }, // e.g., 'Convo', 'Convo+', 'Convo++'
    totalSwipes: { type: Number, default: 10 },
    remainingSwipes: { type: Number, default: 10 },
    activatedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date }
  },
  is_enable_post: { type: Boolean, default: false },
  is_enable_diary: { type: Boolean, default: false },
  
  // Verification status
  verificationStatus: { type: String, enum: ['pending', 'verified'], default: 'pending' },
  
  // Profile image (copied from first photo)
  profileImage: { type: String, default: '' },
  
  // Profile completion percentage
  profileCompletion: { type: Number, default: 0 },
  
  // Member since date
  memberSince: { type: Date, default: Date.now },
  
  // Profile statistics
  profileViews: { type: Number, default: 0 },
  matches: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  superLikes: { type: Number, default: 0 },
  
  // Distance from current user
  distance: { type: String, default: '2 miles away' },

  // Geolocation (optional but recommended): used to compute dynamic distances
  latitude: { type: Number },
  longitude: { type: Number },
  
  // Social login fields
  platformtype: { type: String, trim: true },
  social_id: { type: String, trim: true },
  
  // Feature flags
  isPostEnabled: { type: Boolean, default: false },
  isDiaryEnabled: { type: Boolean, default: false }
}, { timestamps: true });

// Custom validation: at least one of email or phoneNumber is required
userSchema.pre('validate', function(next) {
  if (!this.email && !this.phoneNumber) {
    this.invalidate('email', 'Either email or phone number is required.');
    this.invalidate('phoneNumber', 'Either email or phone number is required.');
  }
  next();
});

module.exports = mongoose.model('User', userSchema); 