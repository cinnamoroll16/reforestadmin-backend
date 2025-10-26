const express = require('express');
const { admin } = require('../config/firebaseAdmin');
const router = express.Router();

// Get reference to RTDB
const rtdb = admin.database();

// Get all sensors
router.get('/', async (req, res) => {
  try {
    const sensorsRef = rtdb.ref('sensors');
    const snapshot = await sensorsRef.once('value');
    
    if (!snapshot.exists()) {
      return res.json([]);
    }

    const sensorsData = snapshot.val();
    const sensors = Object.keys(sensorsData).map(sensorId => {
      const sensor = sensorsData[sensorId];
      
      // Get the latest sensor data entry
      const sensordata = sensor.sensordata || {};
      const dataKeys = Object.keys(sensordata);
      const latestDataKey = dataKeys[dataKeys.length - 1];
      const latestData = sensordata[latestDataKey] || {};
      
      return {
        id: sensorId,
        latitude: sensor.latitude,
        longitude: sensor.longitude,
        location_id: sensor.location_id,
        sensor_lastCalibrationDate: sensor.sensor_lastCalibrationDate,
        sensor_location: sensor.sensor_location,
        sensor_status: sensor.sensor_status,
        // Include latest reading
        latest_reading: latestData
      };
    });

    res.json(sensors);
  } catch (error) {
    console.error('Get sensors error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get sensor data
router.get('/:sensorId/data', async (req, res) => {
  try {
    const sensorRef = rtdb.ref(`sensors/${req.params.sensorId}/sensordata`);
    const snapshot = await sensorRef.once('value');
    
    if (!snapshot.exists()) {
      return res.json([]);
    }

    const sensorData = snapshot.val();
    const dataArray = Object.keys(sensorData).map(dataId => {
      return {
        id: dataId,
        ...sensorData[dataId]
      };
    });

    // Sort by timestamp (newest first)
    dataArray.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(dataArray);
  } catch (error) {
    console.error('Get sensor data error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get specific sensor
router.get('/:sensorId', async (req, res) => {
  try {
    const sensorRef = rtdb.ref(`sensors/${req.params.sensorId}`);
    const snapshot = await sensorRef.once('value');
    
    if (!snapshot.exists()) {
      return res.status(404).json({ error: 'Sensor not found' });
    }

    const sensorData = snapshot.val();
    res.json({
      id: req.params.sensorId,
      ...sensorData
    });
  } catch (error) {
    console.error('Get sensor error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new sensor
router.post('/', async (req, res) => {
  try {
    const sensorData = req.body;
    const newSensorRef = rtdb.ref('sensors').push();
    
    await newSensorRef.set({
      ...sensorData,
      createdAt: admin.database.ServerValue.TIMESTAMP,
      updatedAt: admin.database.ServerValue.TIMESTAMP
    });

    res.status(201).json({
      message: 'Sensor created successfully',
      id: newSensorRef.key
    });
  } catch (error) {
    console.error('Create sensor error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update sensor
router.put('/:sensorId', async (req, res) => {
  try {
    const sensorRef = rtdb.ref(`sensors/${req.params.sensorId}`);
    const snapshot = await sensorRef.once('value');
    
    if (!snapshot.exists()) {
      return res.status(404).json({ error: 'Sensor not found' });
    }

    await sensorRef.update({
      ...req.body,
      updatedAt: admin.database.ServerValue.TIMESTAMP
    });

    res.json({ message: 'Sensor updated successfully' });
  } catch (error) {
    console.error('Update sensor error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add sensor data
router.post('/:sensorId/data', async (req, res) => {
  try {
    const sensorRef = rtdb.ref(`sensors/${req.params.sensorId}`);
    const snapshot = await sensorRef.once('value');
    
    if (!snapshot.exists()) {
      return res.status(404).json({ error: 'Sensor not found' });
    }

    const newDataRef = rtdb.ref(`sensors/${req.params.sensorId}/sensordata`).push();
    
    await newDataRef.set({
      ...req.body,
      timestamp: admin.database.ServerValue.TIMESTAMP
    });

    res.status(201).json({
      message: 'Sensor data added successfully',
      id: newDataRef.key
    });
  } catch (error) {
    console.error('Add sensor data error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete sensor
router.delete('/:sensorId', async (req, res) => {
  try {
    const sensorRef = rtdb.ref(`sensors/${req.params.sensorId}`);
    const snapshot = await sensorRef.once('value');
    
    if (!snapshot.exists()) {
      return res.status(404).json({ error: 'Sensor not found' });
    }

    await sensorRef.remove();
    res.json({ message: 'Sensor deleted successfully' });
  } catch (error) {
    console.error('Delete sensor error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;