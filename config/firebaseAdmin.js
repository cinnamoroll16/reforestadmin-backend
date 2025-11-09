// config/firebaseAdmin.js
const admin = require('firebase-admin');

let serviceAccount;

try {
  // Check if Base64 encoded service account exists (Vercel)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    console.log('🔧 Using Firebase credentials from Base64 environment variable');
    
    // Decode Base64 to JSON
    const serviceAccountJson = Buffer.from(
      process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 
      'base64'
    ).toString('utf8');
    
    serviceAccount = JSON.parse(serviceAccountJson);
    console.log('✅ Service account decoded successfully');
    console.log('📝 Project ID:', serviceAccount.project_id);
  } 
  // Fallback to individual environment variables
  else if (process.env.FIREBASE_PROJECT_ID) {
    console.log('🔧 Using Firebase credentials from individual environment variables');
    
    serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    };
  } 
  // Local development: Use JSON file
  else {
    console.log('🔧 Using Firebase credentials from serviceAccountKey.json');
    serviceAccount = require('../serviceAccountKey.json');
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://reforestadmin-default-rtdb.asia-southeast1.firebasedatabase.app'
  });
  
  console.log('✅ Firebase Admin initialized successfully');
} catch (error) {
  console.error('❌ Firebase Admin initialization failed:', error.message);
  console.error('Full error:', error);
  throw error;
}

const db = admin.firestore();
const auth = admin.auth();
const rtdb = admin.database();

db.settings({ ignoreUndefinedProperties: true });

console.log('✅ Firestore, Auth, and Realtime Database services initialized');

module.exports = { 
  admin, 
  db, 
  auth,
  rtdb
};
