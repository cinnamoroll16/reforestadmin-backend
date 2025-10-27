// middleware/auth.js
const { auth, db } = require('../config/firebaseAdmin');

/**
 * Middleware to authenticate user using Firebase ID token
 */
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'No token provided' 
      });
    }

    const token = authHeader.split('Bearer ')[1];

    // Verify the Firebase ID token
    const decodedToken = await auth.verifyIdToken(token);
    
    // Get user data from Firestore
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ 
        error: 'User not found in database' 
      });
    }

    // Attach user data to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      ...userDoc.data()
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ 
        error: 'Token expired', 
        message: 'Please login again' 
      });
    }
    
    res.status(401).json({ 
      error: 'Invalid token', 
      message: 'Authentication failed' 
    });
  }
};

/**
 * Middleware to check if user has required role
 * Usage: hasRole('admin', 'officer')
 */
const hasRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Unauthorized', 
          message: 'Authentication required' 
        });
      }

      // Extract role from roleRef (format: /roles/admin)
      const userRole = req.user.roleRef?.split('/').pop();

      if (!userRole || !allowedRoles.includes(userRole)) {
        return res.status(403).json({ 
          error: 'Forbidden', 
          message: 'Insufficient permissions',
          requiredRoles: allowedRoles,
          userRole: userRole || 'none'
        });
      }

      next();
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({ 
        error: 'Authorization check failed' 
      });
    }
  };
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      const decodedToken = await auth.verifyIdToken(token);
      const userDoc = await db.collection('users').doc(decodedToken.uid).get();
      
      if (userDoc.exists) {
        req.user = {
          uid: decodedToken.uid,
          email: decodedToken.email,
          ...userDoc.data()
        };
      }
    }
    
    next();
  } catch (error) {
    // Continue without user data
    next();
  }
};

module.exports = {
  authenticateUser,
  hasRole,
  optionalAuth
};