//routes/auth.js
const express = require('express');
const { db, auth, admin } = require('../config/firebaseAdmin');
const router = express.Router();

// User registration
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;

    console.log('📝 Attempting to register user:', email);

    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`
    });

    console.log('✅ Firebase Auth user created:', userRecord.uid);

    // Create user document in Firestore
    const userData = {
      user_firstname: firstName,
      user_lastname: lastName,
      user_email: email,
      roleRef: `/roles/${role}`,
      user_password: "hashed_password", // In real app, use proper hashing
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'active',
      uid: userRecord.uid
    };

    await db.collection('users').doc(userRecord.uid).set(userData);
    console.log('✅ Firestore user document created');

    res.status(201).json({
      message: 'User created successfully',
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName
      }
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(400).json({ 
      error: error.message,
      details: 'Check Firebase Admin configuration and service account key'
    });
  }
});

// User login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔐 Login attempt for:', email);

    // Get user by email from Firebase Auth
    const userRecord = await auth.getUserByEmail(email);
    console.log('✅ User found in Firebase Auth:', userRecord.uid);
    
    // Get user data from Firestore
    const userDoc = await db.collection('users').doc(userRecord.uid).get();
    
    if (!userDoc.exists) {
      console.log('❌ User not found in Firestore');
      return res.status(404).json({ error: 'User not found in database' });
    }

    const userData = userDoc.data();
    console.log('✅ User data retrieved from Firestore');

    res.json({
      message: 'Login successful',
      user: {
        ...userData,
        uid: userRecord.uid,
        displayName: userRecord.displayName,
        email: userRecord.email
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    
    let errorMessage = 'Login failed';
    let statusCode = 400;

    if (error.code === 'auth/user-not-found') {
      errorMessage = 'No account found with this email';
    } else if (error.code === 'auth/wrong-password') {
      errorMessage = 'Invalid password';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address';
    }

    res.status(statusCode).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
// Forgot Password - Send reset email
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide a valid email address' 
      });
    }

    // Check if user exists
    const userQuery = await db.collection('users')
      .where('user_email', '==', email)
      .limit(1)
      .get();

    if (userQuery.empty) {
      // For security, don't reveal if email exists or not
      return res.json({ 
        success: true, 
        message: 'If an account with that email exists, a password reset link has been sent.' 
      });
    }

    // Get user data
    const userDoc = userQuery.docs[0];
    const userData = userDoc.data();

    // In a real implementation, you would:
    // 1. Generate a reset token
    // 2. Save it to the database with expiration
    // 3. Send email with reset link
    
    // For now, we'll simulate success
    console.log(`Password reset requested for: ${email}`);
    console.log(`User ID: ${userDoc.id}`);
    
    // Simulate email sending (replace with actual email service)
    // await sendResetEmail(email, resetToken);

    res.json({ 
      success: true, 
      message: 'If an account with that email exists, a password reset link has been sent.' 
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process password reset request. Please try again.' 
    });
  }
});

// Reset Password - Process the reset
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Token and new password are required' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters long' 
      });
    }

    // In a real implementation, you would:
    // 1. Verify the reset token
    // 2. Check if it's expired
    // 3. Update the user's password
    // 4. Invalidate the used token

    console.log(`Password reset attempted with token: ${token}`);
    
    // Simulate success
    res.json({ 
      success: true, 
      message: 'Password has been reset successfully' 
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to reset password. Please try again.' 
    });
  }
});
// Test Firebase connection
router.get('/test-firebase', async (req, res) => {
  try {
    // Test Firestore connection
    const testDoc = await db.collection('test').doc('connection').get();
    
    // Test Auth service
    const authTest = await auth.listUsers(1);
    
    res.json({
      firestore: 'Connected',
      auth: 'Connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Firebase connection failed',
      message: error.message
    });
  }
});

module.exports = router;