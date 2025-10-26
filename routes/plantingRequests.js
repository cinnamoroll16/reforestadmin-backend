const express = require('express');
const { db, admin } = require('../config/firebaseAdmin');
const router = express.Router();

// Get all planting requests
router.get('/', async (req, res) => {
  try {
    const { status, userRef } = req.query;
    let query = db.collection('plantingrequests');
    
    if (status) query = query.where('request_status', '==', status);
    if (userRef) query = query.where('userRef', '==', userRef);

    const requestsSnapshot = await query.get();
    const requests = [];
    
    requestsSnapshot.forEach(doc => {
      requests.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json(requests);
  } catch (error) {
    console.error('Get planting requests error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create planting request
router.post('/', async (req, res) => {
  try {
    const requestData = {
      ...req.body,
      request_date: new Date().toISOString().split('T')[0],
      request_status: 'pending'
    };

    const docRef = await db.collection('plantingrequests').add(requestData);
    
    // Create notification for admin
    await db.collection('notifications').add({
      title: "New Planting Request",
      notif_message: `New planting request from ${req.body.fullName} for ${req.body.preferred_date}`,
      type: "plant_request",
      notification_type: "pending",
      targetRole: "admin",
      priority: "medium",
      read: false,
      resolved: false,
      hidden: false,
      plantRequestId: docRef.id,
      createdBy: req.body.userEmail || 'unknown@example.com',
      locationRef: req.body.locationRef,
      preferredDate: req.body.preferred_date,
      requestStatus: "pending",
      notif_timestamp: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(201).json({
      message: 'Planting request created successfully',
      id: docRef.id
    });
  } catch (error) {
    console.error('Create planting request error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update request status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    await db.collection('plantingrequests').doc(id).update({
      request_status: status
    });

    res.json({ message: 'Request status updated successfully' });
  } catch (error) {
    console.error('Update request status error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;