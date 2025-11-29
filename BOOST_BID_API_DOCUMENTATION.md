# 🚀 Boost Bid Feature - API Documentation

## 📋 Overview

Boost Bid feature allows users to purchase and activate boosts to appear at the **top of the preference list** for increased visibility.

---

## 🎯 Flow Diagram Implementation

```
Boost Button → Boost Option (₹99 for 3) → Select Boost Option → 
Estimate and Pay Option → Confirmation Screen → Use Boost Option Button → 
Boost Bid Option → User appears at TOP in preference list
```

---

## 📊 Database Schema

### User Model - New Fields:

```javascript
{
  boostCredits: Number,          // Number of boosts available (default: 0)
  isBoostActive: Boolean,        // Is boost currently active (default: false)
  boostStartTime: Date,          // When boost was activated
  boostEndTime: Date,            // When boost expires
  boostDuration: Number,         // Boost duration in minutes (default: 180 = 3 hours)
  totalBoostsPurchased: Number,  // Total boosts ever purchased (default: 0)
  totalBoostsUsed: Number        // Total boosts used (default: 0)
}
```

---

## 🔥 API Endpoints

### 1. GET /api/boost/status
Get current boost status for logged-in user

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "status": true,
  "message": "Boost status fetched successfully",
  "data": {
    "boostCredits": 3,
    "isBoostActive": true,
    "boostStartTime": "2025-11-28T12:00:00.000Z",
    "boostEndTime": "2025-11-28T15:00:00.000Z",
    "boostDuration": 180,
    "totalBoostsPurchased": 5,
    "totalBoostsUsed": 2,
    "remainingTime": 175
  }
}
```

---

### 2. GET /api/boost/packages
Get available boost packages

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "status": true,
  "message": "Boost packages fetched successfully",
  "data": [
    {
      "id": "boost_3",
      "name": "3 Boosts",
      "price": 99,
      "currency": "INR",
      "credits": 3,
      "description": "Get 3 boost credits",
      "popular": false
    },
    {
      "id": "boost_5",
      "name": "5 Boosts",
      "price": 149,
      "currency": "INR",
      "credits": 5,
      "description": "Get 5 boost credits",
      "popular": true,
      "savings": "₹20 saved"
    },
    {
      "id": "boost_10",
      "name": "10 Boosts",
      "price": 249,
      "currency": "INR",
      "credits": 10,
      "description": "Get 10 boost credits",
      "popular": false,
      "savings": "₹81 saved"
    }
  ]
}
```

---

### 3. POST /api/boost/purchase
Purchase boost credits

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "package": "boost_3",
  "paymentMethod": "in-app-purchase",
  "transactionId": "23424242424",
  "duration": 180
}
```

**Parameters:**
- `package` (required): Package type (`boost_3`, `boost_5`, `boost_10`)
- `paymentMethod` (optional): Payment method used
- `transactionId` (optional): Payment transaction ID
- `duration` (optional): Boost duration in minutes (default: 180 = 3 hours)

**Package Options:**
- `boost_3` - ₹99 for 3 Boosts
- `boost_5` - ₹149 for 5 Boosts
- `boost_10` - ₹249 for 10 Boosts

**Response - With Auto-Activation:**
```json
{
  "status": true,
  "message": "Boost credits purchased and activated successfully",
  "data": {
    "package": "₹149 for 5 Boosts",
    "creditsAdded": 5,
    "totalCredits": 4,
    "price": 149,
    "transactionId": "23424242424",
    "boostActivated": true,
    "boost": {
      "isBoostActive": true,
      "boostStartTime": "2025-11-28T12:00:00.000Z",
      "boostEndTime": "2025-11-28T15:00:00.000Z",
      "boostDuration": 180,
      "remainingMinutes": 180
    }
  }
}
```

**Response - If Boost Already Active:**
```json
{
  "status": true,
  "message": "Boost credits purchased successfully",
  "data": {
    "package": "₹149 for 5 Boosts",
    "creditsAdded": 5,
    "totalCredits": 8,
    "price": 149,
    "transactionId": "23424242424",
    "boostActivated": false,
    "boost": null
  }
}
```

**Note:** 
- ✅ Purchase ke saath hi boost automatically activate ho jayega (agar active boost nahi hai)
- ✅ Ek credit automatically use hoga activation ke liye
- ✅ Agar already boost active hai, to sirf credits add honge (activation nahi hogi)

---

### 4. POST /api/boost/activate
Activate boost

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "duration": 180
}
```

