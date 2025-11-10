// config/firebaseAdmin.js
const admin = require('firebase-admin');

let serviceAccount;

try {
  // Production: Use individual environment variables (Vercel)
  if (process.env.FIREBASE_PRIVATE_KEY) {
    console.log('🔧 Using Firebase credentials from individual environment variables');
    
    serviceAccount = {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      universe_domain: 'googleapis.com'
    };
    
    console.log('✅ Firebase credentials loaded from environment variables');
    console.log('📝 Project ID:', serviceAccount.project_id);
    console.log('📧 Client Email:', serviceAccount.client_email);
  } 
  // Local development: Use JSON file
  else {
    console.log('🔧 Using Firebase credentials from serviceAccountKey.json');
    serviceAccount = require('../serviceAccountKey.json');
    console.log('📝 Project ID:', serviceAccount.project_id);
  }

  // Validate required fields
  if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
    throw new Error('Missing required Firebase credentials. Check your environment variables.');
  }

  // Initialize Firebase Admin (only if not already initialized)
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${serviceAccount.project_id}-default-rtdb.asia-southeast1.firebasedatabase.app`
    });
    
    console.log('✅ Firebase Admin initialized successfully');
  } else {
    console.log('ℹ️ Firebase Admin already initialized');
  }
  
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
