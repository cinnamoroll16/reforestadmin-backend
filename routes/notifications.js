// routes/notifications.js - OPTIMIZED FOR ADMIN NOTIFICATIONS
const express = require('express');
const { db } = require('../config/firebaseAdmin');
const router = express.Router();

// Get admin notifications - SIMPLIFIED AND OPTIMIZED
router.get('/', async (req, res) => {
  try {
    const { read, type, limit = 50, page } = req.query;
    
    console.log('🔔 Fetching ADMIN notifications with params:', { read, type, limit, page });
    
    // Build query - always filter by targetRole: 'admin'
    let query = db.collection('notifications').where('targetRole', '==', 'admin');
    
    // Apply additional filters
    if (read !== undefined) {
      const readBool = read === 'true';
      query = query.where('read', '==', readBool);
    }
    
    if (type) {
      query = query.where('type', '==', type);
    }
    
    // Try different ordering strategies
    let snapshot;
    let orderingStrategy = 'default';
    
    try {
      // Strategy 1: Try updatedAt (from your sample data)
      query = query.orderBy('updatedAt', 'desc').limit(parseInt(limit));
      snapshot = await query.get();
      orderingStrategy = 'updatedAt';
      console.log('✓ Successfully ordered by updatedAt');
    } catch (indexError) {
      console.log('⚠️ updatedAt ordering failed, trying notif_timestamp...');
      
      try {
        // Strategy 2: Try notif_timestamp
        query = db.collection('notifications')
          .where('targetRole', '==', 'admin');
        
        // Reapply filters
        if (read !== undefined) query = query.where('read', '==', read === 'true');
        if (type) query = query.where('type', '==', type);
        
        query = query.orderBy('notif_timestamp', 'desc').limit(parseInt(limit));
        snapshot = await query.get();
        orderingStrategy = 'notif_timestamp';
        console.log('✓ Successfully ordered by notif_timestamp');
      } catch (indexError2) {
        console.log('⚠️ Both timestamp orderings failed, using createdAt...');
        
        try {
          // Strategy 3: Try createdAt
          query = db.collection('notifications')
            .where('targetRole', '==', 'admin');
          
          if (read !== undefined) query = query.where('read', '==', read === 'true');
          if (type) query = query.where('type', '==', type);
          
          query = query.orderBy('createdAt', 'desc').limit(parseInt(limit));
          snapshot = await query.get();
          orderingStrategy = 'createdAt';
          console.log('✓ Successfully ordered by createdAt');
        } catch (indexError3) {
          console.log('⚠️ All timestamp orderings failed, using manual approach...');
          
          // Final strategy: Get all admin notifications and sort manually
          query = db.collection('notifications')
            .where('targetRole', '==', 'admin')
            .limit(100);
          
          snapshot = await query.get();
          orderingStrategy = 'manual';
          console.log('✓ Using manual sorting for admin notifications');
        }
      }
    }

    const notifications = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      
      // Convert Firestore timestamps to ISO strings
      const processTimestamp = (timestamp) => {
        if (!timestamp) return new Date().toISOString();
        if (typeof timestamp === 'string') return timestamp;
        if (timestamp.toDate) return timestamp.toDate().toISOString();
        return new Date(timestamp).toISOString();
      };

      const notification = {
        id: doc.id,
        // Core notification fields from your sample data
        type: data.type,
        notification_type: data.notification_type,
        title: data.title,
        notif_message: data.notif_message,
        targetRole: data.targetRole,
        priority: data.priority,
        read: data.read,
        resolved: data.resolved,
        hidden: data.hidden,
        // Timestamp fields
        notif_timestamp: processTimestamp(data.notif_timestamp),
        updatedAt: processTimestamp(data.updatedAt),
        createdAt: processTimestamp(data.createdAt),
        // Include the data object if it exists
        data: data.data || {}
      };

      // Add optional fields if they exist
      if (data.createdBy) notification.createdBy = data.createdBy;
      if (data.locationRef) notification.locationRef = data.locationRef;
      if (data.plantRequestId) notification.plantRequestId = data.plantRequestId;
      if (data.preferredDate) notification.preferredDate = data.preferredDate;
      if (data.requestStatus) notification.requestStatus = data.requestStatus;
      if (data.userRef) notification.userRef = data.userRef;

      notifications.push(notification);
    });

    console.log(`   Retrieved ${notifications.length} ADMIN notifications from database`);

    // Manual sorting if needed
    if (orderingStrategy === 'manual') {
      notifications.sort((a, b) => {
        const timeA = new Date(a.notif_timestamp || a.updatedAt || a.createdAt);
        const timeB = new Date(b.notif_timestamp || b.updatedAt || b.createdAt);
        return timeB - timeA; // Descending order
      });
      
      // Apply limit after manual sorting
      if (notifications.length > parseInt(limit)) {
        notifications.length = parseInt(limit);
      }
    }

    console.log(`✅ Returning ${notifications.length} ADMIN notifications (ordered by ${orderingStrategy})`);
    
    // Log sample for debugging
    if (notifications.length > 0) {
      const sample = notifications[0];
      console.log('   Sample admin notification:', {
        id: sample.id,
        type: sample.type,
        targetRole: sample.targetRole,
        title: sample.title,
        read: sample.read,
        timestamp: sample.updatedAt || sample.notif_timestamp
      });
    }
    
    res.json({
      success: true,
      notifications: notifications,
      total: notifications.length,
      targetRole: 'admin',
      orderingStrategy: orderingStrategy
    });
    
  } catch (error) {
    console.error('❌ Get admin notifications error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      details: 'Failed to fetch admin notifications',
      suggestion: 'Check if Firestore indexes are properly configured for targetRole queries'
    });
  }
});

