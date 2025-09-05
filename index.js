require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());


// Serve static files from public directory
app.use('/public', express.static('public'));

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
// Business Profile routes
app.use('/api/business-profile', require('./routes/business-profile'));
// Collaboration Profile routes
app.use('/api/collaboration-profile', require('./routes/collaboration-profile'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 