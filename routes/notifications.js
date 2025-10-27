// routes/notifications.js - FIXED AND OPTIMIZED VERSION
const express = require('express');
const { db, admin } = require('../config/firebaseAdmin');
const router = express.Router();

// Get all notifications (OPTIMIZED with pagination)
router.get('/', async (req, res) => {
  try {
    const { targetRole, read, resolved, limit = '50' } = req.query;
    
    let query = db.collection('notifications')
      .orderBy('createdAt', 'desc') // Add ordering for better performance
      .limit(parseInt(limit)); // Add limit for pagination
    
    // Apply filters
    if (targetRole) {
      query = query.where('targetRole', '==', targetRole);
    }
    if (read !== undefined) {
      query = query.where('read', '==', read === 'true');
    }
    if (resolved !== undefined) {
      query = query.where('resolved', '==', resolved === 'true');
    }

    const notificationsSnapshot = await query.get();
    const notifications = [];
    
    notificationsSnapshot.forEach(doc => {
      const data = doc.data();
      notifications.push({
        id: doc.id,
        ...data,
        // Convert Firestore timestamps to ISO strings for JSON
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        notif_timestamp: data.notif_timestamp?.toDate?.()?.toISOString() || data.notif_timestamp
      });
    });

    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch notifications',
      message: error.message 
    });
  }
});

// Get unread count by role (MUST BE BEFORE /:id to avoid route conflicts)
router.get('/count/unread', async (req, res) => {
  try {
    const { targetRole } = req.query;
    
    let query = db.collection('notifications')
      .where('read', '==', false);
    
    if (targetRole) {
      query = query.where('targetRole', '==', targetRole);
    }

    const snapshot = await query.get();
    
    res.json({ 
      unreadCount: snapshot.size,
      targetRole: targetRole || 'all'
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ 
      error: 'Failed to get unread count',
      message: error.message 
    });
  }
});
// Get notification by ID
router.get('/:id', async (req, res) => {
  try {
    const doc = await db.collection('notifications').doc(req.params.id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const data = doc.data();
    res.json({
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      notif_timestamp: data.notif_timestamp?.toDate?.()?.toISOString() || data.notif_timestamp
    });
  } catch (error) {
    console.error('Get notification error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch notification',
      message: error.message 
    });
  }
});
// Create notification
router.post('/', async (req, res) => {
  try {
    const notificationData = {
      title: req.body.title || 'Notification',
      notif_message: req.body.notif_message || req.body.message,
      type: req.body.type || 'general',
      notification_type: req.body.notification_type || 'info',
      targetRole: req.body.targetRole || 'all',
      priority: req.body.priority || 'medium',
      read: false,
      resolved: false,
      hidden: false,
      ...req.body,
      notif_timestamp: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('notifications').add(notificationData);
    
    res.status(201).json({
      message: 'Notification created successfully',
      id: docRef.id
    });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ 
      error: 'Failed to create notification',
      message: error.message 
    });
  }
});

// Mark notification as read
router.patch('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    
    const docRef = db.collection('notifications').doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    await docRef.update({
      read: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ 
      message: 'Notification marked as read',
      id: id
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ 
      error: 'Failed to mark notification as read',
      message: error.message 
    });
  }
});

// Mark notification as resolved
router.patch('/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    
    const docRef = db.collection('notifications').doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    await docRef.update({
      resolved: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ 
      message: 'Notification resolved',
      id: id
    });
  } catch (error) {
    console.error('Resolve notification error:', error);
    res.status(500).json({ 
      error: 'Failed to resolve notification',
      message: error.message 
    });
  }
});

// Mark multiple notifications as read (batch operation)
router.patch('/batch/read', async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'ids array is required'
      });
    }

    // Firestore batch supports up to 500 operations
    if (ids.length > 500) {
      return res.status(400).json({ 
        error: 'Too many notifications',
        message: 'Maximum 500 notifications can be updated at once'
      });
    }

    const batch = db.batch();
    
    ids.forEach(id => {
      const docRef = db.collection('notifications').doc(id);
      batch.update(docRef, {
        read: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    await batch.commit();

    res.json({ 
      message: 'Notifications marked as read',
      count: ids.length
    });
  } catch (error) {
    console.error('Batch mark read error:', error);
    res.status(500).json({ 
      error: 'Failed to mark notifications as read',
      message: error.message 
    });
  }
});

// Delete notification
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const docRef = db.collection('notifications').doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    await docRef.delete();

    res.json({ 
      message: 'Notification deleted successfully',
      id: id
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ 
      error: 'Failed to delete notification',
      message: error.message 
    });
  }
});

module.exports = router;