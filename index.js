require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:5173',  // React default port
    'https://convo-admin.arinovation.com'  // Production frontend URL
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.use(express.json());


// Serve static files from public directory
app.use('/public', express.static('public'));
// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// MongoDB connection with Mongoose
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected successfully with Mongoose!'))
  .catch((err) => console.error('MongoDB connection error:', err));


// Root route for health check
app.get('/', (req, res) => {
  res.send('API is running!');
});

// Public webpage: Privacy Policy (HTML)
app.use('/privacy-policy', require('./routes/privacy-page'));

// Mount user routes at root for /api/register, /api/login, /api/users
app.use('/api', require('./routes/user'));
// Mount auth routes for phone registration and OTP
app.use('/api/auth', require('./routes/auth'));
// Interest routes
app.use('/api/interests', require('./routes/interest'));
// Orientation routes
app.use('/api/orientations', require('./routes/orientation'));
// Work routes
app.use('/api/work', require('./routes/work'));
// Gender routes
app.use('/api/genders', require('./routes/gender'));
// Industry routes
app.use('/api/industries', require('./routes/industry'));
// Networking Goals routes
app.use('/api/networking-goals', require('./routes/networking-goals'));
// Artistic Identity routes
app.use('/api/artistic-identities', require('./routes/artistic-identity'));
// Primary Mediums routes
app.use('/api/primary-mediums', require('./routes/primary-mediums'));
// Skills and Techniques routes
app.use('/api/skills-and-techniques', require('./routes/skills-and-techniques'));
// Tools and Software routes
app.use('/api/tools-and-software', require('./routes/tools-and-software'));
// Combined Creative Attributes (PrimaryMediums, SkillsAndTechniques, ToolsAndSoftware)
app.use('/api/creative-attributes', require('./routes/creative-attributes'));
// Collaboration Goals routes
app.use('/api/collaboration-goals', require('./routes/collaboration-goals'));
// Communication Style routes
app.use('/api/communication-styles', require('./routes/communication-style'));
// Love Language routes
app.use('/api/love-languages', require('./routes/love-language'));
// Zodiac Sign routes
app.use('/api/zodiac-signs', require('./routes/zodiac-sign'));
// Icebreaker Prompt routes
app.use('/api/icebreaker-prompts', require('./routes/icebreaker-prompt'));
// Post routes
app.use('/api/posts', require('./routes/post'));
// Upload routes
app.use('/api/upload', require('./routes/upload'));
// Diary Upload routes
app.use('/api/upload/diary', require('./routes/diary-upload'));
// Diary routes
app.use('/api/diary', require('./routes/diary'));
// Business Profile routes
app.use('/api/business-profile', require('./routes/business-profile'));
// Collaboration Profile routes
app.use('/api/collaboration-profile', require('./routes/collaboration-profile'));
app.use('/api/admin', require('./routes/admin'));
// Package routes
app.use('/api/packages', require('./routes/package'));
// Subscription routes
app.use('/api/subscriptions', require('./routes/subscription'));
// Matches & Swipes routes
app.use('/api/matches', require('./routes/match'));
// Notification routes (Testing & Management)
app.use('/api/notification', require('./routes/notification'));
// Boost/Bid routes
app.use('/api/boost', require('./routes/boost'));
// Wallet routes
app.use('/api/wallet', require('./routes/wallet'));
// Terms and Conditions routes
app.use('/api/terms-and-conditions', require('./routes/terms-and-conditions'));
// Privacy Policy routes
app.use('/api/privacy-policy', require('./routes/privacy-policy'));
// Connection routes
app.use('/api/connections', require('./routes/connection'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});