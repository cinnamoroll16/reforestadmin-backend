// src/pages/Task.js
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, Card, CardContent, Alert, 
  useMediaQuery, useTheme, TextField, FormControl,
  InputLabel, Select, MenuItem, LinearProgress, Avatar, alpha,
  Toolbar, IconButton, Tooltip, Divider, List, ListItem,
  ListItemText, ListItemIcon, Badge, Chip, CardActions,
  CardHeader, Accordion, AccordionSummary, AccordionDetails,
  Stack, Rating, Switch, FormControlLabel
} from '@mui/material';
import { useParams } from 'react-router-dom';
import {
  Park as TreeIcon,
  Visibility as ViewIcon,
  CheckCircle as AssignIcon,
  Person as PersonIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  Nature as SeedlingIcon,
  LocalFlorist as EcoIcon,
  Science as ScienceIcon,
  TrendingUp as SuitabilityIcon,
  Assignment as TaskIcon,
  Notifications as NotificationIcon,
  ExpandMore as ExpandMoreIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  AutoAwesome as RecommendIcon,
  Terrain as TerrainIcon,
  WaterDrop as WaterIcon,
  WbSunny as SunIcon,
  Thermostat as TempIcon
} from '@mui/icons-material';
import { 
  collection, getDocs, doc, updateDoc, addDoc, getDoc,
  query, where, onSnapshot, orderBy, serverTimestamp
} from 'firebase/firestore';
import { auth, firestore } from "../firebase.js";
import ReForestAppBar from './AppBar.js';
import Navigation from './Navigation.js';

const drawerWidth = 240;

