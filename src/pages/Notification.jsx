// src/pages/Notification.js
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, Alert, IconButton,
  Badge, useMediaQuery, useTheme, Avatar, LinearProgress, alpha,
  Tabs, Tab
} from '@mui/material';
import { 
  collection, getDocs, doc, updateDoc, addDoc,
  query, where, onSnapshot, serverTimestamp, getDoc
} from 'firebase/firestore';
import { auth, firestore } from "../firebase.js";
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
      targetRole: 'admin',
      read: false,
      resolved: false,
      hidden: false,
      priority: 'medium',
      notif_timestamp: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(firestore, 'notifications'), notificationData);
    console.log('✓ Notification created:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

export const markNotificationAsRead = async (notificationId) => {
  try {
    const notificationRef = doc(firestore, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      read: true,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

export const hideNotification = async (notificationId) => {
  try {
    const notificationRef = doc(firestore, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      hidden: true,
      hiddenAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error hiding notification:', error);
    throw error;
  }
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const NotificationPanel = () => {
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

  const convertTimestamp = (timestamp) => {
    if (!timestamp) return null;
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    if (timestamp.seconds !== undefined) {
      return new Date(timestamp.seconds * 1000);
    }
    if (timestamp instanceof Date) {
      return timestamp;
    }
    if (typeof timestamp === 'string') {
      return new Date(timestamp);
    }
    return null;
  };

  // Helper function to resolve location reference
  const resolveLocationRef = async (locationRef) => {
    if (!locationRef) return 'Unknown Location';
    
    try {
      // If it's a string path like "/locations/abc123"
      if (typeof locationRef === 'string') {
        const locationId = locationRef.split('/').pop();
        const locationDoc = await getDoc(doc(firestore, 'locations', locationId));
        if (locationDoc.exists()) {
          return locationDoc.data().location_name || 'Unknown Location';
        }
      }
      // If it's a reference object
      else if (locationRef.path) {
        const locationId = locationRef.path.split('/').pop();
        const locationDoc = await getDoc(doc(firestore, 'locations', locationId));
        if (locationDoc.exists()) {
          return locationDoc.data().location_name || 'Unknown Location';
        }
      }
    } catch (error) {
      console.error('Error resolving location:', error);
    }
    
    return 'Unknown Location';
  };

  // Helper function to resolve user reference
  const resolveUserRef = async (userRef) => {
    if (!userRef) return { name: 'Unknown User', email: 'N/A' };
    
    try {
      // If it's a string path like "/users/abc123"
      if (typeof userRef === 'string') {
        const userId = userRef.split('/').pop();
        const userDoc = await getDoc(doc(firestore, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          return {
            name: `${userData.user_Firstname || ''} ${userData.user_Lastname || ''}`.trim() || 
                  `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 
                  'Unknown User',
            email: userData.user_email || userData.email || 'N/A'
          };
        }
      }
      // If it's a reference object
      else if (userRef.path) {
        const userId = userRef.path.split('/').pop();
        const userDoc = await getDoc(doc(firestore, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          return {
            name: `${userData.user_Firstname || ''} ${userData.user_Lastname || ''}`.trim() || 
                  `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 
                  'Unknown User',
            email: userData.user_email || userData.email || 'N/A'
          };
        }
      }
    } catch (error) {
      console.error('Error resolving user:', error);
    }
    
    return { name: 'Unknown User', email: 'N/A' };
  };

  useEffect(() => {
    let unsubscribeRequests = null;
    let unsubscribeNotifications = null;

    const setupListeners = async () => {
      try {
        setLoading(true);

        // ========== FETCH ALL PLANTING REQUESTS ==========
        console.log('📋 Fetching planting requests from "plantingrequests" collection...');
        
        // Get ALL requests first to see what we have
        const requestsQuery = collection(firestore, 'plantingrequests');
        
        unsubscribeRequests = onSnapshot(requestsQuery, 
          async (snapshot) => {
            console.log(`✓ Found ${snapshot.docs.length} total planting requests`);
            
            if (snapshot.docs.length > 0) {
              // Log first document structure to understand the data
              const firstDoc = snapshot.docs[0].data();
              console.log('Sample request structure:', Object.keys(firstDoc));
            }
            
            // Process all requests and resolve references
            const requestsPromises = snapshot.docs.map(async (docSnap) => {
              const data = docSnap.data();
              
              // Resolve user and location references
              const userInfo = await resolveUserRef(data.userRef);
              const locationName = await resolveLocationRef(data.locationRef);
              
              return {
                id: docSnap.id,
                ...data,
                fullName: userInfo.name,
                createdBy: userInfo.email,
                locationName: locationName,
                request_date: convertTimestamp(data.request_date),
                approvedAt: convertTimestamp(data.approvedAt),
                rejectedAt: convertTimestamp(data.rejectedAt),
                submittedAt: convertTimestamp(data.submittedAt)
              };
            });
            
            const allRequests = await Promise.all(requestsPromises);
            
            // Filter for pending requests (check both possible field names)
            const pendingRequests = allRequests.filter(req => {
              const status = req.requestStatus || req.request_status || 'pending';
              return status.toLowerCase() === 'pending';
            });
            
            console.log(`✓ Filtered to ${pendingRequests.length} pending requests`);
            setPlantingRequests(pendingRequests);
          },
          (error) => {
            console.error('❌ Error fetching requests:', error);
            setAlert({
              open: true,
              message: 'Error loading planting requests: ' + error.message,
              severity: 'error'
            });
          }
        );

        // ========== FETCH ALL NOTIFICATIONS ==========
        console.log('🔔 Fetching notifications from "notifications" collection...');
        
        // Get ALL notifications first to see what we have
        const notificationsQuery = collection(firestore, 'notifications');

        unsubscribeNotifications = onSnapshot(notificationsQuery, 
          (snapshot) => {
            console.log(`✓ Found ${snapshot.docs.length} total notifications`);
            
            if (snapshot.docs.length > 0) {
              // Log first document structure to understand the data
              const firstDoc = snapshot.docs[0].data();
              console.log('Sample notification structure:', Object.keys(firstDoc));
            }
            
            const allNotifications = snapshot.docs.map(doc => {
              const data = doc.data();
              const timestamp = convertTimestamp(data.notif_timestamp || data.createdAt) || new Date();
              
              return {
                id: doc.id,
                ...data,
                timestamp: timestamp,
                notif_timestamp: timestamp,
                createdAt: convertTimestamp(data.createdAt),
                updatedAt: convertTimestamp(data.updatedAt),
                resolvedAt: convertTimestamp(data.resolvedAt)
              };
            });
            
            // Filter for admin notifications that are not hidden
            const adminNotifications = allNotifications.filter(notification => {
              const isAdmin = !notification.targetRole || notification.targetRole === 'admin';
              const notHidden = notification.hidden !== true;
              return isAdmin && notHidden;
            });
            
            // Sort by timestamp (newest first)
            const sortedNotifications = adminNotifications.sort((a, b) => 
              new Date(b.timestamp) - new Date(a.timestamp)
            );
            
            console.log(`✓ Filtered to ${sortedNotifications.length} admin notifications`);
            setNotifications(sortedNotifications);
          },
          (error) => {
            console.error('❌ Error fetching notifications:', error);
            setAlert({
              open: true,
              message: 'Error loading notifications: ' + error.message,
              severity: 'error'
            });
          }
        );

        setLoading(false);

      } catch (error) {
        console.error('❌ Error setting up listeners:', error);
        setAlert({
          open: true,
          message: 'Error setting up data connections: ' + error.message,
          severity: 'error'
        });
        setLoading(false);
      }
    };

    setupListeners();

    return () => {
      if (unsubscribeRequests) unsubscribeRequests();
      if (unsubscribeNotifications) unsubscribeNotifications();
    };
  }, []);

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
      
      if (date && typeof date === 'object' && 'seconds' in date) {
        return new Date(date.seconds * 1000).toLocaleDateString();
      }
      
      if (date && typeof date.toDate === 'function') {
        return date.toDate().toLocaleDateString();
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
      } else if (date && typeof date === 'object' && 'seconds' in date) {
        dateObj = new Date(date.seconds * 1000);
      } else if (date && typeof date.toDate === 'function') {
        dateObj = date.toDate();
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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', bgcolor: '#f8fafc', minHeight: '100vh' }}>
        <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={auth.currentUser} onLogout={handleLogout} />
        <Navigation mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} isMobile={isMobile} />
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
            {(request.fullName || 'U').charAt(0)}
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
              {request.locationName || 'Unknown Location'}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CalendarTodayIcon fontSize="small" color="action" />
            <Typography variant="body2">
              {typeof request.preferred_date === 'string' 
                ? request.preferred_date 
                : formatDate(request.preferred_date)}
            </Typography>
          </Box>
          
          <Chip 
            label={request.requestStatus || request.request_status || 'pending'} 
            color={getStatusColor(request.requestStatus || request.request_status || 'pending')}
            size="small"
          />
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

  return (
    <Box sx={{ display: 'flex', bgcolor: '#f8fafc', minHeight: '100vh' }}>
      <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={auth.currentUser} onLogout={handleLogout} />
      <Navigation mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} isMobile={isMobile} />

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
              Planting Requests
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

        {/* Detail Dialog */}
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
                      <strong>Preferred Date:</strong>{' '}
                      {typeof selectedRequest.preferred_date === 'string' 
                        ? selectedRequest.preferred_date 
                        : formatDate(selectedRequest.preferred_date) || 'N/A'}
                    </Typography>
                    <Typography>
                      <strong>Submitted At:</strong>{' '}
                      {formatDateTime(selectedRequest.request_date) || 'N/A'}
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