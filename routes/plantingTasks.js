// routes/plantingTasks.js
const express = require('express');
const { db } = require('../config/firebaseAdmin');
const router = express.Router();

// POST /api/plantingtasks - Create a new planting task
router.post('/', async (req, res) => {
  try {
    const taskData = req.body;
    
    console.log('📝 Creating planting task with data:', taskData);
    
    // Validate required fields
    if (!taskData.location_id || !taskData.user_id) {
      return res.status(400).json({ 
        error: 'Missing required fields: location_id and user_id are required' 
      });
    }

    // Create planting task with generated ID
    const taskId = `task_${Date.now()}`;
    const plantingTask = {
      id: taskId,
      task_id: taskId,
      user_id: taskData.user_id,
      reco_id: taskData.reco_id || null,
      location_id: taskData.location_id,
      task_status: taskData.task_status || 'assigned',
      task_date: taskData.task_date || new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      recommendation_data: taskData.recommendation_data || {},
      assigned_to: taskData.assigned_to || taskData.user_id,
      priority: taskData.priority || 'medium',
      estimated_duration: taskData.estimated_duration || 120,
      seedlings_required: taskData.recommendation_data?.seedlingCount || 0,
      completed_at: null,
      notes: taskData.notes || ''
    };

    // Save to Firestore
    await db.collection('plantingtasks').doc(taskId).set(plantingTask);
    
    console.log('✅ Planting task created successfully:', taskId);
    
    res.status(201).json({
      success: true,
      taskId: taskId,
      message: 'Planting task created successfully',
      task: plantingTask
    });
    
  } catch (error) {
    console.error('❌ Error creating planting task:', error);
    res.status(500).json({ 
      error: 'Failed to create planting task: ' + error.message 
    });
  }
});

// GET /api/plantingtasks - Get all planting tasks
router.get('/', async (req, res) => {
  try {
    const { user_id, status, limit = 50 } = req.query;
    
    let query = db.collection('plantingtasks');
    
    if (user_id) {
      query = query.where('user_id', '==', user_id);
    }
    
    if (status) {
      query = query.where('task_status', '==', status);
    }
    
    const snapshot = await query.orderBy('created_at', 'desc').limit(parseInt(limit)).get();
    
    const tasks = [];
    snapshot.forEach(doc => {
      tasks.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json(tasks);
  } catch (error) {
    console.error('Error fetching planting tasks:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/plantingtasks/:id - Get specific planting task
router.get('/:id', async (req, res) => {
  try {
    const taskId = req.params.id;
    const doc = await db.collection('plantingtasks').doc(taskId).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Planting task not found' });
    }
    
    res.json({
      id: doc.id,
      ...doc.data()
    });
  } catch (error) {
    console.error('Error fetching planting task:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/plantingtasks/:id - Update planting task
router.put('/:id', async (req, res) => {
  try {
    const taskId = req.params.id;
    const updateData = {
      ...req.body,
      updated_at: new Date().toISOString()
    };

    await db.collection('plantingtasks').doc(taskId).update(updateData);
    
    res.json({
      success: true,
      message: 'Planting task updated successfully'
    });
  } catch (error) {
    console.error('Error updating planting task:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;