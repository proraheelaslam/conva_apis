# 📱 Push Notification Testing Guide

## 🎯 Flutter App Se Device Token Kaise Get Karein?

### Step 1: Flutter App Me Firebase Setup

```yaml
# pubspec.yaml
dependencies:
  firebase_core: ^2.24.2
  firebase_messaging: ^14.7.9
```

### Step 2: Flutter Code - Device Token Get Karein

```dart
import 'package:firebase_messaging/firebase_messaging.dart';

class NotificationService {
  final FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance;
  
  Future<String?> getDeviceToken() async {
    try {
      // Request notification permission
      NotificationSettings settings = await _firebaseMessaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );
      
      if (settings.authorizationStatus == AuthorizationStatus.authorized) {
        // Get device token
        String? token = await _firebaseMessaging.getToken();
        print('📱 Device Token: $token');
        return token;
      }
      return null;
    } catch (e) {
      print('Error getting token: $e');
      return null;
    }
  }
  
  // Listen for token refresh
  void listenToTokenRefresh() {
    _firebaseMessaging.onTokenRefresh.listen((newToken) {
      print('🔄 Token Refreshed: $newToken');
      // Send new token to backend
    });
  }
}
```

### Step 3: Token Console Me Print Karein

```dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  
  NotificationService notificationService = NotificationService();
  String? deviceToken = await notificationService.getDeviceToken();
  
  if (deviceToken != null) {
    print('========================================');
    print('📱 YOUR DEVICE TOKEN:');
    print(deviceToken);
    print('========================================');
  }
  
  runApp(MyApp());
}
```

---

## 🧪 Backend API Testing

### API 1: Simple Test Notification (Device Token Se)

```http
POST {{base_url}}/api/notification/test
Content-Type: application/json

{
  "deviceToken": "your-flutter-device-token-here",
  "title": "🔔 Test Notification",
  "body": "Hello from Conva Backend!"
}
```

**Response:**
```json
{
  "status": true,
  "message": "Test notification sent successfully!",
  "data": {
    "deviceToken": "your-device-token",
    "notification": {
      "title": "🔔 Test Notification",
      "body": "Hello from Conva Backend!",
      "data": {
        "type": "test",
        "timestamp": "2025-11-28T10:30:00.000Z"
      }
    },
    "result": {
      "success": true,
      "message": "Notification sent successfully"
    }
  }
}
```

---

### API 2: Test Notification To Registered User (User ID Se)

```http
POST {{base_url}}/api/notification/test-to-user
Content-Type: application/json

{
  "userId": "user-id-from-database",
  "title": "👋 Hello",
  "body": "This is a personalized test notification!"
}
```

**Response:**
```json
{
  "status": true,
  "message": "Test notification sent to user successfully!",
  "data": {
    "user": {
      "id": "673f5a2e8c9d1e2f3a4b5c6d",
      "name": "John Doe"
    },
    "result": {
      "success": true
    }
  }
}
```

---

### API 3: Get User's Device Token

```http
GET {{base_url}}/api/notification/user-token/{{userId}}
```

**Response:**
```json
{
  "status": true,
  "message": "User device token fetched",
  "data": {
    "user": {
      "id": "673f5a2e8c9d1e2f3a4b5c6d",
      "name": "John Doe",
      "email": "john@example.com",
      "phoneNumber": "+1234567890",
      "deviceToken": "fcm-device-token-here",
      "hasDeviceToken": true
    }
  }
}
```

---

### API 4: Update Device Token (Logged In User)

```http
PUT {{base_url}}/api/notification/update-token
Authorization: Bearer {{your-jwt-token}}
Content-Type: application/json

{
  "deviceToken": "new-device-token-here"
}
```

**Response:**
```json
{
  "status": true,
  "message": "Device token updated successfully",
  "data": {
    "user": {
      "id": "673f5a2e8c9d1e2f3a4b5c6d",
      "name": "John Doe",
      "deviceToken": "new-device-token-here"
    }
  }
}
```

---

### API 5: Test Multiple Devices

```http
POST {{base_url}}/api/notification/test-multiple
Content-Type: application/json

{
  "deviceTokens": [
    "device-token-1",
    "device-token-2",
    "device-token-3"
  ],
  "title": "🎉 Group Notification",
  "body": "This goes to multiple devices!"
}
```

**Response:**
```json
{
  "status": true,
  "message": "Test notification sent to multiple devices",
  "data": {
    "totalDevices": 3,
    "successCount": 2,
    "failureCount": 1
  }
}
```

---

## 📋 Complete Testing Flow

### Step-by-Step Process:

#### 1. Flutter App Setup
```bash
# Install Firebase packages
flutter pub add firebase_core firebase_messaging

# Get device token from console
flutter run
```

#### 2. Copy Device Token
```
Flutter Console Output:
========================================
📱 YOUR DEVICE TOKEN:
dxYZ1234abc...XYZ (copy this)
========================================
```

#### 3. Test Basic Notification (Postman/Insomnia)
```http
POST http://localhost:3000/api/notification/test

{
  "deviceToken": "paste-your-copied-token-here"
}
```