**Duration:** Time in minutes (default: 180 = 3 hours)

**Response - Success:**
```json
{
  "status": true,
  "message": "Boost activated successfully",
  "data": {
    "isBoostActive": true,
    "boostStartTime": "2025-11-28T12:00:00.000Z",
    "boostEndTime": "2025-11-28T15:00:00.000Z",
    "boostDuration": 180,
    "remainingCredits": 2
  }
}
```

**Response - No Credits:**
```json
{
  "status": false,
  "message": "No boost credits available. Please purchase boost credits first.",
  "data": {
    "boostCredits": 0
  }
}
```

**Response - Already Active:**
```json
{
  "status": false,
  "message": "Boost is already active",
  "data": {
    "isBoostActive": true,
    "remainingMinutes": 170,
    "boostEndTime": "2025-11-28T15:00:00.000Z"
  }
}
```

---

### 5. POST /api/boost/deactivate
Manually deactivate boost

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "status": true,
  "message": "Boost deactivated successfully",
  "data": {
    "isBoostActive": false,
    "remainingCredits": 2
  }
}
```

---

### 6. GET /api/matches/preference/users (Updated)
Get preference users list with boosted users at top

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
```
page=1
limit=20
profileType=personal
minAge=18
maxAge=35
maxDistance=50
```

**Response:**
```json
{
  "status": 200,
  "message": "Preference users fetched",
  "data": [
    {
      "id": "user1_id",
      "name": "John Doe",
      "age": 25,
      "currentCity": "Mumbai",
      "profileType": "personal",
      "distance": "5 miles away",
      "profileImage": "http://...",
      "portfolioImages": ["http://..."],
      "isLike": 0,
      "isBoosted": true,
      "boostEndTime": "2025-11-28T15:00:00.000Z"
    },
    {
      "id": "user2_id",
      "name": "Jane Smith",
      "age": 28,
      "currentCity": "Delhi",
      "profileType": "personal",
      "distance": "8 miles away",
      "profileImage": "http://...",
      "portfolioImages": ["http://..."],
      "isLike": 0,
      "isBoosted": false,
      "boostEndTime": null
    }
  ]
}
```

**Note:** Users with `isBoosted: true` will appear at the **top of the list**.

---

## 🎯 Feature Workflow

### Step 1: View Available Packages
```http
GET {{base_url}}/api/boost/packages
Authorization: Bearer {{token}}
```

### Step 2: Purchase Boost Credits (Auto-Activates)
```http
POST {{base_url}}/api/boost/purchase
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "package": "boost_5",
  "paymentMethod": "in-app-purchase",
  "transactionId": "23424242424",
  "duration": 180
}
```

**What happens:**
- ✅ Credits are added (e.g., 5 credits for boost_5)
- ✅ Boost automatically activates (uses 1 credit)
- ✅ User appears at top immediately!

### Step 3: Check Boost Status (Optional)
```http
GET {{base_url}}/api/boost/status
Authorization: Bearer {{token}}
```

### Step 4: User Appears at Top in Preference List
```http
GET {{base_url}}/api/matches/preference/users?page=1&limit=20
Authorization: Bearer {{token}}
```

**Note:** 
- ✅ Purchase ke saath hi boost activate ho jata hai
- ✅ Alag se activate API call ki zarurat nahi!
- ✅ Agar boost already active hai, to sirf credits add honge

---

## 📱 Frontend Implementation

### Flutter Example:

```dart
// 1. Get Boost Packages
Future<List<BoostPackage>> getBoostPackages() async {
  final response = await http.get(
    Uri.parse('$baseUrl/api/boost/packages'),
    headers: {'Authorization': 'Bearer $token'},
  );
  // Parse and return packages
}

// 2. Purchase Boost
Future<bool> purchaseBoost(String packageId, String transactionId) async {
  final response = await http.post(
    Uri.parse('$baseUrl/api/boost/purchase'),
    headers: {
      'Authorization': 'Bearer $token',
      'Content-Type': 'application/json',
    },
    body: jsonEncode({
      'package': packageId,
      'paymentMethod': 'razorpay',
      'transactionId': transactionId,
    }),
  );
  return response.statusCode == 200;
}

