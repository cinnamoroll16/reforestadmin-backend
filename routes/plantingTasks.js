// routes/notifications.js - WITH DEBUG ROUTE
const express = require('express');
const { db } = require('../config/firebaseAdmin');
const router = express.Router();

// Debug route to check notification structure
router.get('/debug/structure', async (req, res) => {
  try {
    const snapshot = await db.collection('notifications').limit(5).get();
    const notifications = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      notifications.push({
        id: doc.id,
        fields: Object.keys(data),
        hasCreatedAt: !!data.createdAt,
        hasNotifTimestamp: !!data.notif_timestamp,
        data: data
      });
    });

    console.log('📊 Notification structure analysis:', notifications);
    res.json(notifications);
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get notifications - FLEXIBLE VERSION
router.get('/', async (req, res) => {
  try {
    const { targetRole, read, limit = 50 } = req.query;
    
    console.log('🔔 Fetching notifications...');
    
    let query = db.collection('notifications');
    
    // Apply targetRole filter if provided
    if (targetRole) {
      query = query.where('targetRole', '==', targetRole);
    }
    
    // Apply read filter if provided
    if (read !== undefined) {
      query = query.where('read', '==', read === 'true');
    }
    
    // Try to use createdAt first, fallback to notif_timestamp
    let snapshot;
    try {
      // First try with createdAt (uses existing index)
      query = query.orderBy('createdAt', 'desc').limit(parseInt(limit));
      snapshot = await query.get();
      console.log('✓ Successfully used createdAt for ordering');
    } catch (indexError) {
      console.log('⚠️ createdAt ordering failed, trying notif_timestamp...');
      
      // If createdAt fails, try notif_timestamp without targetRole filter
      query = db.collection('notifications')
               .orderBy('notif_timestamp', 'desc')
               .limit(parseInt(limit));
      
      if (targetRole) {
        // We'll filter manually after query
        console.log('⚠️ Cannot use targetRole filter with notif_timestamp ordering');
      }
      
      snapshot = await query.get();
      console.log('✓ Successfully used notif_timestamp for ordering');
    }

    const notifications = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      notifications.push({
        id: doc.id,
        ...data
      });
    });

    // Manual filtering if we couldn't use targetRole in query
    let filteredNotifications = notifications;
    if (targetRole && !query._queryOptions.fieldFilters?.some(f => f.field.path === 'targetRole')) {
      filteredNotifications = notifications.filter(n => n.targetRole === targetRole);
      console.log(`✓ Manually filtered to ${filteredNotifications.length} notifications for targetRole: ${targetRole}`);
    }

    console.log(`✓ Found ${filteredNotifications.length} notifications total`);
    res.json(filteredNotifications);
    
  } catch (error) {
    console.error('❌ Get notifications error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;