// Get admin notification statistics
router.get('/stats/summary', async (req, res) => {
  try {
    console.log('📊 Fetching admin notification statistics');
    
    // Get total count
    const totalQuery = db.collection('notifications')
      .where('targetRole', '==', 'admin');
    const totalSnapshot = await totalQuery.get();
    
    // Get unread count
    const unreadQuery = db.collection('notifications')
      .where('targetRole', '==', 'admin')
      .where('read', '==', false);
    const unreadSnapshot = await unreadQuery.get();
    
    // Get count by type
    const typeDistribution = {};
    totalSnapshot.forEach(doc => {
      const data = doc.data();
      const type = data.type || 'unknown';
      typeDistribution[type] = (typeDistribution[type] || 0) + 1;
    });
    
    const stats = {
      total: totalSnapshot.size,
      unread: unreadSnapshot.size,
      read: totalSnapshot.size - unreadSnapshot.size,
      typeDistribution: typeDistribution,
      targetRole: 'admin'
    };
    
    console.log('📊 Admin notification stats:', stats);
    
    res.json({
      success: true,
      ...stats
    });
    
  } catch (error) {
    console.error('❌ Get admin notification stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get admin notification by ID (only if it belongs to admin)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🔔 Fetching admin notification: ${id}`);
    
    const doc = await db.collection('notifications').doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ 
        success: false,
        error: 'Notification not found',
        id: id
      });
    }

    const data = doc.data();
    
    // Check if notification belongs to admin
    if (data.targetRole !== 'admin') {
      return res.status(403).json({ 
        success: false,
        error: 'Access denied',
        message: 'This notification does not belong to admin role',
        id: id,
        targetRole: data.targetRole
      });
    }
    
    // Process timestamp fields
    const processTimestamp = (timestamp) => {
      if (!timestamp) return new Date().toISOString();
      if (typeof timestamp === 'string') return timestamp;
      if (timestamp.toDate) return timestamp.toDate().toISOString();
      return new Date(timestamp).toISOString();
    };

    const notification = {
      id: doc.id,
      // Core notification fields
      type: data.type,
      notification_type: data.notification_type,
      title: data.title,
      notif_message: data.notif_message,
      targetRole: data.targetRole,
      priority: data.priority,
      read: data.read,
      resolved: data.resolved,
      hidden: data.hidden,
      // Timestamp fields
      notif_timestamp: processTimestamp(data.notif_timestamp),
      updatedAt: processTimestamp(data.updatedAt),
      createdAt: processTimestamp(data.createdAt),
      // Include the data object
      data: data.data || {}
    };

    // Add optional fields if they exist
    if (data.createdBy) notification.createdBy = data.createdBy;
    if (data.locationRef) notification.locationRef = data.locationRef;
    if (data.plantRequestId) notification.plantRequestId = data.plantRequestId;
    if (data.preferredDate) notification.preferredDate = data.preferredDate;
    if (data.requestStatus) notification.requestStatus = data.requestStatus;
    if (data.userRef) notification.userRef = data.userRef;

    console.log(`✅ Found admin notification: ${notification.title}`);
    
    res.json({
      success: true,
      notification: notification
    });
  } catch (error) {
    console.error('❌ Get admin notification by ID error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Create notification - ENFORCE ADMIN ROLE
router.post('/', async (req, res) => {
  try {
    const {
      type,
      notification_type,
      title,
      notif_message,
      data: notificationData,
      targetRole = 'admin', // Default to admin
      priority = 'medium',
      read = false,
      resolved = false,
      hidden = false,
      ...additionalFields
    } = req.body;

    // Validate required fields based on your sample data
    if (!type || !title || !notif_message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: 'type, title, and notif_message are required',
        received: {
          type: !!type,
          title: !!title,
          notif_message: !!notif_message
        }
      });
    }

    // Force targetRole to be admin
    const finalTargetRole = 'admin';
    
    const now = new Date();
    const notificationDoc = {
      type,
      notification_type: notification_type || 'general',
      title,
      notif_message,
      data: notificationData || {},
      targetRole: finalTargetRole, // Always set to admin
      priority,
      read,
      resolved,
      hidden,
      ...additionalFields,
      // Timestamp fields
      notif_timestamp: now,
      updatedAt: now,
      createdAt: now
    };

    console.log('📝 Creating ADMIN notification:', {
      type: notificationDoc.type,
      targetRole: notificationDoc.targetRole,
      title: notificationDoc.title
    });

    const docRef = await db.collection('notifications').add(notificationDoc);
    
    console.log(`✅ ADMIN notification created with ID: ${docRef.id}`);
    
    // Return the created notification
    const responseNotification = {
      id: docRef.id,
      ...notificationDoc,
      notif_timestamp: now.toISOString(),
      updatedAt: now.toISOString(),
      createdAt: now.toISOString()
    };
    
    res.status(201).json({
      success: true,
      message: 'Admin notification created successfully',
      notification: responseNotification
    });
  } catch (error) {
    console.error('❌ Create admin notification error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message
    });
  }
});

