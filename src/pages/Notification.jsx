// src/pages/Notification.js - DEBUGGED VERSION
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
import { firestore } from "../firebase.js";
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
import NatureIcon from '@mui/icons-material/Nature'; // Changed from Eco to Nature
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

export const createPlantingRecordNotification = async (plantingRecordData, plantingRecordId) => {
  try {
    // Resolve user and location information for the notification message
    const userInfo = await resolveUserRef(plantingRecordData.userRef);
    const locationName = await resolveLocationRef(plantingRecordData.locationRef);
    
    const notificationData = {
      type: 'planting_record',
      notification_type: 'completed',
      title: 'Planting Activity Completed',
      notif_message: `User ${userInfo.name} has planted ${plantingRecordData.treeSeedlingName || 'a tree'} in ${locationName}`,
      data: {
        plantingRecordId: plantingRecordId,
        userRef: plantingRecordData.userRef,
        locationRef: plantingRecordData.locationRef,
        treeSeedlingName: plantingRecordData.treeSeedlingName,
        plantingDate: plantingRecordData.plantingDate,
        status: 'completed'
      },
      targetRole: 'admin',
      read: false,
      resolved: false,
      hidden: false,
      priority: 'low',
      notif_timestamp: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(firestore, 'notifications'), notificationData);
    console.log('✓ Planting record notification created:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating planting record notification:', error);
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

// =============================================================================
// DATA FETCHING FUNCTIONS
// =============================================================================

// Fetch planting requests from API
const fetchPlantingRequests = async () => {
  try {
    console.log('🌱 Fetching planting requests via API...');
    const response = await apiService.getPlantingRequests();
    console.log('✅ Planting requests loaded via API:', response.length);
    return response;
  } catch (error) {
    console.warn('⚠ API fetch failed, falling back to Firestore:', error.message);
    return fetchPlantingRequestsFromFirestore();
  }
};

// Fetch planting records from API
const fetchPlantingRecords = async () => {
  try {
    console.log('📊 Fetching planting records via API...');
    const response = await apiService.getPlantingRecords();
    console.log('✅ Planting records loaded via API:', response.length);
    return response;
  } catch (error) {
    console.warn('⚠ API fetch failed, falling back to Firestore:', error.message);
    return fetchPlantingRecordsFromFirestore();
  }
};

// Fallback function to fetch planting requests directly from Firestore
const fetchPlantingRequestsFromFirestore = async () => {
  try {
    console.log('🔄 Fetching planting requests from Firestore...');
    const querySnapshot = await getDocs(collection(firestore, 'plantingrequests'));
    const requests = [];
    
    for (const docSnap of querySnapshot.docs) {
      const requestData = docSnap.data();
      let locationName = 'Unknown Location';
      let fullName = 'Unknown User';
      
      // Resolve location name
      if (requestData.locationRef) {
        locationName = await resolveLocationRef(requestData.locationRef);
      }
      
      // Resolve user name
      if (requestData.userRef) {
        const userInfo = await resolveUserRef(requestData.userRef);
        fullName = userInfo.name;
      }
      
      requests.push({
        id: docSnap.id,
        ...requestData,
        locationName,
        fullName
      });
    }
    
    console.log('✅ Planting requests loaded from Firestore:', requests.length);
    return requests;
  } catch (error) {
    console.error('❌ Error fetching planting requests from Firestore:', error);
    return [];
  }
};

// Fallback function to fetch planting records directly from Firestore
const fetchPlantingRecordsFromFirestore = async () => {
  try {
    console.log('🔄 Fetching planting records from Firestore...');
    const querySnapshot = await getDocs(collection(firestore, 'plantingrecords'));
    const records = [];
    
    for (const docSnap of querySnapshot.docs) {
      const recordData = docSnap.data();
      let locationName = 'Unknown Location';
      let fullName = 'Unknown User';
      let userEmail = 'N/A';
      
      // Resolve location name
      if (recordData.locationRef) {
        locationName = await resolveLocationRef(recordData.locationRef);
      }
      
      // Resolve user information
      if (recordData.userRef) {
        const userInfo = await resolveUserRef(recordData.userRef);
        fullName = userInfo.name;
        userEmail = userInfo.email;
      }
      
      records.push({
        id: docSnap.id,
        ...recordData,
        locationName,
        fullName,
        userEmail
      });
    }
    
    console.log('✅ Planting records loaded from Firestore:', records.length);
    return records;
  } catch (error) {
    console.error('❌ Error fetching planting records from Firestore:', error);
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

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
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

  // Fetch combined notifications
  const fetchNotifications = async () => {
    try {
      console.log('🔔 Fetching combined notifications via API...');
      
      const [requestsData, recordsData] = await Promise.all([
        fetchPlantingRequests(),
        fetchPlantingRecords()
      ]);

      // Create notification objects from planting requests
      const requestNotifications = requestsData.map(request => {
        const timestamp = convertTimestamp(request.request_date) || new Date();
        
        return {
          id: `request-${request.id}`,
          type: 'plant_request',
          notification_type: 'pending',
          title: 'New Planting Request',
          message: `User ${request.fullName} has submitted a planting request for ${request.locationName}`,
          notif_message: `User ${request.fullName} has submitted a planting request for ${request.locationName}`,
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
          timestamp: timestamp,
          notif_timestamp: timestamp,
          createdAt: timestamp,
          updatedAt: timestamp
        };
      });

      // Create notification objects from planting records
      const recordNotifications = recordsData.map(record => {
        const timestamp = convertTimestamp(record.plantingDate) || new Date();
        
        return {
          id: `record-${record.id}`,
          type: 'planting_record',
          notification_type: 'completed',
          title: 'Planting Activity Completed',
          message: `User ${record.fullName} has planted ${record.treeSeedlingName || 'a tree'} in ${record.locationName}`,
          notif_message: `User ${record.fullName} has planted ${record.treeSeedlingName || 'a tree'} in ${record.locationName}`,
          data: {
            plantingRecordId: record.id,
            userRef: record.userRef,
            locationRef: record.locationRef,
            treeSeedlingName: record.treeSeedlingName,
            plantingDate: record.plantingDate,
            status: 'completed'
          },
          targetRole: 'admin',
          read: false,
          resolved: false,
          hidden: false,
          priority: 'low',
          timestamp: timestamp,
          notif_timestamp: timestamp,
          createdAt: timestamp,
          updatedAt: timestamp
        };
      });

      const combinedNotifications = [...requestNotifications, ...recordNotifications];
      const sortedNotifications = combinedNotifications.sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      );
      
      console.log(`✅ Loaded ${sortedNotifications.length} combined notifications`);
      return sortedNotifications;
      
    } catch (error) {
      console.warn('⚠ Combined notifications fetch failed:', error.message);
      return [];
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading notification data...');

      const [notificationsData, requestsData, recordsData] = await Promise.all([
        fetchNotifications(),
        fetchPlantingRequests(),
        fetchPlantingRecords()
      ]);

      setNotifications(notificationsData);
      setPlantingRequests(requestsData);
      setPlantingRecords(recordsData);

      console.log('✅ Notification data loaded successfully');
      setLoading(false);

    } catch (error) {
      console.error('❌ Error loading notification data:', error);
      setAlert({
        open: true,
        message: 'Error loading data: ' + error.message,
        severity: 'error'
      });
      setLoading(false);
    }
  };

  const setupRealTimeListeners = () => {
    let unsubscribeRequests = null;
    let unsubscribeRecords = null;

    try {
      const requestsQuery = collection(firestore, 'plantingrequests');
      unsubscribeRequests = onSnapshot(requestsQuery, 
        async () => {
          console.log('🔄 Real-time update: Planting requests changed');
          const [notificationsData, requestsData] = await Promise.all([
            fetchNotifications(),
            fetchPlantingRequests()
          ]);
          setNotifications(notificationsData);
          setPlantingRequests(requestsData);
        },
        (error) => {
          console.error('❌ Real-time requests listener error:', error);
        }
      );

      const recordsQuery = collection(firestore, 'plantingrecords');
      unsubscribeRecords = onSnapshot(recordsQuery, 
        async () => {
          console.log('🔄 Real-time update: Planting records changed');
          const [notificationsData, recordsData] = await Promise.all([
            fetchNotifications(),
            fetchPlantingRecords()
          ]);
          setNotifications(notificationsData);
          setPlantingRecords(recordsData);
        },
        (error) => {
          console.error('❌ Real-time records listener error:', error);
        }
      );

    } catch (error) {
      console.warn('⚠ Real-time listeners setup failed:', error.message);
    }

    return () => {
      if (unsubscribeRequests) unsubscribeRequests();
      if (unsubscribeRecords) unsubscribeRecords();
    };
  };

  useEffect(() => {
    loadData();
    const cleanup = setupRealTimeListeners();
    const pollInterval = setInterval(() => {
      loadData();
    }, 30000);

    return () => {
      cleanup();
      clearInterval(pollInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        try {
          await apiService.updateNotification(notification.id, { read: true });
          console.log('✅ Notification marked as read via API');
        } catch (apiError) {
          console.warn('⚠ API mark as read failed:', apiError.message);
          await markNotificationAsRead(notification.id);
        }
        
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
      
      try {
        await apiService.markMultipleNotificationsAsRead(unreadNotifications.map(n => n.id));
        console.log('✅ All notifications marked as read via API');
      } catch (apiError) {
        console.warn('⚠ API bulk mark as read failed:', apiError.message);
        const updatePromises = unreadNotifications.map(notification => 
          markNotificationAsRead(notification.id)
        );
        await Promise.all(updatePromises);
      }
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setAlert({ open: true, message: 'All notifications marked as read', severity: 'success' });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      setAlert({ open: true, message: 'Error marking notifications as read', severity: 'error' });
    }
  };

  const handleRemoveNotification = async (notificationId) => {
    try {
      try {
        await apiService.deleteNotification(notificationId);
        console.log('✅ Notification removed via API');
      } catch (apiError) {
        console.warn('⚠ API delete failed:', apiError.message);
        await hideNotification(notificationId);
      }
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setAlert({ open: true, message: 'Notification removed', severity: 'success' });
    } catch (error) {
      console.error('Error removing notification:', error);
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
      case 'planting_record': return <EcoIcon />;
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
  const recordsCount = plantingRecords.length;

  // NotificationRow component - FIXED SYNTAX ERROR
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
              {formatDateTime(notification.timestamp)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              • {formatType(notification.type)}
            </Typography>
            {notification.data?.preferredDate && (
              <Typography variant="caption" color="text.secondary">
                • Preferred: {formatDate(notification.data.preferredDate)}
              </Typography>
            )}
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

  const RecordRow = ({ record }) => (
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
      onClick={() => handleViewRecord(record)}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: '#4caf50', width: 40, height: 40 }}>
            <EcoIcon />
          </Avatar>
          
          <Box>
            <Typography variant="subtitle1" fontWeight="bold">
              {record.fullName || 'Unknown User'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {record.userEmail || 'N/A'}
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <LocationOnIcon fontSize="small" color="action" />
            <Typography variant="body2">
              {record.locationName || 'Unknown Location'}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <EcoIcon fontSize="small" color="action" />
            <Typography variant="body2">
              {record.treeSeedlingName || 'Unknown Tree'}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CalendarTodayIcon fontSize="small" color="action" />
            <Typography variant="body2">
              {formatDate(record.plantingDate)}
            </Typography>
          </Box>
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
            Loading notifications...
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
                Notifications Center
              </Typography>
              <Typography variant="body1" color="text.secondary">
                View and manage system notifications and activities
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
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
            <Tab 
              icon={
                <Badge 
                  badgeContent={recordsCount} 
                  color="success"
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
                  <HistoryIcon />
                </Badge>
              }
              label={
                <Box>
                  <Typography variant="body2" fontWeight="600">
                    Planting Records
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {recordsCount} completed
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

        {activeTab === 2 && (
          <>
            <Typography variant="h6" sx={{ color: '#2e7d32', fontWeight: 600, mb: 2 }}>
              Planting Records
            </Typography>

            {plantingRecords.length === 0 ? (
              <EmptyState 
                icon={EcoIcon}
                title="No planting records available"
                description="Completed planting activities will appear here"
              />
            ) : (
              <Box>
                {plantingRecords.map((record) => (
                  <RecordRow key={record.id} record={record} />
                ))}
              </Box>
            )}
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

        {/* Detail Dialog for Planting Records */}
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
                      <strong>Tree Seedling:</strong> {selectedRecord.treeSeedlingName || 'Unknown Tree'}
                    </Typography>
                    <Typography>
                      <strong>Planting Date:</strong> {formatDateTime(selectedRecord.plantingDate) || 'N/A'}
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