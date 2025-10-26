const express = require('express');
const { admin } = require('../config/firebaseAdmin');
const router = express.Router();

// Get reference to RTDB
const rtdb = admin.database();

// Get all locations
router.get('/', async (req, res) => {
  try {
    const locationsRef = rtdb.ref('locations');
    const snapshot = await locationsRef.once('value');
    
    if (!snapshot.exists()) {
      return res.json([]);
    }

    const locationsData = snapshot.val();
    const locations = Object.keys(locationsData).map(locationId => {
      return {
        id: locationId,
        ...locationsData[locationId]
      };
    });

    res.json(locations);
  } catch (error) {
    console.error('Get locations error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get specific location
router.get('/:locationId', async (req, res) => {
  try {
    const locationRef = rtdb.ref(`locations/${req.params.locationId}`);
    const snapshot = await locationRef.once('value');
    
    if (!snapshot.exists()) {
      return res.status(404).json({ error: 'Location not found' });
    }

    const locationData = snapshot.val();
    res.json({
      id: req.params.locationId,
      ...locationData
    });
  } catch (error) {
    console.error('Get location error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;