// Update notification - ONLY ALLOW IF TARGETROLE IS ADMIN
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };

    console.log(`📝 Updating admin notification ${id}:`, Object.keys(updateData));

    // Check if document exists first and belongs to admin
    const docRef = db.collection('notifications').doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ 
        success: false,
        error: 'Notification not found',
        id: id
      });
    }

    const existingData = doc.data();
    
    // Check if notification belongs to admin
    if (existingData.targetRole !== 'admin') {
      return res.status(403).json({ 
        success: false,
        error: 'Access denied',
        message: 'Cannot update notification that does not belong to admin role',
        id: id,
        targetRole: existingData.targetRole
      });
    }

    await docRef.update(updateData);
    
    // Get the updated document
    const updatedDoc = await docRef.get();
    const updatedData = updatedDoc.data();
    
    // Process timestamps for response
    const processTimestamp = (timestamp) => {
      if (!timestamp) return new Date().toISOString();
      if (typeof timestamp === 'string') return timestamp;
      if (timestamp.toDate) return timestamp.toDate().toISOString();
      return new Date(timestamp).toISOString();
    };

    const responseNotification = {
      id,
      // Core fields
      type: updatedData.type,
      notification_type: updatedData.notification_type,
      title: updatedData.title,
      notif_message: updatedData.notif_message,
      targetRole: updatedData.targetRole,
      priority: updatedData.priority,
      read: updatedData.read,
      resolved: updatedData.resolved,
      hidden: updatedData.hidden,
      // Timestamps
      notif_timestamp: processTimestamp(updatedData.notif_timestamp),
      updatedAt: processTimestamp(updatedData.updatedAt),
      createdAt: processTimestamp(updatedData.createdAt),
      // Data object
      data: updatedData.data || {}
    };

    // Add optional fields if they exist
    if (updatedData.createdBy) responseNotification.createdBy = updatedData.createdBy;
    if (updatedData.locationRef) responseNotification.locationRef = updatedData.locationRef;
    if (updatedData.plantRequestId) responseNotification.plantRequestId = updatedData.plantRequestId;
    if (updatedData.preferredDate) responseNotification.preferredDate = updatedData.preferredDate;
    if (updatedData.requestStatus) responseNotification.requestStatus = updatedData.requestStatus;
    if (updatedData.userRef) responseNotification.userRef = updatedData.userRef;

    console.log(`✅ Admin notification ${id} updated successfully`);
    
    res.json({
      success: true,
      message: 'Admin notification updated successfully',
      notification: responseNotification
    });
  } catch (error) {
    console.error('❌ Update admin notification error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message
    });
  }
});

