// routes/sensors.js
const express = require('express');
const { rtdb, admin } = require('../config/firebaseAdmin');
const { authenticateUser, hasRole } = require('../middleware/auth');
const router = express.Router();

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
        sensor_type: sensor.sensor_type,
        // Include latest reading
        latest_reading: latestData,
        last_updated: sensor.updatedAt || sensor.createdAt
      };
    });

    // Sort by last updated (most recent first)
    sensors.sort((a, b) => (b.last_updated || 0) - (a.last_updated || 0));

    res.json(sensors);
  } catch (error) {
    console.error('Get sensors error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch sensors',
      message: error.message 
    });
  }
});

// Get sensor data (with pagination and filtering)
router.get('/:sensorId/data', async (req, res) => {
  try {
    const { limit = 100, startDate, endDate } = req.query;
    
    const sensorRef = rtdb.ref(`sensors/${req.params.sensorId}/sensordata`);
    let query = sensorRef;

    // Apply limit
    query = query.limitToLast(parseInt(limit));

    const snapshot = await query.once('value');
    
    if (!snapshot.exists()) {
      return res.json([]);
    }

    const sensorData = snapshot.val();
    let dataArray = Object.keys(sensorData).map(dataId => {
      return {
        id: dataId,
        ...sensorData[dataId]
      };
    });

    // Filter by date range if provided
    if (startDate || endDate) {
      dataArray = dataArray.filter(reading => {
        const readingDate = new Date(reading.timestamp || reading.date);
        if (startDate && readingDate < new Date(startDate)) return false;
        if (endDate && readingDate > new Date(endDate)) return false;
        return true;
      });
    }

    // Sort by timestamp (newest first)
    dataArray.sort((a, b) => {
      const dateA = new Date(b.timestamp || b.date || 0);
      const dateB = new Date(a.timestamp || a.date || 0);
      return dateA - dateB;
    });

    res.json(dataArray);
  } catch (error) {
    console.error('Get sensor data error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch sensor data',
      message: error.message 
    });
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
    
    // Get latest reading
    const sensordata = sensorData.sensordata || {};
    const dataKeys = Object.keys(sensordata);
    const latestDataKey = dataKeys[dataKeys.length - 1];
    const latestData = sensordata[latestDataKey] || {};

    res.json({
      id: req.params.sensorId,
      ...sensorData,
      latest_reading: latestData,
      reading_count: dataKeys.length
    });
  } catch (error) {
    console.error('Get sensor error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch sensor',
      message: error.message 
    });
  }
});

// Create new sensor (protected - admin/officer only)
router.post('/', authenticateUser, hasRole('admin', 'officer'), async (req, res) => {
  try {
    const { 
      latitude, 
      longitude, 
      location_id,
      sensor_location,
      sensor_type,
      sensor_lastCalibrationDate 
    } = req.body;

    // Validation
    if (!latitude || !longitude || !location_id || !sensor_location) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['latitude', 'longitude', 'location_id', 'sensor_location']
      });
    }

    const newSensorRef = rtdb.ref('sensors').push();
    
    const sensorData = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      location_id,
      sensor_location,
      sensor_type: sensor_type || 'environmental',
      sensor_status: 'active',
      sensor_lastCalibrationDate: sensor_lastCalibrationDate || new Date().toISOString().split('T')[0],
      createdBy: req.user.uid,
      createdAt: admin.database.ServerValue.TIMESTAMP,
      updatedAt: admin.database.ServerValue.TIMESTAMP
    };

    await newSensorRef.set(sensorData);

    res.status(201).json({
      message: 'Sensor created successfully',
      id: newSensorRef.key,
      sensor: sensorData
    });
  } catch (error) {
    console.error('Create sensor error:', error);
    res.status(500).json({ 
      error: 'Failed to create sensor',
      message: error.message 
    });
  }
});

