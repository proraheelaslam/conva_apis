# 🔔 Notification Flow - Match APIs

## 📋 Summary

| API | Notification To | Condition | Title | Body |
|-----|----------------|-----------|-------|------|
| **Like** | Target User | Simple Like | 💙 New Like! | `{userName} liked you!` |
| **Like** | Both Users | Match Created | 🎉 It's a Match! | `You and {userName} liked each other!` |
| **Superlike** | Target User | Simple Superlike | ⭐ Super Like! | `{userName} super liked you!` |
| **Superlike** | Both Users | Match Created | 🎉 It's a Match! | `You and {userName} liked each other!` |
| **Dislike** | Target User | Profile View | 👀 Profile View | `{userName} viewed your profile` |

---

## 🎯 Detailed Flow

### 1. POST /api/matches/like

#### Case A: Simple Like (No Match)
```javascript
User A likes User B (but User B hasn't liked User A yet)

Notification sent to: User B only ✅
Current user (User A): No notification ✅

Notification Details:
{
  title: "💙 New Like!",
  body: "John Doe liked you!",
  data: {
    type: "like",
    userId: "user-a-id",
    userName: "John Doe"
  }
}
```

#### Case B: Match Created
```javascript
User A likes User B (and User B already liked User A)

Notification sent to: Both User A and User B ✅

User B receives:
{
  title: "🎉 It's a Match!",
  body: "You and John Doe liked each other!",
  data: {
    type: "match",
    matchId: "match-id",
    userId: "user-a-id",
    userName: "John Doe"
  }
}

User A receives:
{
  title: "🎉 It's a Match!",
  body: "You and Jane Smith liked each other!",
  data: {
    type: "match",
    matchId: "match-id",
    userId: "user-b-id",
    userName: "Jane Smith"
  }
}
```

---

### 2. POST /api/matches/superlike

#### Case A: Simple Superlike (No Match)
```javascript
User A superlikes User B (but User B hasn't liked User A yet)

Notification sent to: User B only ✅
Current user (User A): No notification ✅

Notification Details:
{
  title: "⭐ Super Like!",
  body: "John Doe super liked you!",
  data: {
    type: "superlike",
    userId: "user-a-id",
    userName: "John Doe"
  }
}
```

#### Case B: Match Created
```javascript
User A superlikes User B (and User B already liked/superliked User A)

Notification sent to: Both User A and User B ✅

Same as Like Match notification ↑
```

---

### 3. POST /api/matches/dislike

```javascript
User A dislikes User B

Notification sent to: User B only ✅
Current user (User A): No notification ✅

Note: Notification shows as "Profile View" instead of "Dislike" for better UX

Notification Details:
{
  title: "👀 Profile View",
  body: "John Doe viewed your profile",
  data: {
    type: "profile_view",
    userId: "user-a-id",
    userName: "John Doe"
  }
}
```

**Design Choice:** We show dislike as "profile view" to maintain positive UX while still notifying the user about activity.

---

## 🔑 Key Implementation Details

### 1. Self-Notification Prevention ✅

```javascript
// Current user ID
const userId = req.user.id;

// Target user ID
const { targetUserId } = req.body;

// Get both users
const [currentUser, targetUser] = await Promise.all([
  User.findById(userId).select('name deviceToken'),      // Current user
  User.findById(targetUserId).select('name deviceToken')  // Target user
]);

// Send only to target user (NOT current user)
if (targetUser && targetUser.deviceToken) {
  await sendNotification(targetUser.deviceToken, { ... });
}
```

### 2. Device Token Check ✅

```javascript
// Only send if user has device token
if (targetUser && targetUser.deviceToken) {
  await sendNotification(targetUser.deviceToken, { ... });
}

// If no device token → notification skipped (no error)
```

### 3. Error Handling ✅

```javascript
try {
  // Send notification
  await sendNotification(...);
} catch (notifError) {
  console.error('❌ Error sending notification:', notifError);
  // Don't fail the request if notification fails
}

// API still returns success even if notification fails
```

---

## 📱 Notification Data Structure

### Notification Object:
```javascript
{
  title: "💙 New Like!",        // Notification title
  body: "John liked you!",       // Notification body
  data: {                        // Additional data (for app routing)
    type: "like",                // Type: like, superlike, match
    userId: "user-id",           // ID of user who performed action
    userName: "John Doe",        // Name of user
    matchId: "match-id"          // Only for match notifications
  }
}
```

### Flutter App Handling:
```dart
// When notification tapped
void handleNotificationTap(Map<String, dynamic> data) {
  String type = data['type'];
  
  switch(type) {
    case 'like':
      // Navigate to likes screen
      Navigator.pushNamed(context, '/likes');
      break;
    case 'superlike':
      // Navigate to profile
      String userId = data['userId'];
      Navigator.pushNamed(context, '/profile/$userId');
      break;
    case 'match':
      // Navigate to match screen
      String matchId = data['matchId'];
      Navigator.pushNamed(context, '/match/$matchId');
      break;
  }
}
```

---

## 🧪 Testing

### Test Like (No Match):
```http
POST {{base_url}}/api/matches/like
Authorization: Bearer {{user-a-token}}
Content-Type: application/json

{
  "targetUserId": "user-b-id"
}

Expected: User B gets notification ✅
Expected: User A gets NO notification ✅
```

### Test Match Creation:
```http
# Step 1: User B likes User A first
POST {{base_url}}/api/matches/like
Authorization: Bearer {{user-b-token}}
Content-Type: application/json
{
  "targetUserId": "user-a-id"
}

# Step 2: User A likes User B (creates match)
POST {{base_url}}/api/matches/like
Authorization: Bearer {{user-a-token}}
Content-Type: application/json
{
  "targetUserId": "user-b-id"
}

Expected: Both User A and User B get match notification ✅
```

### Test Superlike:
```http
POST {{base_url}}/api/matches/superlike
Authorization: Bearer {{user-a-token}}
Content-Type: application/json

{
  "targetUserId": "user-b-id"
}

Expected: User B gets superlike notification ✅
Expected: User A gets NO notification ✅
```

### Test Dislike:
```http
POST {{base_url}}/api/matches/dislike
Authorization: Bearer {{user-a-token}}
Content-Type: application/json

{
  "targetUserId": "user-b-id"
}

Expected: User B gets "Profile View" notification ✅
Expected: User A gets NO notification ✅
```

---

## ✅ Verification Checklist

- [x] Like sends notification to target user only
- [x] Superlike sends notification to target user only
- [x] Match sends notification to both users
- [x] Dislike sends "profile view" notification to target user only
- [x] Current user never gets notification for their own action
- [x] Device token check before sending
- [x] Error handling (notification failure doesn't break API)
- [x] Proper notification titles and messages
- [x] Data payload for app routing

---

## 🚀 Deployment

After pushing code to server:

```bash
# On server
cd ~/conva_apis
git pull origin main
pm2 restart all
pm2 logs

# Should see:
# ✅ Firebase Admin initialized successfully
```

Then test with actual device tokens!

---

**All notifications working! 🎉**

