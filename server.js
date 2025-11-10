const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

// Import Firebase Admin with new lazy initialization
const { db, auth, isInitialized, initializationError } = require('./config/firebaseAdmin');

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
app.set('trust proxy', 1);

// Initialize ML Services
const datasetService = new DatasetService();
const mlService = new MLService(datasetService, db);

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,
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

// ============================================================================
// FIXED CORS CONFIGURATION
// ============================================================================
const allowedOrigins = [
  'https://reforestadmin-frontend.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001'
];

// CORS middleware - handle preflight requests
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://reforestadmin-frontend.vercel.app',
    'https://reforestadmin-frontend-git-myself-jessas-projects-763c9cbb.vercel.app',
    /https:\/\/reforestadmin-frontend.*\.vercel\.app$/, // Allow all preview deployments
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600 // Cache preflight for 10 minutes
}));

// Main CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('🚫 CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));

// ============================================================================
// Middleware
// ============================================================================
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(morgan('combined'));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Add CORS headers manually for additional safety
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// ============================================================================
// Non-blocking middleware
// ============================================================================
app.use((req, res, next) => {
  // Let individual routes handle Firebase errors gracefully
  next();
});

// Handle preflight requests explicitly
app.options('*', cors());

// Add a simple middleware to log CORS headers for debugging
app.use((req, res, next) => {
  const origin = req.headers.origin;
  console.log('📨 Request from origin:', origin);
  next();
});
// ============================================================================
// Routes
// ============================================================================
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

// UPDATED Health check with graceful Firebase handling
app.get('/health', async (req, res) => {
  let dbStatus = 'Unknown';
  let dbError = null;

  // Check if Firebase is initialized
  if (isInitialized()) {
    try {
      // Test Firebase connection
      await db.collection('test').doc('health').set({
        checkedAt: new Date().toISOString()
      });
      dbStatus = 'Connected';
    } catch (error) {
      dbStatus = 'Error';
      dbError = error.message;
    }
  } else if (initializationError()) {
    dbStatus = 'Not Initialized';
    dbError = initializationError().message;
  } else {
    dbStatus = 'Initializing';
  }

  // Check ML service status
  const mlStatus = datasetService.isDatasetLoaded() ? 'Ready' : 'No Dataset';

  res.status(200).json({
    status: dbStatus === 'Connected' ? 'OK' : 'WARNING',
    message: 'ReForest Backend is running',
    database: dbStatus,
    databaseError: dbError,
    mlService: mlStatus,
    cors: {
      enabled: true,
      allowedOrigins: allowedOrigins,
      currentOrigin: req.headers.origin || 'No origin header'
    },
    timestamp: new Date().toISOString()
  });
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
    cors: {
      enabled: true,
      currentOrigin: req.headers.origin || 'No origin header'
    },
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
  const firebaseStatus = isInitialized() ? 'Connected' : (initializationError() ? 'Error' : 'Initializing');
  
  res.json({ 
    message: 'ReForest Backend API',
    version: '1.0.0',
    database: firebaseStatus,
    mlService: datasetService.isDatasetLoaded() ? 'Ready' : 'Dataset Required',
    cors: {
      enabled: true,
      allowedOrigins: allowedOrigins,
      currentOrigin: req.headers.origin || 'No origin header'
    },
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
  
  // CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'CORS Error',
      message: 'Origin not allowed',
      allowedOrigins: allowedOrigins,
      yourOrigin: req.headers.origin
    });
  }
  
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
  console.log(`🔥 Firebase: ${isInitialized() ? 'Connected' : 'Initializing...'}`);
  console.log(`🔒 CORS: Enabled for ${allowedOrigins.length} origins`);
  console.log(`   - ${allowedOrigins.join('\n   - ')}`);
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
