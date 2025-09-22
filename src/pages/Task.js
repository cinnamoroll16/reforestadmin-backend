// src/pages/Task.js
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, Dialog, DialogTitle,
  Box, Typography, Paper, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, Card, CardContent, Alert, 
  useMediaQuery, useTheme, TextField, FormControl,
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
  Eco as EcoIcon,
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
  collection, getDocs, doc, updateDoc, addDoc,
  query, where, onSnapshot, orderBy, serverTimestamp
} from 'firebase/firestore';
import { auth, firestore } from "../firebase.js";
import ReForestAppBar from './AppBar.js';
import Navigation from './Navigation.js';

const drawerWidth = 240;

const SeedlingAssignmentPage = () => {
  const [approvedRecords, setApprovedRecords] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [planters, setPlanters] = useState([]);
  const [locations, setLocations] = useState([]);
  const [seedlings, setSeedlings] = useState([]);
  const [filter, setFilter] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
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

  // Fetch all necessary data
  useEffect(() => {
    setLoading(true);
    
    const fetchData = async () => {
      try {
        console.log('🚀 Starting to fetch approved planting requests...');
        
        // First, let's try to fetch all PlantingRequest documents to see what we have
        const allRequestsQuery = query(collection(firestore, 'PlantingRequest'));
        
        const recordsUnsubscribe = onSnapshot(allRequestsQuery, (snapshot) => {
          console.log(`📋 Found ${snapshot.docs.length} total planting requests`);
          
          const allRequests = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          console.log('📋 All requests with statuses:', allRequests.map(r => ({ 
            id: r.id, 
            request_status: r.request_status,
            status: r.status,
            preferred_date: r.preferred_date 
          })));
          
          // Filter for approved requests (handle different possible status field names)
          const approvedRequests = allRequests.filter(request => {
            const status = request.request_status || request.status;
            console.log(`Request ${request.id}: status="${status}"`);
            return status === 'approved';
          });
          
          console.log(`✅ Found ${approvedRequests.length} approved requests`);
          
          // Process the approved requests
          const recordsData = approvedRequests.map(doc => ({
            id: doc.id,
            ...doc,
            record_datePlanted: (() => {
              // Handle different date formats
              const dateField = doc.preferred_date || doc.record_datePlanted;
              if (!dateField) return new Date();
              
              // If it's a Firestore Timestamp
              if (dateField.toDate) return dateField.toDate();
              
              // If it's a string
              if (typeof dateField === 'string') return new Date(dateField);
              
              // If it's already a Date
              if (dateField instanceof Date) return dateField;
              
              // Fallback
              return new Date();
            })()
          }));
          
          console.log(`📊 Processed ${recordsData.length} approved records for display`);
          setApprovedRecords(recordsData);
          setLoading(false);
        }, (error) => {
          console.error('❌ Error fetching planting requests:', error);
          setAlert({ 
            open: true, 
            message: 'Error loading planting requests: ' + error.message, 
            severity: 'error' 
          });
          setLoading(false);
        });

        // Fetch recommendations for seedling matching
        console.log('🌿 Fetching recommendations...');
        const recosSnapshot = await getDocs(collection(firestore, 'Recommendation'));
        const recosData = recosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`🌿 Found ${recosData.length} recommendations`);
        console.log('🌿 Sample recommendation:', recosData[0]);
        setRecommendations(recosData);

        // Fetch users
        console.log('👥 Fetching users...');
        const usersSnapshot = await getDocs(collection(firestore, 'users'));
        const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`👥 Found ${usersData.length} users`);
        setPlanters(usersData);

        // Fetch locations
        console.log('📍 Fetching locations...');
        const locationsSnapshot = await getDocs(collection(firestore, 'Location'));
        const locationsData = locationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`📍 Found ${locationsData.length} locations`);
        setLocations(locationsData);

        // Fetch available seedlings
        console.log('🌱 Fetching seedlings...');
        const seedlingsSnapshot = await getDocs(collection(firestore, 'TreeSeedling'));
        const seedlingsData = seedlingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`🌱 Found ${seedlingsData.length} seedlings`);
        setSeedlings(seedlingsData);

        return () => {
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

  // Helper functions
  const getPlanterDetails = (userId) => {
    return planters.find(planter => planter.id === userId) || {};
  };

  const getLocationDetails = (locationId) => {
    return locations.find(location => location.id === locationId) || {};
  };

  const getSeedlingDetails = (seedlingId) => {
    return seedlings.find(seedling => seedling.id === seedlingId) || {};
  };

  // Get recommended seedlings for location with enhanced scoring based on your Firestore structure
  const getRecommendedSeedlings = (locationId) => {
    console.log(`🔍 Looking for recommendations for location: ${locationId}`);
    
    // Find recommendations that match this location
    const locationRecommendations = recommendations.filter(reco => {
      // Check both location and location_id fields to be flexible
      const recoLocation = reco.location || reco.location_id;
      console.log(`📍 Checking recommendation ${reco.id}: location="${recoLocation}" vs target="${locationId}"`);
      return recoLocation === locationId;
    });
    
    console.log(`🌿 Found ${locationRecommendations.length} recommendations for location ${locationId}`);
    
    if (locationRecommendations.length === 0) return [];
    
    const recommendedSeedlings = [];
    
    locationRecommendations.forEach(reco => {
      console.log(`Processing recommendation ${reco.id} with ${reco.seedlings?.length || 0} seedlings`);
      
      if (reco.seedlings && Array.isArray(reco.seedlings)) {
        reco.seedlings.forEach(seedling => {
          // Find matching seedling details from TreeSeedling collection
          const seedlingDetails = seedlings.find(s => 
            s.id === seedling.seedling_id || 
            s.id === seedling.id ||
            s.seedling_commonName === seedling.commonName ||
            s.seedling_commonName === seedling.seedling_commonName
          );
          
          recommendedSeedlings.push({
            ...seedling,
            ...seedlingDetails,
            // Use your confidence score field name
            confidence: parseFloat(reco.reco_confidenceScore) || parseFloat(seedling.confidenceScore) || parseFloat(seedling.suitabilityScore) || 0,
            recommendationId: reco.id,
            sensorDataId: reco.sensorData_id,
            inventoryId: reco.inventory_id,
            generatedDate: reco.reco_generatedDATE
          });
        });
      }
    });
    
    console.log(`🎯 Final recommended seedlings: ${recommendedSeedlings.length}`);
    
    return recommendedSeedlings
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5); // Show top 5 recommendations
  };

  // Enhanced filtering
  const filteredRecords = approvedRecords.filter(record => {
    const planter = getPlanterDetails(record.user_id);
    const planterName = planter.firstName && planter.lastName 
      ? `${planter.firstName} ${planter.lastName}` 
      : planter.email || record.user_id;
    const location = getLocationDetails(record.location_id);
    const locationName = location.location_name || record.location_id;
    
    const matchesSearch = record.record_id?.toLowerCase().includes(filter.toLowerCase()) ||
                         planterName.toLowerCase().includes(filter.toLowerCase()) ||
                         locationName.toLowerCase().includes(filter.toLowerCase());
    
    const hasNoSeedling = !record.seedling_id || record.seedling_id === '';
    const matchesAssignmentFilter = !showOnlyUnassigned || hasNoSeedling;
    
    return matchesSearch && matchesAssignmentFilter;
  });

  // Statistics
  const stats = {
    total: approvedRecords.length,
    unassigned: approvedRecords.filter(r => !r.seedling_id).length,
    assigned: approvedRecords.filter(r => r.seedling_id).length,
    urgent: approvedRecords.filter(r => {
      const plantDate = new Date(r.preferred_date || r.record_datePlanted);
      const today = new Date();
      const daysUntil = Math.ceil((plantDate - today) / (1000 * 60 * 60 * 24));
      return daysUntil <= 7;
    }).length
  };

  // Create notification for planter when seedling is assigned
  const createSeedlingAssignmentNotification = async (record, seedlingDetails) => {
    try {
      const notificationData = {
        type: 'seedling_assigned',
        title: 'Seedling Assigned to Your Planting Request',
        message: `Your seedling ${seedlingDetails.seedling_commonName} has been assigned for planting at ${getLocationDetails(record.location_id).location_name}`,
        data: {
          recordId: record.id,
          seedlingId: seedlingDetails.id,
          locationId: record.location_id,
          plantingDate: record.record_datePlanted
        },
        targetUserId: record.user_id,
        read: false,
        resolved: false,
        priority: 'medium',
        createdAt: serverTimestamp()
      };

      await addDoc(collection(firestore, 'Notifications'), notificationData);
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  // Handle seedling assignment
  const handleAssignSeedling = (record) => {
    setSelectedRecord(record);
    setSelectedSeedling(record.seedling_id || '');
    setAssignDialogOpen(true);
  };

  const handleSaveSeedlingAssignment = async () => {
    try {
      const seedlingDetails = getSeedlingDetails(selectedSeedling);
      
      const requestRef = doc(firestore, 'PlantingRequest', selectedRecord.id);
      await updateDoc(requestRef, {
        seedling_id: selectedSeedling,
        request_status: 'assigned',
        assigned_by: user.uid,
        assignment_date: serverTimestamp(),
        updated_at: serverTimestamp()
      });

      // Create notification for planter
      await createSeedlingAssignmentNotification(selectedRecord, seedlingDetails);

      setAssignDialogOpen(false);
      setSelectedRecord(null);
      setSelectedSeedling('');
      
      setAlert({ 
        open: true, 
        message: `Seedling "${seedlingDetails.seedling_commonName}" successfully assigned! Notification sent to planter.`, 
        severity: 'success' 
      });
    } catch (error) {
      console.error('Error assigning seedling:', error);
      setAlert({ 
        open: true, 
        message: 'Failed to assign seedling: ' + error.message, 
        severity: 'error' 
      });
    }
  };

  const handleViewRecord = (record) => {
    setSelectedRecord(record);
    setDetailDialogOpen(true);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  };

  const getPriorityLevel = (record) => {
    const plantDate = new Date(record.preferred_date || record.record_datePlanted);
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
          <Typography sx={{ mt: 2 }}>Loading approved planting requests...</Typography>
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
                Assign suitable tree seedlings to approved planting requests
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
                      <Typography variant="body2" color="text.secondary">Approved Requests</Typography>
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
                  label="Search assignments"
                  variant="outlined"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Search by Record ID, Planter, or Location"
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
                  {filteredRecords.length} result{filteredRecords.length !== 1 ? 's' : ''}
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* Assignment Cards */}
          <Grid container spacing={3}>
            {filteredRecords.length === 0 ? (
              <Grid item xs={12}>
                <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
                  <TreeIcon sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    No approved requests found
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {showOnlyUnassigned 
                      ? "All approved requests have been assigned seedlings!"
                      : "No approved planting requests match your search criteria."}
                  </Typography>
                </Paper>
              </Grid>
            ) : (
              filteredRecords.map((record) => {
                const planter = getPlanterDetails(record.user_id);
                const planterName = planter.firstName && planter.lastName 
                  ? `${planter.firstName} ${planter.lastName}` 
                  : planter.email || record.user_id;
                const location = getLocationDetails(record.location_id);
                const seedling = getSeedlingDetails(record.seedling_id);
                const priority = getPriorityLevel(record);
                const recommendedSeedlings = getRecommendedSeedlings(record.location_id);

                return (
                  <Grid item xs={12} md={6} lg={4} key={record.id}>
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
                            {record.record_id}
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
                              {planter.role || 'Community Member'}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Location Info */}
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <LocationIcon sx={{ mr: 1, color: 'action.active' }} />
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {location.location_name || 'Unknown Location'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {location.location_type || 'Planting Site'}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Planting Date */}
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <CalendarIcon sx={{ mr: 1, color: 'action.active' }} />
                          <Typography variant="body2">
                            {formatDate(record.record_datePlanted)}
                          </Typography>
                        </Box>

                        {/* Current Assignment Status */}
                        {record.seedling_id ? (
                          <Box sx={{ bgcolor: 'success.light', p: 2, borderRadius: 1, mb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <TreeIcon sx={{ mr: 1, color: 'success.main' }} />
                              <Typography variant="body2" fontWeight="bold" color="success.main">
                                Assigned Seedling
                              </Typography>
                            </Box>
                            <Typography variant="body2">
                              {seedling.seedling_commonName || seedling.id}
                            </Typography>
                            <Typography variant="caption" color="success.main">
                              {seedling.seedling_scientificName || 'Scientific name not available'}
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
                        {recommendedSeedlings.length > 0 && !record.seedling_id && (
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
                          onClick={() => handleViewRecord(record)}
                        >
                          View Details
                        </Button>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={record.seedling_id ? <TreeIcon /> : <AssignIcon />}
                          onClick={() => handleAssignSeedling(record)}
                          color={record.seedling_id ? "success" : "primary"}
                        >
                          {record.seedling_id ? "Reassign" : "Assign Tree"}
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
              {selectedRecord && (
                <Chip 
                  label={selectedRecord.record_id} 
                  sx={{ bgcolor: 'white', color: 'primary.main', ml: 1 }} 
                />
              )}
            </Box>
          </DialogTitle>
          <DialogContent>
            {selectedRecord && (
              <Box sx={{ mt: 2 }}>
                {/* Request Summary */}
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    <strong>Planter:</strong> {getPlanterDetails(selectedRecord.user_id).firstName} {getPlanterDetails(selectedRecord.user_id).lastName} • 
                    <strong> Location:</strong> {getLocationDetails(selectedRecord.location_id).location_name} • 
                    <strong> Date:</strong> {formatDate(selectedRecord.record_datePlanted)}
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
                      const recommendedSeedlings = getRecommendedSeedlings(selectedRecord.location_id);
                      
                      if (recommendedSeedlings.length === 0) {
                        return (
                          <Alert severity="warning" sx={{ mb: 2 }}>
                            No AI recommendations available for this location. Please select from all available seedlings below.
                          </Alert>
                        );
                      }

                      return (
                        <Box sx={{ mb: 3 }}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Based on environmental analysis and location characteristics:
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
                                          {seedling.seedling_commonName || seedling.commonName || 'Unknown Species'}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                          {seedling.seedling_scientificName || seedling.scientificName || 'Scientific name not available'}
                                        </Typography>
                                      </Box>
                                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <Typography variant="caption" color="text.secondary">
                                          Suitability
                                        </Typography>
                                        <Rating 
                                          value={seedling.confidence || 0} 
                                          max={1} 
                                          precision={0.1} 
                                          readOnly 
                                          size="small"
                                        />
                                        <Typography variant="caption" color="success.main" fontWeight="bold">
                                          {Math.round((seedling.confidence || 0) * 100)}%
                                        </Typography>
                                      </Box>
                                    </Box>

                                    {/* Environmental Factors */}
                                    {seedling.environmentalMatch && (
                                      <Box sx={{ mb: 2 }}>
                                        <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                                          Environmental Match:
                                        </Typography>
                                        <Stack direction="row" spacing={1} flexWrap="wrap">
                                          {seedling.environmentalMatch.soilType && (
                                            <Chip 
                                              icon={<TerrainIcon />} 
                                              label={`Soil: ${seedling.environmentalMatch.soilType}`}
                                              size="small" 
                                              variant="outlined"
                                            />
                                          )}
                                          {seedling.environmentalMatch.waterLevel && (
                                            <Chip 
                                              icon={<WaterIcon />} 
                                              label={`Water: ${seedling.environmentalMatch.waterLevel}`}
                                              size="small" 
                                              variant="outlined"
                                            />
                                          )}
                                          {seedling.environmentalMatch.sunlight && (
                                            <Chip 
                                              icon={<SunIcon />} 
                                              label={`Sun: ${seedling.environmentalMatch.sunlight}`}
                                              size="small" 
                                              variant="outlined"
                                            />
                                          )}
                                        </Stack>
                                      </Box>
                                    )}

                                    {/* Growth Projection */}
                                    {seedling.growthProjection && (
                                      <Accordion>
                                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                          <Typography variant="caption">
                                            Growth Projection & Benefits
                                          </Typography>
                                        </AccordionSummary>
                                        <AccordionDetails>
                                          <Typography variant="body2" color="text.secondary">
                                            <strong>Mature Height:</strong> {seedling.growthProjection.matureHeight || 'Unknown'}<br/>
                                            <strong>Growth Rate:</strong> {seedling.growthProjection.growthRate || 'Unknown'}<br/>
                                            <strong>Carbon Absorption:</strong> {seedling.growthProjection.carbonAbsorption || 'Unknown'}<br/>
                                            <strong>Ecological Benefits:</strong> {seedling.growthProjection.ecologicalBenefits || 'Various environmental benefits'}
                                          </Typography>
                                        </AccordionDetails>
                                      </Accordion>
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
                              <Typography variant="caption" color="primary">
                                Stock: {seedling.stock || 'Unknown'} available
                              </Typography>
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

        {/* Record Detail Dialog */}
        <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            Request Details: {selectedRecord?.record_id}
          </DialogTitle>
          <DialogContent>
            {selectedRecord && (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Planter Information</Typography>
                  <Box sx={{ mt: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    {(() => {
                      const planter = getPlanterDetails(selectedRecord.user_id);
                      return (
                        <>
                          <Typography><strong>Name:</strong> {planter.firstName} {planter.lastName}</Typography>
                          <Typography><strong>Email:</strong> {planter.email}</Typography>
                          <Typography><strong>Phone:</strong> {planter.phoneNumber || 'N/A'}</Typography>
                          <Typography><strong>Role:</strong> {planter.role || 'Community Member'}</Typography>
                        </>
                      );
                    })()}
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Location Information</Typography>
                  <Box sx={{ mt: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    {(() => {
                      const location = getLocationDetails(selectedRecord.location_id);
                      return (
                        <>
                          <Typography><strong>Name:</strong> {location.location_name}</Typography>
                          <Typography><strong>Type:</strong> {location.location_type || 'Planting Site'}</Typography>
                          <Typography><strong>Area:</strong> {location.area || 'Unknown'} hectares</Typography>
                          <Typography><strong>Soil Type:</strong> {location.soilType || 'Unknown'}</Typography>
                        </>
                      );
                    })()}
                  </Box>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Planting Details</Typography>
                  <Box sx={{ mt: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography><strong>Proposed Date:</strong> {formatDate(selectedRecord.record_datePlanted)}</Typography>
                    <Typography><strong>Priority:</strong> {getPriorityLevel(selectedRecord).label}</Typography>
                    <Typography><strong>Status:</strong> {selectedRecord.status}</Typography>
                    {selectedRecord.approved_at && (
                      <Typography><strong>Approved:</strong> {formatDate(selectedRecord.approved_at.toDate())}</Typography>
                    )}
                  </Box>
                </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
            {selectedRecord && (
              <Button 
                variant="contained" 
                onClick={() => {
                  setDetailDialogOpen(false);
                  handleAssignSeedling(selectedRecord);
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