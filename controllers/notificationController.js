// controllers/notificationController.js
const { db } = require('../config/firebaseAdmin');

/**
 * @desc    Get all notifications for user
 * @route   GET /api/notifications
 * @access  Private
 */
exports.getUserNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, read, resolved } = req.query;
    const userRole = req.user.role;

    let query = db.collection('notifications').where('targetRole', '==', userRole);

    if (read !== undefined) {
      query = query.where('read', '==', read === 'true');
    }

    if (resolved !== undefined) {
      query = query.where('resolved', '==', resolved === 'true');
    }

    query = query.where('hidden', '==', false);
    query = query.orderBy('notif_timestamp', 'desc');

    const snapshot = await query.get();
    const notifications = [];

    snapshot.forEach(doc => {
      notifications.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedNotifications = notifications.slice(startIndex, endIndex);

    res.status(200).json({
      success: true,
      data: paginatedNotifications,
      pagination: {
        total: notifications.length,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(notifications.length / parseInt(limit)),
        unread: notifications.filter(n => !n.read).length
      }
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get single notification
 * @route   GET /api/notifications/:id
 * @access  Private
 */
exports.getNotificationById = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection('notifications').doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: doc.id,
        ...doc.data()
      }
    });

  } catch (error) {
    console.error('Get notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve notification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Mark notification as read
 * @route   PATCH /api/notifications/:id/read
 * @access  Private
 */
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    await db.collection('notifications').doc(id).update({
      read: true,
      updatedAt: new Date()
    });

    res.status(200).json({
      success: true,
      message: 'Notification marked as read'
    });

  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Mark notification as resolved
 * @route   PATCH /api/notifications/:id/resolve
 * @access  Private (Admin/Officer)
 */
exports.markAsResolved = async (req, res) => {
  try {
    const { id } = req.params;

    await db.collection('notifications').doc(id).update({
      resolved: true,
      read: true,
      updatedAt: new Date()
    });

    res.status(200).json({
      success: true,
      message: 'Notification marked as resolved'
    });

  } catch (error) {
    console.error('Mark as resolved error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as resolved',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Delete notification (hide)
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    await db.collection('notifications').doc(id).update({
      hidden: true,
      updatedAt: new Date()
    });

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Mark all notifications as read
 * @route   POST /api/notifications/mark-all-read
 * @access  Private
 */
exports.markAllAsRead = async (req, res) => {
  try {
    const userRole = req.user.role;

    const snapshot = await db.collection('notifications')
      .where('targetRole', '==', userRole)
      .where('read', '==', false)
      .get();

    const batch = db.batch();

    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        read: true,
        updatedAt: new Date()
      });
    });

    await batch.commit();

    res.status(200).json({
      success: true,
      message: `${snapshot.size} notifications marked as read`
    });

  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}