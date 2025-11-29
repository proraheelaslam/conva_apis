/**
 * Migration Script: Add Boost Fields to Existing Users
 * 
 * This script initializes boost fields for all existing users in the database
 * Run this once after deploying boost feature
 * 
 * Usage: node scripts/migrate-boost-fields.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function migrateBoostFields() {
  try {
    console.log('🔄 Starting boost fields migration...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Find all users without boost fields initialized
    const usersWithoutBoost = await User.find({
      $or: [
        { boostCredits: { $exists: false } },
        { isBoostActive: { $exists: false } },
        { totalBoostsPurchased: { $exists: false } },
        { totalBoostsUsed: { $exists: false } }
      ]
    });
    
    console.log(`📊 Found ${usersWithoutBoost.length} users to update`);
    
    if (usersWithoutBoost.length === 0) {
      console.log('✅ All users already have boost fields initialized');
      await mongoose.connection.close();
      return;
    }
    
    // Update all users with default boost values
    const updateResult = await User.updateMany(
      {
        $or: [
          { boostCredits: { $exists: false } },
          { isBoostActive: { $exists: false } },
          { totalBoostsPurchased: { $exists: false } },
          { totalBoostsUsed: { $exists: false } }
        ]
      },
      {
        $set: {
          boostCredits: 0,
          isBoostActive: false,
          boostDuration: 180,
          totalBoostsPurchased: 0,
          totalBoostsUsed: 0
        }
      }
    );
    
    console.log(`✅ Successfully updated ${updateResult.modifiedCount} users`);
    
    // Deactivate expired boosts
    const now = new Date();
    const expiredBoostResult = await User.updateMany(
      {
        isBoostActive: true,
        boostEndTime: { $lt: now }
      },
      {
        $set: {
          isBoostActive: false,
          boostStartTime: null,
          boostEndTime: null
        }
      }
    );
    
    console.log(`✅ Deactivated ${expiredBoostResult.modifiedCount} expired boosts`);
    
    // Verify migration
    const remainingUsers = await User.countDocuments({
      $or: [
        { boostCredits: { $exists: false } },
        { isBoostActive: { $exists: false } },
        { totalBoostsPurchased: { $exists: false } },
        { totalBoostsUsed: { $exists: false } }
      ]
    });
    
    if (remainingUsers === 0) {
      console.log('✅ Migration completed successfully!');
    } else {
      console.log(`⚠️ Warning: ${remainingUsers} users still missing boost fields`);
    }
    
    // Close connection
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateBoostFields();

