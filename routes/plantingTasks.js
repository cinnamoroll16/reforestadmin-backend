const express = require('express');
const { db, admin } = require('../config/firebaseAdmin');
const router = express.Router();

// Get all planting tasks
router.get('/', async (req, res) => {
  try {
    const { user_id, task_status } = req.query;
    let query = db.collection('plantingtasks');
    
    if (user_id) query = query.where('user_id', '==', user_id);
    if (task_status) query = query.where('task_status', '==', task_status);

    const tasksSnapshot = await query.get();
    const tasks = [];
    
    tasksSnapshot.forEach(doc => {
      tasks.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json(tasks);
  } catch (error) {
    console.error('Get planting tasks error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create planting task
router.post('/', async (req, res) => {
  try {
    const taskData = {
      ...req.body,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      task_date: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('plantingtasks').add(taskData);
    
    res.status(201).json({
      message: 'Planting task created successfully',
      id: docRef.id
    });
  } catch (error) {
    console.error('Create planting task error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update task status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { task_status } = req.body;
    
    await db.collection('plantingtasks').doc(id).update({
      task_status,
      last_updated: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ message: 'Task status updated successfully' });
  } catch (error) {
    console.error('Update task status error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;