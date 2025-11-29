# 🔄 Boost Fields Migration Guide

## ✅ Status Check

### User Model - Fields Added:
```javascript
✅ boostCredits: { type: Number, default: 0 }
✅ isBoostActive: { type: Boolean, default: false }
✅ boostStartTime: { type: Date }
✅ boostEndTime: { type: Date }
✅ boostDuration: { type: Number, default: 180 } // 3 hours
✅ totalBoostsPurchased: { type: Number, default: 0 }
✅ totalBoostsUsed: { type: Number, default: 0 }
```

---

## 🔍 Current Status

### ✅ Model Updated
- User model me sab fields add ho chuki hain
- Default values set hain
- New users ko automatically fields mil jayengi

### ⚠️ Existing Users
- Existing users ke liye migration script needed
- Migration script ready hai: `scripts/migrate-boost-fields.js`

---

## 🚀 Migration Steps

### Step 1: Verify Model Fields
```bash
# Check User model
cat models/User.js | grep -A 7 "Boost/Bid feature"
```

### Step 2: Run Migration Script
```bash
# From project root
node scripts/migrate-boost-fields.js
```

### Step 3: Verify Migration
```bash
# Check database - should show updated count
# Script will show success message
```

---

## 📊 What Migration Script Does:

1. ✅ **Finds all users** without boost fields
2. ✅ **Initializes boost fields** with default values:
   - `boostCredits: 0`
   - `isBoostActive: false`
   - `boostDuration: 180` (3 hours)
   - `totalBoostsPurchased: 0`
   - `totalBoostsUsed: 0`
3. ✅ **Deactivates expired boosts** (if any)
4. ✅ **Reports migration status**

---

## 🧪 Test Migration

### Before Migration:
```javascript
// Existing user in database
{
  _id: "...",
  name: "John Doe",
  email: "john@example.com"
  // boostCredits: missing
  // isBoostActive: missing
}
```

### After Migration:
```javascript
// Same user after migration
{
  _id: "...",
  name: "John Doe",
  email: "john@example.com",
  boostCredits: 0,              // ✅ Added
  isBoostActive: false,         // ✅ Added
  boostDuration: 180,           // ✅ Added
  totalBoostsPurchased: 0,      // ✅ Added
  totalBoostsUsed: 0            // ✅ Added
}
```

---

## 🎯 Migration Output Example:

```
🔄 Starting boost fields migration...
✅ Connected to MongoDB
📊 Found 150 users to update
✅ Successfully updated 150 users
✅ Deactivated 0 expired boosts
✅ Migration completed successfully!
✅ Database connection closed
```

---

## 🔧 Manual Migration (Alternative)

If script doesn't work, you can manually update via MongoDB shell:

```javascript
// MongoDB Shell
use your_database_name;

// Update all users
db.users.updateMany(
  {},
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

// Deactivate expired boosts
db.users.updateMany(
  {
    isBoostActive: true,
    boostEndTime: { $lt: new Date() }
  },
  {
    $set: {
      isBoostActive: false,
      boostStartTime: null,
      boostEndTime: null
    }
  }
);
```

---

## ✅ Verification Query

After migration, verify with:

```javascript
// Count users with boost fields
db.users.countDocuments({
  boostCredits: { $exists: true },
  isBoostActive: { $exists: true }
});

// Should equal total user count
```

---

## 🚨 Important Notes

1. **MongoDB Schema-less:**
   - MongoDB automatically allows new fields
   - Existing users without fields will get defaults on read
   - But migration ensures consistency

2. **Safe to Run Multiple Times:**
   - Script only updates users missing fields
   - Won't overwrite existing values
   - Safe to run multiple times

3. **No Data Loss:**
   - Only adds missing fields
   - Doesn't modify existing data
   - Sets safe default values

---

## 📝 Deployment Checklist

- [x] User model updated with boost fields
- [x] Default values set in model
- [x] Migration script created
- [ ] Migration script tested locally
- [ ] Migration script run on production
- [ ] Verification query executed
- [ ] Boost APIs tested with migrated users

---

## 🎯 Quick Migration Command

```bash
# From project root directory
node scripts/migrate-boost-fields.js
```

---

**Migration ready! Run the script to update existing users! 🚀**

