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
  collection, getDocs, doc, updateDoc, addDoc,
  query, where, onSnapshot, orderBy, Timestamp
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
const drawerWidth = 240;
const NotificationPanel = () => {
  const [plantingRequests, setPlantingRequests] = useState([]);
  const [sensorAlerts, setSensorAlerts] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
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

  // Fetch all necessary data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch planting requests
        const requestsQuery = query(
          collection(firestore, 'PlantingRequest')
        );
        
        const unsubscribe = onSnapshot(requestsQuery, 
          (snapshot) => {
            const allRequests = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            
            // Filter for pending requests manually
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
          }
        });

        return () => {
          unsubscribe();
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

    // Check each sensor for issues
    Object.entries(sensorsData.sensors).forEach(([sensorId, sensorData]) => {
      if (!sensorData.sensorData) return;

      const readings = Object.values(sensorData.sensorData);
      if (readings.length === 0) return;

      // Get the latest reading
      const latestReading = readings[readings.length - 1];
      
      // Check if reading is recent (within last 4 hours)
      const readingTime = new Date(latestReading.timestamp);
      const hoursDiff = (now - readingTime) / (1000 * 60 * 60);
      
      if (hoursDiff > 24) {
        // Sensor offline alert
        alerts.push({
          id: `offline-${sensorId}`,
          type: 'offline',
          sensorId,
          message: `Sensor ${sensorId} has been offline for more than 24 hours`,
          timestamp: readingTime,
          severity: 'high'
        });
      } else if (hoursDiff > 4) {
        // Sensor delayed alert
        alerts.push({
          id: `delayed-${sensorId}`,
          type: 'delayed',
          sensorId,
          message: `Sensor ${sensorId} data is delayed (last update ${Math.round(hoursDiff)} hours ago)`,
          timestamp: readingTime,
          severity: 'medium'
        });
      }

      // Check sensor readings for anomalies
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

    // Sort alerts by severity and timestamp
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

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setDetailDialogOpen(true);
  };

  const handleViewAlert = (alert) => {
    setSelectedAlert(alert);
    setAlertDialogOpen(true);
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
    // Simulate refresh by re-fetching sensor data
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

  const confirmApprove = async () => {
    try {
      await createPlantingRecord(selectedRequest);

      const requestRef = doc(firestore, 'PlantingRequest', selectedRequest.id);
      await updateDoc(requestRef, {
        request_status: 'approved',
        request_remarks: rejectionReason || 'Request approved by administrator',
        approved_at: Timestamp.now()
      });

      setApprovalDialogOpen(false);
      setSelectedRequest(null);
      setRejectionReason('');
      
      setAlert({ open: true, message: 'Request approved successfully! Planting record created.', severity: 'success' });
    } catch (error) {
      console.error('Error approving request:', error);
      setAlert({ open: true, message: 'Error approving request: ' + error.message, severity: 'error' });
    }
  };

  const confirmReject = async () => {
    try {
      const requestRef = doc(firestore, 'PlantingRequest', selectedRequest.id);
      await updateDoc(requestRef, {
        request_status: 'rejected',
        request_remarks: rejectionReason || 'Request rejected by administrator',
        rejected_at: Timestamp.now()
      });

      setRejectionDialogOpen(false);
      setRejectionReason('');
      setSelectedRequest(null);
      
      setAlert({ open: true, message: 'Request rejected successfully!', severity: 'warning' });
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

  const pendingCount = plantingRequests.filter(req => 
    (req.request_status === 'pending' || req.status === 'pending') && 
    req.request_status !== 'approved' && 
    req.request_status !== 'rejected'
  ).length;

  const alertCount = sensorAlerts.length;

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
                  {pendingCount} pending request{pendingCount !== 1 ? 's' : ''} • {alertCount} sensor alert{alertCount !== 1 ? 's' : ''}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Badge badgeContent={pendingCount} color="warning" sx={{ mr: 1 }}>
                  <PendingActionsIcon color="action" />
                </Badge>
                <Badge badgeContent={alertCount} color="error">
                  <WarningIcon color="action" />
                </Badge>
              </Box>
            </Box>
          </Box>

        {/* Tabs for different notification types */}
        <Paper sx={{ mb: 3, borderRadius: 2 }}>
          <Tabs value={activeTab} onChange={handleTabChange} centered>
            <Tab label={`Planting Requests (${pendingCount})`} />
            <Tab label={`Sensor Alerts (${alertCount})`} />
          </Tabs>
        </Paper>

        {/* Content based on active tab */}
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
                      <Box sx={{ bgcolor: alpha(theme.palette.primary.main, 0.2), p: 1.5, borderRadius: 2, mr: 2 }}>
                        <PersonIcon color="primary" />
                      </Box>
                      <Box>
                        <Typography variant="h5" fontWeight="bold">
                          {new Set(plantingRequests.map(req => req.user_id)).size}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">Unique Planters</Typography>
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
                        <LocationOnIcon color="info" />
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
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box sx={{ bgcolor: alpha(theme.palette.success.main, 0.2), p: 1.5, borderRadius: 2, mr: 2 }}>
                        <CalendarTodayIcon color="success" />
                      </Box>
                      <Box>
                        <Typography variant="h5" fontWeight="bold">
                          {plantingRequests.length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">Total Requests</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Requests Table */}
            {plantingRequests.length === 0 ? (
              <Card sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
                <PendingActionsIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No Pending Requests
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  All planting requests have been processed. New requests will appear here.
                </Typography>
              </Card>
            ) : (
              <Card sx={{ borderRadius: 2, boxShadow: 2, overflow: 'hidden' }}>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: theme.palette.grey[50] }}>
                        <TableCell><Typography variant="subtitle2" fontWeight="bold">Request ID</Typography></TableCell>
                        <TableCell><Typography variant="subtitle2" fontWeight="bold">Planter</Typography></TableCell>
                        <TableCell><Typography variant="subtitle2" fontWeight="bold">Location</Typography></TableCell>
                        <TableCell><Typography variant="subtitle2" fontWeight="bold">Preferred Date</Typography></TableCell>
                        <TableCell><Typography variant="subtitle2" fontWeight="bold">Request Date</Typography></TableCell>
                        <TableCell><Typography variant="subtitle2" fontWeight="bold">Status</Typography></TableCell>
                        <TableCell align="center"><Typography variant="subtitle2" fontWeight="bold">Actions</Typography></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {plantingRequests.map((request) => {
                        const status = getStatusText(request);
                        const isPending = status === 'pending';
                        const user = getUserDetails(request.user_id);
                        const location = getLocationDetails(request.location_id);

                        return (
                          <TableRow 
                            key={request.id} 
                            hover 
                            sx={{ 
                              '&:last-child td, &:last-child th': { border: 0 },
                              bgcolor: isPending ? alpha(theme.palette.warning.light, 0.1) : 'inherit'
                            }}
                          >
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {request.request_id || request.id}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Avatar sx={{ width: 32, height: 32, mr: 1, bgcolor: 'primary.main' }}>
                                  <PersonIcon fontSize="small" />
                                </Avatar>
                                <Box>
                                  <Typography variant="body2">
                                    {user.displayName || user.email || request.user_id}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {user.role || 'Planter'}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <LocationOnIcon fontSize="small" color="action" sx={{ mr: 0.5 }} />
                                <Typography variant="body2">
                                  {location.location_name || request.location_id}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <CalendarTodayIcon fontSize="small" color="action" sx={{ mr: 0.5 }} />
                                <Typography variant="body2">
                                  {formatDate(request.preferred_date)}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {formatDate(request.request_date)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={status.toUpperCase()} 
                                color={getStatusColor(status)} 
                                size="small"
                                variant={isPending ? "filled" : "outlined"}
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                                <Tooltip title="View Details">
                                  <IconButton 
                                    color="info" 
                                    onClick={() => handleViewDetails(request)}
                                    size="small"
                                  >
                                    <VisibilityIcon />
                                  </IconButton>
                                </Tooltip>
                                {isPending && (
                                  <>
                                    <Tooltip title="Approve Request">
                                      <IconButton 
                                        color="success" 
                                        onClick={() => handleApprove(request)}
                                        size="small"
                                      >
                                        <CheckCircleIcon />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Reject Request">
                                      <IconButton 
                                        color="error" 
                                        onClick={() => handleReject(request)}
                                        size="small"
                                      >
                                        <CancelIcon />
                                      </IconButton>
                                    </Tooltip>
                                  </>
                                )}
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Card>
            )}
          </>
        ) : (
          /* Sensor Alerts Tab */
          <>
            {/* Alert Stats Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box sx={{ bgcolor: alpha(theme.palette.error.main, 0.2), p: 1.5, borderRadius: 2, mr: 2 }}>
                        <WarningIcon color="error" />
                      </Box>
                      <Box>
                        <Typography variant="h5" fontWeight="bold">
                          {sensorAlerts.filter(a => a.severity === 'high').length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">High Priority</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box sx={{ bgcolor: alpha(theme.palette.warning.main, 0.2), p: 1.5, borderRadius: 2, mr: 2 }}>
                        <WarningIcon color="warning" />
                      </Box>
                      <Box>
                        <Typography variant="h5" fontWeight="bold">
                          {sensorAlerts.filter(a => a.severity === 'medium').length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">Medium Priority</Typography>
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
                        <SensorsIcon color="info" />
                      </Box>
                      <Box>
                        <Typography variant="h5" fontWeight="bold">
                          {sensorAlerts.filter(a => a.severity === 'low').length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">Low Priority</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ bgcolor: alpha(theme.palette.primary.main, 0.2), p: 1.5, borderRadius: 2, mr: 2 }}>
                          <NewReleasesIcon color="primary" />
                        </Box>
                        <Box>
                          <Typography variant="h5" fontWeight="bold">
                            {sensorAlerts.length}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">Total Alerts</Typography>
                        </Box>
                      </Box>
                      <IconButton onClick={handleRefreshSensorAlerts} size="small">
                        <RefreshIcon />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Alerts List */}
            {sensorAlerts.length === 0 ? (
              <Card sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
                <SensorsIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No Sensor Alerts
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  All sensors are functioning normally. New alerts will appear here.
                </Typography>
              </Card>
            ) : (
              <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
                <List>
                  {sensorAlerts.map((alert) => (
                    <ListItem 
                      key={alert.id} 
                      divider
                      button
                      onClick={() => handleViewAlert(alert)}
                      sx={{
                        borderLeft: `4px solid ${theme.palette[getAlertColor(alert.severity)].main}`,
                        '&:hover': {
                          backgroundColor: alpha(theme.palette[getAlertColor(alert.severity)].light, 0.1)
                        }
                      }}
                    >
                      <ListItemIcon>
                        {getAlertIcon(alert.severity)}
                      </ListItemIcon>
                      <ListItemText
                        primary={alert.message}
                        secondary={`Detected: ${formatDateTime(alert.timestamp)}`}
                        primaryTypographyProps={{ 
                          variant: 'body1',
                          color: getAlertColor(alert.severity) === 'default' ? 'textPrimary' : getAlertColor(alert.severity)
                        }}
                      />
                      <ListItemSecondaryAction>
                        <Chip 
                          label={alert.severity.toUpperCase()} 
                          color={getAlertColor(alert.severity)} 
                          size="small"
                          variant="outlined"
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </Card>
            )}
          </>
        )}

        {/* Request Details Dialog */}
        <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <VisibilityIcon /> Request Details
            </Box>
          </DialogTitle>
          <DialogContent>
            {selectedRequest && (
              <Grid container spacing={3} sx={{ mt: 1, p: 1 }}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="textSecondary" gutterBottom>Request Information</Typography>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="textSecondary">Request ID</Typography>
                        <Typography variant="body1">{selectedRequest.request_id || selectedRequest.id}</Typography>
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="textSecondary">Status</Typography>
                        <Box sx={{ mt: 0.5 }}>
                          <Chip 
                            label={getStatusText(selectedRequest).toUpperCase()} 
                            color={getStatusColor(getStatusText(selectedRequest))} 
                            size="small"
                          />
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="textSecondary" gutterBottom>Timeline</Typography>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="textSecondary">Preferred Date</Typography>
                        <Typography variant="body1">{formatDate(selectedRequest.preferred_date)}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="textSecondary">Request Date</Typography>
                        <Typography variant="body1">{formatDate(selectedRequest.request_date)}</Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="textSecondary" gutterBottom>Planter Details</Typography>
                      {(() => {
                        const user = getUserDetails(selectedRequest.user_id);
                        return (
                          <>
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="caption" color="textSecondary">Name</Typography>
                              <Typography variant="body1">{user.displayName || user.email || selectedRequest.user_id}</Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="textSecondary">Role</Typography>
                              <Typography variant="body1">{user.role || 'Not specified'}</Typography>
                            </Box>
                          </>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="textSecondary" gutterBottom>Location Details</Typography>
                      {(() => {
                        const location = getLocationDetails(selectedRequest.location_id);
                        return (
                          <>
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="caption" color="textSecondary">Location Name</Typography>
                              <Typography variant="body1">{location.location_name || selectedRequest.location_id}</Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="textSecondary">Type</Typography>
                              <Typography variant="body1">{location.location_type || 'Not specified'}</Typography>
                            </Box>
                          </>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="textSecondary" gutterBottom>Remarks</Typography>
                      <Typography variant="body1">
                        {selectedRequest.request_remarks || 'No remarks provided'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Alert Details Dialog */}
        <Dialog open={alertDialogOpen} onClose={() => setAlertDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ bgcolor: selectedAlert ? theme.palette[getAlertColor(selectedAlert.severity)].main : 'primary.main', color: 'white' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {selectedAlert && getAlertIcon(selectedAlert.severity)}
              Sensor Alert Details
            </Box>
          </DialogTitle>
          <DialogContent>
            {selectedAlert && (
              <Grid container spacing={3} sx={{ mt: 1, p: 1 }}>
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="textSecondary" gutterBottom>Alert Message</Typography>
                      <Typography variant="body1" paragraph>
                        {selectedAlert.message}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <Chip 
                          label={selectedAlert.severity.toUpperCase()} 
                          color={getAlertColor(selectedAlert.severity)} 
                          size="small"
                        />
                        <Chip 
                          label={`Sensor: ${selectedAlert.sensorId}`} 
                          variant="outlined"
                          size="small"
                        />
                        {selectedAlert.parameter && (
                          <Chip 
                            label={`Parameter: ${selectedAlert.parameter}`} 
                            variant="outlined"
                            size="small"
                          />
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="textSecondary" gutterBottom>Timeline</Typography>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="textSecondary">Detected</Typography>
                        <Typography variant="body1">{formatDateTime(selectedAlert.timestamp)}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="textSecondary">Current Status</Typography>
                        <Typography variant="body1">Active</Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="textSecondary" gutterBottom>Alert Details</Typography>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="textSecondary">Type</Typography>
                        <Typography variant="body1">{selectedAlert.type}</Typography>
                      </Box>
                      {selectedAlert.value && (
                        <Box>
                          <Typography variant="caption" color="textSecondary">Value</Typography>
                          <Typography variant="body1">{selectedAlert.value}</Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="textSecondary" gutterBottom>Recommended Action</Typography>
                      <Typography variant="body1">
                        {selectedAlert.severity === 'high' 
                          ? 'Immediate attention required. Please check the sensor and take corrective action.'
                          : selectedAlert.severity === 'medium'
                          ? 'Monitor the situation and plan for maintenance if the issue persists.'
                          : 'No immediate action required. Monitor for changes.'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setAlertDialogOpen(false)}>Close</Button>
            <Button 
              variant="contained" 
              color={getAlertColor(selectedAlert?.severity)}
              onClick={() => {
                // Mark as resolved action
                setAlert({ open: true, message: 'Alert marked as resolved', severity: 'success' });
                setAlertDialogOpen(false);
              }}
            >
              Mark as Resolved
            </Button>
          </DialogActions>
        </Dialog>

        {/* Approval Confirmation Dialog */}
        <Dialog open={approvalDialogOpen} onClose={() => setApprovalDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ bgcolor: 'success.main', color: 'white' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircleIcon /> Approve Request
            </Box>
          </DialogTitle>
          <DialogContent>
            {selectedRequest && (
              <>
                <Typography paragraph sx={{ mt: 2 }}>
                  Approve planting request from <strong>{getUserDetails(selectedRequest.user_id).displayName || selectedRequest.user_id}</strong>?
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Location: {getLocationDetails(selectedRequest.location_id).location_name || selectedRequest.location_id}
                </Typography>
                
                <TextField
                  margin="dense"
                  label="Approval Notes (Optional)"
                  fullWidth
                  variant="outlined"
                  multiline
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Add any notes or comments about this approval..."
                />
                
                <Alert severity="info" sx={{ mt: 2 }}>
                  This will create a planting record in the database and notify the planter.
                </Alert>
              </>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setApprovalDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={confirmApprove} 
              color="success" 
              variant="contained"
              startIcon={<CheckCircleIcon />}
            >
              Approve Request
            </Button>
          </DialogActions>
        </Dialog>

        {/* Rejection Dialog */}
        <Dialog open={rejectionDialogOpen} onClose={() => setRejectionDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ bgcolor: 'error.main', color: 'white' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CancelIcon /> Reject Request
            </Box>
          </DialogTitle>
          <DialogContent>
            {selectedRequest && (
              <>
                <Typography paragraph sx={{ mt: 2 }}>
                  Reject planting request from <strong>{getUserDetails(selectedRequest.user_id).displayName || selectedRequest.user_id}</strong>?
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Please provide a reason for rejection:
                </Typography>
                
                <TextField
                  autoFocus
                  margin="dense"
                  label="Rejection Reason"
                  fullWidth
                  variant="outlined"
                  multiline
                  rows={4}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  required
                  placeholder="Explain why this request is being rejected..."
                />
              </>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setRejectionDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={confirmReject} 
              color="error" 
              variant="contained"
              startIcon={<CancelIcon />}
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