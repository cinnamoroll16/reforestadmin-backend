// config/firebaseAdmin.js
const admin = require('firebase-admin');

let isInitialized = false;
let initializationError = null;

function initializeFirebase() {
  if (isInitialized) {
    return; // Already initialized
  }

  try {
    let serviceAccount;

    // Try BASE64 first (easiest for Vercel)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      console.log('🔧 Loading Firebase from BASE64');
      const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
      serviceAccount = JSON.parse(decoded);
    }
    // Try individual variables
    else if (process.env.FIREBASE_PRIVATE_KEY) {
      console.log('🔧 Loading Firebase from individual variables');
      serviceAccount = {
        type: 'service_account',
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID || '',
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        universe_domain: 'googleapis.com'
      };
    }
    // Local development
    else {
      console.log('🔧 Loading Firebase from local JSON file');
      serviceAccount = require('../serviceAccountKey.json');
    }

    // Validate
    if (!serviceAccount || !serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
      throw new Error('Invalid or missing Firebase credentials');
    }

    // Initialize only if not already done
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${serviceAccount.project_id}-default-rtdb.asia-southeast1.firebasedatabase.app`
      });
      console.log('✅ Firebase initialized:', serviceAccount.project_id);
    }

    isInitialized = true;
  } catch (error) {
    initializationError = error;
    console.error('❌ Firebase initialization error:', error.message);
    // Don't throw - let the app start and handle errors gracefully
  }
}

// Initialize immediately
initializeFirebase();

// Export getters that initialize on-demand
const getDb = () => {
  if (!isInitialized && !initializationError) {
    initializeFirebase();
  }
  if (initializationError) {
    throw new Error(`Firebase not initialized: ${initializationError.message}`);
  }
  return admin.firestore();
};

const getAuth = () => {
  if (!isInitialized && !initializationError) {
    initializeFirebase();
  }
  if (initializationError) {
    throw new Error(`Firebase not initialized: ${initializationError.message}`);
  }
  return admin.auth();
};

const getRtdb = () => {
  if (!isInitialized && !initializationError) {
    initializeFirebase();
  }
  if (initializationError) {
    throw new Error(`Firebase not initialized: ${initializationError.message}`);
  }
  return admin.database();
};

// Set Firestore settings
if (isInitialized) {
  try {
    getDb().settings({ ignoreUndefinedProperties: true });
  } catch (e) {
    console.warn('Could not set Firestore settings:', e.message);
  }
}

module.exports = {
  admin,
  get db() { return getDb(); },
  get auth() { return getAuth(); },
  get rtdb() { return getRtdb(); },
  isInitialized: () => isInitialized,
  initializationError: () => initializationError
};
