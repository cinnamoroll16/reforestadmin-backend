const express = require('express');
const router = express.Router();
const { db } = require('../config/firebaseAdmin');

// GET all recommendations
router.get('/', async (req, res) => {
  try {
    const snapshot = await db.collection('recommendations')
      .orderBy('reco_generatedAt', 'desc')
      .get();
    
    const recommendations = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      // Filter out deleted items in code instead of query
      if (data.deleted !== true) {
        recommendations.push({
          id: doc.id,
          sensorConditions: data.sensorConditions || {},
          ...data
        });
      }
    });
    
    res.json(recommendations);
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});
// GET single recommendation
router.get('/:id', async (req, res) => {
  try {
    const doc = await db.collection('recommendations').doc(req.params.id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }
    
    const data = doc.data();
    res.json({
      id: doc.id,
      sensorConditions: data.sensorConditions || {}, // Ensure sensorConditions is included
      ...data
    });
  } catch (error) {
    console.error('Error fetching recommendation:', error);
    res.status(500).json({ error: 'Failed to fetch recommendation' });
  }
});

// DELETE recommendation
router.delete('/:id', async (req, res) => {
  try {
    await db.collection('recommendations').doc(req.params.id).delete();
    res.json({ message: 'Recommendation deleted successfully' });
  } catch (error) {
    console.error('Error deleting recommendation:', error);
    res.status(500).json({ error: 'Failed to delete recommendation' });
  }
});

module.exports = router;