const express = require('express');
const { db, admin } = require('../config/firebaseAdmin');
const router = express.Router();

// Get all planting records
router.get('/', async (req, res) => {
  try {
    const recordsSnapshot = await db.collection('plantingrecords').get();
    const records = [];
    
    recordsSnapshot.forEach(doc => {
      records.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json(records);
  } catch (error) {
    console.error('Get planting records error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create planting record
router.post('/', async (req, res) => {
  try {
    const recordData = {
      ...req.body,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('plantingrecords').add(recordData);
    
    res.status(201).json({
      message: 'Planting record created successfully',
      id: docRef.id
    });
  } catch (error) {
    console.error('Create planting record error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;