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

// Forgot Password - Generate reset link
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

    // Check if user exists in Firebase Auth
    try {
      const userRecord = await auth.getUserByEmail(email);
      console.log('✅ User found in Firebase Auth:', userRecord.uid);

      // Generate password reset link
      const actionCodeSettings = {
        url: process.env.FRONTEND_URL || 'http://localhost:3000/reset-password',
        handleCodeInApp: true // This must be true for mobile apps
      };

      // Generate the password reset link
      const resetLink = await auth.generatePasswordResetLink(email, actionCodeSettings);
      
      console.log('✅ Password reset link generated for:', email);
      
      // In a production environment, you would send this link via email
      // For development, we'll return it in the response
      if (process.env.NODE_ENV === 'development') {
        console.log('🔗 Reset link (dev only):', resetLink);
        
        res.json({ 
          success: true, 
          message: 'Password reset link has been generated.',
          resetLink: resetLink, // Only in development
          userId: userRecord.uid
        });
      } else {
        // In production, send email here using your email service
        // await sendPasswordResetEmail(email, resetLink);
        
        res.json({ 
          success: true, 
          message: 'If an account with that email exists, a password reset link has been sent.' 
        });
      }

    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // For security, don't reveal if email exists or not
        console.log('ℹ️ User not found (security):', email);
        res.json({ 
          success: true, 
          message: 'If an account with that email exists, a password reset link has been sent.' 
        });
      } else {
        throw error;
      }
    }

  } catch (error) {
    console.error('❌ Forgot password error:', error);
    
    let errorMessage = 'Failed to process password reset request';
    
    if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address';
    } else if (error.code === 'auth/operation-not-allowed') {
      errorMessage = 'Password reset is not enabled';
    }
    
    res.status(500).json({ 
      success: false, 
      message: errorMessage 
    });
  }
});

// Verify reset password OOB code
router.post('/verify-reset-code', async (req, res) => {
  try {
    const { oobCode } = req.body;

    if (!oobCode) {
      return res.status(400).json({ 
        success: false, 
        message: 'Reset code is required' 
      });
    }

    // Verify the password reset code
    const email = await auth.verifyPasswordResetCode(oobCode);
    
    console.log('✅ Reset code verified for email:', email);
    
    res.json({ 
      success: true, 
      email: email,
      message: 'Reset code is valid'
    });

  } catch (error) {
    console.error('❌ Verify reset code error:', error);
    
    let errorMessage = 'Invalid or expired reset link';
    
    if (error.code === 'auth/expired-action-code') {
      errorMessage = 'Reset link has expired';
    } else if (error.code === 'auth/invalid-action-code') {
      errorMessage = 'Invalid reset link';
    } else if (error.code === 'auth/user-disabled') {
      errorMessage = 'This account has been disabled';
    } else if (error.code === 'auth/user-not-found') {
      errorMessage = 'User account not found';
    }
    
    res.status(400).json({ 
      success: false, 
      message: errorMessage 
    });
  }
});

// Confirm password reset
router.post('/confirm-password-reset', async (req, res) => {
  try {
    const { oobCode, newPassword } = req.body;

    if (!oobCode || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Reset code and new password are required' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters long' 
      });
    }

    // Confirm the password reset
    const email = await auth.verifyPasswordResetCode(oobCode);
    await auth.confirmPasswordReset(oobCode, newPassword);
    
    console.log('✅ Password reset successful for:', email);
    
    // Get user data to return
    const userRecord = await auth.getUserByEmail(email);
    const userDoc = await db.collection('users').doc(userRecord.uid).get();
    const userData = userDoc.data();

    // Log the password reset event
    await db.collection('password_reset_logs').add({
      userId: userRecord.uid,
      email: email,
      resetAt: admin.firestore.FieldValue.serverTimestamp(),
      ip: req.ip
    });

    res.json({ 
      success: true, 
      message: 'Password has been reset successfully',
      user: {
        email: email,
        uid: userRecord.uid,
        displayName: userRecord.displayName
      }
    });

  } catch (error) {
    console.error('❌ Confirm password reset error:', error);
    
    let errorMessage = 'Failed to reset password';
    
    if (error.code === 'auth/expired-action-code') {
      errorMessage = 'Reset link has expired. Please request a new one.';
    } else if (error.code === 'auth/invalid-action-code') {
      errorMessage = 'Invalid reset link';
    } else if (error.code === 'auth/user-disabled') {
      errorMessage = 'This account has been disabled';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Password is too weak';
    }
    
    res.status(400).json({ 
      success: false, 
      message: errorMessage 
    });
  }
});

// Change password (for authenticated users)
router.post('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword, userId } = req.body;

    if (!currentPassword || !newPassword || !userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Current password, new password, and user ID are required' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'New password must be at least 6 characters long' 
      });
    }

    // Note: Firebase Admin SDK doesn't have a direct way to verify current password
    // You would typically use Firebase Client SDK for this, or implement your own verification
    // For now, we'll update the password directly (use with caution)
    
    await auth.updateUser(userId, {
      password: newPassword
    });

    console.log('✅ Password changed successfully for user:', userId);

    res.json({ 
      success: true, 
      message: 'Password changed successfully' 
    });

  } catch (error) {
    console.error('❌ Change password error:', error);
    
    let errorMessage = 'Failed to change password';
    
    if (error.code === 'auth/weak-password') {
      errorMessage = 'Password is too weak';
    } else if (error.code === 'auth/user-not-found') {
      errorMessage = 'User not found';
    }
    
    res.status(400).json({ 
      success: false, 
      message: errorMessage 
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