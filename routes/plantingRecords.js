// routes/plantingrecords.js
const express = require('express');
const { db } = require('../config/firebaseAdmin');
const router = express.Router();

// Get planting records (completed tasks)
router.get('/', async (req, res) => {
  try {
    let query = db.collection('plantingrecords');
    
    // You can add filters here if needed
    const snapshot = await query.get();
    const records = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      records.push({
        id: doc.id,
        ...data,
        record_date: data.record_date || data.createdAt?.toDate?.() || new Date(),
        // Convert timestamps to ISO strings for frontend
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
      });
    });

    console.log(`✅ Found ${records.length} planting records`);
    res.json(records);
  } catch (error) {
    console.error('Get planting records error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get planting record by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection('plantingrecords').doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Planting record not found' });
    }

    const data = doc.data();
    res.json({
      id: doc.id,
      ...data,
      record_date: data.record_date || data.createdAt?.toDate?.() || new Date(),
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
    });
  } catch (error) {
    console.error('Get planting record error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;