// src/pages/Task.js
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, Alert, 
  useMediaQuery, useTheme, TextField, FormControl,
  InputLabel, Select, MenuItem, LinearProgress, Avatar,
  Toolbar, Chip, Card, CardContent, Stack, 
  Switch, FormControlLabel, Divider, IconButton
} from '@mui/material';
import { useParams } from 'react-router-dom';
import {
  Park as TreeIcon,
  CheckCircle as AssignIcon,
  Person as PersonIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  LocalFlorist as EcoIcon,
  Assignment as TaskIcon,
  Search as SearchIcon,
  AutoAwesome as RecommendIcon,
  Close as CloseIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { 
  collection, getDocs, doc, updateDoc, addDoc, getDoc,
  query, onSnapshot, where, serverTimestamp
} from 'firebase/firestore';
import { auth, firestore } from "../firebase.js";
import ReForestAppBar from './AppBar.js';
import Navigation from './Navigation.js';

const drawerWidth = 240;

const SeedlingAssignmentPage = () => {
  const [plantingRequests, setPlantingRequests] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [seedlings, setSeedlings] = useState([]);
  const [plantingRecords, setPlantingRecords] = useState([]);
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

  // Convert Firestore Timestamp to Date
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

  // Check if request already has assigned seedling
  const isRequestAssigned = (requestId) => {
    return plantingRecords.some(record => 
      record.requestId === requestId && record.seedlingRef
    );
  };

  // Get assigned seedling for a request
  const getAssignedSeedling = (requestId) => {
    const record = plantingRecords.find(record => 
      record.requestId === requestId && record.seedlingRef
    );
    
    if (!record) return null;
    
    // Handle seedlingRef - could be string ID or path
    if (typeof record.seedlingRef === 'string') {
      return record.seedlingRef.includes('/') 
        ? record.seedlingRef.split('/').pop() 
        : record.seedlingRef;
    } else if (record.seedlingRef?.path) {
      return record.seedlingRef.path.split('/').pop();
    } else if (record.seedlingRef?.id) {
      return record.seedlingRef.id;
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
          }
          return null;
        } catch (error) {
          console.error(`Error fetching seedling ${seedlingId}:`, error);
          return null;
        }
      });

      const seedlingsData = await Promise.all(seedlingPromises);
      return seedlingsData.filter(seedling => seedling !== null);
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
          
          const requestsData = snapshot.docs.map(requestDoc => {
            const data = requestDoc.data();
            
            return {
              id: requestDoc.id,
              ...data,
              // Convert timestamps
              request_date: convertTimestamp(data.request_date),
              approvedAt: convertTimestamp(data.approvedAt),
              // Use preferred_date as string if it exists, otherwise convert request_date
              preferred_date: data.preferred_date || convertTimestamp(data.request_date),
              // Extract simple fields
              planterName: data.fullName || 'Unknown User',
              planterEmail: data.createdBy || 'N/A',
              locationName: data.locationRef || 'Unknown Location',
              status: data.requestStatus || data.request_status || 'pending'
            };
          });
          
          console.log(`✅ Processed ${requestsData.length} requests`);
          setPlantingRequests(requestsData);
        });

        // Fetch planting records
        const recordsQuery = query(collection(firestore, 'plantingrecords'));
        const recordsUnsubscribe = onSnapshot(recordsQuery, (snapshot) => {
          const recordsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          console.log(`📝 Found ${recordsData.length} planting records`);
          setPlantingRecords(recordsData);
        });

        // Fetch recommendations
        const recosSnapshot = await getDocs(collection(firestore, 'recommendations'));
        const recosData = recosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRecommendations(recosData);

        // Fetch specific seedlings
        const specificSeedlingIds = ['ts001', 'ts002', 'ts003'];
        const specificSeedlings = await fetchSpecificSeedlings(specificSeedlingIds);
        setSeedlings(specificSeedlings);

        setLoading(false);

        return () => {
          requestsUnsubscribe();
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

  // Auto-open assign dialog if recoId exists
  useEffect(() => {
    if (recoId && plantingRequests.length > 0) {
      const matchedRequest = plantingRequests.find(req => req.id === recoId);
      if (matchedRequest) {
        setSelectedRequest(matchedRequest);
        const assignedSeedlingId = getAssignedSeedling(matchedRequest.id);
        setSelectedSeedling(assignedSeedlingId || '');
        setAssignDialogOpen(true);
      }
    }
  }, [recoId, plantingRequests]);

  // Get recommended seedlings for location
  const getRecommendedSeedlings = (request) => {
    const recommendation = recommendations.find(reco => 
      reco.locationRef === request.locationRef
    );
    
    if (!recommendation || !recommendation.seedlingOptions) {
      return [];
    }
    
    const recommendedSeedlingIds = recommendation.seedlingOptions.map(option => 
      option.split('/').pop()
    );
    
    return seedlings.filter(seedling =>
      recommendedSeedlingIds.includes(seedling.id)
    );
  };

  // Filter planting requests
  const filteredRequests = plantingRequests.filter(request => {
    const matchesSearch =
      (request.id?.toLowerCase() || "").includes(filter.toLowerCase()) ||
      (request.planterName?.toLowerCase() || "").includes(filter.toLowerCase()) ||
      (request.locationName?.toLowerCase() || "").includes(filter.toLowerCase()) ||
      (request.approvalNotes?.toLowerCase() || "").includes(filter.toLowerCase());

    const hasAssignment = isRequestAssigned(request.id);
    const matchesAssignmentFilter = !showOnlyUnassigned || !hasAssignment;
    
    return matchesSearch && matchesAssignmentFilter;
  });

  // Statistics
  const stats = {
    total: plantingRequests.length,
    unassigned: plantingRequests.filter(request => !isRequestAssigned(request.id)).length,
    assigned: plantingRequests.filter(request => isRequestAssigned(request.id)).length,
    urgent: plantingRequests.filter(request => {
      const plantDate = new Date(request.preferred_date);
      const today = new Date();
      const daysUntil = Math.ceil((plantDate - today) / (1000 * 60 * 60 * 24));
      return daysUntil <= 7;
    }).length
  };

  // Create notification
  const createSeedlingAssignmentNotification = async (request, seedlingDetails) => {
    try {
      await addDoc(collection(firestore, 'notifications'), {
        type: 'seedling_assigned',
        notification_type: 'pending',
        title: 'Tree Seedling Assigned',
        notif_message: `Your seedling ${seedlingDetails.seedling_commonName} has been assigned for planting at ${request.locationName}`,
        data: {
          requestId: request.id,
          seedlingId: seedlingDetails.id,
          locationName: request.locationName
        },
        targetUser: request.userRef,
        targetRole: 'planter',
        read: false,
        resolved: false,
        hidden: false,
        priority: 'high',
        notif_timestamp: serverTimestamp(),
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  // Handle seedling assignment
  const handleAssignSeedling = (request) => {
    setSelectedRequest(request);
    const currentSeedlingId = getAssignedSeedling(request.id);
    setSelectedSeedling(currentSeedlingId || '');
    setAssignDialogOpen(true);
  };

  // Update the handleSaveSeedlingAssignment function
  const handleSaveSeedlingAssignment = async () => {
    try {
      if (!selectedRequest || !selectedSeedling) return;

      // Find the recommendation for this location
      const matchingRecommendation = recommendations.find(reco => 
        reco.locationRef === selectedRequest.locationRef
      );

      if (!matchingRecommendation) {
        setAlert({ 
          open: true, 
          message: 'No recommendation found for this location', 
          severity: 'warning' 
        });
        return;
      }

      // 1. Create/update planting record
      const existingRecord = plantingRecords.find(record => 
        record.requestId === selectedRequest.id
      );

      const recordData = {
        requestId: selectedRequest.id,
        userRef: selectedRequest.userRef,
        locationRef: selectedRequest.locationRef,
        seedlingRef: selectedSeedling,
        record_date: selectedRequest.preferred_date,
        createdAt: serverTimestamp()
      };

      if (existingRecord) {
        await updateDoc(doc(firestore, 'plantingrecords', existingRecord.id), recordData);
      } else {
        await addDoc(collection(firestore, 'plantingrecords'), recordData);
      }

      // 2. Create/update planting task WITH recoRef as path
      const taskData = {
        userRef: selectedRequest.userRef,
        locationRef: selectedRequest.locationRef,
        seedlingRef: selectedSeedling,
        recoRef: `recommendations/${matchingRecommendation.id}`, // Save as path format
        task_status: 'assigned',
        task_date: selectedRequest.preferred_date,
        createdAt: serverTimestamp()
      };

      // Check if task already exists for this request
      const existingTaskQuery = query(
        collection(firestore, 'plantingtasks'),
        where('userRef', '==', selectedRequest.userRef),
        where('locationRef', '==', selectedRequest.locationRef)
      );
      
      const existingTaskSnapshot = await getDocs(existingTaskQuery);
      
      if (!existingTaskSnapshot.empty) {
        // Update existing task
        const taskDoc = existingTaskSnapshot.docs[0];
        await updateDoc(doc(firestore, 'plantingtasks', taskDoc.id), taskData);
        console.log(`✅ Updated planting task with recoRef: recommendations/${matchingRecommendation.id}`);
      } else {
        // Create new task
        await addDoc(collection(firestore, 'plantingtasks'), taskData);
        console.log(`✅ Created planting task with recoRef: recommendations/${matchingRecommendation.id}`);
      }

      // 3. Update the planting request status
      await updateDoc(doc(firestore, 'plantingrequests', selectedRequest.id), {
        requestStatus: 'assigned_seedling',
        request_status: 'assigned_seedling'
      });

      // 4. Create notification
      const seedlingDetails = seedlings.find(s => s.id === selectedSeedling);
      if (seedlingDetails) {
        await createSeedlingAssignmentNotification(selectedRequest, seedlingDetails);
      }

      setAssignDialogOpen(false);
      setSelectedRequest(null);
      setSelectedSeedling('');
      setAlert({ 
        open: true, 
        message: `Seedling assigned successfully! Linked to recommendations/${matchingRecommendation.id}`, 
        severity: 'success' 
      });
    } catch (err) {
      console.error('❌ Error assigning seedling:', err);
      setAlert({ open: true, message: err.message, severity: 'error' });
    }
  };

  const handleViewRequest = (request) => {
    setSelectedRequest(request);
    setDetailDialogOpen(true);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    
    try {
      // If it's a string like "10/2/2025", return it as is
      if (typeof date === 'string') {
        return date;
      }
      
      // If it's a Date object
      if (date instanceof Date && !isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      
      return String(date);
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getPriorityLevel = (request) => {
    try {
      const plantDate = new Date(request.preferred_date);
      const today = new Date();
      const daysUntil = Math.ceil((plantDate - today) / (1000 * 60 * 60 * 24));
      
      if (daysUntil < 0) return { level: 'overdue', color: 'error', label: 'Overdue', days: Math.abs(daysUntil) };
      if (daysUntil <= 7) return { level: 'urgent', color: 'error', label: 'Urgent', days: daysUntil };
      if (daysUntil <= 14) return { level: 'medium', color: 'warning', label: 'Soon', days: daysUntil };
      return { level: 'normal', color: 'info', label: 'Normal', days: daysUntil };
    } catch {
      return { level: 'normal', color: 'info', label: 'Normal', days: 0 };
    }
  };

  // Simple Request Row Component
  const RequestRow = ({ request }) => {
    const priority = getPriorityLevel(request);
    const recommendedSeedlings = getRecommendedSeedlings(request);
    const isAssigned = isRequestAssigned(request.id);
    const assignedSeedlingId = getAssignedSeedling(request.id);
    const assignedSeedling = assignedSeedlingId ? seedlings.find(s => s.id === assignedSeedlingId) : null;

    return (
      <Paper 
        sx={{ 
          p: 2,
          mb: 2,
          borderRadius: 2,
          borderLeft: `4px solid ${theme.palette[priority.color].main}`,
          cursor: 'pointer',
          transition: 'all 0.2s ease-in-out',
          '&:hover': { 
            transform: 'translateY(-1px)',
            boxShadow: 3
          }
        }}
        onClick={() => handleViewRequest(request)}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Request #{request.id.slice(0, 8)}
              </Typography>
              <Chip 
                label={priority.label} 
                color={priority.color} 
                size="small"
              />
            </Box>
            
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
              {priority.level === 'overdue' 
                ? `Overdue by ${priority.days} days`
                : `${priority.days} days until planting`
              }
            </Typography>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={4}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon sx={{ color: 'action.active' }} />
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {request.planterName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {request.planterEmail}
                    </Typography>
                  </Box>
                </Box>
              </Grid>

              <Grid item xs={12} md={4}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocationIcon sx={{ color: 'action.active' }} />
                  <Typography variant="body2">
                    {request.locationName}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={4}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarIcon sx={{ color: 'action.active' }} />
                  <Typography variant="body2">
                    {formatDate(request.preferred_date)}
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            {isAssigned && assignedSeedling ? (
              <Alert severity="success" sx={{ mb: 2 }}>
                <Typography variant="body2" fontWeight="bold">
                  Assigned: {assignedSeedling.seedling_commonName}
                </Typography>
              </Alert>
            ) : (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  No seedling assigned
                </Typography>
              </Alert>
            )}

            {recommendedSeedlings.length > 0 && !isAssigned && (
              <Box sx={{ bgcolor: 'info.light', p: 1, borderRadius: 1, mb: 2 }}>
                <Typography variant="caption" fontWeight="bold" color="info.main">
                  Recommended: {recommendedSeedlings.map(s => s.seedling_commonName).join(', ')}
                </Typography>
              </Box>
            )}
          </Box>

          <Box sx={{ ml: 2 }} onClick={(e) => e.stopPropagation()}>
            <Button
              variant="contained"
              size="small"
              startIcon={<AssignIcon />}
              onClick={() => handleAssignSeedling(request)}
              color={isAssigned ? "success" : "primary"}
              sx={{ minWidth: '100px' }}
            >
              {isAssigned ? "Reassign" : "Assign"}
            </Button>
          </Box>
        </Box>
      </Paper>
    );
  };

  // Update the SeedlingCard component to accept a readOnly prop
const SeedlingCard = ({ seedling, isSelected, onSelect, readOnly = false }) => (
  <Card 
    sx={{ 
      p: 2,
      cursor: readOnly ? 'default' : 'pointer',
      border: isSelected ? 2 : 1,
      borderColor: isSelected ? 'primary.main' : 'divider',
      backgroundColor: isSelected ? 'primary.light' : 'background.paper',
      opacity: readOnly ? 0.7 : 1,
      transition: 'all 0.2s',
      ...(!readOnly && {
        '&:hover': { 
          borderColor: 'primary.main',
          transform: 'translateY(-2px)'
        }
      })
    }}
    onClick={readOnly ? undefined : onSelect}
  >
    <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
        {seedling.seedling_commonName}
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {seedling.seedling_scientificName}
      </Typography>
      {seedling.seedling_isNative && (
        <Chip 
          icon={<EcoIcon />} 
          label="Native Species" 
          color="success" 
          size="small"
        />
      )}
    </CardContent>
  </Card>
);

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
                label={`${stats.unassigned} Pending`} 
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
                  placeholder="Search by ID, Planter, Location..."
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
                  label="Show only unassigned"
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <Typography variant="body2" color="text.secondary">
                  {filteredRequests.length} result{filteredRequests.length !== 1 ? 's' : ''}
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* Request Rows */}
          <Box>
            {filteredRequests.length === 0 ? (
              <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
                <TreeIcon sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No planting requests found
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {showOnlyUnassigned 
                    ? 'All requests have been assigned seedlings' 
                    : 'Try adjusting your search criteria'
                  }
                </Typography>
              </Paper>
            ) : (
              filteredRequests.map((request) => (
                <RequestRow key={request.id} request={request} />
              ))
            )}
          </Box>
        </Box>

        {/* Assignment Dialog */}
        <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ 
            bgcolor: 'primary.main', 
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TreeIcon /> Assign Tree Seedling
            </Box>
            <IconButton 
              onClick={() => setAssignDialogOpen(false)} 
              sx={{ color: 'white' }}
              size="small"
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 3 }}>
            {selectedRequest && (
              <Box>
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    <strong>Planter:</strong> {selectedRequest.planterName} • 
                    <strong> Location:</strong> {selectedRequest.locationName} • 
                    <strong> Date:</strong> {formatDate(selectedRequest.preferred_date)}
                  </Typography>
                  {selectedRequest.approvalNotes && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      <strong>Notes:</strong> {selectedRequest.approvalNotes}
                    </Typography>
                  )}
                </Alert>
                <Grid container spacing={3}>
                  {(() => {
                    const recommendedSeedlings = getRecommendedSeedlings(selectedRequest);
                    if (recommendedSeedlings.length > 0) {
                      return (
                        <>
                          {/* Recommended Seedlings - CLICKABLE */}
                          <Grid item xs={12}>
                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                              <RecommendIcon sx={{ mr: 1, color: 'primary.main' }} />
                              Recommended Seedlings
                            </Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              Based on environmental analysis of this location
                            </Typography>
                            <Grid container spacing={2}>
                              {recommendedSeedlings.map((seedling) => (
                                <Grid item xs={12} md={4} key={seedling.id}>
                                  <SeedlingCard
                                    seedling={seedling}
                                    isSelected={selectedSeedling === seedling.id}
                                    onSelect={() => setSelectedSeedling(seedling.id)}
                                    readOnly={false}
                                  />
                                </Grid>
                              ))}
                            </Grid>
                            <Divider sx={{ my: 3 }} />
                          </Grid>

                          {/* All Available Seedlings - DISPLAY ONLY */}
                          <Grid item xs={12}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                              <InfoIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                              <Typography variant="h6">
                                All Available Seedlings
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                (Display only)
                              </Typography>
                            </Box>
                            <Grid container spacing={2}>
                              {seedlings.map((seedling) => (
                                <Grid item xs={12} md={6} key={seedling.id}>
                                  <SeedlingCard
                                    seedling={seedling}
                                    isSelected={selectedSeedling === seedling.id}
                                    onSelect={() => setSelectedSeedling(seedling.id)}
                                    readOnly={true}
                                  />
                                </Grid>
                              ))}
                            </Grid>
                          </Grid>
                        </>
                      );
                    } else {
                      // No recommendations - show all seedlings as CLICKABLE
                      return (
                        <Grid item xs={12}>
                          <Typography variant="h6" gutterBottom>
                            All Available Seedlings
                          </Typography>
                          <Grid container spacing={2}>
                            {seedlings.map((seedling) => (
                              <Grid item xs={12} md={6} key={seedling.id}>
                                <SeedlingCard
                                  seedling={seedling}
                                  isSelected={selectedSeedling === seedling.id}
                                  onSelect={() => setSelectedSeedling(seedling.id)}
                                  readOnly={false}
                                />
                              </Grid>
                            ))}
                          </Grid>
                        </Grid>
                      );
                    }
                  })()}
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="contained" 
              color="success"
              startIcon={<AssignIcon />}
              onClick={handleSaveSeedlingAssignment}
              disabled={!selectedSeedling}
              sx={{ minWidth: '140px' }}
            >
              Assign & Notify
            </Button>
          </DialogActions>
        </Dialog>

        {/* Enhanced Detail Dialog */}
        <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            bgcolor: 'grey.50',
            borderBottom: 1,
            borderColor: 'divider'
          }}>
            <Typography variant="h6" fontWeight="600">
              Request Details
            </Typography>
            <IconButton 
              onClick={() => setDetailDialogOpen(false)} 
              size="small"
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 3 }}>
            {selectedRequest && (
              <Stack spacing={3}>
                {/* Planter Information */}
                <Box>
                  <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon color="primary" /> Planter Information
                  </Typography>
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <Stack spacing={1}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Name:</Typography>
                        <Typography variant="body2" fontWeight="medium">{selectedRequest.planterName}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Email:</Typography>
                        <Typography variant="body2">{selectedRequest.planterEmail}</Typography>
                      </Box>
                    </Stack>
                  </Card>
                </Box>

                {/* Location Information */}
                <Box>
                  <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocationIcon color="primary" /> Location
                  </Typography>
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="body2">{selectedRequest.locationName}</Typography>
                  </Card>
                </Box>

                {/* Request Details */}
                <Box>
                  <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarIcon color="primary" /> Request Details
                  </Typography>
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <Stack spacing={1}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Preferred Date:</Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {formatDate(selectedRequest.preferred_date)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Status:</Typography>
                        <Chip 
                          label={selectedRequest.status} 
                          color={selectedRequest.status === 'approved' ? 'success' : 'warning'}
                          size="small"
                        />
                      </Box>
                      {selectedRequest.approvalNotes && (
                        <Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Notes:</Typography>
                          <Typography variant="body2" sx={{ p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                            {selectedRequest.approvalNotes}
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                  </Card>
                </Box>

                {/* Assigned Seedling */}
                {(() => {
                  const assignedSeedlingId = getAssignedSeedling(selectedRequest.id);
                  if (assignedSeedlingId) {
                    const seedling = seedlings.find(s => s.id === assignedSeedlingId);
                    return (
                      <Box>
                        <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TreeIcon color="success" /> Assigned Seedling
                        </Typography>
                        <Card variant="outlined" sx={{ p: 2, bgcolor: 'success.light' }}>
                          <Stack spacing={1}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2" color="text.secondary">Common Name:</Typography>
                              <Typography variant="body2" fontWeight="medium">{seedling?.seedling_commonName}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2" color="text.secondary">Scientific Name:</Typography>
                              <Typography variant="body2">{seedling?.seedling_scientificName}</Typography>
                            </Box>
                            {seedling?.seedling_isNative && (
                              <Chip 
                                icon={<EcoIcon />} 
                                label="Native Species" 
                                color="success" 
                                size="small"
                                sx={{ alignSelf: 'flex-start' }}
                              />
                            )}
                          </Stack>
                        </Card>
                      </Box>
                    );
                  }
                  return null;
                })()}
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button 
              variant="contained" 
              onClick={() => {
                setDetailDialogOpen(false);
                handleAssignSeedling(selectedRequest);
              }}
              startIcon={<AssignIcon />}
            >
              Assign Seedling
            </Button>
            <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default SeedlingAssignmentPage;