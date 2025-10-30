const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
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

const app = express();

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

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('combined'));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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

// Health check with Firebase status
app.get('/health', async (req, res) => {
  try {
    // Test Firebase connection
    await db.collection('test').doc('health').set({
      checkedAt: new Date().toISOString()
    });
    
    res.status(200).json({ 
      status: 'OK', 
      message: 'ReForest Backend is running',
      database: 'Connected',
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

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'ReForest Backend API',
    version: '1.0.0',
    database: 'Firestore',
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
      treeSeedlings: '/api/tree-seedlings'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('🚨 Server Error:', err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('');
  console.log('='.repeat(60));
  console.log('🌳 ReForest Backend Server Started');
  console.log('='.repeat(60));
  console.log(`📡 Server running on: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🤖 ML Recommendations: http://localhost:${PORT}/api/recommendations/generate`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔥 Firebase RTDB: Connected`);
  console.log(`📚 Firestore: Connected`);
  console.log('='.repeat(60));
  console.log('');
});