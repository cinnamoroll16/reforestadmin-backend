const admin = require('firebase-admin');

// Initialize Firebase Admin
let serviceAccount;
try {
  serviceAccount = require('../serviceAccountKey.json');
} catch (error) {
  console.error('❌ serviceAccountKey.json not found or invalid');
  console.error('💡 Please make sure serviceAccountKey.json exists in the root directory');
  process.exit(1);
}

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://reforestadmin-default-rtdb.asia-southeast1.firebasedatabase.app'
  });
  
  console.log('✅ Firebase Admin initialized successfully');
} catch (error) {
  console.error('❌ Firebase Admin initialization failed:', error.message);
  process.exit(1);
}

const db = admin.firestore();
const auth = admin.auth();

// Firestore settings
db.settings({ ignoreUndefinedProperties: true });

console.log('✅ Firestore and Auth services initialized');

module.exports = { admin, db, auth };