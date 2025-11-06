// routes/plantingrecords.js
const express = require('express');
const { db } = require('../config/firebaseAdmin');
const router = express.Router();

// Helper function to process Firestore document data
const processPlantingRecord = (doc) => {
  const data = doc.data();
  
  // Handle timestamp conversion safely
  const createdAt = data.createdAt?.toDate?.();
  const recordDate = data.record_date || createdAt;
  
  return {
    id: doc.id,
    ...data,
    record_date: recordDate ? 
      (typeof recordDate === 'string' ? recordDate : recordDate.toISOString().split('T')[0]) : 
      new Date().toISOString().split('T')[0],
    createdAt: createdAt ? createdAt.toISOString() : new Date().toISOString(),
    // Remove Firebase-specific properties that shouldn't be sent to client
    createdAt_raw: undefined,
    toJSON: undefined
  };
};

// Get all planting records with optional filtering
router.get('/', async (req, res) => {
  try {
    const { 
      userRef, 
      locationRef, 
      seedlingRef, 
      startDate, 
      endDate,
      limit = 50 
    } = req.query;
    
    let query = db.collection('plantingrecords');
    
    // Apply filters if provided
    if (userRef) query = query.where('userRef', '==', userRef);
    if (locationRef) query = query.where('locationRef', '==', locationRef);
    if (seedlingRef) query = query.where('seedlingRef', '==', seedlingRef);
    
    // Date range filtering
    if (startDate) {
      query = query.where('record_date', '>=', startDate);
    }
    if (endDate) {
      query = query.where('record_date', '<=', endDate);
    }
    
    // Order by creation date (newest first) and limit results
    query = query.orderBy('createdAt', 'desc').limit(parseInt(limit));
    
    const snapshot = await query.get();
    const records = snapshot.docs.map(processPlantingRecord);

    console.log(`✅ Found ${records.length} planting records`);
    res.json({
      success: true,
      data: records,
      count: records.length
    });
  } catch (error) {
    console.error('Get planting records error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch planting records',
      details: error.message 
    });
  }
});

// Get planting record by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ID format
    if (!id || id.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid planting record ID'
      });
    }

    const doc = await db.collection('plantingrecords').doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Planting record not found'
      });
    }

    const record = processPlantingRecord(doc);
    
    res.json({
      success: true,
      data: record
    });
  } catch (error) {
    console.error('Get planting record error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch planting record',
      details: error.message 
    });
  }
});

// Create new planting record
router.post('/', async (req, res) => {
  try {
    const {
      locationRef,
      seedlingRef,
      userRef,
      record_date,
      requestId,
      ...additionalData
    } = req.body;

    // Validate required fields
    if (!locationRef || !seedlingRef || !userRef) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: locationRef, seedlingRef, and userRef are required'
      });
    }

    const plantingRecord = {
      locationRef,
      seedlingRef,
      userRef,
      record_date: record_date || new Date().toISOString().split('T')[0],
      requestId: requestId || null,
      ...additionalData,
      createdAt: new Date() // Firestore will convert this to timestamp
    };

    const docRef = await db.collection('plantingrecords').add(plantingRecord);
    
    console.log(`✅ Created new planting record: ${docRef.id}`);
    
    res.status(201).json({
      success: true,
      data: {
        id: docRef.id,
        ...plantingRecord,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Create planting record error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create planting record',
      details: error.message
    });
  }
});

// Update planting record
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.createdAt;

    // Add updated timestamp
    updateData.updatedAt = new Date();

    const docRef = db.collection('plantingrecords').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Planting record not found'
      });
    }

    await docRef.update(updateData);
    
    console.log(`✅ Updated planting record: ${id}`);
    
    // Return the updated record
    const updatedDoc = await docRef.get();
    const updatedRecord = processPlantingRecord(updatedDoc);
    
    res.json({
      success: true,
      data: updatedRecord
    });
  } catch (error) {
    console.error('Update planting record error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update planting record',
      details: error.message
    });
  }
});

// Delete planting record
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const docRef = db.collection('plantingrecords').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Planting record not found'
      });
    }

    await docRef.delete();
    
    console.log(`✅ Deleted planting record: ${id}`);
    
    res.json({
      success: true,
      message: 'Planting record deleted successfully'
    });
  } catch (error) {
    console.error('Delete planting record error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete planting record',
      details: error.message
    });
  }
});

module.exports = router;