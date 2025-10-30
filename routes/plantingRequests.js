// routes/plantingrequests.js
const express = require('express');
const { db } = require('../config/firebaseAdmin');
const router = express.Router();

// Get planting requests - FIXED: Query the correct collection
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    let query = db.collection('plantingrequests');
    
    if (status) {
      query = query.where('request_status', '==', status);
    }
    
    query = query.orderBy('request_date', 'desc');

    const snapshot = await query.get();
    const requests = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      requests.push({
        id: doc.id,
        requestId: doc.id, // Ensure requestId is populated
        ...data,
        // Ensure consistent field names
        request_status: data.request_status || 'pending',
        fullName: data.fullName || data.planterName || 'Unknown User',
        locationRef: data.locationRef || 'Unknown Location'
      });
    });

    console.log(`✅ Found ${requests.length} planting requests`);
    res.json(requests);
  } catch (error) {
    console.error('Get planting requests error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update planting request status - FIXED: Update correct collection
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewedBy } = req.body;
    
    const updateData = {
      request_status: status,
      updatedAt: new Date(),
    };
    
    if (reviewedBy) {
      updateData.reviewedBy = reviewedBy;
      updateData.reviewedAt = new Date();
    }
    
    await db.collection('plantingrequests').doc(id).update(updateData);

    console.log(`✅ Planting request ${id} updated to status: ${status}`);
    res.json({ message: `Planting request ${status}`, id });
  } catch (error) {
    console.error('Update planting request error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single planting request by ID
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
      requestId: doc.id,
      ...data,
      request_status: data.request_status || 'pending'
    });
  } catch (error) {
    console.error('Get planting request error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;