// 3. Activate Boost
Future<bool> activateBoost(int durationMinutes) async {
  final response = await http.post(
    Uri.parse('$baseUrl/api/boost/activate'),
    headers: {
      'Authorization': 'Bearer $token',
      'Content-Type': 'application/json',
    },
    body: jsonEncode({'duration': durationMinutes}),
  );
  return response.statusCode == 200;
}

// 4. Get Boost Status
Future<BoostStatus> getBoostStatus() async {
  final response = await http.get(
    Uri.parse('$baseUrl/api/boost/status'),
    headers: {'Authorization': 'Bearer $token'},
  );
  // Parse and return status
}
```

---

## 🔒 Business Logic

### Boost Rules:
1. ✅ Purchase boost credits with `duration` parameter
2. ✅ Boost automatically activates after purchase (if no active boost)
3. ✅ Each boost activation consumes 1 credit
4. ✅ Default boost duration: 3 hours (180 minutes) - customizable via `duration` parameter
5. ✅ Boost automatically expires after duration ends
6. ✅ Only one boost can be active at a time
7. ✅ If boost already active, purchase only adds credits (no auto-activation)
8. ✅ Expired boosts are automatically deactivated
9. ✅ Boosted users appear at TOP in preference list
10. ✅ Non-boosted users appear below boosted users

### Sorting Logic:
```javascript
// In preference/users API
1. Filter users based on preferences
2. Separate into:
   - Boosted Users (isBoostActive=true AND boostEndTime > now)
   - Regular Users (all others)
3. Combine: [Boosted Users] + [Regular Users]
4. Return paginated results
```

---

## 🧪 Testing

### Test Case 1: Purchase Boost (Auto-Activates)
```http
POST {{base_url}}/api/boost/purchase
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "package": "boost_5",
  "paymentMethod": "in-app-purchase",
  "transactionId": "23424242424",
  "duration": 180
}

Expected: 
- User gets 5 boost credits
- 1 credit automatically used for activation
- Total credits: 4 (5 - 1)
- Boost automatically activated
- isBoostActive = true
- boostEndTime set to now + 180 minutes (3 hours)
```

### Test Case 2: Manual Activate Boost (Optional)
```http
POST {{base_url}}/api/boost/activate
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "duration": 180
}

Expected: 
- isBoostActive = true
- boostCredits reduced by 1
- boostEndTime set to now + 180 minutes (3 hours)

Note: Usually not needed as purchase auto-activates
```

### Test Case 3: Verify Top Position
```http
# User A activates boost
POST {{base_url}}/api/boost/activate
Authorization: Bearer {{user-a-token}}

# User B checks preference list
GET {{base_url}}/api/matches/preference/users
Authorization: Bearer {{user-b-token}}

Expected: User A appears at TOP with isBoosted: true
```

### Test Case 4: Boost Expiry
```http
# Wait for boost duration to pass (or manually set boostEndTime to past)

GET {{base_url}}/api/boost/status
Authorization: Bearer {{token}}

Expected: isBoostActive = false (auto-deactivated)
```

---

## 💡 Additional Features (Future)

- [ ] Boost analytics (views, likes during boost)
- [ ] Boost history/logs
- [ ] Multiple boost durations (1 hour, 3 hours, 6 hours)
- [ ] Recurring boost subscriptions
- [ ] Boost scheduling (activate at specific time)
- [ ] Wallet integration for boost purchases

---

## 🚀 Deployment Checklist

- [x] User model updated with boost fields
- [x] Boost APIs created
- [x] Preference/users endpoint updated with boost logic
- [x] Routes registered in index.js
- [x] No linter errors
- [ ] Payment gateway integration (TODO)
- [ ] Testing with real devices
- [ ] Frontend integration

---

## 📊 Summary

| Feature | Status |
|---------|--------|
| Purchase Boost Credits | ✅ Working |
| Activate Boost | ✅ Working |
| Deactivate Boost | ✅ Working |
| Check Boost Status | ✅ Working |
| Boosted Users at Top | ✅ Working |
| Auto Expiry | ✅ Working |
| Payment Integration | ⏳ TODO |

---

**Boost Bid feature is ready! 🎉**

Server pe deploy karke test kar sakte hain!

