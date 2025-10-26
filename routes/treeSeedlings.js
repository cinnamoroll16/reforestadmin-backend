const express = require('express');
const { db, admin } = require('../config/firebaseAdmin');
const router = express.Router();

// Get all tree seedlings
router.get('/', async (req, res) => {
  try {
    const seedlingsSnapshot = await db.collection('treeseedlings').get();
    const seedlings = [];
    
    seedlingsSnapshot.forEach(doc => {
      seedlings.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json(seedlings);
  } catch (error) {
    console.error('Get tree seedlings error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get tree seedling by ID
router.get('/:id', async (req, res) => {
  try {
    const seedlingDoc = await db.collection('treeseedlings').doc(req.params.id).get();
    
    if (!seedlingDoc.exists) {
      return res.status(404).json({ error: 'Tree seedling not found' });
    }

    res.json({
      id: seedlingDoc.id,
      ...seedlingDoc.data()
    });
  } catch (error) {
    console.error('Get tree seedling error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get seedlings by category
router.get('/category/:category', async (req, res) => {
  try {
    const seedlingsSnapshot = await db.collection('treeseedlings')
      .where('seedling_category', '==', req.params.category)
      .get();
    
    const seedlings = [];
    seedlingsSnapshot.forEach(doc => {
      seedlings.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json(seedlings);
  } catch (error) {
    console.error('Get seedlings by category error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;