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
  const [plantingTasks, setPlantingTasks] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [seedlings, setSeedlings] = useState([]);
  const [plantingRecords, setPlantingRecords] = useState([]);
  const [filter, setFilter] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
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

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const handleLogout = () => auth.signOut();

  // Helper function to resolve user reference
  const resolveUserRef = async (userRef) => {
    try {
      if (!userRef) return null;
      const userId = userRef.split('/').pop();
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
      const locationId = locationRef.split('/').pop();
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
      const recoId = recoRef.split('/').pop();
      const recoDoc = await getDoc(doc(firestore, 'recommendations', recoId));
      if (recoDoc.exists()) {
        return { id: recoDoc.id, ...recoDoc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error resolving recommendation ref:', error);
      return null;
    }
  };

  // Check if task already has assigned seedling by looking in plantingrecords
  const isTaskAssigned = (taskId, taskLocationRef, taskUserRef) => {
    return plantingRecords.some(record => 
      record.locationRef === taskLocationRef && 
      record.userRef === taskUserRef &&
      record.seedlingRef // Has an assigned seedling
    );
  };

  // Get assigned seedling for a task
  const getAssignedSeedling = (taskLocationRef, taskUserRef) => {
    const record = plantingRecords.find(record => 
      record.locationRef === taskLocationRef && 
      record.userRef === taskUserRef &&
      record.seedlingRef
    );
    return record ? record.seedlingRef : null;
  };

  // Fetch all necessary data
  useEffect(() => {
    setLoading(true);
    
    const fetchData = async () => {
      try {
        console.log('🚀 Starting to fetch planting tasks...');
        
        // Fetch planting tasks
        const tasksQuery = query(collection(firestore, 'plantingtasks'));
        const tasksUnsubscribe = onSnapshot(tasksQuery, async (snapshot) => {
          console.log(`📋 Found ${snapshot.docs.length} planting tasks`);
          
          const tasksData = await Promise.all(
            snapshot.docs.map(async (taskDoc) => {
              const taskData = { id: taskDoc.id, ...taskDoc.data() };
              const resolveRef = async (ref) => {
                if (!ref) return null;
                try {
                  const docSnap = await getDoc(ref);
                  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
                } catch (err) {
                  console.error('Error resolving ref:', err);
                  return null;
                }
              };

              // Resolve references
              const userData = await resolveRef(taskData.userRef);
              const locationData = await resolveRef(taskData.locationRef);
              const recoData = await resolveRef(taskData.recoRef);

              return {
                ...taskData,
                resolvedUser: userData,
                resolvedLocation: locationData,
                resolvedRecommendation: recoData,
                // Convert task_date to proper date format
                task_date: taskData.task_date ? new Date(taskData.task_date) : new Date()
              };
            })
          );
          
          console.log(`✅ Processed ${tasksData.length} tasks with resolved references`);
          setPlantingTasks(tasksData);
          setLoading(false);
        }, (error) => {
          console.error('❌ Error fetching planting tasks:', error);
          setAlert({ 
            open: true, 
            message: 'Error loading planting tasks: ' + error.message, 
            severity: 'error' 
          });
          setLoading(false);
        });

        // Fetch planting records to check assignments
        console.log('📝 Fetching planting records...');
        const recordsQuery = query(collection(firestore, 'plantingrecords'));
        const recordsUnsubscribe = onSnapshot(recordsQuery, (snapshot) => {
          const recordsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          console.log(`📝 Found ${recordsData.length} planting records`);
          setPlantingRecords(recordsData);
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

        // Fetch available seedlings
        console.log('🌱 Fetching seedlings...');
        const seedlingsSnapshot = await getDocs(collection(firestore, 'treeseedlings'));
        const seedlingsData = seedlingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSeedlings(seedlingsData);

        return () => {
          tasksUnsubscribe();
          recordsUnsubscribe();
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

  // Get recommended seedlings for location based on recommendation
  const getRecommendedSeedlings = (task) => {
    if (!task.resolvedRecommendation) return [];
    
    console.log(`🔍 Getting recommendations for task: ${task.id}`);
    
    const reco = task.resolvedRecommendation;
    const recommendedSeedlings = [];
    
    if (reco.seedlingOptions && Array.isArray(reco.seedlingOptions)) {
      reco.seedlingOptions.forEach(seedlingRef => {
        const seedlingId = seedlingRef.split('/').pop();
        const seedlingDetails = seedlings.find(s => s.id === seedlingId);
        
        if (seedlingDetails) {
          recommendedSeedlings.push({
            ...seedlingDetails,
            confidence: parseFloat(reco.reco_confidenceScore) || 0.8,
            recommendationId: reco.id
          });
        }
      });
    }
    
    return recommendedSeedlings.sort((a, b) => b.confidence - a.confidence);
  };

  // Enhanced filtering
  const filteredTasks = plantingTasks.filter(task => {
    const userData = task.resolvedUser || {};
    const planterName = userData.firstName && userData.lastName 
      ? `${userData.firstName} ${userData.lastName}` 
      : userData.email || 'Unknown User';
    const locationData = task.resolvedLocation || {};
    const locationName = locationData.location_name || 'Unknown Location';
    
    const matchesSearch =
      (task.id?.toLowerCase() || "").includes(filter.toLowerCase()) ||
      (planterName?.toLowerCase() || "").includes(filter.toLowerCase()) ||
      (locationName?.toLowerCase() || "").includes(filter.toLowerCase());

    const hasAssignment = isTaskAssigned(task.id, task.locationRef, task.userRef);
    const matchesAssignmentFilter = !showOnlyUnassigned || !hasAssignment;
    
    return matchesSearch && matchesAssignmentFilter;
  });

  // Statistics
  const stats = {
    total: plantingTasks.length,
    unassigned: plantingTasks.filter(task => !isTaskAssigned(task.id, task.locationRef, task.userRef)).length,
    assigned: plantingTasks.filter(task => isTaskAssigned(task.id, task.locationRef, task.userRef)).length,
    urgent: plantingTasks.filter(task => {
      const plantDate = new Date(task.task_date);
      const today = new Date();
      const daysUntil = Math.ceil((plantDate - today) / (1000 * 60 * 60 * 24));
      return daysUntil <= 7;
    }).length
  };

  // Create notification for planter when seedling is assigned
  const createSeedlingAssignmentNotification = async (task, seedlingDetails) => {
    try {
      const notificationData = {
        type: 'seedling_assigned',
        title: 'Seedling Assigned to Your Planting Task',
        message: `Your seedling ${seedlingDetails.seedling_commonName} has been assigned for planting at ${task.resolvedLocation?.location_name}`,
        data: {
          taskId: task.id,
          seedlingId: seedlingDetails.id,
          locationRef: task.locationRef,
          plantingDate: task.task_date
        },
        targetUserId: task.userRef.split('/').pop(),
        read: false,
        resolved: false,
        priority: 'medium',
        createdAt: serverTimestamp()
      };

      await addDoc(collection(firestore, 'notifications'), notificationData);
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  // Handle seedling assignment
  const handleAssignSeedling = (task) => {
    setSelectedTask(task);
    const currentAssignment = getAssignedSeedling(task.locationRef, task.userRef);
    const currentSeedlingId = currentAssignment ? currentAssignment.split('/').pop() : '';
    setSelectedSeedling(currentSeedlingId);
    setAssignDialogOpen(true);
  };
  // Helper: Generate next tsXXX ID for seedlings
  const generateNextSeedlingId = async () => {
    const seedlingsSnapshot = await getDocs(collection(firestore, 'treeseedlings'));
    const existingIds = seedlingsSnapshot.docs.map(doc => doc.id);
    
    let maxNumber = 0;
    existingIds.forEach(id => {
      const match = id.match(/^ts(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) maxNumber = num;
      }
    });

    const nextNumber = maxNumber + 1;
    return `ts${String(nextNumber).padStart(3, '0')}`;
  };

  const handleSaveSeedlingAssignment = async () => {
  try {
    if (!selectedTask || !selectedSeedling) return;

    const recordData = {
      userRef: selectedTask.userRef,
      locationRef: selectedTask.locationRef,
      seedlingRef: doc(firestore, 'treeseedlings', selectedSeedling),
      record_date: selectedTask.task_date,
      assigned_by: user.uid,
      assignment_date: serverTimestamp(),
      created_at: serverTimestamp(),
    };

    // Check if record exists
    const existingRecord = plantingRecords.find(record =>
      record.locationRef.id === selectedTask.locationRef.id &&
      record.userRef.id === selectedTask.userRef.id
    );

    if (existingRecord) {
      await updateDoc(doc(firestore, 'plantingrecords', existingRecord.id), recordData);
    } else {
      await addDoc(collection(firestore, 'plantingrecords'), recordData);
    }

    await updateDoc(doc(firestore, 'plantingtasks', selectedTask.id), {
      task_status: 'assigned_seedling',
      updated_at: serverTimestamp(),
    });

    await createSeedlingAssignmentNotification(selectedTask, seedlings.find(s => s.id === selectedSeedling));

    setAssignDialogOpen(false);
    setSelectedTask(null);
    setSelectedSeedling('');
    setAlert({ open: true, message: 'Seedling assigned successfully!', severity: 'success' });
  } catch (err) {
    console.error(err);
    setAlert({ open: true, message: err.message, severity: 'error' });
  }
};

  const handleViewTask = (task) => {
    setSelectedTask(task);
    setDetailDialogOpen(true);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  };

  const getPriorityLevel = (task) => {
    const plantDate = new Date(task.task_date);
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
          <Typography sx={{ mt: 2 }}>Loading planting tasks...</Typography>
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
                Assign suitable tree seedlings to planting tasks
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

          {/* Stats Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ bgcolor: alpha(theme.palette.primary.main, 0.2), p: 1.5, borderRadius: 2, mr: 2 }}>
                      <TaskIcon color="primary" />
                    </Box>
                    <Box>
                      <Typography variant="h5" fontWeight="bold">{stats.total}</Typography>
                      <Typography variant="body2" color="text.secondary">Total Tasks</Typography>
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
                      <SeedlingIcon color="warning" />
                    </Box>
                    <Box>
                      <Typography variant="h5" fontWeight="bold">{stats.unassigned}</Typography>
                      <Typography variant="body2" color="text.secondary">Need Assignment</Typography>
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
                      <TreeIcon color="success" />
                    </Box>
                    <Box>
                      <Typography variant="h5" fontWeight="bold">{stats.assigned}</Typography>
                      <Typography variant="body2" color="text.secondary">Assigned</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ bgcolor: alpha(theme.palette.error.main, 0.2), p: 1.5, borderRadius: 2, mr: 2 }}>
                      <CalendarIcon color="error" />
                    </Box>
                    <Box>
                      <Typography variant="h5" fontWeight="bold">{stats.urgent}</Typography>
                      <Typography variant="body2" color="text.secondary">Urgent (7 days)</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Filters */}
          <Paper sx={{ mb: 3, p: 2, borderRadius: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Search tasks"
                  variant="outlined"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Search by Task ID, Planter, or Location"
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
                  label="Show only unassigned tasks"
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <Typography variant="body2" color="text.secondary">
                  {filteredTasks.length} result{filteredTasks.length !== 1 ? 's' : ''}
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* Task Cards */}
          <Grid container spacing={3}>
            {filteredTasks.length === 0 ? (
              <Grid item xs={12}>
                <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
                  <TreeIcon sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    No planting tasks found
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {showOnlyUnassigned 
                      ? "All tasks have been assigned seedlings!"
                      : "No planting tasks match your search criteria."}
                  </Typography>
                </Paper>
              </Grid>
            ) : (
              filteredTasks.map((task) => {
                const userData = task.resolvedUser || {};
                const planterName = userData.firstName && userData.lastName 
                  ? `${userData.firstName} ${userData.lastName}` 
                  : userData.email || 'Unknown User';
                const locationData = task.resolvedLocation || {};
                const priority = getPriorityLevel(task);
                const recommendedSeedlings = getRecommendedSeedlings(task);
                const isAssigned = isTaskAssigned(task.id, task.locationRef, task.userRef);
                const assignedSeedlingRef = getAssignedSeedling(task.locationRef, task.userRef);
                const assignedSeedlingId = assignedSeedlingRef ? assignedSeedlingRef.split('/').pop() : null;
                const assignedSeedling = assignedSeedlingId ? seedlings.find(s => s.id === assignedSeedlingId) : null;

                return (
                  <Grid item xs={12} md={6} lg={4} key={task.id}>
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
                            Task {task.id}
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
                            {formatDate(task.task_date)}
                          </Typography>
                        </Box>

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

                        {/* Recommendations Preview */}
                        {recommendedSeedlings.length > 0 && !isAssigned && (
                          <Box sx={{ bgcolor: 'primary.light', p: 2, borderRadius: 1, mb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <RecommendIcon sx={{ mr: 1, color: 'primary.main' }} />
                              <Typography variant="body2" fontWeight="bold" color="primary.main">
                                AI Recommendations Available
                              </Typography>
                            </Box>
                            <Typography variant="caption">
                              {recommendedSeedlings.length} suitable species found
                            </Typography>
                          </Box>
                        )}
                      </CardContent>

                      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                        <Button
                          size="small"
                          startIcon={<ViewIcon />}
                          onClick={() => handleViewTask(task)}
                        >
                          View Details
                        </Button>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={isAssigned ? <TreeIcon /> : <AssignIcon />}
                          onClick={() => handleAssignSeedling(task)}
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

        {/* Enhanced Seedling Assignment Dialog */}
        <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} maxWidth="lg" fullWidth>
          <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TreeIcon /> Assign Tree Seedling
              {selectedTask && (
                <Chip 
                  label={`Task ${selectedTask.id}`} 
                  sx={{ bgcolor: 'white', color: 'primary.main', ml: 1 }} 
                />
              )}
            </Box>
          </DialogTitle>
          <DialogContent>
            {selectedTask && (
              <Box sx={{ mt: 2 }}>
                {/* Task Summary */}
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    <strong>Planter:</strong> {selectedTask.resolvedUser?.firstName} {selectedTask.resolvedUser?.lastName} • 
                    <strong> Location:</strong> {selectedTask.resolvedLocation?.location_name} • 
                    <strong> Date:</strong> {formatDate(selectedTask.task_date)}
                  </Typography>
                </Alert>

                <Grid container spacing={3}>
                  {/* AI Recommendations */}
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                      <RecommendIcon sx={{ mr: 1, color: 'primary.main' }} />
                      AI-Powered Recommendations
                    </Typography>
                    
                    {(() => {
                      const recommendedSeedlings = getRecommendedSeedlings(selectedTask);
                      
                      if (recommendedSeedlings.length === 0) {
                        return (
                          <Alert severity="warning" sx={{ mb: 2 }}>
                            No AI recommendations available for this task. Please select from all available seedlings below.
                          </Alert>
                        );
                      }

                      return (
                        <Box sx={{ mb: 3 }}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Based on environmental analysis and recommendation data:
                          </Typography>
                          <Grid container spacing={2}>
                            {recommendedSeedlings.map((seedling, index) => (
                              <Grid item xs={12} md={6} key={index}>
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
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                      <Box sx={{ flex: 1 }}>
                                        <Typography variant="h6" gutterBottom>
                                          {seedling.seedling_commonName || 'Unknown Species'}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                          {seedling.seedling_scientificName || 'Scientific name not available'}
                                        </Typography>
                                      </Box>
                                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <Typography variant="caption" color="text.secondary">
                                          Confidence
                                        </Typography>
                                        <Rating 
                                          value={seedling.confidence} 
                                          max={1} 
                                          precision={0.1} 
                                          readOnly 
                                          size="small"
                                        />
                                        <Typography variant="caption" color="success.main" fontWeight="bold">
                                          {Math.round(seedling.confidence * 100)}%
                                        </Typography>
                                      </Box>
                                    </Box>

                                    {/* Seedling Preferences */}
                                    <Box sx={{ mb: 2 }}>
                                      <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                                        Preferred Conditions:
                                      </Typography>
                                      <Stack direction="row" spacing={1} flexWrap="wrap">
                                        {seedling.seedling_prefMoisture && (
                                          <Chip 
                                            icon={<WaterIcon />} 
                                            label={`Moisture: ${seedling.seedling_prefMoisture}%`}
                                            size="small" 
                                            variant="outlined"
                                          />
                                        )}
                                        {seedling.seedling_prefTemp && (
                                          <Chip 
                                            icon={<TempIcon />} 
                                            label={`Temp: ${seedling.seedling_prefTemp}°C`}
                                            size="small" 
                                            variant="outlined"
                                          />
                                        )}
                                        {seedling.seedling_prefpH && (
                                          <Chip 
                                            icon={<ScienceIcon />} 
                                            label={`pH: ${seedling.seedling_prefpH}`}
                                            size="small" 
                                            variant="outlined"
                                          />
                                        )}
                                      </Stack>
                                    </Box>

                                    {/* Native Status */}
                                    {seedling.seedling_isNative && (
                                      <Chip 
                                        icon={<EcoIcon />} 
                                        label="Native Species" 
                                        color="success" 
                                        size="small"
                                        variant="outlined"
                                      />
                                    )}
                                  </CardContent>
                                </Card>
                              </Grid>
                            ))}
                          </Grid>
                        </Box>
                      );
                    })()}
                  </Grid>

                  <Divider sx={{ width: '100%', my: 2 }} />

                  {/* All Available Seedlings */}
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      All Available Seedlings
                    </Typography>
                    <FormControl fullWidth size="small">
                      <InputLabel>Select or confirm seedling assignment</InputLabel>
                      <Select
                        value={selectedSeedling}
                        label="Select or confirm seedling assignment"
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

        {/* Task Detail Dialog */}
        <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            Task Details: {selectedTask?.id}
          </DialogTitle>
          <DialogContent>
            {selectedTask && (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Planter Information</Typography>
                  <Box sx={{ mt: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography><strong>Name:</strong> {selectedTask.resolvedUser?.firstName} {selectedTask.resolvedUser?.lastName}</Typography>
                    <Typography><strong>Email:</strong> {selectedTask.resolvedUser?.email}</Typography>
                    <Typography><strong>Phone:</strong> {selectedTask.resolvedUser?.phoneNumber || 'N/A'}</Typography>
                    <Typography><strong>Role:</strong> {selectedTask.resolvedUser?.role || 'Community Member'}</Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Location Information</Typography>
                  <Box sx={{ mt: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography><strong>Name:</strong> {selectedTask.resolvedLocation?.location_name}</Typography>
                    <Typography><strong>Coordinates:</strong> {selectedTask.resolvedLocation?.location_latitude}, {selectedTask.resolvedLocation?.location_longitude}</Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Task Details</Typography>
                  <Box sx={{ mt: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography><strong>Task Date:</strong> {formatDate(selectedTask.task_date)}</Typography>
                    <Typography><strong>Priority:</strong> {getPriorityLevel(selectedTask).label}</Typography>
                    <Typography><strong>Status:</strong> {selectedTask.task_status}</Typography>
                    <Typography><strong>Recommendation ID:</strong> {selectedTask.resolvedRecommendation?.id || 'N/A'}</Typography>
                  </Box>
                </Grid>

                {/* Show assigned seedling if exists */}
                {(() => {
                  const assignedSeedlingRef = getAssignedSeedling(selectedTask.locationRef, selectedTask.userRef);
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
            {selectedTask && (
              <Button 
                variant="contained" 
                onClick={() => {
                  setDetailDialogOpen(false);
                  handleAssignSeedling(selectedTask);
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