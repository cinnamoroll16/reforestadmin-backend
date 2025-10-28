// routes/plantingrequests.js - UPDATED AND IMPROVED
const express = require('express');
const { db, admin } = require('../config/firebaseAdmin');
const router = express.Router();

// Get all planting requests with better filtering
router.get('/', async (req, res) => {
  try {
    const { status, userId, limit = '50', offset = '0' } = req.query;
    
    let query = db.collection('plantingrequests')
      .orderBy('request_date', 'desc');
    
    // Apply filters
    if (status && status !== 'all') {
      query = query.where('request_status', '==', status);
    }
    if (userId) {
      query = query.where('userRef', '==', userId);
    }

    const requestsSnapshot = await query.get();
    const requests = [];
    
    requestsSnapshot.forEach(doc => {
      const data = doc.data();
      requests.push({
        id: doc.id,
        ...data,
        // Convert Firestore timestamps properly
        request_date: data.request_date?.toDate?.()?.toISOString() || data.request_date,
        reviewedAt: data.reviewedAt?.toDate?.()?.toISOString() || data.reviewedAt,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
      });
    });

    // Apply pagination manually since Firestore doesn't support offset natively
    const startIndex = parseInt(offset);
    const endIndex = startIndex + parseInt(limit);
    const paginatedRequests = requests.slice(startIndex, endIndex);

    res.json({
      requests: paginatedRequests,
      total: requests.length,
      hasMore: endIndex < requests.length
    });
  } catch (error) {
    console.error('Get planting requests error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch planting requests',
      message: error.message 
    });
  }
});

// Get planting request by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection('plantingrequests').doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Planting request not found' });
    }

    const data = doc.data();
    res.json({
      id: doc.id,
      ...data,
      request_date: data.request_date?.toDate?.()?.toISOString() || data.request_date,
      reviewedAt: data.reviewedAt?.toDate?.()?.toISOString() || data.reviewedAt,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
    });
  } catch (error) {
    console.error('Get planting request error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch planting request',
      message: error.message 
    });
  }
});

// Update planting request status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewedBy, adminNotes } = req.body;
    
    if (!status) {
      return res.status(400).json({ 
        error: 'Status is required',
        message: 'Please provide a status (approved, rejected, pending)' 
      });
    }

    const validStatuses = ['pending', 'approved', 'rejected', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status',
        message: `Status must be one of: ${validStatuses.join(', ')}` 
      });
    }

    const docRef = db.collection('plantingrequests').doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Planting request not found' });
    }
    
    const updateData = {
      request_status: status,
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    if (reviewedBy) {
      updateData.reviewedBy = reviewedBy;
    }
    
    if (adminNotes) {
      updateData.admin_notes = adminNotes;
    }

    await docRef.update(updateData);

    // Create notification for status change
    const requestData = doc.data();
    if (requestData.userRef) {
      try {
        const notificationData = {
          type: `request_${status}`,
          title: `Planting Request ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          message: `Your planting request for ${requestData.preferred_date} has been ${status}`,
          targetRole: 'user',
          targetUserId: requestData.userRef,
          data: {
            plantRequestId: id,
            status: status,
            preferredDate: requestData.preferred_date
          },
          read: false,
          resolved: false,
          priority: status === 'rejected' ? 'high' : 'medium'
        };

        await db.collection('notifications').add({
          ...notificationData,
          notif_timestamp: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (notificationError) {
        console.warn('Failed to create status notification:', notificationError);
        // Don't fail the main request if notification fails
      }
    }

    res.json({ 
      message: `Planting request ${status} successfully`,
      id: id,
      status: status,
      reviewedBy: reviewedBy || 'System'
    });
  } catch (error) {
    console.error('Update planting request error:', error);
    res.status(500).json({ 
      error: 'Failed to update planting request',
      message: error.message 
    });
  }
});

// Create planting request
router.post('/', async (req, res) => {
  try {
    const { fullName, locationRef, preferred_date, request_notes, userRef } = req.body;
    
    // Validation
    if (!fullName || !locationRef || !preferred_date || !userRef) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'fullName, locationRef, preferred_date, and userRef are required' 
      });
    }

    const requestData = {
      fullName: fullName.trim(),
      locationRef: locationRef,
      preferred_date: preferred_date,
      request_notes: request_notes || '',
      request_status: 'pending',
      userRef: userRef,
      request_date: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('plantingrequests').add(requestData);
    
    // Update with requestId
    await docRef.update({
      requestId: docRef.id
    });

    // Create notification for admin
    try {
      const notificationData = {
        type: 'plant_request',
        title: 'New Planting Request',
        message: `New planting request from ${fullName} for ${preferred_date}`,
        targetRole: 'admin',
        data: {
          plantRequestId: docRef.id,
          userRef: userRef,
          locationRef: locationRef,
          preferredDate: preferred_date
        },
        read: false,
        resolved: false,
        priority: 'medium'
      };

      await db.collection('notifications').add({
        ...notificationData,
        notif_timestamp: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (notificationError) {
      console.warn('Failed to create admin notification:', notificationError);
      // Don't fail the main request if notification fails
    }

    res.status(201).json({
      message: 'Planting request created successfully',
      id: docRef.id,
      requestId: docRef.id
    });
  } catch (error) {
    console.error('Create planting request error:', error);
    res.status(500).json({ 
      error: 'Failed to create planting request',
      message: error.message 
    });
  }
});

// Delete planting request (admin only)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const docRef = db.collection('plantingrequests').doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Planting request not found' });
    }
    
    await docRef.delete();

    res.json({ 
      message: 'Planting request deleted successfully',
      id: id
    });
  } catch (error) {
    console.error('Delete planting request error:', error);
    res.status(500).json({ 
      error: 'Failed to delete planting request',
      message: error.message 
    });
  }
});

// Get planting requests statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const snapshot = await db.collection('plantingrequests').get();
    const requests = [];
    
    snapshot.forEach(doc => {
      requests.push(doc.data());
    });

    const stats = {
      total: requests.length,
      pending: requests.filter(r => r.request_status === 'pending').length,
      approved: requests.filter(r => r.request_status === 'approved').length,
      rejected: requests.filter(r => r.request_status === 'rejected').length,
      completed: requests.filter(r => r.request_status === 'completed').length
    };

    res.json(stats);
  } catch (error) {
    console.error('Get planting requests stats error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch planting requests statistics',
      message: error.message 
    });
  }
});

module.exports = router;