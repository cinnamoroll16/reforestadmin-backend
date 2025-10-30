// src/pages/Task.js
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, Alert, 
  useMediaQuery, useTheme, TextField,
  LinearProgress, Toolbar, Chip, Card, CardContent, Stack, 
  Switch, FormControlLabel, IconButton
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Park as TreeIcon,
  CheckCircle as AssignIcon,
  Person as PersonIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  LocalFlorist as EcoIcon,
  Assignment as TaskIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  ArrowBack as BackIcon
} from '@mui/icons-material';
import { auth } from "../firebase.js";
import { apiService } from '../services/api.js';
import ReForestAppBar from './AppBar.jsx';
import Navigation from './Navigation.jsx';

const drawerWidth = 240;

const SeedlingAssignmentPage = () => {
  const [plantingRequests, setPlantingRequests] = useState([]);
  const [currentRecommendation, setCurrentRecommendation] = useState(null);
  const [seedlings, setSeedlings] = useState([]);
  const [plantingRecords, setPlantingRecords] = useState([]);
  const [filter, setFilter] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showOnlyUnassigned, setShowOnlyUnassigned] = useState(true);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const user = auth.currentUser;
  const { id: recoId } = useParams();
  const navigate = useNavigate();

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const handleLogout = () => auth.signOut();

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

  const isRequestAssigned = (requestId) => {
    return plantingRecords.some(record => 
      record.requestId === requestId && record.seedlingRef
    );
  };

  const getAssignedSeedling = (requestId) => {
    const record = plantingRecords.find(record => 
      record.requestId === requestId && record.seedlingRef
    );
    
    if (!record) return null;
    
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

  // Fetch specific seedlings using API service
  const fetchSpecificSeedlings = async (seedlingIds) => {
    try {
      const seedlingPromises = seedlingIds.map(async (seedlingId) => {
        try {
          const seedling = await apiService.getTreeSeedlingById(seedlingId);
          return { id: seedlingId, ...seedling };
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

  // Fetch user data using API service
  const fetchUserData = async (userRef) => {
    try {
      if (!userRef) return { email: 'N/A', fullName: 'Unknown User' };
      
      const userId = userRef.split('/').pop();
      const userData = await apiService.getUser(userId);
      
      return {
        email: userData.user_email || userData.email || 'N/A',
        fullName: `${userData.user_firstname || userData.user_Firstname || ''} ${userData.user_lastname || userData.user_Lastname || ''}`.trim() || 'Unknown User'
      };
    } catch (error) {
      console.error('Error fetching user data:', error);
      return { email: 'N/A', fullName: 'Unknown User' };
    }
  };

  // Fetch recommendation data if recoId exists
  useEffect(() => {
    const fetchRecommendation = async () => {
      if (!recoId) {
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching recommendation:', recoId);
        
        const recoData = await apiService.getRecommendationById(recoId);
        
        if (!recoData) {
          setAlert({ 
            open: true, 
            message: 'Recommendation not found', 
            severity: 'error' 
          });
          setLoading(false);
          return;
        }

        console.log('Recommendation data:', recoData);

        // Fetch seedlings from recommendation
        const seedlingIds = recoData.seedlingOptions?.map(path => path.split('/').pop()) || [];
        const fetchedSeedlings = await fetchSpecificSeedlings(seedlingIds);
        
        setCurrentRecommendation({
          id: recoId,
          ...recoData
        });
        setSeedlings(fetchedSeedlings);
        
      } catch (error) {
        console.error('Error fetching recommendation:', error);
        setAlert({ 
          open: true, 
          message: 'Error loading recommendation: ' + error.message, 
          severity: 'error' 
        });
      }
    };

    fetchRecommendation();
  }, [recoId]);

  // Fetch ALL approved planting requests
  useEffect(() => {
    if (!currentRecommendation) return;

    setLoading(true);
    
    const fetchData = async () => {
      try {
        // Fetch ALL approved planting requests using API service
        const requestsData = await apiService.getPlantingRequests();
        
        // Filter for approved/pending requests and enrich with user data
        const approvedRequests = requestsData.filter(request => 
          request.request_status === 'approved' || request.request_status === 'pending'
        );
        
        const enrichedRequests = await Promise.all(
          approvedRequests.map(async (request) => {
            const userData = await fetchUserData(request.userRef);
            
            // Extract location name from locationRef path
            const locationName = request.locationRef 
              ? request.locationRef.split('/').pop() 
              : 'Unknown Location';
            
            return {
              id: request.id,
              ...request,
              planterName: userData.fullName,
              planterEmail: userData.email,
              locationName: locationName,
              status: request.request_status,
              request_date: request.request_date,
              preferred_date: request.preferred_date,
              reviewedAt: convertTimestamp(request.reviewedAt)
            };
          })
        );
        
        console.log(`Found ${enrichedRequests.length} approved requests`);
        setPlantingRequests(enrichedRequests);

        // Fetch planting records to check assignments
        const recordsData = await apiService.getPlantingRecords();
        setPlantingRecords(recordsData);

        setLoading(false);

      } catch (error) {
        console.error("Error fetching data:", error);
        setAlert({ 
          open: true, 
          message: 'Error loading data: ' + error.message, 
          severity: 'error' 
        });
        setLoading(false);
      }
    };

    fetchData();
  }, [currentRecommendation]);

  const getRecommendedSeedlings = () => {
    if (!currentRecommendation || !seedlings || seedlings.length === 0) {
      return [];
    }
    return seedlings;
  };

  const filteredRequests = plantingRequests.filter(request => {
    const matchesSearch =
      (request.id?.toLowerCase() || "").includes(filter.toLowerCase()) ||
      (request.planterName?.toLowerCase() || "").includes(filter.toLowerCase()) ||
      (request.locationName?.toLowerCase() || "").includes(filter.toLowerCase()) ||
      (request.request_notes?.toLowerCase() || "").includes(filter.toLowerCase());

    const hasAssignment = isRequestAssigned(request.id);
    const matchesAssignmentFilter = !showOnlyUnassigned || !hasAssignment;
    
    return matchesSearch && matchesAssignmentFilter;
  });

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

  const createSeedlingAssignmentNotification = async (request, seedlingDetails) => {
    try {
      await apiService.createNotification({
        notification_type: 'pending',
        notif_message: `Your seedling has been assigned for planting at ${request.locationName}`,
        data: {
          requestId: request.id,
          locationName: request.locationName,
          recommendationId: currentRecommendation.id
        },
        targetUser: request.userRef,
        targetRole: 'planter',
        read: false,
        priority: 'high',
        notif_timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  const handleAssignSeedling = (request) => {
    setSelectedRequest(request);
    setAssignDialogOpen(true);
  };

  const handleConfirmAssignment = async () => {
    try {
      if (!selectedRequest || !currentRecommendation) return;

      const recommendedSeedlings = getRecommendedSeedlings();
      
      if (recommendedSeedlings.length === 0) {
        setAlert({ 
          open: true, 
          message: 'No recommended seedlings available', 
          severity: 'warning' 
        });
        return;
      }

      // Use the first recommended seedling
      const assignedSeedling = recommendedSeedlings[0];

      // Create/update planting record using API service
      const existingRecord = plantingRecords.find(record => 
        record.requestId === selectedRequest.id
      );

      const recordData = {
        requestId: selectedRequest.id,
        userRef: selectedRequest.userRef,
        locationRef: selectedRequest.locationRef,
        seedlingRef: assignedSeedling.id,
        record_date: selectedRequest.preferred_date,
        createdAt: new Date().toISOString()
      };

      let recordId;
      if (existingRecord) {
        await apiService.updatePlantingRecord(existingRecord.id, recordData);
        recordId = existingRecord.id;
      } else {
        const newRecord = await apiService.createPlantingRecord(recordData);
        recordId = newRecord.id;
      }

      // Create/update planting task with recommendation reference using API service
      const taskData = {
        userRef: selectedRequest.userRef,
        locationRef: selectedRequest.locationRef,
        reqRef: `plantingrequests/${selectedRequest.id}`, 
        recoRef: `recommendations/${currentRecommendation.id}`,
        task_status: 'assigned',
        task_date: selectedRequest.preferred_date,
        createdAt: new Date().toISOString()
      };

      const existingTasks = await apiService.getPlantingTasks();
      const existingTask = existingTasks.find(task => 
        task.userRef === selectedRequest.userRef && 
        task.locationRef === selectedRequest.locationRef
      );
      
      if (existingTask) {
        await apiService.updatePlantingTask(existingTask.id, taskData);
        console.log(`✅ Updated planting task with recoRef: recommendations/${currentRecommendation.id}`);
      } else {
        await apiService.createPlantingTask(taskData);
        console.log(`✅ Created planting task with recoRef: recommendations/${currentRecommendation.id}`);
      }

      // Update the planting request status using API service
      await apiService.updatePlantingRequest(selectedRequest.id, {
        request_status: 'assigned_seedling'
      });

      // Create notification
      await createSeedlingAssignmentNotification(selectedRequest, assignedSeedling);

      // Refresh data
      const updatedRecords = await apiService.getPlantingRecords();
      setPlantingRecords(updatedRecords);

      setAssignDialogOpen(false);
      setSelectedRequest(null);
      setAlert({ 
        open: true, 
        message: `${assignedSeedling.seedling_commonName} assigned to ${selectedRequest.planterName} successfully!`, 
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
      if (typeof date === 'string') {
        const parsedDate = new Date(date);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        }
        return date;
      }
      
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

  const RequestRow = ({ request }) => {
    const priority = getPriorityLevel(request);
    const recommendedSeedlings = getRecommendedSeedlings();
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
              <Alert severity="success">
                <Typography variant="body2" fontWeight="bold">
                  Assigned: {assignedSeedling.seedling_commonName}
                </Typography>
              </Alert>
            ) : (
              <Alert severity="warning">
                <Typography variant="body2">
                  Ready for assignment
                </Typography>
              </Alert>
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
              disabled={recommendedSeedlings.length === 0}
            >
              {isAssigned ? "Reassign" : "Assign"}
            </Button>
          </Box>
        </Box>
      </Paper>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', bgcolor: '#f8fafc', minHeight: '100vh' }}>
        <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={user} onLogout={handleLogout} />
        <Navigation mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} isMobile={isMobile} />
        <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - ${drawerWidth}px)` } }}>
          <Toolbar />
          <LinearProgress />
          <Typography sx={{ mt: 2 }}>Loading assignment data...</Typography>
        </Box>
      </Box>
    );
  }

  if (!currentRecommendation) {
    return (
      <Box sx={{ display: 'flex', bgcolor: '#f8fafc', minHeight: '100vh' }}>
        <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={user} onLogout={handleLogout} />
        <Navigation mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} isMobile={isMobile} />
        <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - ${drawerWidth}px)` } }}>
          <Toolbar />
          <Alert severity="error">
            No recommendation selected. Please select a recommendation from the Recommendations page.
          </Alert>
          <Button 
            startIcon={<BackIcon />} 
            onClick={() => navigate('/recommendations')}
            sx={{ mt: 2 }}
            variant="contained"
          >
            Back to Recommendations
          </Button>
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

        {/* Recommendation Info Banner */}
        <Paper sx={{ mb: 3, p: 2, bgcolor: 'primary.light', borderRadius: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <Typography variant="h6" fontWeight="600">
                Recommendation: {currentRecommendation.id.substring(0, 12)}...
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                <strong>Available Seedlings:</strong> {seedlings.map(s => s.seedling_commonName).join(', ')}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                Confidence Score: {currentRecommendation.reco_confidenceScore}%
              </Typography>
            </Grid>
            <Grid item xs={12} md={4} sx={{ textAlign: { md: 'right' } }}>
              <Button 
                startIcon={<BackIcon />} 
                variant="outlined"
                onClick={() => navigate('/recommendations')}
              >
                Back to Recommendations
              </Button>
            </Grid>
          </Grid>
        </Paper>
        
        <Box sx={{ width: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h4" sx={{ color: '#2e7d32', fontWeight: 600 }}>
                Assign Seedlings to Planters
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Select planting requests to assign these recommended seedlings
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip 
                icon={<TaskIcon />} 
                label={`${stats.unassigned} Unassigned`} 
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

          <Box>
            {filteredRequests.length === 0 ? (
              <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
                <TreeIcon sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No planting requests found
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {showOnlyUnassigned 
                    ? 'All pending requests have been assigned' 
                    : 'No pending planting requests available'
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
        <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ 
            bgcolor: 'primary.main', 
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TreeIcon /> Confirm Seedling Assignment
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
                    <strong>Planter:</strong> {selectedRequest.planterName} <br />
                    <strong>Location:</strong> {selectedRequest.locationName} <br />
                    <strong>Date:</strong> {formatDate(selectedRequest.preferred_date)}
                  </Typography>
                  {selectedRequest.request_notes && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      <strong>Notes:</strong> {selectedRequest.request_notes}
                    </Typography>
                  )}
                </Alert>

                {(() => {
                  const recommendedSeedlings = getRecommendedSeedlings();
                  
                  if (recommendedSeedlings.length === 0) {
                    return (
                      <Alert severity="warning">
                        <Typography variant="body2">
                          No seedlings available for this recommendation.
                        </Typography>
                      </Alert>
                    );
                  }

                  return (
                    <>
                      <Typography variant="h6" gutterBottom>
                        Seedling to Assign
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        This seedling from the recommendation will be assigned:
                      </Typography>
                      
                      <Card sx={{ bgcolor: 'success.light', p: 2 }}>
                        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                          <Typography variant="h6" fontWeight="bold" gutterBottom>
                            {recommendedSeedlings[0].seedling_commonName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {recommendedSeedlings[0].seedling_scientificName}
                          </Typography>
                          {recommendedSeedlings[0].seedling_isNative && (
                            <Chip 
                              icon={<EcoIcon />} 
                              label="Native Species" 
                              color="success" 
                              size="small"
                              sx={{ mt: 1 }}
                            />
                          )}
                        </CardContent>
                      </Card>

                      {recommendedSeedlings.length > 1 && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="caption" color="text.secondary">
                            Other available options: {recommendedSeedlings.slice(1).map(s => s.seedling_commonName).join(', ')}
                          </Typography>
                        </Box>
                      )}
                    </>
                  );
                })()}
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="contained" 
              color="success"
              startIcon={<AssignIcon />}
              onClick={handleConfirmAssignment}
              disabled={!selectedRequest || getRecommendedSeedlings().length === 0}
              sx={{ minWidth: '140px' }}
            >
              Confirm & Notify
            </Button>
          </DialogActions>
        </Dialog>

        {/* Detail Dialog */}
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

                <Box>
                  <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocationIcon color="primary" /> Location
                  </Typography>
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="body2">{selectedRequest.locationName}</Typography>
                  </Card>
                </Box>

                <Box>
                  <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarIcon color="primary" /> Request Details
                  </Typography>
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <Stack spacing={1}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Request Date:</Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {formatDate(selectedRequest.request_date)}
                        </Typography>
                      </Box>
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
                      {selectedRequest.request_notes && (
                        <Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Notes:</Typography>
                          <Typography variant="body2" sx={{ p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                            {selectedRequest.request_notes}
                          </Typography>
                        </Box>
                      )}
                      {selectedRequest.reviewedBy && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">Reviewed By:</Typography>
                          <Typography variant="body2">{selectedRequest.reviewedBy}</Typography>
                        </Box>
                      )}
                    </Stack>
                  </Card>
                </Box>

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
              disabled={getRecommendedSeedlings().length === 0}
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