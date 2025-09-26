// src/pages/Notification.js
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Grid, Alert, IconButton,
  Badge, useMediaQuery, useTheme, Avatar, LinearProgress, alpha,
  Tabs, Tab
} from '@mui/material';
import { 
  collection, getDocs, doc, updateDoc, addDoc,
  query, where, onSnapshot, serverTimestamp
} from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import { auth, firestore, rtdb } from "../firebase.js";
import ReForestAppBar from './AppBar.js';
import Navigation from './Navigation.js';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import SensorsIcon from '@mui/icons-material/Sensors';
import WarningIcon from '@mui/icons-material/Warning';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import MarkAsReadIcon from '@mui/icons-material/DoneAll';

const drawerWidth = 240;

// =============================================================================
// NOTIFICATION HELPER FUNCTIONS
// =============================================================================

export const createPlantRequestNotification = async (plantRequestData, plantRequestId) => {
  try {
    const notificationData = {
      type: 'plant_request',
      notification_type: plantRequestData.request_status || 'pending',
      title: 'New Planting Request',
      notif_message: `New planting request from ${plantRequestData.fullName} for ${plantRequestData.preferred_date}`,
      data: {
        plantRequestId: plantRequestId,
        userRef: plantRequestData.userRef,
        locationRef: plantRequestData.locationRef,
        preferredDate: plantRequestData.preferred_date,
        createdBy: plantRequestData.createdBy,
        requestStatus: plantRequestData.requestStatus || 'pending'
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
    console.log('Notification created with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

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
      hidden: false,
      priority: alertData.severity === 'high' ? 'high' : alertData.severity === 'medium' ? 'medium' : 'low',
      notif_timestamp: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(firestore, 'notifications'), notificationData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating sensor alert notification:', error);
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

// Soft delete - hide notification but don't delete from Firestore
export const hideNotification = async (notificationId) => {
  try {
    const notificationRef = doc(firestore, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      hidden: true,
      hiddenAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    console.log('Notification hidden:', notificationId);
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
  const [sensorAlerts, setSensorAlerts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
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
            createdBy: request.createdBy,
            locationRef: request.locationRef,
            userRef: request.userRef,
            preferred_date: request.preferred_date,
            request_status: request.request_status,
            requestStatus: request.requestStatus
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
            const allRequests = snapshot.docs.map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                ...data,
                request_date: convertTimestamp(data.request_date),
                approvedAt: convertTimestamp(data.approvedAt),
                rejectedAt: convertTimestamp(data.rejectedAt),
                submittedAt: convertTimestamp(data.submittedAt)
              };
            });
            
            const pendingRequests = allRequests.filter(req => {
              const status = req.requestStatus || 'pending';
              return status === 'pending';
            });
            
            setPlantingRequests(pendingRequests);

            if (pendingRequests.length > 0) {
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

        // Query only non-hidden notifications
        const notificationsQuery = query(
          collection(firestore, 'notifications'),
          where('notification_type', '==', 'pending'),
          where('hidden', '==', false)
        );

        unsubscribeNotifications = onSnapshot(notificationsQuery, 
          (snapshot) => {
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
            
            const adminNotifications = allNotifications
              .filter(notification => notification.targetRole === 'admin')
              .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
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
      console.error('Error formatting date:', error, date);
      return 'Invalid Date';
    }
  };

  const formatType = (type) => {
    if (!type) return "Unknown";
    return type.replace('_', ' ');
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
      console.error('Error formatting datetime:', error, date);
      return 'Invalid Date';
    }
  };

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
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
          <Avatar sx={{ bgcolor: '#2e7d32', width: 40, height: 40 }}>
            {(request.fullName || 'U').charAt(0)}
          </Avatar>
          
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" fontWeight="bold">
              {request.fullName || 'Unknown User'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {request.createdBy || 'N/A'}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <LocationOnIcon fontSize="small" color="action" />
              <Typography variant="body2">
                {request.locationRef || 'Unknown Location'}
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
      </Box>
    </Paper>
  );

  const AlertRow = ({ alert }) => (
    <Paper 
      sx={{ 
        p: 2, 
        mb: 1,
        borderRadius: 2,
        borderLeft: `4px solid ${theme.palette[getAlertColor(alert.severity)].main}`,
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        '&:hover': { 
          transform: 'translateY(-1px)',
          boxShadow: 2
        }
      }}
      onClick={() => handleViewAlert(alert)}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Box sx={{ 
          color: theme.palette[getAlertColor(alert.severity)].main,
          mt: 0.5
        }}>
          <WarningIcon />
        </Box>
        
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
            <Typography variant="subtitle1" fontWeight="bold">
              Sensor {alert.sensorId}
            </Typography>
            <Chip 
              label={alert.severity.toUpperCase()} 
              color={getAlertColor(alert.severity)}
              size="small"
            />
            {alert.parameter && (
              <Chip 
                label={alert.parameter} 
                size="small" 
                variant="outlined"
              />
            )}
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {alert.message}
          </Typography>
          
          <Typography variant="caption" color="text.secondary">
            {formatDateTime(alert.timestamp)}
          </Typography>
        </Box>
        
        {alert.value !== undefined && (
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="h6" color={getAlertColor(alert.severity)}>
              {alert.value}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Value
            </Typography>
          </Box>
        )}
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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
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

        {activeTab === 2 && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
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

            {sensorAlerts.length === 0 ? (
              <EmptyState 
                icon={SensorsIcon}
                title="No sensor alerts"
                description="All sensors are functioning normally"
              />
            ) : (
              <Box>
                {sensorAlerts.map((alert) => (
                  <AlertRow key={alert.id} alert={alert} />
                ))}
              </Box>
            )}
          </>
        )}

        {/* Detail Dialog - READ ONLY */}
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
                    <Typography><strong>Location:</strong> {selectedRequest.locationRef || 'Unknown Location'}</Typography>
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
          </DialogActions>
        </Dialog>

        {/* Alert Dialog - READ ONLY */}
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

        {/* Notification Dialog - READ ONLY */}
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
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default NotificationPanel;