const SeedlingAssignmentPage = () => {
  const [plantingRequests, setPlantingRequests] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [seedlings, setSeedlings] = useState([]);
  const [plantingRecords, setPlantingRecords] = useState([]);
  const [plantingTasks, setPlantingTasks] = useState([]);
  const [filter, setFilter] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedSeedling, setSelectedSeedling] = useState('');
  const [showOnlyUnassigned, setShowOnlyUnassigned] = useState(true);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const user = auth.currentUser;
  const { id: recoId } = useParams();

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const handleLogout = () => auth.signOut();

  // Helper function to resolve user reference
  const resolveUserRef = async (userRef) => {
    try {
      if (!userRef) return null;
      
      // Handle both DocumentReference objects and path strings
      let userId;
      if (typeof userRef === 'string') {
        userId = userRef.split('/').pop();
      } else if (userRef.path) {
        userId = userRef.path.split('/').pop();
      } else {
        console.error('Invalid userRef format:', userRef);
        return null;
      }
      
      const userDoc = await getDoc(doc(firestore, 'users', userId));
      if (userDoc.exists()) {
        return { id: userDoc.id, ...userDoc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error resolving user ref:', error);
      return null;
    }
  };

  // Helper function to resolve location reference
  const resolveLocationRef = async (locationRef) => {
    try {
      if (!locationRef) return null;
      
      // Handle both DocumentReference objects and path strings
      let locationId;
      if (typeof locationRef === 'string') {
        locationId = locationRef.split('/').pop();
      } else if (locationRef.path) {
        locationId = locationRef.path.split('/').pop();
      } else {
        console.error('Invalid locationRef format:', locationRef);
        return null;
      }
      
      const locationDoc = await getDoc(doc(firestore, 'locations', locationId));
      if (locationDoc.exists()) {
        return { id: locationDoc.id, ...locationDoc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error resolving location ref:', error);
      return null;
    }
  };

  // Helper function to resolve recommendation reference
  const resolveRecoRef = async (recoRef) => {
    try {
      if (!recoRef) return null;
      
      let recoId;
      if (typeof recoRef === 'string') {
        recoId = recoRef.split('/').pop();
      } else if (recoRef.path) {
        recoId = recoRef.path.split('/').pop();
      } else {
        console.error('Invalid recoRef format:', recoRef);
        return null;
      }
      
      const recoDoc = await getDoc(doc(firestore, 'recommendations', recoId));
      if (recoDoc.exists()) {
        return { id: recoDoc.id, ...recoDoc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error resolving reco ref:', error);
      return null;
    }
  };

  // Check if request already has assigned seedling by looking in plantingrecords
  const isRequestAssigned = (requestId, requestLocationRef, requestUserRef) => {
    return plantingRecords.some(record => {
      // Convert references to comparable strings
      const recordLocationStr = typeof record.locationRef === 'string' 
        ? record.locationRef 
        : record.locationRef?.path || '';
      
      const recordUserStr = typeof record.userRef === 'string'
        ? record.userRef
        : record.userRef?.path || '';
      
      const requestLocationStr = typeof requestLocationRef === 'string'
        ? requestLocationRef
        : requestLocationRef?.path || '';
      
      const requestUserStr = typeof requestUserRef === 'string'
        ? requestUserRef
        : requestUserRef?.path || '';
      
      return recordLocationStr === requestLocationStr && 
             recordUserStr === requestUserStr &&
             record.seedlingRef; // Has an assigned seedling
    });
  };

  // Get assigned seedling for a request
  const getAssignedSeedling = (requestLocationRef, requestUserRef) => {
    const record = plantingRecords.find(record => {
      // Convert references to comparable strings
      const recordLocationStr = typeof record.locationRef === 'string' 
        ? record.locationRef 
        : record.locationRef?.path || '';
      
      const recordUserStr = typeof record.userRef === 'string'
        ? record.userRef
        : record.userRef?.path || '';
      
      const requestLocationStr = typeof requestLocationRef === 'string'
        ? requestLocationRef
        : requestLocationRef?.path || '';
      
      const requestUserStr = typeof requestUserRef === 'string'
        ? requestUserRef
        : requestUserRef?.path || '';
      
      return recordLocationStr === requestLocationStr && 
             recordUserStr === requestUserStr &&
             record.seedlingRef;
    });
    
    if (!record) return null;
    
    // Handle both DocumentReference objects and string paths
    if (typeof record.seedlingRef === 'string') {
      return record.seedlingRef;
    } else if (record.seedlingRef?.path) {
      return record.seedlingRef.path;
    } else if (record.seedlingRef?.id) {
      return `/treeseedlings/${record.seedlingRef.id}`;
    }
    
    return null;
  };

  // Fetch specific seedlings by their IDs
  const fetchSpecificSeedlings = async (seedlingIds) => {
    try {
      console.log('🌱 Fetching specific seedlings:', seedlingIds);
      
      const seedlingPromises = seedlingIds.map(async (seedlingId) => {
        try {
          const seedlingDoc = await getDoc(doc(firestore, 'treeseedlings', seedlingId));
          if (seedlingDoc.exists()) {
            return { id: seedlingDoc.id, ...seedlingDoc.data() };
          } else {
            console.warn(`Seedling ${seedlingId} not found`);
            return null;
          }
        } catch (error) {
          console.error(`Error fetching seedling ${seedlingId}:`, error);
          return null;
        }
      });

      const seedlingsData = await Promise.all(seedlingPromises);
      const validSeedlings = seedlingsData.filter(seedling => seedling !== null);
      
      console.log(`✅ Fetched ${validSeedlings.length} specific seedlings`);
      return validSeedlings;
    } catch (error) {
      console.error('Error fetching specific seedlings:', error);
      return [];
    }
  };

  // Fetch all necessary data
  useEffect(() => {
    setLoading(true);
    
    const fetchData = async () => {
      try {
        console.log('🚀 Starting to fetch planting requests...');
        
        // Fetch planting requests
        const requestsQuery = query(collection(firestore, 'plantingrequests'));
        const requestsUnsubscribe = onSnapshot(requestsQuery, async (snapshot) => {
          console.log(`📋 Found ${snapshot.docs.length} planting requests`);
          
          const requestsData = await Promise.all(
            snapshot.docs.map(async (requestDoc) => {
              const requestData = { id: requestDoc.id, ...requestDoc.data() };
              
              console.log('Processing request:', requestData.id, requestData);

              // Resolve references
              const userData = await resolveUserRef(requestData.userRef);
              const locationData = await resolveLocationRef(requestData.locationRef);

              return {
                ...requestData,
                resolvedUser: userData,
                resolvedLocation: locationData,
                task_date: requestData.preferred_date ? new Date(requestData.preferred_date) : new Date(),
                task_status: requestData.request_status || 'pending'
              };
            })
          );
          
          console.log(`✅ Processed ${requestsData.length} requests with resolved references`);
          setPlantingRequests(requestsData);
        }, (error) => {
          console.error('❌ Error fetching planting requests:', error);
          setAlert({ 
            open: true, 
            message: 'Error loading planting requests: ' + error.message, 
            severity: 'error' 
          });
        });

        // Fetch planting records to check assignments
        console.log('📝 Fetching planting records...');
        const recordsQuery = query(collection(firestore, 'plantingrecords'));
        const recordsUnsubscribe = onSnapshot(recordsQuery, (snapshot) => {
          const recordsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          console.log(`📝 Found ${recordsData.length} planting records`);
          setPlantingRecords(recordsData);
        });

        // Fetch planting tasks
        console.log('📋 Fetching planting tasks...');
        const tasksQuery = query(collection(firestore, 'plantingtasks'));
        const tasksUnsubscribe = onSnapshot(tasksQuery, (snapshot) => {
          const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          console.log(`📋 Found ${tasksData.length} planting tasks`);
          setPlantingTasks(tasksData);
        });

        // Fetch recommendations for seedling matching
        console.log('🌿 Fetching recommendations...');
        const recosSnapshot = await getDocs(collection(firestore, 'recommendations'));
        const recosData = recosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRecommendations(recosData);

        // Fetch users
        console.log('👥 Fetching users...');
        const usersSnapshot = await getDocs(collection(firestore, 'users'));
        const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(usersData);

        // Fetch locations
        console.log('📍 Fetching locations...');
        const locationsSnapshot = await getDocs(collection(firestore, 'locations'));
        const locationsData = locationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLocations(locationsData);

        // Fetch ONLY the 3 specific seedlings from seedlingOptions
        console.log('🌱 Fetching specific seedlings from recommendations...');
        const specificSeedlingIds = ['ts001', 'ts002', 'ts003'];
        
        const specificSeedlings = await fetchSpecificSeedlings(specificSeedlingIds);
        setSeedlings(specificSeedlings);

        setLoading(false);

        return () => {
          requestsUnsubscribe();
          recordsUnsubscribe();
          tasksUnsubscribe();
        };

      } catch (error) {
        console.error("❌ Error fetching data:", error);
        setAlert({ 
          open: true, 
          message: 'Error loading data: ' + error.message, 
          severity: 'error' 
        });
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle recoId parameter to auto-open assign dialog
  useEffect(() => {
    if (recoId && plantingRequests.length > 0) {
      const matchedRequest = plantingRequests.find(req => req.id === recoId);
      if (matchedRequest) {
        setSelectedRequest(matchedRequest);
        
        // Preselect assigned seedling if already exists
        const assignedSeedlingRef = getAssignedSeedling(matchedRequest.locationRef, matchedRequest.userRef);
        const assignedSeedlingId = assignedSeedlingRef ? assignedSeedlingRef.split('/').pop() : '';
        setSelectedSeedling(assignedSeedlingId);

        // Open assign dialog automatically
        setAssignDialogOpen(true);
      }
    }
  }, [recoId, plantingRequests]);

  // Get recommended seedlings for location based on recommendation data
  const getRecommendedSeedlings = (request) => {
    console.log(`🔍 Getting recommendations for request: ${request.id}`);
    
    // Find if there's a recommendation for this request
    const recommendation = recommendations.find(reco => 
      reco.locationRef === request.locationRef
    );
    
    if (!recommendation || !recommendation.seedlingOptions) {
      return [];
    }
    
    // Extract seedling IDs from the recommendation's seedlingOptions
    const recommendedSeedlingIds = recommendation.seedlingOptions.map(option => 
      option.split('/').pop()
    );
    
    // Filter seedlings to only show the recommended ones
    const recommendedSeedlings = seedlings.filter(seedling =>
      recommendedSeedlingIds.includes(seedling.id)
    );
    
    console.log(`✅ Found ${recommendedSeedlings.length} recommended seedlings`);
    return recommendedSeedlings;
  };

  // Enhanced filtering for planting requests
  const filteredRequests = plantingRequests.filter(request => {
    const userData = request.resolvedUser || {};
    const planterName = userData.firstName && userData.lastName 
      ? `${userData.firstName} ${userData.lastName}` 
      : userData.email || 'Unknown User';
    const locationData = request.resolvedLocation || {};
    const locationName = locationData.location_name || 'Unknown Location';
    
    const matchesSearch =
      (request.id?.toLowerCase() || "").includes(filter.toLowerCase()) ||
      (planterName?.toLowerCase() || "").includes(filter.toLowerCase()) ||
      (locationName?.toLowerCase() || "").includes(filter.toLowerCase()) ||
      (request.request_notes?.toLowerCase() || "").includes(filter.toLowerCase());

    const hasAssignment = isRequestAssigned(request.id, request.locationRef, request.userRef);
    const matchesAssignmentFilter = !showOnlyUnassigned || !hasAssignment;
    
    return matchesSearch && matchesAssignmentFilter;
  });

  // Statistics for planting requests
  const stats = {
    total: plantingRequests.length,
    unassigned: plantingRequests.filter(request => !isRequestAssigned(request.id, request.locationRef, request.userRef)).length,
    assigned: plantingRequests.filter(request => isRequestAssigned(request.id, request.locationRef, request.userRef)).length,
    urgent: plantingRequests.filter(request => {
      const plantDate = new Date(request.preferred_date || request.request_date);
      const today = new Date();
      const daysUntil = Math.ceil((plantDate - today) / (1000 * 60 * 60 * 24));
      return daysUntil <= 7;
    }).length
  };

  // Create notification for planter when seedling is assigned
  const createSeedlingAssignmentNotification = async (request, seedlingDetails) => {
    try {
      const notificationData = {
        userRef: request.userRef,
        notif_message: `Your seedling ${seedlingDetails.seedling_commonName} has been assigned for planting at ${request.resolvedLocation?.location_name}`,
        notif_timestamp: serverTimestamp(),
        notification_type: 'seedling_assigned',
        read: false
      };

      await addDoc(collection(firestore, 'notifications'), notificationData);
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  // Handle seedling assignment
  const handleAssignSeedling = (request) => {
    setSelectedRequest(request);
    const currentAssignment = getAssignedSeedling(request.locationRef, request.userRef);
    const currentSeedlingId = currentAssignment ? currentAssignment.split('/').pop() : '';
    setSelectedSeedling(currentSeedlingId);
    setAssignDialogOpen(true);
  };

  const handleSaveSeedlingAssignment = async () => {
    try {
      if (!selectedRequest || !selectedSeedling) return;

      // 1. Create planting record
      const recordData = {
        userRef: selectedRequest.userRef,
        locationRef: selectedRequest.locationRef,
        seedlingRef: doc(firestore, 'treeseedlings', selectedSeedling),
        record_date: selectedRequest.preferred_date || selectedRequest.request_date
      };

      // Check if planting record exists
      const existingRecord = plantingRecords.find(record => {
        const recordLocationStr = typeof record.locationRef === 'string' 
          ? record.locationRef 
          : record.locationRef?.path || '';
        
        const recordUserStr = typeof record.userRef === 'string'
          ? record.userRef
          : record.userRef?.path || '';
        
        const requestLocationStr = typeof selectedRequest.locationRef === 'string'
          ? selectedRequest.locationRef
          : selectedRequest.locationRef?.path || '';
        
        const requestUserStr = typeof selectedRequest.userRef === 'string'
          ? selectedRequest.userRef
          : selectedRequest.userRef?.path || '';
        
        return recordLocationStr === requestLocationStr && 
               recordUserStr === requestUserStr;
      });

      if (existingRecord) {
        await updateDoc(doc(firestore, 'plantingrecords', existingRecord.id), recordData);
      } else {
        await addDoc(collection(firestore, 'plantingrecords'), recordData);
      }

      // 2. Create or update planting task
      const taskData = {
        userRef: selectedRequest.userRef,
        locationRef: selectedRequest.locationRef,
        seedlingRef: doc(firestore, 'treeseedlings', selectedSeedling),
        task_status: 'assigned',
        task_date: selectedRequest.preferred_date || selectedRequest.request_date
      };

      // Find if there's a recommendation for this request to link to planting task
      const relatedRecommendation = recommendations.find(reco => 
        reco.locationRef === selectedRequest.locationRef
      );

      if (relatedRecommendation) {
        taskData.recoRef = doc(firestore, 'recommendations', relatedRecommendation.id);
      }

      // Check if planting task exists
      const existingTask = plantingTasks.find(task => {
        const taskLocationStr = typeof task.locationRef === 'string' 
          ? task.locationRef 
          : task.locationRef?.path || '';
        
        const taskUserStr = typeof task.userRef === 'string'
          ? task.userRef
          : task.userRef?.path || '';
        
        const requestLocationStr = typeof selectedRequest.locationRef === 'string'
          ? selectedRequest.locationRef
          : selectedRequest.locationRef?.path || '';
        
        const requestUserStr = typeof selectedRequest.userRef === 'string'
          ? selectedRequest.userRef
          : selectedRequest.userRef?.path || '';
        
        return taskLocationStr === requestLocationStr && 
               taskUserStr === requestUserStr;
      });

      if (existingTask) {
        await updateDoc(doc(firestore, 'plantingtasks', existingTask.id), taskData);
      } else {
        await addDoc(collection(firestore, 'plantingtasks'), taskData);
      }

      // 3. Update the planting request status
      await updateDoc(doc(firestore, 'plantingrequests', selectedRequest.id), {
        request_status: 'assigned_seedling'
      });

      // 4. Create notification
      await createSeedlingAssignmentNotification(selectedRequest, seedlings.find(s => s.id === selectedSeedling));

      setAssignDialogOpen(false);
      setSelectedRequest(null);
      setSelectedSeedling('');
      setAlert({ open: true, message: 'Seedling assigned successfully!', severity: 'success' });
    } catch (err) {
      console.error(err);
      setAlert({ open: true, message: err.message, severity: 'error' });
    }
  };

  const handleViewRequest = (request) => {
    setSelectedRequest(request);
    setDetailDialogOpen(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    };
    return new Date(dateString).toLocaleString('en-US', options);
  };

  const getPriorityLevel = (request) => {
    const plantDate = new Date(request.preferred_date || request.request_date);
    const today = new Date();
    const daysUntil = Math.ceil((plantDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntil < 0) return { level: 'overdue', color: 'error', label: 'Overdue', days: Math.abs(daysUntil) };
    if (daysUntil <= 7) return { level: 'urgent', color: 'error', label: 'Urgent', days: daysUntil };
    if (daysUntil <= 14) return { level: 'medium', color: 'warning', label: 'Soon', days: daysUntil };
    return { level: 'normal', color: 'info', label: 'Normal', days: daysUntil };
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', bgcolor: '#f8fafc', minHeight: '100vh' }}>
        <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={user} onLogout={handleLogout} />
        <Navigation mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} isMobile={isMobile} />
        <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - ${drawerWidth}px)` } }}>
          <Toolbar />
          <LinearProgress />
          <Typography sx={{ mt: 2 }}>Loading planting requests...</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', bgcolor: '#f8fafc', minHeight: '100vh' }}>
      <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={user} onLogout={handleLogout} />
      <Navigation mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} isMobile={isMobile} />

      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - ${drawerWidth}px)` } }}>
        <Toolbar />

        {/* Alert */}
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
                Tree Seedling Assignment
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Assign suitable tree seedlings to planting requests
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip 
                icon={<TaskIcon />} 
                label={`${stats.unassigned} Pending Assignment`} 
                color="warning" 
                variant="outlined"
              />
              {stats.urgent > 0 && (
                <Chip 
                  icon={<CalendarIcon />} 
                  label={`${stats.urgent} Urgent`} 
                  color="error"
                />
              )}
            </Box>
          </Box>
            
          {/* Filters */}
          <Paper sx={{ mb: 3, p: 2, borderRadius: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Search requests"
                  variant="outlined"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Search by Request ID, Planter, Location, or Notes"
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={showOnlyUnassigned}
                      onChange={(e) => setShowOnlyUnassigned(e.target.checked)}
                    />
                  }
                  label="Show only unassigned requests"
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <Typography variant="body2" color="text.secondary">
                  {filteredRequests.length} result{filteredRequests.length !== 1 ? 's' : ''}
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* Request Cards */}
          <Grid container spacing={3}>
            {filteredRequests.length === 0 ? (
              <Grid item xs={12}>
                <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
                  <TreeIcon sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    No planting requests found
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {showOnlyUnassigned 
                      ? "All requests have been assigned seedlings!"
                      : "No planting requests match your search criteria."}
                  </Typography>
                </Paper>
              </Grid>
            ) : (
              filteredRequests.map((request) => {
                const userData = request.resolvedUser || {};
                const planterName = userData.firstName && userData.lastName 
                  ? `${userData.firstName} ${userData.lastName}` 
                  : userData.email || 'Unknown User';
                const locationData = request.resolvedLocation || {};
                const priority = getPriorityLevel(request);
                const recommendedSeedlings = getRecommendedSeedlings(request);
                const isAssigned = isRequestAssigned(request.id, request.locationRef, request.userRef);
                const assignedSeedlingRef = getAssignedSeedling(request.locationRef, request.userRef);
                const assignedSeedlingId = assignedSeedlingRef ? assignedSeedlingRef.split('/').pop() : null;
                const assignedSeedling = assignedSeedlingId ? seedlings.find(s => s.id === assignedSeedlingId) : null;

                return (
                  <Grid item xs={12} md={6} lg={4} key={request.id}>
                    <Card sx={{ 
                      borderRadius: 2, 
                      height: '100%',
                      borderLeft: `4px solid ${theme.palette[priority.color].main}`,
                      transition: 'all 0.2s',
                      '&:hover': { 
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
                      }
                    }}>
                      <CardHeader
                        avatar={
                          <Avatar sx={{ bgcolor: theme.palette[priority.color].main }}>
                            {priority.level === 'overdue' ? '!' : priority.days}
                          </Avatar>
                        }
                        action={
                          <Chip 
                            label={priority.label} 
                            color={priority.color} 
                            size="small"
                            variant="outlined"
                          />
                        }
                        title={
                          <Typography variant="h6" noWrap>
                            Request {request.id}
                          </Typography>
                        }
                        subheader={
                          <Typography variant="body2" color="text.secondary">
                            {priority.level === 'overdue' 
                              ? `Overdue by ${priority.days} days`
                              : `${priority.days} days until planting`
                            }
                          </Typography>
                        }
                      />
                      
                      <CardContent sx={{ pt: 0 }}>
                        {/* Planter Info */}
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <PersonIcon sx={{ mr: 1, color: 'action.active' }} />
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {planterName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {userData.role || 'Community Member'}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Location Info */}
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <LocationIcon sx={{ mr: 1, color: 'action.active' }} />
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {locationData.location_name || 'Unknown Location'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {locationData.location_type || 'Planting Site'}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Planting Date */}
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <CalendarIcon sx={{ mr: 1, color: 'action.active' }} />
                          <Typography variant="body2">
                            {formatDate(request.preferred_date)}
                          </Typography>
                        </Box>

                        {/* Request Notes */}
                        {request.request_notes && (
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Notes:
                            </Typography>
                            <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                              {request.request_notes}
                            </Typography>
                          </Box>
                        )}

                        {/* Current Assignment Status */}
                        {isAssigned && assignedSeedling ? (
                          <Box sx={{ bgcolor: 'success.light', p: 2, borderRadius: 1, mb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <TreeIcon sx={{ mr: 1, color: 'success.main' }} />
                              <Typography variant="body2" fontWeight="bold" color="success.main">
                                Assigned Seedling
                              </Typography>
                            </Box>
                            <Typography variant="body2">
                              {assignedSeedling.seedling_commonName || assignedSeedling.id}
                            </Typography>
                            <Typography variant="caption" color="success.main">
                              {assignedSeedling.seedling_scientificName || 'Scientific name not available'}
                            </Typography>
                          </Box>
                        ) : (
                          <Alert severity="warning" sx={{ mb: 2 }}>
                            <Typography variant="body2">
                              No seedling assigned yet
                            </Typography>
                          </Alert>
                        )}

                        {/* Show recommended seedlings if available */}
                        {recommendedSeedlings.length > 0 && !isAssigned && (
                          <Box sx={{ bgcolor: 'info.light', p: 1.5, borderRadius: 1, mb: 2 }}>
                            <Typography variant="caption" fontWeight="bold" display="block" color="info.main">
                              AI Recommended Species:
                            </Typography>
                            <Typography variant="caption" display="block">
                              {recommendedSeedlings.map(s => s.seedling_commonName).join(', ')}
                            </Typography>
                          </Box>
                        )}

                        {/* Request Status */}
                        <Chip 
                          label={request.request_status || 'pending'} 
                          color={
                            request.request_status === 'assigned_seedling' ? 'success' :
                            request.request_status === 'pending' ? 'warning' : 'default'
                          }
                          size="small"
                          variant="outlined"
                        />
                      </CardContent>

                      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                        <Button
                          size="small"
                          startIcon={<ViewIcon />}
                          onClick={() => handleViewRequest(request)}
                        >
                          View Details
                        </Button>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={isAssigned ? <TreeIcon /> : <AssignIcon />}
                          onClick={() => handleAssignSeedling(request)}
                          color={isAssigned ? "success" : "primary"}
                        >
                          {isAssigned ? "Reassign" : "Assign Tree"}
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                );
              })
            )}
          </Grid>
        </Box>

        <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} maxWidth="lg" fullWidth>
          <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TreeIcon /> Assign Tree Seedling
              {selectedRequest && (
                <Chip 
                  label={`Request ${selectedRequest.id}`} 
                  sx={{ bgcolor: 'white', color: 'primary.main', ml: 1 }} 
                />
              )}
            </Box>
          </DialogTitle>
          <DialogContent>
            {selectedRequest && (
              <Box sx={{ mt: 2 }}>
                {/* Request Summary */}
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    <strong>Planter:</strong> {selectedRequest.resolvedUser?.firstName} {selectedRequest.resolvedUser?.lastName} • 
                    <strong> Location:</strong> {selectedRequest.resolvedLocation?.location_name} • 
                    <strong> Preferred Date:</strong> {formatDate(selectedRequest.preferred_date)}
                  </Typography>
                  {selectedRequest.request_notes && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      <strong>Notes:</strong> {selectedRequest.request_notes}
                    </Typography>
                  )}
                </Alert>

                <Grid container spacing={3}>
                  {/* Show recommended seedlings if available */}
                  {(() => {
                    const recommendedSeedlings = getRecommendedSeedlings(selectedRequest);
                    if (recommendedSeedlings.length > 0) {
                      return (
                        <Grid item xs={12}>
                          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                            <RecommendIcon sx={{ mr: 1, color: 'primary.main' }} />
                            AI Recommended Seedlings
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Based on environmental analysis of this location
                          </Typography>
                          <Grid container spacing={2}>
                            {recommendedSeedlings.map((seedling) => (
                              <Grid item xs={12} md={4} key={seedling.id}>
                                <Card 
                                  variant={selectedSeedling === seedling.id ? "elevation" : "outlined"}
                                  sx={{ 
                                    cursor: 'pointer',
                                    border: selectedSeedling === seedling.id ? 2 : 1,
                                    borderColor: selectedSeedling === seedling.id ? 'primary.main' : 'divider',
                                    '&:hover': { borderColor: 'primary.main' }
                                  }}
                                  onClick={() => setSelectedSeedling(seedling.id)}
                                >
                                  <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                      {seedling.seedling_commonName || seedling.id}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                      {seedling.seedling_scientificName || 'Scientific name not available'}
                                    </Typography>
                                    {seedling.seedling_isNative && (
                                      <Chip 
                                        icon={<EcoIcon />} 
                                        label="Native Species" 
                                        color="success" 
                                        size="small"
                                        variant="outlined"
                                        sx={{ mt: 1 }}
                                      />
                                    )}
                                  </CardContent>
                                </Card>
                              </Grid>
                            ))}
                          </Grid>
                          <Divider sx={{ my: 3 }} />
                        </Grid>
                      );
                    }
                    return null;
                  })()}

                  {/* All Available Seedlings (only the 3 specific ones) */}
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      Available Seedlings
                    </Typography>
                    <FormControl fullWidth size="small">
                      <InputLabel>Select seedling to assign</InputLabel>
                      <Select
                        value={selectedSeedling}
                        label="Select seedling to assign"
                        onChange={(e) => setSelectedSeedling(e.target.value)}
                      >
                        <MenuItem value="">
                          <em>Choose a seedling...</em>
                        </MenuItem>
                        {seedlings.map((seedling) => (
                          <MenuItem key={seedling.id} value={seedling.id}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', py: 1 }}>
                              <Typography variant="body2" fontWeight="medium">
                                {seedling.seedling_commonName || seedling.id}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {seedling.seedling_scientificName || 'Scientific name not available'}
                              </Typography>
                              {seedling.seedling_isNative && (
                                <Typography variant="caption" color="success.main">
                                  Native Species
                                </Typography>
                              )}
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="contained" 
              color="success"
              startIcon={<AssignIcon />}
              onClick={handleSaveSeedlingAssignment}
              disabled={!selectedSeedling}
            >
              Assign Seedling & Notify Planter
            </Button>
          </DialogActions>
        </Dialog>

        {/* Request Detail Dialog */}
        <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            Request Details: {selectedRequest?.id}
          </DialogTitle>
          <DialogContent>
            {selectedRequest && (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Planter Information</Typography>
                  <Box sx={{ mt: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography><strong>Name:</strong> {selectedRequest.resolvedUser?.firstName} {selectedRequest.resolvedUser?.lastName}</Typography>
                    <Typography><strong>Email:</strong> {selectedRequest.resolvedUser?.email}</Typography>
                    <Typography><strong>Phone:</strong> {selectedRequest.resolvedUser?.phoneNumber || 'N/A'}</Typography>
                    <Typography><strong>Role:</strong> {selectedRequest.resolvedUser?.role || 'Community Member'}</Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Location Information</Typography>
                  <Box sx={{ mt: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography><strong>Name:</strong> {selectedRequest.resolvedLocation?.location_name}</Typography>
                    <Typography><strong>Coordinates:</strong> {selectedRequest.resolvedLocation?.location_latitude}, {selectedRequest.resolvedLocation?.location_longitude}</Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Request Details</Typography>
                  <Box sx={{ mt: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography><strong>Preferred Date:</strong> {formatDate(selectedRequest.preferred_date)}</Typography>
                    <Typography><strong>Request Date:</strong> {formatDate(selectedRequest.request_date)}</Typography>
                    <Typography><strong>Priority:</strong> {getPriorityLevel(selectedRequest).label}</Typography>
                    <Typography><strong>Status:</strong> {selectedRequest.request_status}</Typography>
                    <Typography><strong>Notes:</strong> {selectedRequest.request_notes || 'N/A'}</Typography>
                  </Box>
                </Grid>

                {/* Show assigned seedling if exists */}
                {(() => {
                  const assignedSeedlingRef = getAssignedSeedling(selectedRequest.locationRef, selectedRequest.userRef);
                  if (assignedSeedlingRef) {
                    const seedlingId = assignedSeedlingRef.split('/').pop();
                    const seedling = seedlings.find(s => s.id === seedlingId);
                    return (
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" color="text.secondary">Assigned Seedling</Typography>
                        <Box sx={{ mt: 1, p: 2, bgcolor: '#e8f5e8', borderRadius: 1 }}>
                          <Typography><strong>Species:</strong> {seedling?.seedling_commonName || 'Unknown'}</Typography>
                          <Typography><strong>Scientific Name:</strong> {seedling?.seedling_scientificName || 'N/A'}</Typography>
                          <Typography><strong>Native:</strong> {seedling?.seedling_isNative ? 'Yes' : 'No'}</Typography>
                        </Box>
                      </Grid>
                    );
                  }
                  return null;
                })()}
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
            {selectedRequest && (
              <Button 
                variant="contained" 
                onClick={() => {
                  setDetailDialogOpen(false);
                  handleAssignSeedling(selectedRequest);
                }}
              >
                Assign Seedling
              </Button>
            )}
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default SeedlingAssignmentPage;