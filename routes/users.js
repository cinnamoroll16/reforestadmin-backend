// routes/users.js
const express = require('express');
const { db, admin } = require('../config/firebaseAdmin');
const router = express.Router();

// Middleware to verify Firebase token
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Get current user profile
router.get('/me', verifyToken, async (req, res) => {
  try {
    console.log('🔍 Fetching user profile for UID:', req.user.uid);
    
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    
    if (!userDoc.exists) {
      console.log('❌ User document not found for UID:', req.user.uid);
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    console.log('✅ User data found:', {
      id: userDoc.id,
      email: userData.user_email,
      firstName: userData.user_Firstname,
      lastName: userData.user_Lastname
    });

    // Transform data to match frontend expectations
    const transformedData = {
      id: userDoc.id,
      uid: req.user.uid,
      // Map Firestore fields to frontend expected fields
      user_firstname: userData.user_Firstname || userData.user_firstname || '',
      user_middlename: userData.user_Middlename || userData.user_middlename || '',
      user_lastname: userData.user_Lastname || userData.user_lastname || '',
      user_email: userData.user_email || userData.email || '',
      phone: userData.phone || userData.user_phone || '',
      organization: userData.organization || 'DENR',
      designation: userData.designation || 'System Administrator',
      department: userData.department || 'Administration',
      role: userData.role || 'admin',
      notifications: userData.notifications !== undefined ? userData.notifications : true,
      twoFactor: userData.twoFactor || false,
      theme: userData.theme || 'light',
      dashboardLayout: userData.dashboardLayout || 'default',
      deactivated: userData.deactivated || false,
      lastLogin: userData.lastLogin || null,
      createdAt: userData.createdAt || null,
      updatedAt: userData.updatedAt || null
    };

    res.json(transformedData);
  } catch (error) {
    console.error('❌ Get user profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all users
router.get('/', async (req, res) => {
  try {
    const usersSnapshot = await db.collection('users').get();
    const users = [];
    
    usersSnapshot.forEach(doc => {
      users.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.params.id).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: userDoc.id,
      ...userDoc.data()
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('users').doc(id).update(updateData);
    
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete user (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.collection('users').doc(id).update({
      deactivated: true,
      deactivatedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'inactive'
    });

    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;