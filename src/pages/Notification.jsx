// src/pages/Notification.js - UPDATED LOCATION RESOLUTION
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, Alert, IconButton,
  Badge, useMediaQuery, useTheme, Avatar, LinearProgress, alpha,
  Tabs, Tab, Snackbar, CircularProgress, Toolbar
} from '@mui/material';
import ReForestAppBar from './AppBar.jsx';
import Navigation from './Navigation.jsx';
import { useAuth } from '../context/AuthContext.js';
import { apiService } from '../services/api.js';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import DeleteIcon from '@mui/icons-material/Delete';
import MarkAsReadIcon from '@mui/icons-material/DoneAll';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ForestIcon from '@mui/icons-material/Forest';
import HistoryIcon from '@mui/icons-material/History';

const drawerWidth = 240;

// =============================================================================
// NOTIFICATION HELPER FUNCTIONS
// =============================================================================

export const createPlantRequestNotification = async (plantRequestData, plantRequestId) => {
  try {
    const notificationData = {
      type: 'plant_request',
      notification_type: 'pending',
      title: 'New Planting Request',
      notif_message: `New planting request from ${plantRequestData.fullName} for ${plantRequestData.preferred_date}`,
      data: {
        plantRequestId: plantRequestId,
        userRef: plantRequestData.userRef,
        locationRef: plantRequestData.locationRef,
        preferredDate: plantRequestData.preferred_date,
        createdBy: plantRequestData.createdBy,
        requestStatus: 'pending'
      },
      targetRole: 'admin', // Explicitly set to admin
      read: false,
      resolved: false,
      hidden: false,
      priority: 'medium',
      notif_timestamp: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await apiService.createNotification(notificationData);
    console.log('✓ Admin notification created via API:', result.id);
    return result.id;
  } catch (error) {
    console.error('Error creating admin notification via API:', error);
    throw error;
  }
};

export const createPlantingRecordNotification = async (plantingRecordData, plantingRecordId) => {
  try {
    // Resolve user and location information for the notification message
    const userInfo = await resolveUserRef(plantingRecordData.userRef);
    const locationName = await resolveLocationRef(plantingRecordData.locationRef);
    
    const notificationData = {
      type: 'planting_record',
      notification_type: 'completed',
      title: 'Planting Activity Completed',
      notif_message: `Planter ${userInfo.name} has planted ${plantingRecordData.seedlingRef || 'a tree'} in ${locationName}`,
      data: {
        plantingRecordId: plantingRecordId,
        userRef: plantingRecordData.userRef,
        locationRef: plantingRecordData.locationRef,
        seedlingRef: plantingRecordData.seedlingRef,
        record_date: plantingRecordData.record_date,
        status: 'completed'
      },
      targetRole: 'admin', // Explicitly set to admin
      read: false,
      resolved: false,
      hidden: false,
      priority: 'low',
      notif_timestamp: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await apiService.createNotification(notificationData);
    console.log('✓ Planting record admin notification created via API:', result.id);
    return result.id;
  } catch (error) {
    console.error('Error creating planting record admin notification via API:', error);
    throw error;
  }
};

export const markNotificationAsRead = async (notificationId) => {
  try {
    await apiService.updateNotification(notificationId, {
      read: true,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error marking notification as read via API:', error);
    throw error;
  }
};

export const hideNotification = async (notificationId) => {
  try {
    await apiService.updateNotification(notificationId, {
      hidden: true,
      hiddenAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error hiding notification via API:', error);
    throw error;
  }
};

// Helper function to resolve location reference - UPDATED VERSION
const resolveLocationRef = async (locationRef) => {
  try {
    if (!locationRef) return { name: 'Unknown Location' };
    
    let locationName;
    
    // Handle different reference formats
    if (locationRef.includes('/')) {
      locationName = locationRef.split('/').pop();
    } else if (locationRef.startsWith('locations/')) {
      locationName = locationRef.replace('locations/', '');
    } else {
      locationName = locationRef;
    }
    
    return {
      name: locationName || 'Unknown Location'
    };
  } catch (error) {
    console.error('Error fetching location data:', error);
    return { name: 'Unknown Location' };
  }
};

// Helper function to resolve user reference using API
const resolveUserRef = async (userRef) => {
  if (!userRef) return { name: 'Unknown User', email: 'N/A' };
  
  try {
    // Extract user ID from reference
    const userId = typeof userRef === 'string' 
      ? userRef.split('/').pop() 
      : userRef.path?.split('/').pop();
    
    if (userId) {
      const userData = await apiService.getUser(userId);
      if (userData) {
        return {
          name: `${userData.user_firstname || userData.user_Firstname || userData.firstName || ''} ${userData.user_lastname || userData.user_Lastname || userData.lastName || ''}`.trim() || 'Unknown User',
          email: userData.user_email || userData.email || 'N/A'
        };
      }
    }
  } catch (error) {
    console.error('Error resolving user via API:', error);
  }
  
  return { name: 'Unknown User', email: 'N/A' };
};

// Helper function to resolve seedling reference using API
const resolveSeedlingRef = async (seedlingRef) => {
  if (!seedlingRef) return 'Unknown Tree';
  
  try {
    // If seedlingRef is a code like "ts070", use it directly
    if (typeof seedlingRef === 'string' && seedlingRef.length > 0) {
      return seedlingRef; // Return the seedling code
    }
    
    // If it's a document reference, extract the ID
    const seedlingId = typeof seedlingRef === 'string' 
      ? seedlingRef.split('/').pop() 
      : seedlingRef.path?.split('/').pop();
    
    if (seedlingId) {
      const seedlingData = await apiService.getTreeSeedling(seedlingId);
      return seedlingData?.tree_name || seedlingData?.name || seedlingId;
    }
  } catch (error) {
    console.error('Error resolving seedling via API:', error);
  }
  
  return 'Unknown Tree';
};

// =============================================================================
// DATA FETCHING FUNCTIONS (UPDATED - FETCH ONLY ADMIN NOTIFICATIONS)
// =============================================================================

// Fetch planting requests from API - UPDATED WITH LOCATION RESOLUTION
const fetchPlantingRequests = async () => {
  try {
    console.log('🌱 Fetching planting requests via API...');
    const response = await apiService.getPlantingRequests();
    
    console.log('🔍 Planting requests API response:', response);
    
    // apiService.getPlantingRequests() returns the raw response
    const requests = Array.isArray(response) ? response : [];
    
    console.log('✅ Planting requests loaded via API:', requests.length);
    
    // Process planting requests with location resolution
    const processedRequests = await Promise.all(
      requests.map(async (request) => {
        try {
          const userInfo = await resolveUserRef(request.userRef);
          const locationInfo = await resolveLocationRef(request.locationRef);
          
          return {
            ...request,
            fullName: userInfo.name,
            userEmail: userInfo.email,
            locationName: locationInfo.name
          };
        } catch (error) {
          console.error('Error processing planting request:', error);
          return {
            ...request,
            fullName: 'Unknown User',
            userEmail: 'N/A',
            locationName: 'Unknown Location'
          };
        }
      })
    );
    
    return processedRequests;
  } catch (error) {
    console.error('❌ API fetch failed:', error.message);
    return [];
  }
};

// Fetch planting records from API - UPDATED WITH LOCATION RESOLUTION
const fetchPlantingRecords = async () => {
  try {
    console.log('📊 Fetching planting records via API...');
    const response = await apiService.getPlantingRecords();
    
    console.log('🔍 Planting records API response:', response);
    
    // apiService.getPlantingRecords() already returns an array or empty array
    const records = Array.isArray(response) ? response : [];
    
    console.log('✅ Planting records loaded via API:', records.length);
    
    // Process planting records to resolve references
    const processedRecords = await Promise.all(
      records.map(async (record) => {
        try {
          const userInfo = await resolveUserRef(record.userRef);
          const locationInfo = await resolveLocationRef(record.locationRef);
          const seedlingName = await resolveSeedlingRef(record.seedlingRef);
          
          return {
            ...record,
            fullName: userInfo.name,
            userEmail: userInfo.email,
            locationName: locationInfo.name,
            treeSeedlingName: seedlingName,
            plantingDate: record.record_date || record.createdAt
          };
        } catch (error) {
          console.error('Error processing planting record:', error);
          return {
            ...record,
            fullName: 'Unknown User',
            userEmail: 'N/A',
            locationName: 'Unknown Location',
            treeSeedlingName: record.seedlingRef || 'Unknown Tree',
            plantingDate: record.record_date || record.createdAt
          };
        }
      })
    );
    
    return processedRecords;
  } catch (error) {
    console.error('❌ API fetch failed:', error.message);
    return [];
  }
};

// Fetch notifications from API - FIXED with better error handling
const fetchNotifications = async () => {
  try {
    console.log('🔔 Fetching ADMIN notifications via API...');
    
    // Clear cache first to ensure fresh data
    apiService.invalidateCache('/api/notifications');
    
    const response = await apiService.getNotifications();
    
    console.log('🔍 Notifications API response:', response);
    
    // apiService.getNotifications() already returns an array or empty array
    const notifications = Array.isArray(response) ? response : [];
    
    console.log('✅ ADMIN notifications loaded via API:', notifications.length);
    
    // Additional client-side filtering to ensure only admin notifications
    const adminNotifications = notifications.filter(notification => 
      notification.targetRole === 'admin'
    );
    
    console.log('✅ Filtered ADMIN notifications:', adminNotifications.length);
    
    return adminNotifications;
  } catch (error) {
    console.error('❌ API fetch failed:', error.message);
    return [];
  }
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const NotificationPanel = () => {
  const { user, logout } = useAuth();
  const [plantingRequests, setPlantingRequests] = useState([]);
  const [plantingRecords, setPlantingRecords] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [saving, setSaving] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Load all data using API service
  const loadData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading ADMIN notification data via API...');

      const [notificationsData, requestsData, recordsData] = await Promise.all([
        fetchNotifications(), // This now fetches only admin notifications
        fetchPlantingRequests(),
        fetchPlantingRecords()
      ]);

      setNotifications(notificationsData);
      setPlantingRequests(requestsData);
      setPlantingRecords(recordsData);

      console.log('✅ ADMIN notification data loaded successfully via API');
      console.log('📊 Stats:', {
        adminNotifications: notificationsData.length,
        requests: requestsData.length,
        records: recordsData.length
      });
      setLoading(false);

    } catch (error) {
      console.error('❌ Error loading admin notification data:', error);
      setAlert({
        open: true,
        message: 'Error loading data: ' + error.message,
        severity: 'error'
      });
      setLoading(false);
    }
  };

  // Setup polling for real-time updates
  useEffect(() => {
    loadData();

    // Set up polling for real-time updates
    const pollInterval = setInterval(() => {
      loadData();
    }, 30000); // Poll every 30 seconds

    return () => {
      clearInterval(pollInterval);
    };
  }, []);

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setDetailDialogOpen(true);
  };

  const handleViewRecord = (record) => {
    setSelectedRecord(record);
    setRecordDialogOpen(true);
  };

  const handleViewNotification = async (notification) => {
    setSelectedNotification(notification);
    setNotificationDialogOpen(true);
    
    if (!notification.read) {
      try {
        await apiService.updateNotification(notification.id, { read: true });
        
        setNotifications(prev => prev.map(n => 
          n.id === notification.id ? { ...n, read: true } : n
        ));
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setSaving(true);
      
      // Use the bulk mark as read endpoint
      await apiService.markAllNotificationsAsRead();
      
      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setAlert({ open: true, message: 'All admin notifications marked as read', severity: 'success' });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      setAlert({ open: true, message: 'Error marking notifications as read', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveNotification = async (notificationId) => {
    try {
      setSaving(true);
      await apiService.deleteNotification(notificationId);
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setAlert({ open: true, message: 'Admin notification removed', severity: 'success' });
    } catch (error) {
      console.error('Error removing notification:', error);
      setAlert({ open: true, message: 'Error removing notification', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status) => {
    if (!status) return 'default';
    switch (status.toLowerCase()) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'completed': return 'info';
      default: return 'default';
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'plant_request': return <NewReleasesIcon />;
      case 'request_approved': return <CheckCircleIcon />;
      case 'request_rejected': return <CancelIcon />;
      case 'planting_record': return <ForestIcon />;
      default: return <NotificationsIcon />;
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    
    try {
      if (typeof date === 'string') {
        const parsed = new Date(date);
        if (!isNaN(parsed.getTime())) {
          return parsed.toLocaleDateString();
        }
        return date;
      }
      
      if (date instanceof Date) {
        return date.toLocaleDateString();
      }
      
      return String(date);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  const formatType = (type) => {
    if (!type) return "Unknown";
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatDateTime = (date) => {
    if (!date) return 'N/A';
    
    try {
      let dateObj = null;
      
      if (typeof date === 'string') {
        dateObj = new Date(date);
      } else if (date instanceof Date) {
        dateObj = date;
      }
      
      if (dateObj && !isNaN(dateObj.getTime())) {
        return dateObj.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      
      return String(date);
    } catch (error) {
      console.error('Error formatting datetime:', error);
      return 'Invalid Date';
    }
  };

  // Combine all notifications: API notifications (admin-only) + planting requests + planting records
  const allNotifications = [
    ...notifications, // These are now filtered to only admin notifications from the backend
    ...plantingRequests.map(request => ({
      id: `request-${request.id}`,
      type: 'plant_request',
      notification_type: 'pending',
      title: 'New Planting Request',
      message: `Planter ${request.fullName} has submitted a planting request for ${request.locationName}`,
      notif_message: `Planter ${request.fullName} has submitted a planting request for ${request.locationName}`,
      data: {
        plantRequestId: request.id,
        userRef: request.userRef,
        locationRef: request.locationRef,
        preferredDate: request.preferred_date,
        requestStatus: request.requestStatus || request.request_status || 'pending'
      },
      targetRole: 'admin',
      read: false,
      resolved: false,
      hidden: false,
      priority: 'medium',
      timestamp: request.request_date || new Date().toISOString(),
      notif_timestamp: request.request_date || new Date().toISOString(),
      createdAt: request.request_date || new Date().toISOString(),
      updatedAt: request.request_date || new Date().toISOString()
    })),
    ...plantingRecords.map(record => ({
      id: `record-${record.id}`,
      type: 'planting_record',
      notification_type: 'completed',
      title: 'Planting Activity Completed',
      message: `Planter ${record.fullName} has planted ${record.treeSeedlingName || record.seedlingRef || 'a tree'} in ${record.locationName}`,
      notif_message: `Planter ${record.fullName} has planted ${record.treeSeedlingName || record.seedlingRef || 'a tree'} in ${record.locationName}`,
      data: {
        plantingRecordId: record.id,
        userRef: record.userRef,
        locationRef: record.locationRef,
        seedlingRef: record.seedlingRef,
        treeSeedlingName: record.treeSeedlingName,
        plantingDate: record.plantingDate,
        record_date: record.record_date,
        status: 'completed'
      },
      targetRole: 'admin',
      read: false,
      resolved: false,
      hidden: false,
      priority: 'low',
      timestamp: record.record_date || record.createdAt || new Date().toISOString(),
      notif_timestamp: record.record_date || record.createdAt || new Date().toISOString(),
      createdAt: record.record_date || record.createdAt || new Date().toISOString(),
      updatedAt: record.record_date || record.createdAt || new Date().toISOString()
    }))
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Filter notifications for each tab
  const plantingRequestNotifications = allNotifications.filter(
    notification => notification.type === 'plant_request'
  );

  const unreadCount = allNotifications.filter(n => !n.read).length;
  const plantingRequestUnreadCount = plantingRequestNotifications.filter(n => !n.read).length;

  // NotificationRow component
  const NotificationRow = ({ notification }) => (
    <Paper 
      sx={{ 
        p: 2, 
        mb: 1,
        borderRadius: 2,
        borderLeft: `4px solid ${
          notification.type === 'plant_request' ? theme.palette.warning.main :
          notification.type === 'planting_record' ? theme.palette.success.main :
          notification.priority === 'high' ? theme.palette.error.main :
          notification.priority === 'medium' ? theme.palette.warning.main :
          theme.palette.info.main
        }`,
        backgroundColor: notification.read ? 'background.paper' : alpha(theme.palette.primary.main, 0.04),
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        '&:hover': { 
          transform: 'translateY(-1px)',
          boxShadow: 2,
          backgroundColor: notification.read ? 
            alpha(theme.palette.primary.main, 0.02) : 
            alpha(theme.palette.primary.main, 0.08)
        }
      }}
      onClick={() => {
        if (notification.type === 'plant_request') {
          const request = plantingRequests.find(req => req.id === notification.data.plantRequestId);
          if (request) {
            handleViewDetails(request);
          }
        } else if (notification.type === 'planting_record') {
          const record = plantingRecords.find(rec => rec.id === notification.data.plantingRecordId);
          if (record) {
            handleViewRecord(record);
          }
        } else {
          handleViewNotification(notification);
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Box sx={{ 
          color: notification.read ? 'text.secondary' : 
            notification.type === 'plant_request' ? 'warning.main' :
            notification.type === 'planting_record' ? 'success.main' :
            notification.priority === 'high' ? 'error.main' :
            notification.priority === 'medium' ? 'warning.main' : 'primary.main',
          mt: 0.5
        }}>
          {getNotificationIcon(notification.type)}
        </Box>
        
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                fontWeight: notification.read ? 'normal' : 'bold',
                color: notification.read ? 'text.primary' : 
                  notification.type === 'plant_request' ? 'warning.main' :
                  notification.type === 'planting_record' ? 'success.main' : 'primary.main'
              }}
            >
              {notification.title}
            </Typography>
            <Chip 
              label={
                notification.type === 'plant_request' ? 'Request' :
                notification.type === 'planting_record' ? 'Completed' :
                notification.priority || 'medium'
              } 
              size="small" 
              color={
                notification.type === 'plant_request' ? 'warning' :
                notification.type === 'planting_record' ? 'success' :
                notification.priority === 'high' ? 'error' : 
                notification.priority === 'medium' ? 'warning' : 'default'
              }
              variant="outlined"
            />
            {!notification.read && (
              <Chip 
                label="New" 
                size="small" 
                color="primary"
                variant="filled"
              />
            )}
          </Box>
          
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ mb: 1 }}
          >
            {notification.message || notification.notif_message}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="caption" color="text.secondary">
              {formatDateTime(notification.notif_timestamp || notification.timestamp)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              • {formatType(notification.type)}
            </Typography>
            {notification.data?.preferredDate && (
              <Typography variant="caption" color="text.secondary">
                • Preferred: {formatDate(notification.data.preferredDate)}
              </Typography>
            )}
            {notification.data?.record_date && (
              <Typography variant="caption" color="text.secondary">
                • Planted: {formatDate(notification.data.record_date)}
              </Typography>
            )}
          </Box>
        </Box>
        
        <Box onClick={(e) => e.stopPropagation()}>
          <IconButton 
            size="small" 
            onClick={() => handleRemoveNotification(notification.id)}
            color="error"
            disabled={saving}
            sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}
            title="Remove notification"
          >
            {saving ? <CircularProgress size={20} /> : <DeleteIcon />}
          </IconButton>
        </Box>
      </Box>
    </Paper>
  );

  const EmptyState = ({ icon: Icon, title, description }) => (
    <Paper sx={{ textAlign: 'center', p: 6, borderRadius: 2 }}>
      <Icon sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
      <Typography variant="h6" color="text.secondary" gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
    </Paper>
  );

  // Get current notifications based on active tab
  const getCurrentNotifications = () => {
    switch (activeTab) {
      case 0: // All Notifications
        return allNotifications;
      case 1: // Planting Requests Only
        return plantingRequestNotifications;
      default:
        return allNotifications;
    }
  };

  const currentNotifications = getCurrentNotifications();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', bgcolor: '#f8fafc', minHeight: '100vh' }}>
        <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={user} onLogout={logout} />
        <Navigation mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} isMobile={isMobile} user={user} />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            width: { md: `calc(100% - ${drawerWidth}px)` },
            mt: '64px',
          }}
        >
          <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />
          <Typography variant="body2" color="text.secondary" align="center">
            Loading admin notifications...
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', bgcolor: '#f8fafc', minHeight: '100vh' }}>
      <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={user} onLogout={logout} />
      <Navigation mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} isMobile={isMobile} user={user} />

      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          p: 3, 
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: '64px'
        }}
      >      
        {alert.open && (
          <Alert 
            severity={alert.severity} 
            onClose={() => setAlert({ ...alert, open: false })}
            sx={{ mb: 2 }}
          >
            {alert.message}
          </Alert>
        )}

        <Box sx={{ width: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h4" sx={{ color: '#2e7d32', fontWeight: 600 }}>
                Admin Notifications Center
              </Typography>
              <Typography variant="body1" color="text.secondary">
                View and manage admin notifications and activities
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              {unreadCount > 0 && (
                <Button
                  startIcon={saving ? <CircularProgress size={20} /> : <MarkAsReadIcon />}
                  onClick={handleMarkAllAsRead}
                  variant="outlined"
                  color="primary"
                  disabled={saving}
                >
                  {saving ? 'Marking...' : 'Mark All as Read'}
                </Button>
              )}
              <Button
                startIcon={<CheckCircleIcon />}
                onClick={loadData}
                variant="outlined"
                disabled={loading}
              >
                Refresh
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Two Tabs: All Notifications and Planting Requests */}
        <Paper sx={{ mb: 3, borderRadius: 2, boxShadow: 2 }}>
          <Tabs 
            value={activeTab}
            onChange={handleTabChange}
            sx={{
              '& .MuiTab-root': { 
                fontWeight: 600,
                minHeight: 70,
                textTransform: 'none',
                fontSize: '0.95rem'
              },
              '& .Mui-selected': { 
                color: '#2e7d32'
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#2e7d32',
                height: 3
              }
            }}
          >
            <Tab 
              icon={
                <Badge 
                  badgeContent={unreadCount} 
                  color="error"
                  sx={{ 
                    '& .MuiBadge-badge': { 
                      right: -3, 
                      top: 3,
                      fontSize: '0.7rem',
                      minWidth: 18,
                      height: 18
                    } 
                  }}
                >
                  <NotificationsIcon />
                </Badge>
              }
              label={
                <Box>
                  <Typography variant="body2" fontWeight="600">
                    All Admin Notifications
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {allNotifications.length} total • {plantingRequests.length} requests • {plantingRecords.length} records
                  </Typography>
                </Box>
              }
              iconPosition="start"
            />
            <Tab 
              icon={
                <Badge 
                  badgeContent={plantingRequestUnreadCount} 
                  color="error"
                  sx={{ 
                    '& .MuiBadge-badge': { 
                      right: -3, 
                      top: 3,
                      fontSize: '0.7rem',
                      minWidth: 18,
                      height: 18
                    } 
                  }}
                >
                  <AssignmentIcon />
                </Badge>
              }
              label={
                <Box>
                  <Typography variant="body2" fontWeight="600">
                    Planting Requests
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {plantingRequestNotifications.length} requests pending review
                  </Typography>
                </Box>
              }
              iconPosition="start"
            />
          </Tabs>
        </Paper>

        {/* Tab Content */}
        {activeTab === 0 && (
          <>
            <Typography variant="h6" sx={{ color: '#2e7d32', fontWeight: 600, mb: 2 }}>
              All Admin Notifications
            </Typography>
            
            {allNotifications.length === 0 ? (
              <EmptyState 
                icon={NotificationsIcon}
                title="No admin notifications available"
                description="New admin notifications will appear here when available"
              />
            ) : (
              <Box>
                {allNotifications.map((notification) => (
                  <NotificationRow key={notification.id} notification={notification} />
                ))}
              </Box>
            )}
          </>
        )}

        {activeTab === 1 && (
          <>
            <Typography variant="h6" sx={{ color: '#2e7d32', fontWeight: 600, mb: 2 }}>
              Planting Requests
            </Typography>
            
            {plantingRequestNotifications.length === 0 ? (
              <EmptyState 
                icon={AssignmentIcon}
                title="No planting requests"
                description="New planting requests will appear here when submitted"
              />
            ) : (
              <Box>
                {plantingRequestNotifications.map((notification) => (
                  <NotificationRow key={notification.id} notification={notification} />
                ))}
              </Box>
            )}
          </>
        )}

        {/* Detail Dialog for Planting Requests - UPDATED LOCATION DISPLAY */}
        <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Planting Request Details</DialogTitle>
          <DialogContent>
            {selectedRequest && (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Requester Information</Typography>
                  <Box sx={{ mt: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography><strong>Name:</strong> {selectedRequest.fullName || 'Unknown User'}</Typography>
                    <Typography><strong>Email:</strong> {selectedRequest.createdBy || 'N/A'}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Location Information</Typography>
                  <Box sx={{ mt: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography><strong>Location:</strong> {selectedRequest.locationName || 'Unknown Location'}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Request Details</Typography>
                  <Box sx={{ mt: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography>
                      <strong>Preferred Date:</strong> {formatDate(selectedRequest.preferred_date) || 'N/A'}
                    </Typography>
                    <Typography>
                      <strong>Submitted At:</strong> {formatDateTime(selectedRequest.request_date) || 'N/A'}
                    </Typography>
                    <Typography>
                      <strong>Status:</strong> 
                      <Chip 
                        label={selectedRequest.requestStatus || selectedRequest.request_status || 'pending'} 
                        color={getStatusColor(selectedRequest.requestStatus || selectedRequest.request_status || 'pending')}
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    </Typography>
                    {selectedRequest.request_remarks && (
                      <Typography sx={{ mt: 1 }}><strong>Remarks:</strong> {selectedRequest.request_remarks}</Typography>
                    )}
                  </Box>
                </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Detail Dialog for Planting Records - UPDATED LOCATION DISPLAY */}
        <Dialog open={recordDialogOpen} onClose={() => setRecordDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Planting Record Details</DialogTitle>
          <DialogContent>
            {selectedRecord && (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">User Information</Typography>
                  <Box sx={{ mt: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography><strong>Name:</strong> {selectedRecord.fullName || 'Unknown User'}</Typography>
                    <Typography><strong>Email:</strong> {selectedRecord.userEmail || 'N/A'}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Location Information</Typography>
                  <Box sx={{ mt: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography><strong>Location:</strong> {selectedRecord.locationName || 'Unknown Location'}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Planting Details</Typography>
                  <Box sx={{ mt: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography>
                      <strong>Tree Seedling:</strong> {selectedRecord.treeSeedlingName || selectedRecord.seedlingRef || 'Unknown Tree'}
                    </Typography>
                    <Typography>
                      <strong>Planting Date:</strong> {formatDateTime(selectedRecord.record_date) || formatDateTime(selectedRecord.createdAt) || 'N/A'}
                    </Typography>
                    <Typography>
                      <strong>Request ID:</strong> {selectedRecord.requestId || 'N/A'}
                    </Typography>
                    <Typography>
                      <strong>Status:</strong> 
                      <Chip 
                        label={selectedRecord.status || 'completed'} 
                        color="success"
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    </Typography>
                    {selectedRecord.notes && (
                      <Typography sx={{ mt: 1 }}><strong>Notes:</strong> {selectedRecord.notes}</Typography>
                    )}
                  </Box>
                </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRecordDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Notification Dialog */}
        <Dialog open={notificationDialogOpen} onClose={() => setNotificationDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Notification Details</DialogTitle>
          <DialogContent>
            {selectedNotification && (
              <Box sx={{ mt: 1 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      {selectedNotification.title}
                    </Typography>
                    <Chip 
                      label={selectedNotification.priority || 'medium'} 
                      size="small" 
                      color={
                        selectedNotification.priority === 'high' ? 'error' : 
                        selectedNotification.priority === 'medium' ? 'warning' : 'default'
                      }
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">Message</Typography>
                    <Typography variant="body1" sx={{ mt: 1 }}>
                      {selectedNotification.message || selectedNotification.notif_message}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">Type</Typography>
                    <Typography variant="body2">{formatType(selectedNotification.type)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">Created</Typography>
                    <Typography variant="body2">{formatDateTime(selectedNotification.notif_timestamp || selectedNotification.timestamp)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                    <Typography variant="body2">
                      {selectedNotification.read ? 'Read' : 'Unread'} • {selectedNotification.resolved ? 'Resolved' : 'Active'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setNotificationDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Success Snackbar */}
        <Snackbar
          open={!!alert.open && alert.severity === 'success'}
          autoHideDuration={4000}
          onClose={() => setAlert({ ...alert, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            severity="success" 
            onClose={() => setAlert({ ...alert, open: false })} 
            sx={{ width: '100%', borderRadius: 2 }}
            icon={<CheckCircleIcon />}
          >
            {alert.message}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
};

export default NotificationPanel;