// routes/dataset.js
import express from 'express';
import { loadTreeDataset, clearDatasetCache } from '../services/datasetLoader.js';

const router = express.Router();

// Get dataset
router.get('/', async (req, res) => {
  try {
    const dataset = await loadTreeDataset();
    res.json({
      success: true,
      data: dataset,
      count: dataset.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Clear cache
router.delete('/cache', async (req, res) => {
  try {
    clearDatasetCache();
    res.json({
      success: true,
      message: 'Dataset cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;