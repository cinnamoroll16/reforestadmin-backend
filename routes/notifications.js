// routes/notifications.js - ENHANCED VERSION
const express = require('express');
const { db, admin } = require('../config/firebaseAdmin');
const router = express.Router();

// Get all notifications with advanced filtering
router.get('/', async (req, res) => {
  try {
    const { 
      targetRole, 
      read, 
      resolved, 
      hidden, 
      type, 
      priority, 
      limit = '50',
      offset = '0' 
    } = req.query;
    
    let query = db.collection('notifications')
      .orderBy('createdAt', 'desc');
    
    // Apply multiple filters
    if (targetRole && targetRole !== 'all') {
      query = query.where('targetRole', '==', targetRole);
    }
    if (read !== undefined) {
      query = query.where('read', '==', read === 'true');
    }
    if (resolved !== undefined) {
      query = query.where('resolved', '==', resolved === 'true');
    }
    if (hidden !== undefined) {
      query = query.where('hidden', '==', hidden === 'true');
    }
    if (type && type !== 'all') {
      query = query.where('type', '==', type);
    }
    if (priority && priority !== 'all') {
      query = query.where('priority', '==', priority);
    }

    const notificationsSnapshot = await query.get();
    const notifications = [];
    
    notificationsSnapshot.forEach(doc => {
      const data = doc.data();
      notifications.push({
        id: doc.id,
        ...data,
        // Convert Firestore timestamps to ISO strings
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        notif_timestamp: data.notif_timestamp?.toDate?.()?.toISOString() || data.notif_timestamp,
        resolvedAt: data.resolvedAt?.toDate?.()?.toISOString() || data.resolvedAt,
        hiddenAt: data.hiddenAt?.toDate?.()?.toISOString() || data.hiddenAt
      });
    });

    // Apply pagination
    const startIndex = parseInt(offset);
    const endIndex = startIndex + parseInt(limit);
    const paginatedNotifications = notifications.slice(startIndex, endIndex);

    res.json({
      notifications: paginatedNotifications,
      total: notifications.length,
      hasMore: endIndex < notifications.length,
      unreadCount: notifications.filter(n => !n.read).length
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch notifications',
      message: error.message 
    });
  }
});

// Get unread count by role
router.get('/count/unread', async (req, res) => {
  try {
    const { targetRole, type } = req.query;
    
    let query = db.collection('notifications')
      .where('read', '==', false);
    
    if (targetRole && targetRole !== 'all') {
      query = query.where('targetRole', '==', targetRole);
    }
    if (type && type !== 'all') {
      query = query.where('type', '==', type);
    }

    const snapshot = await query.get();
    
    res.json({ 
      unreadCount: snapshot.size,
      targetRole: targetRole || 'all',
      type: type || 'all'
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
    const { id } = req.params;
    const doc = await db.collection('notifications').doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const data = doc.data();
    res.json({
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      notif_timestamp: data.notif_timestamp?.toDate?.()?.toISOString() || data.notif_timestamp,
      resolvedAt: data.resolvedAt?.toDate?.()?.toISOString() || data.resolvedAt
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
    const { 
      title, 
      message, 
      notif_message, 
      type, 
      notification_type, 
      targetRole, 
      targetUserId,
      priority, 
      data 
    } = req.body;

    // Validation
    if (!title || (!message && !notif_message)) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'Title and message are required' 
      });
    }

    const notificationData = {
      title: title.trim(),
      notif_message: notif_message || message,
      message: message || notif_message,
      type: type || 'general',
      notification_type: notification_type || 'info',
      targetRole: targetRole || 'all',
      targetUserId: targetUserId || null,
      priority: priority || 'medium',
      data: data || {},
      read: false,
      resolved: false,
      hidden: false,
      notif_timestamp: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('notifications').add(notificationData);
    
    res.status(201).json({
      message: 'Notification created successfully',
      id: docRef.id,
      ...notificationData
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
      id: id,
      read: true
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
      resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ 
      message: 'Notification resolved',
      id: id,
      resolved: true
    });
  } catch (error) {
    console.error('Resolve notification error:', error);
    res.status(500).json({ 
      error: 'Failed to resolve notification',
      message: error.message 
    });
  }
});

// Hide notification (soft delete)
router.patch('/:id/hide', async (req, res) => {
  try {
    const { id } = req.params;
    
    const docRef = db.collection('notifications').doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    await docRef.update({
      hidden: true,
      hiddenAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ 
      message: 'Notification hidden',
      id: id,
      hidden: true
    });
  } catch (error) {
    console.error('Hide notification error:', error);
    res.status(500).json({ 
      error: 'Failed to hide notification',
      message: error.message 
    });
  }
});

// Mark multiple notifications as read
router.patch('/batch/read', async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'ids array is required'
      });
    }

    if (ids.length > 500) {
      return res.status(400).json({ 
        error: 'Too many notifications',
        message: 'Maximum 500 notifications can be updated at once'
      });
    }

    const batch = db.batch();
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    ids.forEach(id => {
      const docRef = db.collection('notifications').doc(id);
      batch.update(docRef, {
        read: true,
        updatedAt: timestamp
      });
    });

    await batch.commit();

    res.json({ 
      message: `${ids.length} notifications marked as read`,
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

// Delete notification (permanent)
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

// Get notification statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const { targetRole } = req.query;
    
    let query = db.collection('notifications');
    if (targetRole && targetRole !== 'all') {
      query = query.where('targetRole', '==', targetRole);
    }

    const snapshot = await query.get();
    const notifications = [];
    
    snapshot.forEach(doc => {
      notifications.push(doc.data());
    });

    const stats = {
      total: notifications.length,
      unread: notifications.filter(n => !n.read).length,
      read: notifications.filter(n => n.read).length,
      resolved: notifications.filter(n => n.resolved).length,
      hidden: notifications.filter(n => n.hidden).length,
      byType: {},
      byPriority: {
        high: notifications.filter(n => n.priority === 'high').length,
        medium: notifications.filter(n => n.priority === 'medium').length,
        low: notifications.filter(n => n.priority === 'low').length
      }
    };

    // Count by type
    notifications.forEach(notification => {
      const type = notification.type || 'general';
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    });

    res.json(stats);
  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch notification statistics',
      message: error.message 
    });
  }
});

module.exports = router;