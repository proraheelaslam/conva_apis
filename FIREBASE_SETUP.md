# Firebase Push Notification Setup Guide

## 📋 Prerequisites
- Firebase Admin SDK
- Firebase project with Cloud Messaging enabled
- Device tokens from mobile app

---

## 🚀 Step-by-Step Setup

### Step 1: Install Firebase Admin SDK

```bash
npm install firebase-admin --save
```

### Step 2: Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** (⚙️ icon)
4. Navigate to **Service Accounts** tab
5. Click **Generate New Private Key**
6. Download the JSON file
7. Rename it to `firebase-service-account.json`
8. Place it in the `config/` folder

**⚠️ Important:** Add this file to `.gitignore` to keep credentials secure!

```bash
# Add to .gitignore
config/firebase-service-account.json
```

### Step 3: Alternative - Use Environment Variables (Optional)

If you don't want to use a service account file, you can use environment variables:

1. Create a `.env` file in the project root
2. Add the following variables:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
```

3. Update `config/firebase.js` to use environment variables (uncomment the Option 2 section)

---

## 📱 Mobile App Setup (Flutter/React Native)

### For Flutter:
```yaml
# pubspec.yaml
dependencies:
  firebase_messaging: ^14.0.0
```

### For React Native:
```bash
npm install @react-native-firebase/messaging
```

### Get Device Token:
Make sure your mobile app sends the `deviceToken` during registration:

```javascript
// Example API call
POST /api/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "deviceToken": "your-fcm-device-token-here",
  // ... other fields
}
```

---

## 🔧 Usage in Your Code

### Import the notification helper:
```javascript
const { sendNotification, sendNotificationToMultiple, sendNotificationToTopic } = require('../helpers/notificationHelper');
```

### Send notification to a single user:
```javascript
const result = await sendNotification(userDeviceToken, {
  title: 'Hello!',
  body: 'This is a test notification',
  data: {
    type: 'test',
    userId: '12345'
  }
});

console.log(result); // { success: true, message: 'Notification sent successfully' }
```

### Send notification to multiple users:
```javascript
const deviceTokens = ['token1', 'token2', 'token3'];

const result = await sendNotificationToMultiple(deviceTokens, {
  title: 'Group Notification',
  body: 'This notification goes to multiple users',
  data: {
    type: 'group',
    groupId: '67890'
  }
});

console.log(result); 
// { success: true, successCount: 2, failureCount: 1 }
```

### Send notification to a topic:
```javascript
const result = await sendNotificationToTopic('all-users', {
  title: 'Announcement',
  body: 'Important update for all users!',
  data: {
    type: 'announcement'
  }
});
```

---

## 📝 Notification Types in the App

### 1. Like Notification
Sent when someone likes you:
```javascript
{
  title: '💙 New Like!',
  body: 'John Doe liked you!',
  data: {
    type: 'like',
    userId: '12345',
    userName: 'John Doe'
  }
}
```

### 2. Super Like Notification
Sent when someone super likes you:
```javascript
{
  title: '⭐ Super Like!',
  body: 'Jane Smith super liked you!',
  data: {
    type: 'superlike',
    userId: '67890',
    userName: 'Jane Smith'
  }
}
```

### 3. Match Notification
Sent when you match with someone:
```javascript
{
  title: '🎉 It\'s a Match!',
  body: 'You and John Doe liked each other!',
  data: {
    type: 'match',
    matchId: 'match123',
    userId: '12345',
    userName: 'John Doe'
  }
}
```

---

## 🔍 Testing Notifications

### Test with Postman:

#### 1. Register a user with deviceToken:
```http
POST {{base_url}}/api/register
Content-Type: application/json

{
  "name": "Test User",
  "email": "test@example.com",
  "phoneNumber": "+1234567890",
  "birthday": "1990-01-01",
  "deviceToken": "your-device-token-here",
  "workId": "...",
  "genderId": "...",
  // ... other required fields
}
```

#### 2. Like another user (will trigger notification):
```http
POST {{base_url}}/api/matches/like
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "targetUserId": "target-user-id"
}
```

---

## 🐛 Troubleshooting

### Issue: "Firebase Admin initialization skipped"
**Solution:** Make sure `firebase-service-account.json` exists in the `config/` folder

### Issue: "Device token is required"
**Solution:** Ensure the user has a valid `deviceToken` saved in the database

### Issue: Notification not received on device
**Checklist:**
- ✅ Firebase project has Cloud Messaging enabled
- ✅ Device token is valid and not expired
- ✅ Mobile app has proper Firebase configuration
- ✅ Device has internet connection
- ✅ App has notification permissions enabled

### Issue: Invalid credentials
**Solution:** Re-download the service account JSON file and replace the old one

---

## 📊 Monitoring

Check Firebase Console for:
- Notification delivery rates
- Failed notifications
- Device token statistics

**Path:** Firebase Console > Cloud Messaging

---

## 🔐 Security Best Practices

1. ✅ Never commit `firebase-service-account.json` to version control
2. ✅ Use environment variables in production
3. ✅ Validate device tokens before sending notifications
4. ✅ Implement rate limiting for notification sending
5. ✅ Handle notification failures gracefully

---

## 📚 Additional Resources

- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [FCM Server Documentation](https://firebase.google.com/docs/cloud-messaging/server)
- [Firebase Console](https://console.firebase.google.com/)

---

## ✅ Current Integration Status

### Implemented Endpoints:
- ✅ `/api/matches/like` - Sends notification on like/match
- ✅ `/api/matches/superlike` - Sends notification on superlike/match

### Notification Helper Functions:
- ✅ `sendNotification(deviceToken, notification)` - Single device
- ✅ `sendNotificationToMultiple(deviceTokens, notification)` - Multiple devices
- ✅ `sendNotificationToTopic(topic, notification)` - Topic-based

---

## 🎯 Next Steps

You can use the `sendNotification` function in any other endpoint:

```javascript
// Example: Send notification when someone views your profile
router.post('/profile/view', auth, async (req, res) => {
  const { targetUserId } = req.body;
  
  const targetUser = await User.findById(targetUserId);
  const currentUser = await User.findById(req.user.id);
  
  if (targetUser && targetUser.deviceToken) {
    await sendNotification(targetUser.deviceToken, {
      title: '👀 Profile View',
      body: `${currentUser.name} viewed your profile`,
      data: {
        type: 'profile_view',
        userId: String(req.user.id)
      }
    });
  }
  
  // ... rest of your code
});
```

---

**Happy Coding! 🚀**

