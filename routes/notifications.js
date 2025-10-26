const express = require('express');
const { db, admin } = require('../config/firebaseAdmin');
const router = express.Router();

// Get all notifications
router.get('/', async (req, res) => {
  try {
    const { targetRole, read, resolved } = req.query;
    let query = db.collection('notifications');
    
    if (targetRole) query = query.where('targetRole', '==', targetRole);
    if (read !== undefined) query = query.where('read', '==', read === 'true');
    if (resolved !== undefined) query = query.where('resolved', '==', resolved === 'true');

    const notificationsSnapshot = await query.get();
    const notifications = [];
    
    notificationsSnapshot.forEach(doc => {
      notifications.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create notification
router.post('/', async (req, res) => {
  try {
    const notificationData = {
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
    res.status(500).json({ error: error.message });
  }
});

// Mark notification as read
router.patch('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.collection('notifications').doc(id).update({
      read: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark notification as resolved
router.patch('/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.collection('notifications').doc(id).update({
      resolved: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ message: 'Notification resolved' });
  } catch (error) {
    console.error('Resolve notification error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;