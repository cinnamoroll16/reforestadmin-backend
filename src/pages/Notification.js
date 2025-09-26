// src/pages/Notification.js
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Grid, Card, CardContent, Alert, IconButton,
  Badge, useMediaQuery, useTheme, Avatar, LinearProgress, alpha, handleMarkNotificationAsRead,
  Tabs, Tab, useScrollTrigger, Slide, Fab, Zoom
} from '@mui/material';
import { 
  collection, getDocs, doc, updateDoc, addDoc, deleteDoc,
  query, where, onSnapshot, orderBy, Timestamp, serverTimestamp
} from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import { auth, firestore, rtdb } from "../firebase.js";
import ReForestAppBar from './AppBar.js';
import Navigation from './Navigation.js';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PersonIcon from '@mui/icons-material/Person';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import SensorsIcon from '@mui/icons-material/Sensors';
import WarningIcon from '@mui/icons-material/Warning';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import MarkAsReadIcon from '@mui/icons-material/DoneAll';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

const drawerWidth = 240;

// =============================================================================
// NOTIFICATION HELPER FUNCTIONS (Keep the same as original)
// =============================================================================

// Function to create notification when plant request is submitted
export const createPlantRequestNotification = async (plantRequestData, plantRequestId) => {
  try {
    const notificationData = {
      type: 'plant_request',
      notification_type: 'pending',
      title: 'New Planting Request',
      notif_message: `New planting request from ${plantRequestData.fullName || plantRequestData.userEmail || 'user'} at ${plantRequestData.location || 'location'}`,
      data: {
        plantRequestId: plantRequestId,
        userId: plantRequestData.userId,
        location: plantRequestData.location,
        preferredDate: plantRequestData.preferredDate
      },
      targetRole: 'admin',
      read: false,
      resolved: false,
      priority: 'medium',
      notif_timestamp: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(firestore, 'notifications'), notificationData);
    console.log('Notification created with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Function to create sensor alert notifications
export const createSensorAlertNotification = async (alertData) => {
  try {
    const notificationData = {
      type: 'sensor_alert',
      notification_type: 'pending',
      title: `Sensor Alert - ${alertData.severity.toUpperCase()}`,
      message: alertData.message,
      data: {
        sensorId: alertData.sensorId,
        parameter: alertData.parameter,
        value: alertData.value,
        severity: alertData.severity,
        alertType: alertData.type
      },
      targetRole: 'admin',
      read: false,
      resolved: false,
      priority: alertData.severity === 'high' ? 'high' : alertData.severity === 'medium' ? 'medium' : 'low',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(firestore, 'notifications'), notificationData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating sensor alert notification:', error);
    throw error;
  }
};

// Function to mark notification as read
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

// Function to mark notification as resolved
export const markNotificationAsResolved = async (notificationId) => {
  try {
    const notificationRef = doc(firestore, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      resolved: true,
      notification_type: 'resolved',
      resolvedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error marking notification as resolved:', error);
    throw error;
  }
};

// Enhanced approval function
export const approveRequestWithNotification = async (plantRequest, approvalNotes = '') => {
  try {
    const requestRef = doc(firestore, 'plantingrequests', plantRequest.id);
    await updateDoc(requestRef, {
      requestStatus: 'approved',
      approvalNotes: approvalNotes || 'Request approved by administrator',
      approvedAt: serverTimestamp()
    });

    const plantingRecordData = {
      userId: plantRequest.userId,
      location: plantRequest.location,
      recordDatePlanted: new Date().toISOString(),
      createdAt: serverTimestamp(),
      status: 'planted',
      requestId: plantRequest.id,
      userEmail: plantRequest.userEmail,
      fullName: plantRequest.fullName
    };
    await addDoc(collection(firestore, 'PlantingRecords'), plantingRecordData);

    const notificationsQuery = query(
      collection(firestore, 'notifications'),
      where('type', '==', 'plant_request'),
      where('data.plantRequestId', '==', plantRequest.id),
      where('notification_type', '==', 'pending')
    );
    
    const notificationSnapshot = await getDocs(notificationsQuery);
    const updatePromises = notificationSnapshot.docs.map(doc => 
      updateDoc(doc.ref, {
        resolved: true,
        notification_type: 'resolved',
        resolvedAt: serverTimestamp(),
        resolutionType: 'approved'
      })
    );
    await Promise.all(updatePromises);

    await addDoc(collection(firestore, 'notifications'), {
      type: 'request_approved',
      notification_type: 'pending',
      title: 'Planting Request Approved',
      message: `Your planting request for ${plantRequest.location} has been approved. You can now proceed with planting.`,
      data: {
        plantRequestId: plantRequest.id,
        approvalNotes: approvalNotes,
        location: plantRequest.location
      },
      targetUserId: plantRequest.userId,
      userEmail: plantRequest.userEmail,
      read: false,
      resolved: false,
      priority: 'medium',
      createdAt: serverTimestamp()
    });

    return { success: true, message: 'Request approved successfully!' };
  } catch (error) {
    console.error('Error approving request:', error);
    throw error;
  }
};

// Enhanced rejection function
export const rejectRequestWithNotification = async (plantRequest, rejectionReason) => {
  try {
    const requestRef = doc(firestore, 'plantingrequests', plantRequest.id);
    await updateDoc(requestRef, {
      requestStatus: 'rejected',
      rejectionReason: rejectionReason,
      rejectedAt: serverTimestamp()
    });

    const notificationsQuery = query(
      collection(firestore, 'Notifications'),
      where('type', '==', 'plant_request'),
      where('data.plantRequestId', '==', plantRequest.id),
      where('resolved', '==', false)
    );
    
    const notificationSnapshot = await getDocs(notificationsQuery);
    const updatePromises = notificationSnapshot.docs.map(doc => 
      updateDoc(doc.ref, {
        resolved: true,
        resolvedAt: serverTimestamp(),
        resolutionType: 'rejected'
      })
    );
    await Promise.all(updatePromises);

    await addDoc(collection(firestore, 'Notifications'), {
      type: 'request_rejected',
      title: 'Planting Request Rejected',
      message: `Your planting request for ${plantRequest.location} has been rejected. Reason: ${rejectionReason}`,
      data: {
        plantRequestId: plantRequest.id,
        rejectionReason: rejectionReason,
        location: plantRequest.location
      },
      targetUserId: plantRequest.userId,
      userEmail: plantRequest.userEmail,
      read: false,
      resolved: false,
      priority: 'high',
      createdAt: serverTimestamp()
    });

    return { success: true, message: 'Request rejected successfully!' };
  } catch (error) {
    console.error('Error rejecting request:', error);
    throw error;
  }
};

// Scroll to top component
function ScrollTop(props) {
  const { children } = props;
  const trigger = useScrollTrigger({
    disableHysteresis: true,
    threshold: 100,
  });

  const handleClick = (event) => {
    const anchor = (event.target.ownerDocument || document).querySelector(
      '#back-to-top-anchor',
    );
    if (anchor) {
      anchor.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  };

  return (
    <Zoom in={trigger}>
      <Box
        onClick={handleClick}
        role="presentation"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
      >
        {children}
      </Box>
    </Zoom>
  );
}

// =============================================================================
// MAIN COMPONENT WITH UPDATED UX/UI
// =============================================================================

const NotificationPanel = () => {
  const [plantingRequests, setPlantingRequests] = useState([]);
  const [sensorAlerts, setSensorAlerts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
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

  // Helper functions (keep the same as original)
  const createMissingRequestNotifications = async (requests) => {
    try {
      for (const request of requests) {
        const existingQuery = query(
          collection(firestore, 'notifications'),
          where('type', '==', 'plant_request'),
          where('data.plantRequestId', '==', request.id),
          where('notification_type', '==', 'pending')
        );
        
        const existingSnapshot = await getDocs(existingQuery);
        
        if (existingSnapshot.empty) {
          await createPlantRequestNotification({
            fullName: request.fullName,
            userEmail: request.userEmail,
            location: request.location,
            userId: request.userId,
            preferredDate: request.preferredDate
          }, request.id);
        }
      }
    } catch (error) {
      console.error('Error creating missing request notifications:', error);
    }
  };

  const createSensorAlertNotificationIfNew = async (alertData) => {
    try {
      const existingQuery = query(
        collection(firestore, 'notifications'),
        where('type', '==', 'sensor_alert'),
        where('data.sensorId', '==', alertData.sensorId),
        where('data.parameter', '==', alertData.parameter || ''),
        where('notification_type', '==', 'pending')
      );
      
      const existingSnapshot = await getDocs(existingQuery);
      
      if (existingSnapshot.empty) {
        await createSensorAlertNotification(alertData);
      }
    } catch (error) {
      console.error('Error checking for existing sensor notification:', error);
    }
  };

  // Main data fetching effect (keep the same as original)
  useEffect(() => {
    let unsubscribeRequests = null;
    let unsubscribeNotifications = null;
    let unsubscribeSensors = null;

    const setupListeners = async () => {
      try {
        console.log('🚀 Starting data fetch...');
        setLoading(true);

        const requestsQuery = query(collection(firestore, 'plantingrequests'));
        
        unsubscribeRequests = onSnapshot(requestsQuery, 
          async (snapshot) => {
            console.log(`📋 Found ${snapshot.docs.length} total planting requests`);
            
            const allRequests = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            
            const pendingRequests = allRequests.filter(req => {
              const status = req.requestStatus || 'pending';
              return status === 'pending';
            });
            
            console.log(`📋 Filtered to ${pendingRequests.length} pending requests`);
            setPlantingRequests(pendingRequests);

            if (pendingRequests.length > 0) {
              console.log('🔔 Creating missing notifications for pending requests...');
              await createMissingRequestNotifications(pendingRequests);
            }
          },
          (error) => {
            console.error('❌ Error in requests snapshot listener:', error);
            setAlert({
              open: true,
              message: 'Error loading planting requests: ' + error.message,
              severity: 'error'
            });
          }
        );

        const notificationsQuery = query(
          collection(firestore, 'notifications'),
          where('notification_type', '==', 'pending')
        );

        unsubscribeNotifications = onSnapshot(notificationsQuery, 
          (snapshot) => {
            console.log(`🔔 Found ${snapshot.docs.length} pending notifications`);
            
            const allNotifications = snapshot.docs.map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                ...data,
                timestamp: data.createdAt?.toDate() || new Date()
              };
            });
            
            const adminNotifications = allNotifications
              .filter(notification => notification.targetRole === 'admin')
              .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            console.log(`🔔 Filtered to ${adminNotifications.length} admin notifications`);
            setNotifications(adminNotifications);
          },
          (error) => {
            console.error('❌ Error in notifications snapshot listener:', error);
            setAlert({
              open: true,
              message: 'Error loading notifications: ' + error.message,
              severity: 'error'
            });
          }
        );

        const sensorRef = ref(rtdb, "sensors");
        unsubscribeSensors = onValue(sensorRef, (snapshot) => {
          if (snapshot.exists()) {
            const sensorsData = snapshot.val();
            const alerts = generateSensorAlerts(sensorsData);
            setSensorAlerts(alerts);
            
            alerts.forEach(alert => {
              createSensorAlertNotificationIfNew(alert);
            });
          } else {
            setSensorAlerts([]);
          }
        }, (error) => {
          console.error('❌ Error in sensor data listener:', error);
        });

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
      if (unsubscribeSensors) unsubscribeSensors();
    };
  }, []);

  // Generate sensor alerts (keep the same as original)
  const generateSensorAlerts = (sensorsData) => {
    const alerts = [];
    const now = new Date();
    
    if (!sensorsData) return alerts;

    Object.entries(sensorsData).forEach(([sensorId, sensorData]) => {
      if (!sensorData.sensorData) return;

      const readings = Object.values(sensorData.sensorData);
      if (readings.length === 0) return;

      const latestReading = readings[readings.length - 1];
      const readingTime = new Date(latestReading.timestamp);
      const hoursDiff = (now - readingTime) / (1000 * 60 * 60);
      
      if (hoursDiff > 24) {
        alerts.push({
          id: `offline-${sensorId}`,
          type: 'offline',
          sensorId,
          message: `Sensor ${sensorId} has been offline for more than 24 hours`,
          timestamp: readingTime,
          severity: 'high'
        });
      } else if (hoursDiff > 4) {
        alerts.push({
          id: `delayed-${sensorId}`,
          type: 'delayed',
          sensorId,
          message: `Sensor ${sensorId} data is delayed (last update ${Math.round(hoursDiff)} hours ago)`,
          timestamp: readingTime,
          severity: 'medium'
        });
      }

      if (latestReading.pH !== undefined && (latestReading.pH < 5.5 || latestReading.pH > 8.5)) {
        alerts.push({
          id: `ph-${sensorId}-${latestReading.timestamp}`,
          type: 'reading',
          sensorId,
          parameter: 'pH',
          value: latestReading.pH,
          message: `Abnormal pH level (${latestReading.pH}) detected at sensor ${sensorId}`,
          timestamp: readingTime,
          severity: 'high'
        });
      }

      if (latestReading.soilMoisture !== undefined && latestReading.soilMoisture < 20) {
        alerts.push({
          id: `moisture-${sensorId}-${latestReading.timestamp}`,
          type: 'reading',
          sensorId,
          parameter: 'moisture',
          value: latestReading.soilMoisture,
          message: `Low soil moisture (${latestReading.soilMoisture}%) detected at sensor ${sensorId}`,
          timestamp: readingTime,
          severity: 'high'
        });
      }

      if (latestReading.temperature !== undefined && latestReading.temperature > 35) {
        alerts.push({
          id: `temp-${sensorId}-${latestReading.timestamp}`,
          type: 'reading',
          sensorId,
          parameter: 'temperature',
          value: latestReading.temperature,
          message: `High temperature (${latestReading.temperature}°C) detected at sensor ${sensorId}`,
          timestamp: readingTime,
          severity: 'medium'
        });
      }
    });

    return alerts.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
  };

  // Updated event handlers for click-to-read functionality
  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setDetailDialogOpen(true);
  };

  const handleViewAlert = (alert) => {
    setSelectedAlert(alert);
    setAlertDialogOpen(true);
  };

  const handleViewNotification = async (notification) => {
    setSelectedNotification(notification);
    setNotificationDialogOpen(true);
    
    // Mark as read when clicked/opened
    if (!notification.read) {
      try {
        await markNotificationAsRead(notification.id);
        // Update local state to reflect the change
        setNotifications(prev => prev.map(n => 
          n.id === notification.id ? { ...n, read: true } : n
        ));
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
  };

  const handleApprove = (request) => {
    setSelectedRequest(request);
    setApprovalDialogOpen(true);
  };

  const handleReject = (request) => {
    setSelectedRequest(request);
    setRejectionDialogOpen(true);
  };

  const handleRefreshSensorAlerts = () => {
    const sensorRef = ref(rtdb, "sensors");
    onValue(sensorRef, (snapshot) => {
      if (snapshot.exists()) {
        const sensorsData = snapshot.val();
        const alerts = generateSensorAlerts(sensorsData);
        setSensorAlerts(alerts);
        setAlert({ open: true, message: 'Sensor alerts refreshed', severity: 'success' });
      }
    });
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      const updatePromises = unreadNotifications.map(notification => 
        markNotificationAsRead(notification.id)
      );
      await Promise.all(updatePromises);
      
      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setAlert({ open: true, message: 'All notifications marked as read', severity: 'success' });
    } catch (error) {
      setAlert({ open: true, message: 'Error marking notifications as read', severity: 'error' });
    }
  };

  const handleResolveNotification = async (notificationId) => {
    try {
      await markNotificationAsResolved(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setAlert({ open: true, message: 'Notification resolved', severity: 'success' });
    } catch (error) {
      setAlert({ open: true, message: 'Error resolving notification', severity: 'error' });
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      await deleteDoc(doc(firestore, 'notifications', notificationId));
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setAlert({ open: true, message: 'Notification deleted', severity: 'success' });
    } catch (error) {
      setAlert({ open: true, message: 'Error deleting notification', severity: 'error' });
    }
  };

  const confirmApprove = async () => {
    try {
      const result = await approveRequestWithNotification(selectedRequest, rejectionReason);
      setApprovalDialogOpen(false);
      setSelectedRequest(null);
      setRejectionReason('');
      setAlert({ open: true, message: result.message, severity: 'success' });
    } catch (error) {
      console.error('Error approving request:', error);
      setAlert({ open: true, message: 'Error approving request: ' + error.message, severity: 'error' });
    }
  };

  const confirmReject = async () => {
    try {
      const result = await rejectRequestWithNotification(selectedRequest, rejectionReason);
      setRejectionDialogOpen(false);
      setRejectionReason('');
      setSelectedRequest(null);
      setAlert({ open: true, message: result.message, severity: 'warning' });
    } catch (error) {
      console.error('Error rejecting request:', error);
      setAlert({ open: true, message: 'Error rejecting request: ' + error.message, severity: 'error' });
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

  const getAlertColor = (severity) => {
    switch (severity) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'plant_request': return <NewReleasesIcon />;
      case 'sensor_alert': return <WarningIcon />;
      case 'request_approved': return <CheckCircleIcon />;
      case 'request_rejected': return <CancelIcon />;
      default: return <NotificationsIcon />;
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      if (date instanceof Timestamp) return date.toDate().toLocaleDateString();
      if (typeof date === 'string') return new Date(date).toLocaleDateString();
      if (date.toDate) return date.toDate().toLocaleDateString();
      return new Date(date).toLocaleDateString();
    } catch (error) {
      return date;
    }
  };

  const formatDateTime = (date) => {
    if (!date) return 'N/A';
    try {
      const dateObj = date instanceof Timestamp ? date.toDate() : new Date(date);
      return dateObj.toLocaleString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getStatusText = (request) => request.requestStatus || 'pending';

  const unreadCount = notifications.filter(n => !n.read).length;
  const pendingCount = plantingRequests.length;
  const alertCount = sensorAlerts.length;
  const notificationCount = notifications.length;

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
          <LinearProgress />
          <Typography sx={{ mt: 2 }}>Loading notifications...</Typography>
        </Box>
      </Box>
    );
  }

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
        <div id="back-to-top-anchor" />
        
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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h4" sx={{ color: '#2e7d32', fontWeight: 600 }}>
                Notifications Center
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Manage and review system notifications
              </Typography>
            </Box>
            {activeTab === 0 && unreadCount > 0 && (
              <Button
                startIcon={<MarkAsReadIcon />}
                onClick={handleMarkAllAsRead}
                variant="outlined"
                color="primary"
              >
                Mark All as Read ({unreadCount})
              </Button>
            )}
          </Box>
        </Box>

        <Paper sx={{ mb: 3, borderRadius: 2, boxShadow: 2 }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange} 
            centered
            sx={{
              '& .MuiTab-root': { fontWeight: 600 },
              '& .Mui-selected': { color: '#2e7d32' }
            }}
          >
            <Tab 
              label={
                <Badge badgeContent={unreadCount} color="error" sx={{ mr: 1 }}>
                  All Notifications ({notificationCount})
                </Badge>
              } 
            />
            <Tab label={`Planting Requests (${pendingCount})`} />
            <Tab label={`Sensor Alerts (${alertCount})`} />
          </Tabs>
        </Paper>

        {activeTab === 0 && (
          <>
            <Typography variant="h6" sx={{ color: '#2e7d32', fontWeight: 600, mb: 3 }}>
              All Notifications
            </Typography>

            <Grid container spacing={2}>
              {notifications.length === 0 ? (
                <Grid item xs={12}>
                  <Card sx={{ textAlign: 'center', py: 6, borderRadius: 2 }}>
                    <CardContent>
                      <NotificationsIcon sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No notifications available
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        New notifications will appear here when available
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ) : (
                notifications.map((notification) => (
                  <Grid item xs={12} key={notification.id}>
                    <Card 
                      sx={{ 
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
                          transform: 'translateY(-2px)',
                          boxShadow: 3,
                          backgroundColor: notification.read ? 
                            alpha(theme.palette.primary.main, 0.02) : 
                            alpha(theme.palette.primary.main, 0.08)
                        }
                      }}
                      onClick={() => handleViewNotification(notification)}
                    >
                      <CardContent sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                          <Box sx={{ 
                            color: notification.read ? 'text.secondary' : 
                              notification.priority === 'high' ? 'error.main' :
                              notification.priority === 'medium' ? 'warning.main' : 'primary.main'
                          }}>
                            {getNotificationIcon(notification.type)}
                          </Box>
                          
                          <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
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
                                label={notification.priority} 
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
                              sx={{ 
                                mb: 1,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                              }}
                            >
                              {notification.message || notification.notif_message}
                            </Typography>
                            
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                              <Typography variant="caption" color="text.secondary">
                                {formatDateTime(notification.timestamp)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                • {notification.type.replace('_', ' ')}
                              </Typography>
                            </Box>
                          </Box>
                          
                          <Box onClick={(e) => e.stopPropagation()}>
                            <IconButton 
                              size="small" 
                              onClick={() => handleDeleteNotification(notification.id)}
                              color="error"
                              sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              )}
            </Grid>
          </>
        )}

        {activeTab === 1 && (
          <>
            <Typography variant="h6" sx={{ color: '#2e7d32', fontWeight: 600, mb: 3 }}>
              Planting Requests
            </Typography>

            <Grid container spacing={2}>
              {plantingRequests.length === 0 ? (
                <Grid item xs={12}>
                  <Card sx={{ textAlign: 'center', py: 6, borderRadius: 2 }}>
                    <CardContent>
                      <CalendarTodayIcon sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No pending planting requests
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        New planting requests will appear here for review
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ) : (
                plantingRequests.map((request) => (
                  <Grid item xs={12} md={6} key={request.id}>
                    <Card 
                      sx={{ 
                        borderRadius: 2,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': { 
                          transform: 'translateY(-2px)',
                          boxShadow: 3
                        }
                      }}
                      onClick={() => handleViewDetails(request)}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                          <Avatar sx={{ bgcolor: '#2e7d32' }}>
                            {(request.fullName || 'U').charAt(0)}
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1" fontWeight="bold">
                              {request.fullName || 'Unknown User'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {request.userEmail}
                            </Typography>
                          </Box>
                          <Chip 
                            label={getStatusText(request)} 
                            color={getStatusColor(getStatusText(request))}
                            size="small"
                          />
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <LocationOnIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            {request.location || 'Unknown Location'}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                          <CalendarTodayIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            Preferred date: {formatDate(request.preferredDate)}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', gap: 1 }} onClick={(e) => e.stopPropagation()}>
                          <Button
                            startIcon={<CheckCircleIcon />}
                            onClick={() => handleApprove(request)}
                            variant="contained"
                            color="success"
                            size="small"
                            fullWidth
                          >
                            Approve
                          </Button>
                          <Button
                            startIcon={<CancelIcon />}
                            onClick={() => handleReject(request)}
                            variant="outlined"
                            color="error"
                            size="small"
                            fullWidth
                          >
                            Reject
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              )}
            </Grid>
          </>
        )}

        {activeTab === 2 && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ color: '#2e7d32', fontWeight: 600 }}>
                Sensor Alerts
              </Typography>
              <Button
                startIcon={<RefreshIcon />}
                onClick={handleRefreshSensorAlerts}
                variant="outlined"
                size="small"
              >
                Refresh
              </Button>
            </Box>

            <Grid container spacing={2}>
              {sensorAlerts.length === 0 ? (
                <Grid item xs={12}>
                  <Card sx={{ textAlign: 'center', py: 6, borderRadius: 2 }}>
                    <CardContent>
                      <SensorsIcon sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No sensor alerts
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        All sensors are functioning normally
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ) : (
                sensorAlerts.map((alert) => (
                  <Grid item xs={12} md={6} lg={4} key={alert.id}>
                    <Card 
                      sx={{ 
                        borderRadius: 2,
                        borderLeft: `4px solid ${theme.palette[getAlertColor(alert.severity)].main}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': { 
                          transform: 'translateY(-2px)',
                          boxShadow: 3
                        }
                      }}
                      onClick={() => handleViewAlert(alert)}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                          <Box sx={{ 
                            color: theme.palette[getAlertColor(alert.severity)].main 
                          }}>
                            <WarningIcon />
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1" fontWeight="bold">
                              Sensor {alert.sensorId}
                            </Typography>
                            <Chip 
                              label={alert.severity.toUpperCase()} 
                              color={getAlertColor(alert.severity)}
                              size="small"
                            />
                          </Box>
                        </Box>
                        
                        <Typography 
                          variant="body2" 
                          color="text.secondary" 
                          sx={{ mb: 2 }}
                        >
                          {alert.message}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="caption" color="text.secondary">
                            {formatDateTime(alert.timestamp)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {alert.parameter && `• ${alert.parameter}`}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              )}
            </Grid>
          </>
        )}

        {/* Dialogs (keep the same as original but with updated styling) */}
        <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Planting Request Details</DialogTitle>
          <DialogContent>
            {selectedRequest && (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Requester Information</Typography>
                  <Box sx={{ mt: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography><strong>Name:</strong> {selectedRequest.fullName || 'Unknown User'}</Typography>
                    <Typography><strong>Email:</strong> {selectedRequest.userEmail || 'N/A'}</Typography>
                    {selectedRequest.organization && (
                      <Typography><strong>Organization:</strong> {selectedRequest.organization}</Typography>
                    )}
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Location Information</Typography>
                  <Box sx={{ mt: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography><strong>Location:</strong> {selectedRequest.location || 'Unknown Location'}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Request Details</Typography>
                  <Box sx={{ mt: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography><strong>Preferred Date:</strong> {formatDate(selectedRequest.preferredDate)}</Typography>
                    <Typography><strong>Submitted At:</strong> {formatDateTime(selectedRequest.submittedAt)}</Typography>
                    <Typography><strong>Status:</strong> 
                      <Chip 
                        label={getStatusText(selectedRequest)} 
                        color={getStatusColor(getStatusText(selectedRequest))}
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    </Typography>
                    {selectedRequest.approvalNotes && (
                      <Typography><strong>Notes:</strong> {selectedRequest.approvalNotes}</Typography>
                    )}
                    {selectedRequest.rejectionReason && (
                      <Typography><strong>Rejection Reason:</strong> {selectedRequest.rejectionReason}</Typography>
                    )}
                  </Box>
                </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
            {selectedRequest && getStatusText(selectedRequest) === 'pending' && (
              <>
                <Button 
                  onClick={() => {
                    setDetailDialogOpen(false);
                    handleApprove(selectedRequest);
                  }} 
                  color="success" 
                  variant="contained"
                >
                  Approve
                </Button>
                <Button 
                  onClick={() => {
                    setDetailDialogOpen(false);
                    handleReject(selectedRequest);
                  }} 
                  color="error" 
                  variant="outlined"
                >
                  Reject
                </Button>
              </>
            )}
          </DialogActions>
        </Dialog>

        {/* Alert Detail Dialog */}
        <Dialog open={alertDialogOpen} onClose={() => setAlertDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Sensor Alert Details</DialogTitle>
          <DialogContent>
            {selectedAlert && (
              <Box sx={{ mt: 1 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      Sensor {selectedAlert.sensorId}
                    </Typography>
                    <Chip 
                      label={selectedAlert.severity.toUpperCase()} 
                      color={getAlertColor(selectedAlert.severity)}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">Alert Message</Typography>
                    <Typography variant="body1" sx={{ mt: 1 }}>
                      {selectedAlert.message}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">Alert Type</Typography>
                    <Typography variant="body2">{selectedAlert.type}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">Timestamp</Typography>
                    <Typography variant="body2">{formatDateTime(selectedAlert.timestamp)}</Typography>
                  </Grid>
                  {selectedAlert.parameter && (
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">Parameter</Typography>
                      <Typography variant="body2">{selectedAlert.parameter}</Typography>
                    </Grid>
                  )}
                  {selectedAlert.value !== undefined && (
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">Value</Typography>
                      <Typography variant="body2">{selectedAlert.value}</Typography>
                    </Grid>
                  )}
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAlertDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Notification Detail Dialog */}
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
                      label={selectedNotification.priority} 
                      size="small" 
                      color={selectedNotification.priority === 'high' ? 'error' : selectedNotification.priority === 'medium' ? 'warning' : 'default'}
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
                    <Typography variant="body2">{selectedNotification.type}</Typography>
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
            {!selectedNotification?.read && (
              <Button 
                onClick={() => {
                  handleMarkNotificationAsRead(selectedNotification.id);
                  setNotificationDialogOpen(false);
                }} 
                color="primary"
              >
                Mark as Read
              </Button>
            )}
          </DialogActions>
        </Dialog>

        {/* Approval and Rejection Dialogs (keep the same as original) */}
        <Dialog open={approvalDialogOpen} onClose={() => setApprovalDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Approve Planting Request</DialogTitle>
          <DialogContent>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Are you sure you want to approve this planting request?
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Approval Notes (Optional)"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Add any notes for the approval..."
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setApprovalDialogOpen(false)}>Cancel</Button>
            <Button onClick={confirmApprove} color="success" variant="contained">
              Approve Request
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={rejectionDialogOpen} onClose={() => setRejectionDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Reject Planting Request</DialogTitle>
          <DialogContent>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Please provide a reason for rejecting this planting request:
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Rejection Reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Explain why this request is being rejected..."
              required
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRejectionDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={confirmReject} 
              color="error" 
              variant="contained"
              disabled={!rejectionReason.trim()}
            >
              Reject Request
            </Button>
          </DialogActions>
        </Dialog>

        <ScrollTop>
          <Fab color="primary" size="small" aria-label="scroll back to top">
            <KeyboardArrowUpIcon />
          </Fab>
        </ScrollTop>
      </Box>
    </Box>
  );
};

export default NotificationPanel;