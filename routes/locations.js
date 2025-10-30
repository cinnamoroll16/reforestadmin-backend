// Backend: routes/locations.js (or wherever your location routes are)

const express = require('express');
const router = express.Router();
const { db } = require('../config/firebaseAdmin');

// GET single location by ID
router.get('/:id', async (req, res) => {
  try {
    const locationId = req.params.id;
    console.log(`📍 Fetching location: ${locationId}`);
    
    const doc = await db.collection('locations').doc(locationId).get();
    
    if (!doc.exists) {
      console.log(`❌ Location not found: ${locationId}`);
      return res.status(404).json({ 
        error: 'Location not found',
        locationId: locationId 
      });
    }
    
    const locationData = {
      id: doc.id,
      ...doc.data()
    };
    
    console.log(`✅ Location found:`, locationData);
    res.json(locationData);
  } catch (error) {
    console.error('❌ Error fetching location:', error);
    res.status(500).json({ error: 'Failed to fetch location' });
  }
});

// GET all locations
router.get('/', async (req, res) => {
  try {
    const snapshot = await db.collection('locations').get();
    
    const locations = [];
    snapshot.forEach(doc => {
      locations.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.json(locations);
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

module.exports = router;
