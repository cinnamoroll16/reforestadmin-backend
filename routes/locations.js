// routes/locations.js
const express = require('express');
const { rtdb, admin } = require('../config/firebaseAdmin');
const { authenticateUser, hasRole } = require('../middleware/auth');
const router = express.Router();

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

    // Sort by name
    locations.sort((a, b) => 
      (a.location_name || '').localeCompare(b.location_name || '')
    );

    res.json(locations);
  } catch (error) {
    console.error('Get locations error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch locations',
      message: error.message 
    });
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
    res.status(500).json({ 
      error: 'Failed to fetch location',
      message: error.message 
    });
  }
});

// Create new location (protected - admin/officer only)
router.post('/', authenticateUser, hasRole('admin', 'officer'), async (req, res) => {
  try {
    const {
      location_name,
      latitude,
      longitude,
      area_size,
      description,
      terrain_type,
      soil_type,
      accessibility
    } = req.body;

    // Validation
    if (!location_name || !latitude || !longitude) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['location_name', 'latitude', 'longitude']
      });
    }

    const newLocationRef = rtdb.ref('locations').push();
    
    const locationData = {
      location_name,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      area_size: area_size ? parseFloat(area_size) : null,
      description: description || '',
      terrain_type: terrain_type || 'mixed',
      soil_type: soil_type || 'unknown',
      accessibility: accessibility || 'moderate',
      status: 'active',
      createdBy: req.user.uid,
      createdAt: admin.database.ServerValue.TIMESTAMP,
      updatedAt: admin.database.ServerValue.TIMESTAMP
    };

    await newLocationRef.set(locationData);

    res.status(201).json({
      message: 'Location created successfully',
      id: newLocationRef.key,
      location: locationData
    });
  } catch (error) {
    console.error('Create location error:', error);
    res.status(500).json({ 
      error: 'Failed to create location',
      message: error.message 
    });
  }
});

// Update location (protected - admin/officer only)
router.put('/:locationId', authenticateUser, hasRole('admin', 'officer'), async (req, res) => {
  try {
    const locationRef = rtdb.ref(`locations/${req.params.locationId}`);
    const snapshot = await locationRef.once('value');
    
    if (!snapshot.exists()) {
      return res.status(404).json({ error: 'Location not found' });
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

    // Convert numeric fields
    if (updateData.latitude) updateData.latitude = parseFloat(updateData.latitude);
    if (updateData.longitude) updateData.longitude = parseFloat(updateData.longitude);
    if (updateData.area_size) updateData.area_size = parseFloat(updateData.area_size);

    await locationRef.update(updateData);

    res.json({ 
      message: 'Location updated successfully',
      id: req.params.locationId
    });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ 
      error: 'Failed to update location',
      message: error.message 
    });
  }
});

// Delete location (protected - admin only)
router.delete('/:locationId', authenticateUser, hasRole('admin'), async (req, res) => {
  try {
    const locationRef = rtdb.ref(`locations/${req.params.locationId}`);
    const snapshot = await locationRef.once('value');
    
    if (!snapshot.exists()) {
      return res.status(404).json({ error: 'Location not found' });
    }

    // Check if location has associated sensors
    const sensorsRef = rtdb.ref('sensors');
    const sensorsSnapshot = await sensorsRef
      .orderByChild('location_id')
      .equalTo(req.params.locationId)
      .once('value');

    if (sensorsSnapshot.exists()) {
      return res.status(400).json({ 
        error: 'Cannot delete location',
        message: 'Location has associated sensors. Please remove sensors first.',
        sensorCount: Object.keys(sensorsSnapshot.val()).length
      });
    }

    await locationRef.remove();
    
    res.json({ 
      message: 'Location deleted successfully',
      id: req.params.locationId
    });
  } catch (error) {
    console.error('Delete location error:', error);
    res.status(500).json({ 
      error: 'Failed to delete location',
      message: error.message 
    });
  }
});

