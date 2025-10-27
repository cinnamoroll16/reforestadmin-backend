// routes/recommendations.js
const express = require('express');
const { db, admin } = require('../config/firebaseAdmin');
const router = express.Router();

// Helper function to fetch related data
const fetchRelatedData = async (recommendation) => {
  try {
    let locationData = null;
    let sensorData = null;
    let recommendedSeedlings = [];

    // Fetch location data
    if (recommendation.locationRef) {
      try {
        const locationParts = recommendation.locationRef.split('/').filter(part => part);
        if (locationParts.length >= 2) {
          const locationId = locationParts[locationParts.length - 1];
          const locationDoc = await db.collection('locations').doc(locationId).get();
          if (locationDoc.exists) {
            locationData = {
              locationId: locationId,
              ...locationDoc.data()
            };
          }
        }
      } catch (error) {
        console.warn('Error fetching location data:', error);
      }
    }

    // Fetch sensor data
    if (recommendation.sensorDataRef) {
      try {
        const sensorParts = recommendation.sensorDataRef.split('/').filter(part => part);
        if (sensorParts.length >= 4) {
          const [collection, sensorId, subcollection, dataId] = sensorParts;
          const sensorDoc = await db.collection(collection).doc(sensorId)
            .collection(subcollection).doc(dataId).get();
          if (sensorDoc.exists) {
            sensorData = {
              sensorId: sensorId,
              dataId: dataId,
              ...sensorDoc.data()
            };
          }
        }
      } catch (error) {
        console.warn('Error fetching sensor data:', error);
      }
    }

    // Fetch seedling data
    if (recommendation.seedlingOptions && Array.isArray(recommendation.seedlingOptions)) {
      try {
        const seedlingPromises = recommendation.seedlingOptions.map(async (seedlingRef) => {
          try {
            const seedlingParts = seedlingRef.split('/').filter(part => part);
            if (seedlingParts.length >= 2) {
              const seedlingId = seedlingParts[seedlingParts.length - 1];
              const seedlingDoc = await db.collection('treeseedlings').doc(seedlingId).get();
              if (seedlingDoc.exists) {
                return {
                  id: seedlingId,
                  ...seedlingDoc.data()
                };
              }
            }
          } catch (error) {
            console.warn(`Error fetching seedling ${seedlingRef}:`, error);
            return null;
          }
          return null;
        });

        const seedlings = await Promise.all(seedlingPromises);
        recommendedSeedlings = seedlings.filter(seedling => seedling !== null);
      } catch (error) {
        console.warn('Error fetching seedlings:', error);
      }
    }

    return {
      locationData,
      sensorData,
      recommendedSeedlings
    };
  } catch (error) {
    console.error('Error in fetchRelatedData:', error);
    return {
      locationData: null,
      sensorData: null,
      recommendedSeedlings: []
    };
  }
};

// Get all recommendations
router.get('/', async (req, res) => {
  try {
    console.log('Fetching recommendations with related data...');
    
    // Get all recommendations without complex queries
    const recommendationsSnapshot = await db.collection('recommendations').get();
    
    const recommendations = [];
    
    // Process each recommendation and fetch related data
    for (const doc of recommendationsSnapshot.docs) {
      const data = doc.data();
      
      // Skip deleted recommendations
      if (data.deleted) continue;
      
      // Fetch related data
      const relatedData = await fetchRelatedData(data);
      
      // Transform to frontend format
      const transformedReco = {
        id: doc.id,
        reco_id: doc.id, // Use document ID as reco_id
        locationRef: data.locationRef,
        sensorDataRef: data.sensorDataRef,
        reco_confidenceScore: data.reco_confidenceScore || 0,
        reco_generatedAt: data.reco_generatedAt,
        season: data.season,
        sensorConditions: data.sensorConditions || {},
        seedlingOptions: data.seedlingOptions || [],
        // Add the fetched related data
        locationData: relatedData.locationData,
        sensorData: relatedData.sensorData,
        recommendedSeedlings: relatedData.recommendedSeedlings,
        seedlingCount: relatedData.recommendedSeedlings.length,
        // Generate status based on confidence score
        status: generateStatus(data.reco_confidenceScore || 0)
      };
      
      recommendations.push(transformedReco);
    }

    // Sort by generation date (newest first)
    recommendations.sort((a, b) => {
      const dateA = a.reco_generatedAt ? new Date(a.reco_generatedAt) : new Date(0);
      const dateB = b.reco_generatedAt ? new Date(b.reco_generatedAt) : new Date(0);
      return dateB - dateA;
    });

    console.log(`Successfully loaded ${recommendations.length} recommendations`);
    res.json(recommendations);
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to generate status (same as frontend)
function generateStatus(confidenceScore) {
  const score = typeof confidenceScore === 'string' ? parseFloat(confidenceScore) : confidenceScore;
  const scorePercent = score > 1 ? score : score * 100;
  
  if (scorePercent >= 85) return 'Approved';
  if (scorePercent >= 70) return 'Pending';
  if (scorePercent >= 50) return 'Under Review';
  return 'Needs Review';
}

// Get recommendation by ID
router.get('/:id', async (req, res) => {
  try {
    const doc = await db.collection('recommendations').doc(req.params.id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }

    const data = doc.data();
    if (data.deleted) {
      return res.status(404).json({ error: 'Recommendation has been deleted' });
    }

    // Fetch related data
    const relatedData = await fetchRelatedData(data);

    const transformedReco = {
      id: doc.id,
      reco_id: doc.id,
      locationRef: data.locationRef,
      sensorDataRef: data.sensorDataRef,
      reco_confidenceScore: data.reco_confidenceScore || 0,
      reco_generatedAt: data.reco_generatedAt,
      season: data.season,
      sensorConditions: data.sensorConditions || {},
      seedlingOptions: data.seedlingOptions || [],
      locationData: relatedData.locationData,
      sensorData: relatedData.sensorData,
      recommendedSeedlings: relatedData.recommendedSeedlings,
      seedlingCount: relatedData.recommendedSeedlings.length,
      status: generateStatus(data.reco_confidenceScore || 0)
    };

    res.json(transformedReco);
  } catch (error) {
    console.error('Get recommendation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete recommendation (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const recommendationRef = db.collection('recommendations').doc(req.params.id);
    
    await recommendationRef.update({
      deleted: true,
      deletedAt: new Date().toISOString(),
      deletedBy: req.user?.uid || 'system'
    });

    res.json({ 
      message: 'Recommendation deleted successfully',
      id: req.params.id
    });
  } catch (error) {
    console.error('Delete recommendation error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;