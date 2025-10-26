// routes/resourceRoutes.js
const express = require('express');
const router = express.Router();
const resourceController = require('../controllers/resourceController');
const { authenticateUser, hasRole } = require('../middleware/auth');

// ========== LOCATION ROUTES ==========
// @route   GET /api/resources/locations
// @desc    Get all locations
// @access  Private
router.get('/locations', authenticateUser, resourceController.getAllLocations);

// @route   GET /api/resources/locations/:id
// @desc    Get single location
// @access  Private
router.get('/locations/:id', authenticateUser, resourceController.getLocationById);

// @route   POST /api/resources/locations
// @desc    Create new location
// @access  Private (Admin/Officer)
router.post('/locations', authenticateUser, hasRole('admin', 'officer'), resourceController.createLocation);

// @route   PUT /api/resources/locations/:id
// @desc    Update location
// @access  Private (Admin/Officer)
router.put('/locations/:id', authenticateUser, hasRole('admin', 'officer'), resourceController.updateLocation);

// @route   DELETE /api/resources/locations/:id
// @desc    Delete location
// @access  Private (Admin)
router.delete('/locations/:id', authenticateUser, hasRole('admin'), resourceController.deleteLocation);

// ========== SENSOR ROUTES ==========
// @route   GET /api/resources/sensors
// @desc    Get all sensors
// @access  Private
router.get('/sensors', authenticateUser, resourceController.getAllSensors);

// @route   GET /api/resources/sensors/:id
// @desc    Get single sensor
// @access  Private
router.get('/sensors/:id', authenticateUser, resourceController.getSensorById);

// @route   GET /api/resources/sensors/:id/data
// @desc    Get sensor data
// @access  Private
router.get('/sensors/:id/data', authenticateUser, resourceController.getSensorData);

// @route   POST /api/resources/sensors
// @desc    Create new sensor
// @access  Private (Admin/Officer)
router.post('/sensors', authenticateUser, hasRole('admin', 'officer'), resourceController.createSensor);

// @route   POST /api/resources/sensors/:id/data
// @desc    Add sensor data reading
// @access  Private (Admin/Officer)
router.post('/sensors/:id/data', authenticateUser, hasRole('admin', 'officer'), resourceController.addSensorData);

// @route   PUT /api/resources/sensors/:id
// @desc    Update sensor
// @access  Private (Admin/Officer)
router.put('/sensors/:id', authenticateUser, hasRole('admin', 'officer'), resourceController.updateSensor);

// ========== SEEDLING ROUTES ==========
// @route   GET /api/resources/seedlings
// @desc    Get all tree seedlings
// @access  Private
router.get('/seedlings', authenticateUser, resourceController.getAllSeedlings);

// @route   GET /api/resources/seedlings/:id
// @desc    Get single seedling
// @access  Private
router.get('/seedlings/:id', authenticateUser, resourceController.getSeedlingById);

// @route   POST /api/resources/seedlings
// @desc    Create new seedling
// @access  Private (Admin/Officer)
router.post('/seedlings', authenticateUser, hasRole('admin', 'officer'), resourceController.createSeedling);

// @route   PUT /api/resources/seedlings/:id
// @desc    Update seedling
// @access  Private (Admin/Officer)
router.put('/seedlings/:id', authenticateUser, hasRole('admin', 'officer'), resourceController.updateSeedling);

// @route   DELETE /api/resources/seedlings/:id
// @desc    Delete seedling
// @access  Private (Admin)
router.delete('/seedlings/:id', authenticateUser, hasRole('admin'), resourceController.deleteSeedling);

// ========== RECOMMENDATION ROUTES ==========
// @route   GET /api/resources/recommendations
// @desc    Get all recommendations
// @access  Private
router.get('/recommendations', authenticateUser, resourceController.getAllRecommendations);

// @route   GET /api/resources/recommendations/:id
// @desc    Get single recommendation
// @access  Private
router.get('/recommendations/:id', authenticateUser, resourceController.getRecommendationById);

// @route   POST /api/resources/recommendations
// @desc    Create new recommendation
// @access  Private (Admin/Officer)
router.post('/recommendations', authenticateUser, hasRole('admin', 'officer'), resourceController.createRecommendation);

module.exports = router;