// Delete notification - ONLY ALLOW IF TARGETROLE IS ADMIN
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🗑️ Deleting admin notification ${id}`);

    // Check if document exists first and belongs to admin
    const docRef = db.collection('notifications').doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ 
        success: false,
        error: 'Notification not found',
        id: id
      });
    }

    const existingData = doc.data();
    
    // Check if notification belongs to admin
    if (existingData.targetRole !== 'admin') {
      return res.status(403).json({ 
        success: false,
        error: 'Access denied',
        message: 'Cannot delete notification that does not belong to admin role',
        id: id,
        targetRole: existingData.targetRole
      });
    }

    await docRef.delete();
    
    console.log(`✅ Admin notification ${id} deleted successfully`);
    
    res.json({ 
      success: true,
      message: 'Admin notification deleted successfully',
      id,
      deletedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Delete admin notification error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message
    });
  }
});

// Mark all admin notifications as read
router.patch('/actions/mark-all-read', async (req, res) => {
  try {
    const { type } = req.body;
    
    console.log('📝 Marking all ADMIN notifications as read', type ? `for type: ${type}` : '');
    
    // Always filter by admin role and unread status
    let query = db.collection('notifications')
      .where('targetRole', '==', 'admin')
      .where('read', '==', false);
    
    // Apply type filter if provided
    if (type) {
      query = query.where('type', '==', type);
    }
    
    const snapshot = await query.get();
    
    if (snapshot.empty) {
      return res.json({
        success: true,
        message: 'No unread admin notifications found',
        updatedCount: 0,
        targetRole: 'admin'
      });
    }
    
    const batch = db.batch();
    const updateTime = new Date();
    
    snapshot.forEach(doc => {
      batch.update(doc.ref, {
        read: true,
        updatedAt: updateTime
      });
    });
    
    await batch.commit();
    
    console.log(`✅ Marked ${snapshot.size} ADMIN notifications as read`);
    
    res.json({
      success: true,
      message: `Successfully marked ${snapshot.size} admin notifications as read`,
      updatedCount: snapshot.size,
      targetRole: 'admin',
      updatedAt: updateTime.toISOString()
    });
  } catch (error) {
    console.error('❌ Mark all as read error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message
    });
  }
});

module.exports = router;