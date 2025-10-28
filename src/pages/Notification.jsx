// src/pages/Notification.js - UPDATED FOR YOUR DATABASE STRUCTURE
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, Alert, IconButton,
  Badge, useMediaQuery, useTheme, Avatar, LinearProgress, alpha,
  Tabs, Tab
} from '@mui/material';
import { auth } from "../firebase.js";
import { apiService } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import ReForestAppBar from './AppBar.jsx';
import Navigation from './Navigation.jsx';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import DeleteIcon from '@mui/icons-material/Delete';
import MarkAsReadIcon from '@mui/icons-material/DoneAll';
import AssignmentIcon from '@mui/icons-material/Assignment';

const drawerWidth = 240;

// =============================================================================
// NOTIFICATION API SERVICE
// =============================================================================

const notificationAPI = {
  // Get notifications
  async getNotifications(filters = {}) {
    try {
      return await apiService.getNotifications(filters);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  },

  // Create notification
  async createNotification(notificationData) {
    try {
      const result = await apiService.createNotification(notificationData);
      return result;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  },

  // Mark notification as read
  async markAsRead(notificationId) {
    try {
      const result = await apiService.markNotificationAsRead(notificationId);
      return result;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  // Delete notification
  async deleteNotification(notificationId) {
    try {
      await apiService.deleteNotification(notificationId);
      console.log('✓ Notification deleted via API');
    } catch (error) {
      console.error('Error deleting notification via API:', error);
      throw error;
    }
  }
};

// =============================================================================
// PLANTING REQUESTS API SERVICE (UPDATED FOR YOUR DATA STRUCTURE)
// =============================================================================

const plantingRequestsAPI = {
  // Get all planting requests - UPDATED for your data structure
  async getPlantingRequests(filters = {}) {
    try {
      const requests = await apiService.getPlantingRequests(filters);
      return requests;
    } catch (error) {
      console.error('Error fetching planting requests:', error);
      
      // For development, return mock data if API fails
      if (process.env.NODE_ENV === 'development') {
        console.log('Using mock planting requests data for development');
        return this.getMockPlantingRequests();
      }
      throw error;
    }
  },

  // Mock data that matches your structure
  getMockPlantingRequests() {
    return [
      {
        id: 'HSAtJSrtmnEza45l43YZ',
        requestId: 'HSAtJSrtmnEza45l43YZ',
        fullName: 'Adriane Racaza',
        locationRef: '/locations/Candyman',
        preferred_date: '2025-10-31',
        request_date: '2025-10-23T00:00:00.000Z',
        request_notes: 'Requesting seedlings for Candyman site.',
        request_status: 'pending',
        reviewedAt: null,
        reviewedBy: null,
        userRef: '/users/hasS8FBp66XIkf42m1C2EfaAocc2'
      }
    ];
  },

  // Update planting request status
  async updatePlantingRequestStatus(requestId, status, reviewedBy = null) {
    try {
      const result = await apiService.updatePlantingRequestStatus(requestId, {
        status: status,
        reviewedBy: reviewedBy
      });
      return result;
    } catch (error) {
      console.error('Error updating planting request:', error);
      throw error;
    }
  }
};

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
      message: `New planting request from ${plantRequestData.fullName} for ${plantRequestData.preferred_date}`,
      data: {
        plantRequestId: plantRequestId,
        userRef: plantRequestData.userRef,
        locationRef: plantRequestData.locationRef,
        preferredDate: plantRequestData.preferred_date,
        requestStatus: plantRequestData.request_status || 'pending'
      },
      targetRole: 'admin',
      read: false,
      resolved: false,
      hidden: false,
      priority: 'medium'
    };

    const result = await notificationAPI.createNotification(notificationData);
    console.log('✓ Notification created via API:', result.id);
    return result.id;
  } catch (error) {
    console.error('Error creating notification via API:', error);
    throw error;
  }
};

export const markNotificationAsRead = async (notificationId) => {
  try {
    await notificationAPI.markAsRead(notificationId);
    console.log('✓ Notification marked as read via API');
  } catch (error) {
    console.error('Error marking notification as read via API:', error);
    throw error;
  }
};

export const hideNotification = async (notificationId) => {
  try {
    await notificationAPI.deleteNotification(notificationId);
    console.log('✓ Notification deleted via API');
  } catch (error) {
    console.error('Error deleting notification via API:', error);
    throw error;
  }
};

// =============================================================================
// MAIN COMPONENT (UPDATED FOR YOUR DATA STRUCTURE)
// =============================================================================

const NotificationPanel = () => {
  const { user } = useAuth();
  const [plantingRequests, setPlantingRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    console.log('Logout clicked');
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Helper function to extract location name from locationRef
  const getLocationName = (locationRef) => {
    if (!locationRef) return 'Unknown Location';
    
    // If it's a path like "/locations/Candyman", extract "Candyman"
    if (typeof locationRef === 'string' && locationRef.includes('/')) {
      const parts = locationRef.split('/');
      return parts[parts.length - 1] || 'Unknown Location';
    }
    
    return locationRef || 'Unknown Location';
  };

  // Convert timestamp helper
  const convertTimestamp = (timestamp) => {
    if (!timestamp) return null;
    
    // Handle Firestore timestamp format
    if (timestamp._seconds !== undefined) {
      return new Date(timestamp._seconds * 1000);
    }
    
    // Handle ISO string
    if (typeof timestamp === 'string') {
      return new Date(timestamp);
    }
    
    // Handle Date object
    if (timestamp instanceof Date) {
      return timestamp;
    }
    
    return null;
  };

  // Fetch notifications from API
  const fetchNotifications = async () => {
    try {
      console.log('🔔 Fetching notifications from API...');
      const notificationsData = await notificationAPI.getNotifications({ 
        targetRole: 'admin' 
      });
      
      const processedNotifications = notificationsData.map(notification => {
        const timestamp = convertTimestamp(notification.notif_timestamp || notification.createdAt) || new Date();
        
        return {
          id: notification.id,
          ...notification,
          timestamp: timestamp,
          notif_timestamp: timestamp,
          createdAt: convertTimestamp(notification.createdAt),
          updatedAt: convertTimestamp(notification.updatedAt),
          resolvedAt: convertTimestamp(notification.resolvedAt)
        };
      });

      const visibleNotifications = processedNotifications
        .filter(notification => notification.hidden !== true)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      console.log(`✓ Retrieved ${visibleNotifications.length} notifications via API`);
      setNotifications(visibleNotifications);
    } catch (error) {
      console.error('❌ Error fetching notifications via API:', error);
      setAlert({
        open: true,
        message: 'Error loading notifications: ' + error.message,
        severity: 'error'
      });
    }
  };

  // Fetch planting requests from API - UPDATED for your data structure
  const fetchPlantingRequests = async () => {
    try {
      console.log('📋 Fetching planting requests from API...');
      const requestsData = await plantingRequestsAPI.getPlantingRequests({ 
        status: 'pending' 
      });
      
      console.log('Raw planting requests data:', requestsData);
      
      // Process requests to match the expected frontend structure
      const processedRequests = requestsData.map(request => {
        const requestDate = convertTimestamp(request.request_date);
        const reviewedAt = convertTimestamp(request.reviewedAt);
        
        return {
          id: request.id || request.requestId,
          requestId: request.requestId,
          fullName: request.fullName,
          locationRef: request.locationRef,
          locationName: getLocationName(request.locationRef),
          preferred_date: request.preferred_date,
          request_date: requestDate,
          request_notes: request.request_notes,
          request_status: request.request_status,
          requestStatus: request.request_status, // Add both for compatibility
          reviewedAt: reviewedAt,
          reviewedBy: request.reviewedBy,
          userRef: request.userRef,
          createdBy: request.userRef ? `User: ${request.userRef.split('/').pop()}` : 'Unknown User'
        };
      });
      
      console.log(`✓ Processed ${processedRequests.length} planting requests`);
      setPlantingRequests(processedRequests);
    } catch (error) {
      console.error('❌ Error fetching planting requests via API:', error);
      setAlert({
        open: true,
        message: 'Error loading planting requests: ' + error.message,
        severity: 'error'
      });
    }
  };

  // Fetch all data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchNotifications(),
        fetchPlantingRequests()
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setAlert({
        open: true,
        message: 'Error loading dashboard data: ' + error.message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Data fetching effect
  useEffect(() => {
    let pollInterval;

    const setupData = async () => {
      try {
        await fetchDashboardData();

        // Start polling for data
        pollInterval = setInterval(() => {
          fetchNotifications();
          fetchPlantingRequests();
        }, 30000);

      } catch (error) {
        console.error('❌ Error setting up data:', error);
        setAlert({
          open: true,
          message: 'Error setting up data connections: ' + error.message,
          severity: 'error'
        });
        setLoading(false);
      }
    };

    setupData();

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, []);

  // Action handlers for planting requests
  const handleApproveRequest = async (requestId) => {
    try {
      await plantingRequestsAPI.updatePlantingRequestStatus(requestId, 'approved', user?.email || 'Admin');
      setAlert({ open: true, message: 'Planting request approved', severity: 'success' });
      fetchPlantingRequests(); // Refresh the list
    } catch (error) {
      setAlert({ open: true, message: 'Error approving request', severity: 'error' });
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await plantingRequestsAPI.updatePlantingRequestStatus(requestId, 'rejected', user?.email || 'Admin');
      setAlert({ open: true, message: 'Planting request rejected', severity: 'success' });
      fetchPlantingRequests(); // Refresh the list
    } catch (error) {
      setAlert({ open: true, message: 'Error rejecting request', severity: 'error' });
    }
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setDetailDialogOpen(true);
  };

  const handleViewNotification = async (notification) => {
    setSelectedNotification(notification);
    setNotificationDialogOpen(true);
    
    if (!notification.read) {
      try {
        await markNotificationAsRead(notification.id);
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
      const unreadNotifications = notifications.filter(n => !n.read);
      const updatePromises = unreadNotifications.map(notification => 
        markNotificationAsRead(notification.id)
      );
      await Promise.all(updatePromises);
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setAlert({ open: true, message: 'All notifications marked as read', severity: 'success' });
    } catch (error) {
      setAlert({ open: true, message: 'Error marking notifications as read', severity: 'error' });
    }
  };

  const handleRemoveNotification = async (notificationId) => {
    try {
      await hideNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setAlert({ open: true, message: 'Notification removed', severity: 'success' });
    } catch (error) {
      setAlert({ open: true, message: 'Error removing notification', severity: 'error' });
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

  const unreadCount = notifications.filter(n => !n.read).length;
  const pendingCount = plantingRequests.length;

  // Loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', bgcolor: '#f8fafc', minHeight: '100vh' }}>
        <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={user} onLogout={handleLogout} />
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
            Loading notifications...
          </Typography>
        </Box>
      </Box>
    );
  }

  const NotificationRow = ({ notification }) => (
    <Paper 
      sx={{ 
        p: 2, 
        mb: 1,
        borderRadius: 2,
        borderLeft: `4px solid ${
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
      onClick={() => handleViewNotification(notification)}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Box sx={{ 
          color: notification.read ? 'text.secondary' : 
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
                color: notification.read ? 'text.primary' : 'primary.main'
              }}
            >
              {notification.title}
            </Typography>
            <Chip 
              label={notification.priority || 'medium'} 
              size="small" 
              color={
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
              {formatDateTime(notification.timestamp)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              • {formatType(notification.type)}
            </Typography>
          </Box>
        </Box>
        
        <Box onClick={(e) => e.stopPropagation()}>
          <IconButton 
            size="small" 
            onClick={() => handleRemoveNotification(notification.id)}
            color="error"
            sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}
            title="Remove notification"
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      </Box>
    </Paper>
  );

  // Updated RequestRow with action buttons
  const RequestRow = ({ request }) => (
    <Paper 
      sx={{ 
        p: 2, 
        mb: 1,
        borderRadius: 2,
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        '&:hover': { 
          transform: 'translateY(-1px)',
          boxShadow: 2
        }
      }}
      onClick={() => handleViewDetails(request)}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: '#2e7d32', width: 40, height: 40 }}>
            {(request.fullName || 'U').charAt(0).toUpperCase()}
          </Avatar>
          
          <Box>
            <Typography variant="subtitle1" fontWeight="bold">
              {request.fullName || 'Unknown User'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {request.createdBy || 'N/A'}
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <LocationOnIcon fontSize="small" color="action" />
            <Typography variant="body2">
              {request.locationName || getLocationName(request.locationRef)}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CalendarTodayIcon fontSize="small" color="action" />
            <Typography variant="body2">
              {request.preferred_date || 'No date specified'}
            </Typography>
          </Box>
          
          <Chip 
            label={request.request_status || 'pending'} 
            color={getStatusColor(request.request_status || 'pending')}
            size="small"
          />
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1 }} onClick={(e) => e.stopPropagation()}>
          <Button
            variant="contained"
            color="success"
            size="small"
            startIcon={<CheckCircleIcon />}
            onClick={() => handleApproveRequest(request.id)}
          >
            Approve
          </Button>
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<CancelIcon />}
            onClick={() => handleRejectRequest(request.id)}
          >
            Reject
          </Button>
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

  // Updated Detail Dialog Content
  const DetailDialogContent = ({ request }) => (
    <Grid container spacing={2} sx={{ mt: 1 }}>
      <Grid item xs={12} md={6}>
        <Typography variant="subtitle2" color="text.secondary">Requester Information</Typography>
        <Box sx={{ mt: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
          <Typography><strong>Name:</strong> {request.fullName || 'Unknown User'}</Typography>
          <Typography><strong>User Reference:</strong> {request.userRef || 'N/A'}</Typography>
          <Typography><strong>Request ID:</strong> {request.requestId || request.id}</Typography>
        </Box>
      </Grid>
      <Grid item xs={12} md={6}>
        <Typography variant="subtitle2" color="text.secondary">Location Information</Typography>
        <Box sx={{ mt: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
          <Typography><strong>Location:</strong> {request.locationName || getLocationName(request.locationRef)}</Typography>
          <Typography><strong>Location Reference:</strong> {request.locationRef || 'N/A'}</Typography>
        </Box>
      </Grid>
      <Grid item xs={12}>
        <Typography variant="subtitle2" color="text.secondary">Request Details</Typography>
        <Box sx={{ mt: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
          <Typography>
            <strong>Preferred Date:</strong> {request.preferred_date || 'N/A'}
          </Typography>
          <Typography>
            <strong>Submitted At:</strong> {formatDateTime(request.request_date) || 'N/A'}
          </Typography>
          <Typography>
            <strong>Status:</strong> 
            <Chip 
              label={request.request_status || 'pending'} 
              color={getStatusColor(request.request_status || 'pending')}
              size="small"
              sx={{ ml: 1 }}
            />
          </Typography>
          {request.request_notes && (
            <Typography sx={{ mt: 1 }}>
              <strong>Notes:</strong> {request.request_notes}
            </Typography>
          )}
          {request.reviewedBy && (
            <Typography sx={{ mt: 1 }}>
              <strong>Reviewed By:</strong> {request.reviewedBy} at {formatDateTime(request.reviewedAt)}
            </Typography>
          )}
        </Box>
      </Grid>
    </Grid>
  );

  return (
    <Box sx={{ display: 'flex', bgcolor: '#f8fafc', minHeight: '100vh' }}>
      <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={user} onLogout={handleLogout} />
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
                Notifications Center
              </Typography>
              <Typography variant="body1" color="text.secondary">
                View and manage system notifications
              </Typography>
            </Box>
            {activeTab === 0 && unreadCount > 0 && (
              <Button
                startIcon={<MarkAsReadIcon />}
                onClick={handleMarkAllAsRead}
                variant="outlined"
                color="primary"
              >
                Mark All as Read
              </Button>
            )}
          </Box>
        </Box>

        {/* Enhanced Tab Design */}
        <Paper sx={{ mb: 3, borderRadius: 2, boxShadow: 2 }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            variant={isMobile ? "scrollable" : "fullWidth"}
            scrollButtons={isMobile ? "auto" : false}
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
                    All Notifications
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {notifications.length} total
                  </Typography>
                </Box>
              }
              iconPosition="start"
            />
            <Tab 
              icon={
                <Badge 
                  badgeContent={pendingCount} 
                  color="warning"
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
                    {pendingCount} pending
                  </Typography>
                </Box>
              }
              iconPosition="start"
            />
          </Tabs>
        </Paper>

        {activeTab === 0 && (
          <>
            <Typography variant="h6" sx={{ color: '#2e7d32', fontWeight: 600, mb: 2 }}>
              All Notifications
            </Typography>
            
            {notifications.length === 0 ? (
              <EmptyState 
                icon={NotificationsIcon}
                title="No notifications available"
                description="New notifications will appear here when available"
              />
            ) : (
              <Box>
                {notifications.map((notification) => (
                  <NotificationRow key={notification.id} notification={notification} />
                ))}
              </Box>
            )}
          </>
        )}

        {activeTab === 1 && (
          <>
            <Typography variant="h6" sx={{ color: '#2e7d32', fontWeight: 600, mb: 2 }}>
              Planting Requests ({pendingCount} pending)
            </Typography>

            {plantingRequests.length === 0 ? (
              <EmptyState 
                icon={CalendarTodayIcon}
                title="No pending planting requests"
                description="New planting requests will appear here for review"
              />
            ) : (
              <Box>
                {plantingRequests.map((request) => (
                  <RequestRow key={request.id} request={request} />
                ))}
              </Box>
            )}
          </>
        )}

        {/* Updated Detail Dialog */}
        <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Planting Request Details</DialogTitle>
          <DialogContent>
            {selectedRequest && <DetailDialogContent request={selectedRequest} />}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
            {selectedRequest?.request_status === 'pending' && (
              <>
                <Button 
                  color="success" 
                  variant="contained"
                  onClick={() => {
                    handleApproveRequest(selectedRequest.id);
                    setDetailDialogOpen(false);
                  }}
                >
                  Approve
                </Button>
                <Button 
                  color="error" 
                  variant="outlined"
                  onClick={() => {
                    handleRejectRequest(selectedRequest.id);
                    setDetailDialogOpen(false);
                  }}
                >
                  Reject
                </Button>
              </>
            )}
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
                    <Typography variant="body2">{formatDateTime(selectedNotification.timestamp)}</Typography>
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
      </Box>
    </Box>
  );
};

export default NotificationPanel;