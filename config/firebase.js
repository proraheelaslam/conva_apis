const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// Note: Place your firebase service account JSON file in the config folder
// Download it from: Firebase Console > Project Settings > Service Accounts > Generate New Private Key

let firebaseApp;

try {
  // Option 1: Using service account file
  const serviceAccount = require('./firebase-service-account.json');
  
  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  
  console.log('✅ Firebase Admin initialized successfully');
} catch (error) {
  console.log('⚠️ Firebase Admin initialization skipped:', error.message);
  
  // Option 2: Using environment variables (uncomment if needed)
  /*
  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  });
  */
}

module.exports = admin;