// Update sensor (protected - admin/officer only)
router.put('/:sensorId', authenticateUser, hasRole('admin', 'officer'), async (req, res) => {
  try {
    const sensorRef = rtdb.ref(`sensors/${req.params.sensorId}`);
    const snapshot = await sensorRef.once('value');
    
    if (!snapshot.exists()) {
      return res.status(404).json({ error: 'Sensor not found' });
    }

    const updateData = {
      ...req.body,
      updatedBy: req.user.uid,
      updatedAt: admin.database.ServerValue.TIMESTAMP
    };

    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.createdBy;
    delete updateData.sensordata;

    await sensorRef.update(updateData);

    res.json({ 
      message: 'Sensor updated successfully',
      id: req.params.sensorId
    });
  } catch (error) {
    console.error('Update sensor error:', error);
    res.status(500).json({ 
      error: 'Failed to update sensor',
      message: error.message 
    });
  }
});

// Add sensor data reading (protected - admin/officer only)
router.post('/:sensorId/data', authenticateUser, hasRole('admin', 'officer'), async (req, res) => {
  try {
    const sensorRef = rtdb.ref(`sensors/${req.params.sensorId}`);
    const snapshot = await sensorRef.once('value');
    
    if (!snapshot.exists()) {
      return res.status(404).json({ error: 'Sensor not found' });
    }

    const newDataRef = rtdb.ref(`sensors/${req.params.sensorId}/sensordata`).push();
    
    const readingData = {
      ...req.body,
      recordedBy: req.user.uid,
      timestamp: req.body.timestamp || admin.database.ServerValue.TIMESTAMP
    };

    await newDataRef.set(readingData);

    // Update sensor's last updated timestamp
    await sensorRef.update({
      updatedAt: admin.database.ServerValue.TIMESTAMP
    });

    res.status(201).json({
      message: 'Sensor data added successfully',
      id: newDataRef.key,
      reading: readingData
    });
  } catch (error) {
    console.error('Add sensor data error:', error);
    res.status(500).json({ 
      error: 'Failed to add sensor data',
      message: error.message 
    });
  }
});

// Delete sensor (protected - admin only)
router.delete('/:sensorId', authenticateUser, hasRole('admin'), async (req, res) => {
  try {
    const sensorRef = rtdb.ref(`sensors/${req.params.sensorId}`);
    const snapshot = await sensorRef.once('value');
    
    if (!snapshot.exists()) {
      return res.status(404).json({ error: 'Sensor not found' });
    }

    await sensorRef.remove();
    
    res.json({ 
      message: 'Sensor deleted successfully',
      id: req.params.sensorId
    });
  } catch (error) {
    console.error('Delete sensor error:', error);
    res.status(500).json({ 
      error: 'Failed to delete sensor',
      message: error.message 
    });
  }
});

// Get sensor statistics
router.get('/:sensorId/stats', async (req, res) => {
  try {
    const sensorRef = rtdb.ref(`sensors/${req.params.sensorId}/sensordata`);
    const snapshot = await sensorRef.once('value');
    
    if (!snapshot.exists()) {
      return res.json({ 
        total_readings: 0,
        latest_reading: null,
        oldest_reading: null
      });
    }

    const sensorData = snapshot.val();
    const dataArray = Object.values(sensorData);
    
    // Calculate statistics
    const stats = {
      total_readings: dataArray.length,
      latest_reading: dataArray[dataArray.length - 1],
      oldest_reading: dataArray[0],
    };

    // If numeric data exists, calculate averages
    if (dataArray[0]?.temperature !== undefined) {
      const temps = dataArray.map(d => d.temperature).filter(t => t !== null);
      stats.avg_temperature = temps.reduce((a, b) => a + b, 0) / temps.length;
    }

    if (dataArray[0]?.humidity !== undefined) {
      const humidity = dataArray.map(d => d.humidity).filter(h => h !== null);
      stats.avg_humidity = humidity.reduce((a, b) => a + b, 0) / humidity.length;
    }

    res.json(stats);
  } catch (error) {
    console.error('Get sensor stats error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch sensor statistics',
      message: error.message 
    });
  }
});

module.exports = router;