// config/firebaseAdmin.js
const admin = require('firebase-admin');

let serviceAccount;

try {
  // Check if Base64 encoded service account exists (Vercel/Production)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    console.log('🔧 Using Firebase credentials from Base64 environment variable');
    
    // Decode Base64 to JSON
    const serviceAccountJson = Buffer.from(
      process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 
      'base64'
    ).toString('utf8');
    
    serviceAccount = JSON.parse(serviceAccountJson);
    
    // Validate required fields
    if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
      throw new Error('Invalid service account: missing required fields (project_id, private_key, client_email)');
    }
    
    console.log('✅ Service account decoded successfully');
    console.log('📝 Project ID:', serviceAccount.project_id);
    console.log('📧 Client Email:', serviceAccount.client_email);
  } 
  // Fallback to individual environment variables
  else if (process.env.FIREBASE_PROJECT_ID) {
    console.log('🔧 Using Firebase credentials from individual environment variables');
    
    // IMPORTANT: Use snake_case property names that Firebase expects
    serviceAccount = {
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
    };
    
    console.log('📝 Project ID:', serviceAccount.project_id);
    console.log('📧 Client Email:', serviceAccount.client_email);
  } 
  // Local development: Use JSON file
  else {
    console.log('🔧 Using Firebase credentials from serviceAccountKey.json');
    serviceAccount = require('../serviceAccountKey.json');
    console.log('📝 Project ID:', serviceAccount.project_id);
  }

  // Initialize Firebase Admin (only if not already initialized)
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://reforestadmin-default-rtdb.asia-southeast1.firebasedatabase.app'
    });
    
    console.log('✅ Firebase Admin initialized successfully');
  } else {
    console.log('ℹ️ Firebase Admin already initialized');
  }
  
} catch (error) {
  console.error('❌ Firebase Admin initialization failed:', error.message);
  console.error('Full error:', error);
  
  // Additional debugging info
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    console.error('🔍 Base64 length:', process.env.FIREBASE_SERVICE_ACCOUNT_BASE64.length);
    console.error('🔍 First 50 chars:', process.env.FIREBASE_SERVICE_ACCOUNT_BASE64.substring(0, 50));
  }
  
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
