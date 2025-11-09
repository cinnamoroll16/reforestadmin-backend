//../server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
require('dotenv').config();
const app = express();

// IMPORTANT: Add this line immediately after creating app
app.set('trust proxy', 1);
// Import Firebase Admin first to check connection
const { db, auth } = require('./config/firebaseAdmin');

// Import routes
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const locationsRoutes = require('./routes/locations');
const notificationsRoutes = require('./routes/notifications');
const plantingRequestsRoutes = require('./routes/plantingRequests');
const plantingRecordsRoutes = require('./routes/plantingRecords');
const plantingTasksRoutes = require('./routes/plantingTasks');
const recommendationsRoutes = require('./routes/recommendations');
const sensorsRoutes = require('./routes/sensors');
const treeSeedlingsRoutes = require('./routes/treeSeedlings');

// Import ML services
const MLService = require('./services/MLService');
const DatasetService = require('./services/DatasetService');

const app = express();

// Initialize ML Services
const datasetService = new DatasetService();
const mlService = new MLService(datasetService, db);

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Increase from 100 to 100 requests per minute
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// File upload configuration for dataset
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `dataset-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed!'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('combined'));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Test Firebase connection on startup
app.use(async (req, res, next) => {
  try {
    // This will verify Firebase connection on first request
    if (!app.get('firebaseTested')) {
      console.log('🔥 Testing Firebase connection...');
      await db.collection('test').doc('connection').set({
        test: true,
        timestamp: new Date().toISOString()
      });
      app.set('firebaseTested', true);
      console.log('✅ Firebase connection verified');
    }
    next();
  } catch (error) {
    console.error('❌ Firebase connection failed:', error.message);
    res.status(500).json({ 
      error: 'Database connection failed',
      details: 'Check Firebase configuration and service account key'
    });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/plantingrequests', plantingRequestsRoutes);
app.use('/api/plantingrecords', plantingRecordsRoutes);
app.use('/api/plantingtasks', plantingTasksRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/sensors', sensorsRoutes);
app.use('/api/tree-seedlings', treeSeedlingsRoutes);

// ============================================================================
// ML BACKEND ROUTES
// ============================================================================

// Health check with Firebase status
app.get('/health', async (req, res) => {
  try {
    // Test Firebase connection
    await db.collection('test').doc('health').set({
      checkedAt: new Date().toISOString()
    });
    
    // Check ML service status
    const mlStatus = datasetService.isDatasetLoaded() ? 'Ready' : 'No Dataset';
    
    res.status(200).json({ 
      status: 'OK', 
      message: 'ReForest Backend is running',
      database: 'Connected',
      mlService: mlStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(200).json({ 
      status: 'WARNING', 
      message: 'Backend running but database connection failed',
      database: 'Disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Upload dataset endpoint
app.post('/api/ml/upload-dataset', upload.single('dataset'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No file uploaded',
        message: 'Please select an Excel file to upload'
      });
    }

    console.log(`📤 Processing dataset upload: ${req.file.filename}`);
    
    const filePath = req.file.path;
    const dataset = await datasetService.loadDatasetFromFile(filePath);
    
    res.json({ 
      success: true, 
      message: 'Dataset uploaded and processed successfully',
      file: req.file.filename,
      speciesCount: dataset.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Dataset upload error:', error);
    
    // Clean up uploaded file on error
    if (req.file && require('fs').existsSync(req.file.path)) {
      require('fs').unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: 'Dataset processing failed',
      message: error.message,
      details: 'Please check the Excel file format and try again'
    });
  }
});

// Generate ML recommendations endpoint
app.post('/api/ml/generate-recommendations', async (req, res) => {
  try {
    const { sensorId, sensorData, location, coordinates } = req.body;

    if (!sensorId || !sensorData) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['sensorId', 'sensorData'],
        received: { sensorId, sensorData: !!sensorData }
      });
    }

    // Validate sensor data structure
    const { ph, soilMoisture, temperature } = sensorData;
    if ([ph, soilMoisture, temperature].some(v => v === null || v === undefined)) {
      return res.status(400).json({
        error: 'Invalid sensor data',
        message: 'sensorData must include ph, soilMoisture, and temperature'
      });
    }

    console.log(`🤖 Generating ML recommendations for sensor: ${sensorId}`);
    
    // Generate recommendations
    const result = await mlService.generateRecommendations({
      sensorId,
      sensorData: {
        ph: parseFloat(ph),
        soilMoisture: parseFloat(soilMoisture),
        temperature: parseFloat(temperature)
      },
      location,
      coordinates
    });

    res.json({
      success: true,
      ...result
    });
    
  } catch (error) {
    console.error('❌ ML Recommendation error:', error);
    
    let statusCode = 500;
    let errorMessage = error.message;
    
    if (error.message.includes('Dataset not loaded')) {
      statusCode = 400;
      errorMessage = 'No tree dataset loaded. Please upload dataset first.';
    } else if (error.message.includes('Invalid sensor data')) {
      statusCode = 400;
    }
    
    res.status(statusCode).json({ 
      success: false,
      error: 'Failed to generate recommendations',
      message: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
});

// Get ML service status
app.get('/api/ml/status', (req, res) => {
  const status = {
    mlService: 'Active',
    datasetLoaded: datasetService.isDatasetLoaded(),
    datasetSize: datasetService.isDatasetLoaded() ? datasetService.getDataset().length : 0,
    lastUpdated: datasetService.getLastUpdateTime(),
    endpoints: {
      uploadDataset: 'POST /api/ml/upload-dataset',
      generateRecommendations: 'POST /api/ml/generate-recommendations',
      analyzeTrends: 'POST /api/ml/analyze-trends',
      getStatus: 'GET /api/ml/status'
    }
  };
  
  res.json(status);
});

// Analyze trends endpoint
app.post('/api/ml/analyze-trends', async (req, res) => {
  try {
    const { readings, sensorId } = req.body;
    
    if (!readings || !Array.isArray(readings)) {
      return res.status(400).json({ 
        error: 'Readings array is required',
        message: 'Please provide an array of sensor readings'
      });
    }

    const analysis = mlService.analyzeSoilTrends(readings);
    
    res.json({
      success: true,
      sensorId,
      analysis,
      readingsAnalyzed: readings.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Trend analysis error:', error);
    res.status(500).json({ 
      error: 'Trend analysis failed',
      message: error.message
    });
  }
});

// Get dataset info
app.get('/api/ml/dataset', (req, res) => {
  try {
    if (!datasetService.isDatasetLoaded()) {
      return res.status(404).json({
        error: 'No dataset loaded',
        message: 'Please upload a dataset first using /api/ml/upload-dataset'
      });
    }

    const dataset = datasetService.getDataset();
    const speciesCount = dataset.length;
    const nativeCount = dataset.filter(tree => tree.isNative).length;
    const nonNativeCount = speciesCount - nativeCount;
    
    // Get categories distribution
    const categories = {};
    dataset.forEach(tree => {
      const category = tree.category || 'unknown';
      categories[category] = (categories[category] || 0) + 1;
    });

    res.json({
      success: true,
      datasetInfo: {
        totalSpecies: speciesCount,
        nativeSpecies: nativeCount,
        nonNativeSpecies: nonNativeCount,
        categories,
        lastUpdated: datasetService.getLastUpdateTime()
      },
      sampleSpecies: dataset.slice(0, 5).map(tree => ({
        commonName: tree.commonName,
        scientificName: tree.scientificName,
        category: tree.category,
        isNative: tree.isNative,
        successRate: tree.successRate
      }))
    });
    
  } catch (error) {
    console.error('❌ Dataset info error:', error);
    res.status(500).json({ 
      error: 'Failed to get dataset info',
      message: error.message
    });
  }
});

// Clear dataset cache
app.delete('/api/ml/dataset', (req, res) => {
  try {
    const wasLoaded = datasetService.isDatasetLoaded();
    datasetService.clearDataset();
    
    res.json({
      success: true,
      message: wasLoaded ? 'Dataset cache cleared' : 'No dataset was loaded',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Clear dataset error:', error);
    res.status(500).json({ 
      error: 'Failed to clear dataset',
      message: error.message
    });
  }
});

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'ReForest Backend API',
    version: '1.0.0',
    database: 'Firestore',
    mlService: datasetService.isDatasetLoaded() ? 'Ready' : 'Dataset Required',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      locations: '/api/locations',
      notifications: '/api/notifications',
      plantingRequests: '/api/plantingrequests',
      plantingRecords: '/api/plantingrecords',
      plantingTasks: '/api/plantingtasks',
      recommendations: '/api/recommendations',
      sensors: '/api/sensors',
      treeSeedlings: '/api/tree-seedlings',
      ml: {
        uploadDataset: 'POST /api/ml/upload-dataset',
        generateRecommendations: 'POST /api/ml/generate-recommendations',
        analyzeTrends: 'POST /api/ml/analyze-trends',
        getStatus: 'GET /api/ml/status',
        getDataset: 'GET /api/ml/dataset'
      }
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('🚨 Server Error:', err.stack);
  
  // Multer file upload errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        message: 'File size must be less than 10MB'
      });
    }
  }
  
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: {
      ml: [
        'POST /api/ml/upload-dataset',
        'POST /api/ml/generate-recommendations',
        'POST /api/ml/analyze-trends',
        'GET /api/ml/status',
        'GET /api/ml/dataset',
        'DELETE /api/ml/dataset'
      ]
    }
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('');
  console.log('='.repeat(60));
  console.log('🌳 ReForest Backend Server Started');
  console.log('='.repeat(60));
  console.log(`📡 Server running on: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🤖 ML Service: http://localhost:${PORT}/api/ml/status`);
  console.log(`📊 Dataset upload: http://localhost:${PORT}/api/ml/upload-dataset`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔥 Firebase RTDB: Connected`);
  console.log(`📚 Firestore: Connected`);
  console.log(`🤖 ML Backend: Ready for dataset upload`);
  console.log('='.repeat(60));
  console.log('');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down ReForest backend gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

module.exports = app;
