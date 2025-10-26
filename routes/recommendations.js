const express = require('express');
const { db, admin } = require('../config/firebaseAdmin');
const router = express.Router();

// Get all recommendations
router.get('/', async (req, res) => {
  try {
    const recommendationsSnapshot = await db.collection('recommendations').get();
    const recommendations = [];
    
    recommendationsSnapshot.forEach(doc => {
      recommendations.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json(recommendations);
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create recommendation
router.post('/', async (req, res) => {
  try {
    const recommendationData = {
      ...req.body,
      reco_generatedAt: new Date().toISOString()
    };

    const docRef = await db.collection('recommendations').add(recommendationData);
    
    res.status(201).json({
      message: 'Recommendation created successfully',
      id: docRef.id
    });
  } catch (error) {
    console.error('Create recommendation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get recommendations by location
router.get('/location/:locationId', async (req, res) => {
  try {
    const recommendationsSnapshot = await db.collection('recommendations')
      .where('locationRef', '==', `/locations/${req.params.locationId}`)
      .get();
    
    const recommendations = [];
    recommendationsSnapshot.forEach(doc => {
      recommendations.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json(recommendations);
  } catch (error) {
    console.error('Get recommendations by location error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;