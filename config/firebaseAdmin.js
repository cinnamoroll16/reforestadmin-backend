// config/firebaseAdmin.js
const admin = require('firebase-admin');

// Initialize Firebase Admin using environment variables
let serviceAccount;

try {
  // Check if we're in production (Vercel) or local development
  if (process.env.FIREBASE_PROJECT_ID) {
    // Production: Use environment variables
    serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    };
    console.log('🔧 Using Firebase credentials from environment variables');
  } else {
    // Local development: Use JSON file
    serviceAccount = require('../serviceAccountKey.json');
    console.log('🔧 Using Firebase credentials from serviceAccountKey.json');
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://reforestadmin-default-rtdb.asia-southeast1.firebasedatabase.app'
  });
  
  console.log('✅ Firebase Admin initialized successfully');
} catch (error) {
  console.error('❌ Firebase Admin initialization failed:', error.message);
  console.error('💡 Make sure environment variables are set in Vercel or serviceAccountKey.json exists locally');
  throw error; // Don't exit in production, let the error handler deal with it
}

// Initialize services
const db = admin.firestore();
const auth = admin.auth();
const rtdb = admin.database();

// Firestore settings
db.settings({ ignoreUndefinedProperties: true });

console.log('✅ Firestore, Auth, and Realtime Database services initialized');

module.exports = { 
  admin, 
  db, 
  auth,
  rtdb
};