// Get sensors for a location
router.get('/:locationId/sensors', async (req, res) => {
  try {
    const sensorsRef = rtdb.ref('sensors');
    const snapshot = await sensorsRef
      .orderByChild('location_id')
      .equalTo(req.params.locationId)
      .once('value');

    if (!snapshot.exists()) {
      return res.json([]);
    }

    const sensorsData = snapshot.val();
    const sensors = Object.keys(sensorsData).map(sensorId => {
      const sensor = sensorsData[sensorId];
      
      // Get latest reading
      const sensordata = sensor.sensordata || {};
      const dataKeys = Object.keys(sensordata);
      const latestDataKey = dataKeys[dataKeys.length - 1];
      const latestData = sensordata[latestDataKey] || {};

      return {
        id: sensorId,
        ...sensor,
        latest_reading: latestData
      };
    });

    res.json(sensors);
  } catch (error) {
    console.error('Get location sensors error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch location sensors',
      message: error.message 
    });
  }
});

// Get location statistics
router.get('/:locationId/stats', async (req, res) => {
  try {
    const locationRef = rtdb.ref(`locations/${req.params.locationId}`);
    const locationSnapshot = await locationRef.once('value');
    
    if (!locationSnapshot.exists()) {
      return res.status(404).json({ error: 'Location not found' });
    }

    // Get sensor count
    const sensorsRef = rtdb.ref('sensors');
    const sensorsSnapshot = await sensorsRef
      .orderByChild('location_id')
      .equalTo(req.params.locationId)
      .once('value');

    const sensorCount = sensorsSnapshot.exists() ? 
      Object.keys(sensorsSnapshot.val()).length : 0;

    // Get active sensor count
    let activeSensorCount = 0;
    if (sensorsSnapshot.exists()) {
      const sensors = sensorsSnapshot.val();
      activeSensorCount = Object.values(sensors)
        .filter(s => s.sensor_status === 'active').length;
    }

    const stats = {
      location_id: req.params.locationId,
      total_sensors: sensorCount,
      active_sensors: activeSensorCount,
      inactive_sensors: sensorCount - activeSensorCount,
      location_data: locationSnapshot.val()
    };

    res.json(stats);
  } catch (error) {
    console.error('Get location stats error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch location statistics',
      message: error.message 
    });
  }
});

// Search locations by name
router.get('/search/:query', async (req, res) => {
  try {
    const query = req.params.query.toLowerCase();
    const locationsRef = rtdb.ref('locations');
    const snapshot = await locationsRef.once('value');
    
    if (!snapshot.exists()) {
      return res.json([]);
    }

    const locationsData = snapshot.val();
    const locations = Object.keys(locationsData)
      .map(locationId => ({
        id: locationId,
        ...locationsData[locationId]
      }))
      .filter(location => 
        location.location_name?.toLowerCase().includes(query) ||
        location.description?.toLowerCase().includes(query)
      );

    res.json(locations);
  } catch (error) {
    console.error('Search locations error:', error);
    res.status(500).json({ 
      error: 'Failed to search locations',
      message: error.message 
    });
  }
});

// Get nearby locations (within radius)
router.get('/nearby/:latitude/:longitude', async (req, res) => {
  try {
    const { latitude, longitude } = req.params;
    const radius = parseFloat(req.query.radius) || 10; // km

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ 
        error: 'Invalid coordinates',
        message: 'Latitude and longitude must be valid numbers'
      });
    }

    const locationsRef = rtdb.ref('locations');
    const snapshot = await locationsRef.once('value');
    
    if (!snapshot.exists()) {
      return res.json([]);
    }

    const locationsData = snapshot.val();
    
    // Calculate distance and filter
    const nearbyLocations = Object.keys(locationsData)
      .map(locationId => {
        const location = locationsData[locationId];
        const distance = calculateDistance(
          lat, lon,
          location.latitude, location.longitude
        );
        
        return {
          id: locationId,
          ...location,
          distance: Math.round(distance * 100) / 100 // Round to 2 decimals
        };
      })
      .filter(location => location.distance <= radius)
      .sort((a, b) => a.distance - b.distance);

    res.json(nearbyLocations);
  } catch (error) {
    console.error('Get nearby locations error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch nearby locations',
      message: error.message 
    });
  }
});

// Helper function: Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

module.exports = router;