#### 4. Check Phone
- ✅ Notification should appear on device
- ✅ Title: "🔔 Test Notification"
- ✅ Body: "This is a test notification from Conva Backend!"

---

## 🔍 Troubleshooting

### Problem 1: Token Not Getting in Flutter
**Solution:**
```dart
// Add this in AndroidManifest.xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
```

### Problem 2: Notification Not Received
**Check:**
- ✅ Firebase project same hai app aur backend me?
- ✅ Device token valid hai?
- ✅ Internet connection?
- ✅ App permissions granted?

### Problem 3: "Device token is required"
**Solution:**
```dart
// Make sure to send token during registration
final token = await FirebaseMessaging.instance.getToken();

final response = await http.post(
  Uri.parse('$baseUrl/api/register'),
  body: jsonEncode({
    'name': 'John Doe',
    'email': 'john@example.com',
    'deviceToken': token,  // ← Must include
    // ... other fields
  }),
);
```

---

## 📊 Real-World Testing Scenarios

### Scenario 1: Like Notification
```http
# User A likes User B
POST {{base_url}}/api/matches/like
Authorization: Bearer {{user-a-token}}

{
  "targetUserId": "user-b-id"
}
```

**Result:** User B receives notification:
```
💙 New Like!
John Doe liked you!
```

---

### Scenario 2: Match Notification
```http
# User A likes User B (and User B already liked User A)
POST {{base_url}}/api/matches/like
Authorization: Bearer {{user-a-token}}

{
  "targetUserId": "user-b-id"
}
```

**Result:** Both users receive notification:
```
🎉 It's a Match!
You and John Doe liked each other!
```

---

### Scenario 3: Super Like Notification
```http
POST {{base_url}}/api/matches/superlike
Authorization: Bearer {{user-a-token}}

{
  "targetUserId": "user-b-id"
}
```

**Result:** User B receives notification:
```
⭐ Super Like!
John Doe super liked you!
```

---

## 🎨 Custom Notification Examples

### Example 1: Welcome Notification
```http
POST {{base_url}}/api/notification/test

{
  "deviceToken": "your-device-token",
  "title": "🎉 Welcome to Conva!",
  "body": "Thanks for joining us. Start swiping now!",
  "data": {
    "type": "welcome",
    "screen": "home"
  }
}
```

### Example 2: Reminder Notification
```http
POST {{base_url}}/api/notification/test

{
  "deviceToken": "your-device-token",
  "title": "⏰ Daily Reminder",
  "body": "You have 5 new likes waiting for you!",
  "data": {
    "type": "reminder",
    "count": 5
  }
}
```

---

## 📱 Flutter App - Notification Handling

### Receive Notifications in Flutter:

```dart
import 'package:firebase_messaging/firebase_messaging.dart';

class NotificationHandler {
  final FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance;
  
  void setupNotifications() {
    // Handle notification when app is in foreground
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      print('📩 Notification received (foreground):');
      print('Title: ${message.notification?.title}');
      print('Body: ${message.notification?.body}');
      print('Data: ${message.data}');
      
      // Show local notification or update UI
      showNotificationDialog(message);
    });
    
    // Handle notification tap when app is in background
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      print('📱 Notification tapped:');
      print('Data: ${message.data}');
      
      // Navigate to specific screen based on notification type
      handleNotificationTap(message.data);
    });
    
    // Handle notification when app is terminated
    _firebaseMessaging.getInitialMessage().then((message) {
      if (message != null) {
        print('🚀 App opened from terminated state');
        handleNotificationTap(message.data);
      }
    });
  }
  
  void handleNotificationTap(Map<String, dynamic> data) {
    String type = data['type'] ?? '';
    
    switch (type) {
      case 'match':
        // Navigate to matches screen
        Navigator.pushNamed(context, '/matches');
        break;
      case 'like':
        // Navigate to likes screen
        Navigator.pushNamed(context, '/likes');
        break;
      case 'superlike':
        // Navigate to profile
        String userId = data['userId'] ?? '';
        Navigator.pushNamed(context, '/profile/$userId');
        break;
      default:
        // Navigate to home
        Navigator.pushNamed(context, '/home');
    }
  }
}
```

---

## ✅ Final Checklist

### Backend Setup:
- [x] Firebase Admin SDK installed
- [x] `firebase-service-account.json` in config folder
- [x] Notification routes registered in `index.js`
- [x] Test APIs created

### Flutter Setup:
- [ ] Firebase packages added
- [ ] Firebase initialized
- [ ] Device token retrieved
- [ ] Notification permissions requested
- [ ] Token sent to backend during registration

### Testing:
- [ ] Basic test notification working
- [ ] User-specific notification working
- [ ] Like notification working
- [ ] Match notification working
- [ ] Super like notification working

---

## 🚀 Quick Start Command

```bash
# 1. Install dependencies (if not already done)
npm install firebase-admin

# 2. Start server
npm start

# 3. Test notification (replace with your token)
curl -X POST http://localhost:3000/api/notification/test \
  -H "Content-Type: application/json" \
  -d '{"deviceToken":"your-device-token-here"}'
```

---

**Happy Testing! 🎊**

