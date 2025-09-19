// src/pages/Notification.js
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Grid, Card, CardContent, Alert, IconButton,
  Badge, useMediaQuery, useTheme, Avatar, LinearProgress, alpha,
  Tabs, Tab, List, ListItem, ListItemIcon, ListItemText, ListItemSecondaryAction, Tooltip,
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
import VisibilityIcon from '@mui/icons-material/Visibility';
import PersonIcon from '@mui/icons-material/Person';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import SensorsIcon from '@mui/icons-material/Sensors';
import WarningIcon from '@mui/icons-material/Warning';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';

const drawerWidth = 240;

// =============================================================================
// NOTIFICATION HELPER FUNCTIONS
// =============================================================================

// Function to create notification when plant request is submitted
export const createPlantRequestNotification = async (plantRequestData, plantRequestId) => {
  try {
    const notificationData = {
      type: 'plant_request',
      title: 'New Planting Request',
      message: `New planting request from ${plantRequestData.userEmail || 'user'} at ${plantRequestData.location_name || 'location'}`,
      data: {
        plantRequestId: plantRequestId,
        userId: plantRequestData.user_id,
        locationId: plantRequestData.location_id,
        preferredDate: plantRequestData.preferred_date
      },
      targetRole: 'admin',
      read: false,
      resolved: false,
      priority: 'medium',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(firestore, 'Notifications'), notificationData);
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

    const docRef = await addDoc(collection(firestore, 'Notifications'), notificationData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating sensor alert notification:', error);
    throw error;
  }
};

// Function to mark notification as read
export const markNotificationAsRead = async (notificationId) => {
  try {
    const notificationRef = doc(firestore, 'Notifications', notificationId);
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
    const notificationRef = doc(firestore, 'Notifications', notificationId);
    await updateDoc(notificationRef, {
      resolved: true,
      resolvedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error marking notification as resolved:', error);
    throw error;
  }
};

// Enhanced approval function that also manages notifications
export const approveRequestWithNotification = async (plantRequest, approvalNotes = '') => {
  try {
    // 1. Update the plant request
    const requestRef = doc(firestore, 'PlantingRequest', plantRequest.id);
    await updateDoc(requestRef, {
      request_status: 'approved',
      request_remarks: approvalNotes || 'Request approved by administrator',
      approved_at: serverTimestamp()
    });

    // 2. Create planting record
    const plantingRecordData = {
      record_id: `REC-${Date.now()}`,
      user_id: plantRequest.user_id,
      location_id: plantRequest.location_id,
      seedling_id: null,
      record_datePlanted: new Date(),
      created_at: serverTimestamp(),
      status: 'planted',
      request_id: plantRequest.id
    };
    await addDoc(collection(firestore, 'PlantingRecord'), plantingRecordData);

    // 3. Mark related notification as resolved
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
        resolutionType: 'approved'
      })
    );
    await Promise.all(updatePromises);

    // 4. Create approval notification for the user
    await addDoc(collection(firestore, 'Notifications'), {
      type: 'request_approved',
      title: 'Planting Request Approved',
      message: `Your planting request has been approved. You can now proceed with planting.`,
      data: {
        plantRequestId: plantRequest.id,
        approvalNotes: approvalNotes
      },
      targetUserId: plantRequest.user_id,
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
    // 1. Update the plant request
    const requestRef = doc(firestore, 'PlantingRequest', plantRequest.id);
    await updateDoc(requestRef, {
      request_status: 'rejected',
      request_remarks: rejectionReason,
      rejected_at: serverTimestamp()
    });

    // 2. Mark related notification as resolved
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

    // 3. Create rejection notification for the user
    await addDoc(collection(firestore, 'Notifications'), {
      type: 'request_rejected',
      title: 'Planting Request Rejected',
      message: `Your planting request has been rejected. Reason: ${rejectionReason}`,
      data: {
        plantRequestId: plantRequest.id,
        rejectionReason: rejectionReason
      },
      targetUserId: plantRequest.user_id,
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

// =============================================================================
// MAIN COMPONENT
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
  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState([]);
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

  // Helper function to avoid duplicate sensor notifications
  const createSensorAlertNotificationIfNew = async (alertData) => {
    try {
      const existingQuery = query(
        collection(firestore, 'Notifications'),
        where('type', '==', 'sensor_alert'),
        where('data.sensorId', '==', alertData.sensorId),
        where('data.parameter', '==', alertData.parameter || ''),
        where('resolved', '==', false)
      );
      
      const existingSnapshot = await getDocs(existingQuery);
      
      if (existingSnapshot.empty) {
        await createSensorAlertNotification(alertData);
      }
    } catch (error) {
      console.error('Error checking for existing sensor notification:', error);
    }
  };

  // Enhanced useEffect with notifications
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch planting requests
        const requestsQuery = query(
          collection(firestore, 'PlantingRequest')
        );
        
        const unsubscribeRequests = onSnapshot(requestsQuery, 
          (snapshot) => {
            const allRequests = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            
            const pendingRequests = allRequests.filter(req => 
              req.request_status === 'pending' || 
              req.status === 'pending' ||
              !req.request_status
            );
            
            setPlantingRequests(pendingRequests);
            setLoading(false);
          },
          (error) => {
            console.error('Error in snapshot listener:', error);
            setLoading(false);
          }
        );

        // Add notifications listener
        const notificationsQuery = query(
          collection(firestore, 'Notifications'),
          where('targetRole', '==', 'admin'),
          where('resolved', '==', false),
          orderBy('createdAt', 'desc')
        );

        const unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
          const notificationData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().createdAt?.toDate() || new Date()
          }));
          
          setNotifications(notificationData);
        });

        // Fetch users for planter names
        const usersSnapshot = await getDocs(collection(firestore, 'users'));
        const usersData = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setUsers(usersData);

        // Fetch locations for location names
        const locationsSnapshot = await getDocs(collection(firestore, 'Location'));
        const locationsData = locationsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setLocations(locationsData);

        // Fetch sensor data for alerts
        const sensorRef = ref(rtdb, "sensors");
        const sensorUnsubscribe = onValue(sensorRef, (snapshot) => {
          if (snapshot.exists()) {
            const sensorsData = snapshot.val();
            const alerts = generateSensorAlerts(sensorsData);
            setSensorAlerts(alerts);
            
            // Create notifications for new sensor alerts
            alerts.forEach(alert => {
              createSensorAlertNotificationIfNew(alert);
            });
          }
        });

        return () => {
          unsubscribeRequests();
          unsubscribeNotifications();
          sensorUnsubscribe();
        };
      } catch (error) {
        console.error('Error setting up data queries:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Generate sensor alerts based on sensor data
  const generateSensorAlerts = (sensorsData) => {
    const alerts = [];
    const now = new Date();
    
    if (!sensorsData || !sensorsData.sensors) return alerts;

    Object.entries(sensorsData.sensors).forEach(([sensorId, sensorData]) => {
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

  // Get user details
  const getUserDetails = (userId) => {
    return users.find(user => user.id === userId) || {};
  };

  // Get location details
  const getLocationDetails = (locationId) => {
    return locations.find(location => location.id === locationId) || {};
  };

  // Event handlers
  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setDetailDialogOpen(true);
  };

  const handleViewAlert = (alert) => {
    setSelectedAlert(alert);
    setAlertDialogOpen(true);
  };

  // Handle notification view
  const handleViewNotification = (notification) => {
    setSelectedNotification(notification);
    setNotificationDialogOpen(true);
    // Mark as read when viewed
    if (!notification.read) {
      markNotificationAsRead(notification.id);
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

  // Notification management functions
  const handleMarkNotificationRead = async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId);
      setAlert({ 
        open: true, 
        message: 'Notification marked as read', 
        severity: 'info' 
      });
    } catch (error) {
      setAlert({ 
        open: true, 
        message: 'Error updating notification', 
        severity: 'error' 
      });
    }
  };

  const handleResolveNotification = async (notificationId) => {
    try {
      await markNotificationAsResolved(notificationId);
      setAlert({ 
        open: true, 
        message: 'Notification resolved', 
        severity: 'success' 
      });
    } catch (error) {
      setAlert({ 
        open: true, 
        message: 'Error resolving notification', 
        severity: 'error' 
      });
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      await deleteDoc(doc(firestore, 'Notifications', notificationId));
      setAlert({ 
        open: true, 
        message: 'Notification deleted', 
        severity: 'success' 
      });
    } catch (error) {
      setAlert({ 
        open: true, 
        message: 'Error deleting notification', 
        severity: 'error' 
      });
    }
  };

  const createPlantingRecord = async (request) => {
    try {
      const plantingRecordData = {
        record_id: `REC-${Date.now()}`,
        user_id: request.user_id,
        location_id: request.location_id,
        seedling_id: null,
        record_datePlanted: new Date(),
        created_at: Timestamp.now(),
        status: 'planted',
        request_id: request.id
      };

      const docRef = await addDoc(collection(firestore, 'PlantingRecord'), plantingRecordData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating planting record:', error);
      throw error;
    }
  };

  // Enhanced approval function
  const confirmApprove = async () => {
    try {
      const result = await approveRequestWithNotification(selectedRequest, rejectionReason);
      
      setApprovalDialogOpen(false);
      setSelectedRequest(null);
      setRejectionReason('');
      
      setAlert({ 
        open: true, 
        message: result.message, 
        severity: 'success' 
      });
    } catch (error) {
      console.error('Error approving request:', error);
      setAlert({ 
        open: true, 
        message: 'Error approving request: ' + error.message, 
        severity: 'error' 
      });
    }
  };

  // Enhanced rejection function
  const confirmReject = async () => {
    try {
      const result = await rejectRequestWithNotification(selectedRequest, rejectionReason);
      
      setRejectionDialogOpen(false);
      setRejectionReason('');
      setSelectedRequest(null);
      
      setAlert({ 
        open: true, 
        message: result.message, 
        severity: 'warning' 
      });
    } catch (error) {
      console.error('Error rejecting request:', error);
      setAlert({ 
        open: true, 
        message: 'Error rejecting request: ' + error.message, 
        severity: 'error' 
      });
    }
  };

  // Utility functions
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

  const getAlertIcon = (severity) => {
    switch (severity) {
      case 'high': return <WarningIcon color="error" />;
      case 'medium': return <WarningIcon color="warning" />;
      case 'low': return <SensorsIcon color="info" />;
      default: return <SensorsIcon />;
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    
    try {
      if (date instanceof Timestamp) {
        return date.toDate().toLocaleDateString();
      }
      if (typeof date === 'string') {
        if (date.includes('September') || date.includes('UTC')) {
          return new Date(date).toLocaleDateString();
        } else {
          return new Date(date + 'T00:00:00').toLocaleDateString();
        }
      }
      if (date.toDate) {
        return date.toDate().toLocaleDateString();
      }
      return 'Invalid Date';
    } catch (error) {
      return 'Invalid Date';
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

  const getStatusText = (request) => {
    return request.request_status || request.status || 'unknown';
  };

  // Count calculations
  const pendingCount = plantingRequests.filter(req => 
    (req.request_status === 'pending' || req.status === 'pending') && 
    req.request_status !== 'approved' && 
    req.request_status !== 'rejected'
  ).length;

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
      {/* App Bar */}
      <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={auth.currentUser} onLogout={handleLogout} />

      {/* Side Navigation */}
      <Navigation mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} isMobile={isMobile} />

      {/* Main Content */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          p: 3, 
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: '64px'
        }}
      >      
        {/* Alert Notification */}
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
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h4" sx={{ color: '#2e7d32', fontWeight: 600 }}>
                Notifications Center
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {pendingCount} pending request{pendingCount !== 1 ? 's' : ''} • {alertCount} sensor alert{alertCount !== 1 ? 's' : ''} • {notificationCount} notification{notificationCount !== 1 ? 's' : ''}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Badge badgeContent={pendingCount} color="warning" sx={{ mr: 1 }}>
                <PendingActionsIcon color="action" />
              </Badge>
              <Badge badgeContent={alertCount} color="error" sx={{ mr: 1 }}>
                <WarningIcon color="action" />
              </Badge>
              <Badge badgeContent={notificationCount} color="primary">
                <NotificationsIcon color="action" />
              </Badge>
            </Box>
          </Box>
        </Box>

        {/* Tabs for different notification types */}
        <Paper sx={{ mb: 3, borderRadius: 2 }}>
          <Tabs value={activeTab} onChange={handleTabChange} centered>
            <Tab label={`Planting Requests (${pendingCount})`} />
            <Tab label={`Sensor Alerts (${alertCount})`} />
            <Tab label={`All Notifications (${notificationCount})`} />
          </Tabs>
        </Paper>

        {/* Tab Content */}
        {activeTab === 0 ? (
          /* Planting Requests Tab */
          <>
            {/* Stats Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box sx={{ bgcolor: alpha(theme.palette.warning.main, 0.2), p: 1.5, borderRadius: 2, mr: 2 }}>
                        <PendingActionsIcon color="warning" />
                      </Box>
                      <Box>
                        <Typography variant="h5" fontWeight="bold">{pendingCount}</Typography>
                        <Typography variant="body2" color="text.secondary">Pending Requests</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box sx={{ bgcolor: alpha(theme.palette.success.main, 0.2), p: 1.5, borderRadius: 2, mr: 2 }}>
                        <CheckCircleIcon color="success" />
                      </Box>
                      <Box>
                        <Typography variant="h5" fontWeight="bold">
                          {plantingRequests.filter(req => req.request_status === 'approved').length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">Approved Today</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box sx={{ bgcolor: alpha(theme.palette.info.main, 0.2), p: 1.5, borderRadius: 2, mr: 2 }}>
                        <PersonIcon color="info" />
                      </Box>
                      <Box>
                        <Typography variant="h5" fontWeight="bold">
                          {new Set(plantingRequests.map(req => req.user_id)).size}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">Active Users</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box sx={{ bgcolor: alpha(theme.palette.primary.main, 0.2), p: 1.5, borderRadius: 2, mr: 2 }}>
                        <LocationOnIcon color="primary" />
                      </Box>
                      <Box>
                        <Typography variant="h5" fontWeight="bold">
                          {new Set(plantingRequests.map(req => req.location_id)).size}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">Locations</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Planting Requests Table */}
            <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <TableContainer>
                <Table>
                  <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                    <TableRow>
                      <TableCell><strong>Requester</strong></TableCell>
                      <TableCell><strong>Location</strong></TableCell>
                      <TableCell><strong>Preferred Date</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                      <TableCell><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {plantingRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          <Typography color="text.secondary" sx={{ py: 4 }}>
                            No pending planting requests
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      plantingRequests.map((request) => {
                        const user = getUserDetails(request.user_id);
                        const location = getLocationDetails(request.location_id);
                        
                        return (
                          <TableRow key={request.id} hover>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Avatar sx={{ mr: 2, bgcolor: '#2e7d32' }}>
                                  {(user.firstName || 'U').charAt(0)}
                                </Avatar>
                                <Box>
                                  <Typography variant="body2" fontWeight="bold">
                                    {user.firstName && user.lastName 
                                      ? `${user.firstName} ${user.lastName}` 
                                      : user.email || 'Unknown User'}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {user.email}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {location.location_name || 'Unknown Location'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {formatDate(request.preferred_date)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={getStatusText(request)} 
                                color={getStatusColor(getStatusText(request))}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Tooltip title="View Details">
                                  <IconButton 
                                    size="small" 
                                    onClick={() => handleViewDetails(request)}
                                    sx={{ color: '#1976d2' }}
                                  >
                                    <VisibilityIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Approve">
                                  <IconButton 
                                    size="small" 
                                    onClick={() => handleApprove(request)}
                                    sx={{ color: '#2e7d32' }}
                                  >
                                    <CheckCircleIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Reject">
                                  <IconButton 
                                    size="small" 
                                    onClick={() => handleReject(request)}
                                    sx={{ color: '#d32f2f' }}
                                  >
                                    <CancelIcon />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </>
        ) : activeTab === 1 ? (
          /* Sensor Alerts Tab */
          <>
            {/* Sensor Alerts Header */}
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

            {/* Sensor Alerts Grid */}
            <Grid container spacing={2}>
              {sensorAlerts.length === 0 ? (
                <Grid item xs={12}>
                  <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
                    <SensorsIcon sx={{ fontSize: 48, color: '#ccc', mb: 2 }} />
                    <Typography color="text.secondary">
                      No sensor alerts at this time
                    </Typography>
                  </Paper>
                </Grid>
              ) : (
                sensorAlerts.map((alert) => (
                  <Grid item xs={12} md={6} lg={4} key={alert.id}>
                    <Card sx={{ 
                      borderRadius: 2, 
                      borderLeft: `4px solid ${theme.palette[getAlertColor(alert.severity)].main}`,
                      transition: 'transform 0.2s',
                      '&:hover': { transform: 'translateY(-2px)' }
                    }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                          {getAlertIcon(alert.severity)}
                          <Box sx={{ ml: 2, flex: 1 }}>
                            <Typography variant="h6" gutterBottom>
                              Sensor {alert.sensorId}
                            </Typography>
                            <Chip 
                              label={alert.severity.toUpperCase()} 
                              color={getAlertColor(alert.severity)}
                              size="small"
                              sx={{ mb: 1 }}
                            />
                          </Box>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {alert.message}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="caption" color="text.secondary">
                            {formatDateTime(alert.timestamp)}
                          </Typography>
                          <Button
                            size="small"
                            onClick={() => handleViewAlert(alert)}
                            startIcon={<VisibilityIcon />}
                          >
                            View
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              )}
            </Grid>
          </>
        ) : (
          /* All Notifications Tab */
          <>
            <Typography variant="h6" sx={{ color: '#2e7d32', fontWeight: 600, mb: 3 }}>
              All Notifications
            </Typography>

            <Paper sx={{ borderRadius: 2 }}>
              <List>
                {notifications.length === 0 ? (
                  <ListItem>
                    <Box sx={{ width: '100%', textAlign: 'center', py: 4 }}>
                      <NotificationsIcon sx={{ fontSize: 48, color: '#ccc', mb: 2 }} />
                      <Typography color="text.secondary">
                        No notifications available
                      </Typography>
                    </Box>
                  </ListItem>
                ) : (
                  notifications.map((notification, index) => (
                    <React.Fragment key={notification.id}>
                      <ListItem 
                        sx={{ 
                          bgcolor: notification.read ? 'transparent' : alpha(theme.palette.primary.main, 0.05),
                          borderRadius: 1,
                          mb: 1,
                          mx: 1
                        }}
                      >
                        <ListItemIcon>
                          {notification.type === 'plant_request' && <NewReleasesIcon color="warning" />}
                          {notification.type === 'sensor_alert' && <WarningIcon color="error" />}
                          {notification.type === 'request_approved' && <CheckCircleIcon color="success" />}
                          {notification.type === 'request_rejected' && <CancelIcon color="error" />}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: notification.read ? 'normal' : 'bold' }}>
                                {notification.title}
                              </Typography>
                              <Chip 
                                label={notification.priority} 
                                size="small" 
                                color={notification.priority === 'high' ? 'error' : notification.priority === 'medium' ? 'warning' : 'default'}
                                variant="outlined"
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                {notification.message}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatDateTime(notification.timestamp)}
                              </Typography>
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="View Details">
                              <IconButton 
                                size="small" 
                                onClick={() => handleViewNotification(notification)}
                              >
                                <VisibilityIcon />
                              </IconButton>
                            </Tooltip>
                            {!notification.read && (
                              <Tooltip title="Mark as Read">
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleMarkNotificationRead(notification.id)}
                                  color="primary"
                                >
                                  <CheckCircleIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="Resolve">
                              <IconButton 
                                size="small" 
                                onClick={() => handleResolveNotification(notification.id)}
                                color="success"
                              >
                                <CheckCircleIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton 
                                size="small" 
                                onClick={() => handleDeleteNotification(notification.id)}
                                color="error"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </ListItemSecondaryAction>
                      </ListItem>
                      {index < notifications.length - 1 && <Box sx={{ height: 8 }} />}
                    </React.Fragment>
                  ))
                )}
              </List>
            </Paper>
          </>
        )}

        {/* Detail Dialog for Planting Requests */}
        <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Planting Request Details</DialogTitle>
          <DialogContent>
            {selectedRequest && (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Requester Information</Typography>
                  <Box sx={{ mt: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography><strong>Name:</strong> {(() => {
                      const user = getUserDetails(selectedRequest.user_id);
                      return user.firstName && user.lastName 
                        ? `${user.firstName} ${user.lastName}` 
                        : user.email || 'Unknown User';
                    })()}</Typography>
                    <Typography><strong>Email:</strong> {getUserDetails(selectedRequest.user_id).email || 'N/A'}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Location Information</Typography>
                  <Box sx={{ mt: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography><strong>Location:</strong> {getLocationDetails(selectedRequest.location_id).location_name || 'Unknown Location'}</Typography>
                    <Typography><strong>Address:</strong> {getLocationDetails(selectedRequest.location_id).location_address || 'N/A'}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Request Details</Typography>
                  <Box sx={{ mt: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography><strong>Preferred Date:</strong> {formatDate(selectedRequest.preferred_date)}</Typography>
                    <Typography><strong>Status:</strong> 
                      <Chip 
                        label={getStatusText(selectedRequest)} 
                        color={getStatusColor(getStatusText(selectedRequest))}
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    </Typography>
                    {selectedRequest.request_remarks && (
                      <Typography><strong>Remarks:</strong> {selectedRequest.request_remarks}</Typography>
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
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      {getAlertIcon(selectedAlert.severity)}
                      <Typography variant="h6" sx={{ ml: 2 }}>
                        Sensor {selectedAlert.sensorId}
                      </Typography>
                      <Chip 
                        label={selectedAlert.severity.toUpperCase()} 
                        color={getAlertColor(selectedAlert.severity)}
                        size="small"
                        sx={{ ml: 2 }}
                      />
                    </Box>
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
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      {selectedNotification.type === 'plant_request' && <NewReleasesIcon color="warning" />}
                      {selectedNotification.type === 'sensor_alert' && <WarningIcon color="error" />}
                      {selectedNotification.type === 'request_approved' && <CheckCircleIcon color="success" />}
                      {selectedNotification.type === 'request_rejected' && <CancelIcon color="error" />}
                      <Typography variant="h6" sx={{ ml: 2 }}>
                        {selectedNotification.title}
                      </Typography>
                      <Chip 
                        label={selectedNotification.priority} 
                        size="small" 
                        color={selectedNotification.priority === 'high' ? 'error' : selectedNotification.priority === 'medium' ? 'warning' : 'default'}
                        variant="outlined"
                        sx={{ ml: 2 }}
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">Message</Typography>
                    <Typography variant="body1" sx={{ mt: 1 }}>
                      {selectedNotification.message}
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
                  {selectedNotification.data && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary">Additional Data</Typography>
                      <Box sx={{ mt: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                        <pre style={{ fontSize: '12px', margin: 0, whiteSpace: 'pre-wrap' }}>
                          {JSON.stringify(selectedNotification.data, null, 2)}
                        </pre>
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setNotificationDialogOpen(false)}>Close</Button>
            {selectedNotification && !selectedNotification.read && (
              <Button 
                onClick={() => {
                  handleMarkNotificationRead(selectedNotification.id);
                  setNotificationDialogOpen(false);
                }} 
                color="primary"
              >
                Mark as Read
              </Button>
            )}
            {selectedNotification && !selectedNotification.resolved && (
              <Button 
                onClick={() => {
                  handleResolveNotification(selectedNotification.id);
                  setNotificationDialogOpen(false);
                }} 
                color="success"
              >
                Resolve
              </Button>
            )}
          </DialogActions>
        </Dialog>

        {/* Approval Dialog */}
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

        {/* Rejection Dialog */}
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
      </Box>
    </Box>
  );
};

export default NotificationPanel;