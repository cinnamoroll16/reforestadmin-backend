// src/server/routes/sensorRoutes.js
const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

const db = admin.firestore();

// Get sensor location with coordinates
router.get('/api/sensors/:sensorId/location', async (req, res) => {
  try {
    const { sensorId } = req.params;
    
    // Get sensor data
    const sensorDoc = await db.collection('Sensor').doc(sensorId).get();
    
    if (!sensorDoc.exists) {
      return res.status(404).json({ error: 'Sensor not found' });
    }
    
    const sensorData = sensorDoc.data();
    const locationId = sensorData.sensor_location;
    
    // Get location coordinates
    const locationDoc = await db.collection('Location').doc(locationId).get();
    
    if (!locationDoc.exists) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    const locationData = locationDoc.data();
    
    // Return combined data
    res.json({
      sensorId: sensorDoc.id,
      locationId: locationDoc.id,
      locationName: locationData.location_name,
      latitude: parseFloat(locationData.location_latitude),
      longitude: parseFloat(locationData.location_longitude),
      sensorType: sensorData.sensor_type,
      status: sensorData.sensorStat_id
    });
    
  } catch (error) {
    console.error('Error fetching sensor location:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all sensors with their locations
router.get('/api/sensors/locations/all', async (req, res) => {
  try {
    const sensorsSnapshot = await db.collection('Sensor').get();
    const sensorsWithLocations = [];
    
    for (const sensorDoc of sensorsSnapshot.docs) {
      const sensorData = sensorDoc.data();
      const locationId = sensorData.sensor_location;
      
      const locationDoc = await db.collection('Location').doc(locationId).get();
      
      if (locationDoc.exists) {
        const locationData = locationDoc.data();
        sensorsWithLocations.push({
          sensorId: sensorDoc.id,
          locationName: locationData.location_name,
          latitude: parseFloat(locationData.location_latitude),
          longitude: parseFloat(locationData.location_longitude),
          sensorType: sensorData.sensor_type
        });
      }
    }
    
    res.json(sensorsWithLocations);
    
  } catch (error) {
    console.error('Error fetching all sensors:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;