// config/firebaseAdmin.js
const admin = require('firebase-admin');

let serviceAccount;

try {
  if (process.env.FIREBASE_PROJECT_ID) {
    // Production: Use environment variables
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    
    // Handle different private key formats
    const formattedPrivateKey = privateKey
      ? privateKey.replace(/\\n/g, '\n') // Replace literal \n with actual newlines
      : null;
    
    serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: formattedPrivateKey,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    };
    
    console.log('🔧 Using Firebase credentials from environment variables');
    console.log('📝 Private key length:', formattedPrivateKey?.length);
    console.log('📝 Private key starts with:', formattedPrivateKey?.substring(0, 30));
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