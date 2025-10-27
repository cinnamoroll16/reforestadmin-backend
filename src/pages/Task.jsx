// src/pages/Task.jsx
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, Alert, 
  useMediaQuery, useTheme, TextField,
  LinearProgress, Toolbar, Chip, Card, CardContent, Stack, 
  Switch, FormControlLabel, IconButton,
  CircularProgress,
  Snackbar,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
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
  ArrowBack as BackIcon,
  CheckCircle as CheckCircleIcon,
  PlaylistAddCheck as SelectRecoIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext.js';
import { apiService } from '../services/api.js';
import ReForestAppBar from './AppBar.jsx';
import Navigation from './Navigation.jsx';

const drawerWidth = 240;

const SeedlingAssignmentPage = () => {
  const { user, logout, loading: authLoading } = useAuth();
  const [plantingRequests, setPlantingRequests] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [currentRecommendation, setCurrentRecommendation] = useState(null);
  const [seedlings, setSeedlings] = useState([]);
  const [plantingRecords, setPlantingRecords] = useState([]);
  const [filter, setFilter] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [recoDialogOpen, setRecoDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showOnlyUnassigned, setShowOnlyUnassigned] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { id: recoId } = useParams();
  const navigate = useNavigate();

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const convertTimestamp = (timestamp) => {
    if (!timestamp) return null;
    if (timestamp instanceof Date) return timestamp;
    if (typeof timestamp === 'string') return new Date(timestamp);
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
    return record.seedlingRef;
  };

  // Fetch all data on component mount
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        console.log('========== FETCHING ALL DATA ==========');
        setLoading(true);
        
        // Fetch ALL approved planting requests
        const requestsData = await apiService.getPlantingRequests('approved');
        console.log(`✓ Found ${requestsData.length} approved requests`);
        
        // Transform data to match frontend expectations
        const transformedRequests = requestsData.map(request => ({
          id: request.id,
          ...request,
          planterName: request.fullName || 'Unknown User',
          planterEmail: request.userEmail || 'N/A',
          locationName: request.locationRef ? request.locationRef.split('/').pop() : 'Unknown Location',
          status: request.request_status || 'pending',
          request_date: request.request_date,
          preferred_date: request.preferred_date,
          reviewedAt: convertTimestamp(request.reviewedAt),
          userRef: request.userRef,
          locationRef: request.locationRef,
          request_notes: request.request_notes
        }));
        
        setPlantingRequests(transformedRequests);

        // Fetch planting records to check assignments
        const recordsData = await apiService.getPlantingRecords();
        console.log(`✓ Found ${recordsData.length} planting records`);
        setPlantingRecords(recordsData);

        // Fetch recommendations for the selection dialog
        const recommendationsData = await apiService.getRecommendations();
        const activeRecommendations = recommendationsData.filter(reco => !reco.deleted);
        console.log(`✓ Found ${activeRecommendations.length} active recommendations`);
        setRecommendations(activeRecommendations);

        // If there's a recoId in URL, load that recommendation
        if (recoId) {
          await loadRecommendation(recoId);
        }

      } catch (error) {
        console.error("❌ Error fetching data:", error);
        setError('Error loading data: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [recoId]);

  const loadRecommendation = async (recommendationId) => {
    try {
      console.log('Loading recommendation:', recommendationId);
      
      // Use getRecommendationById instead of getRecommendation
      const recommendation = await apiService.getRecommendationById(recommendationId);
      
      if (!recommendation) {
        setError('Recommendation not found');
        return;
      }

      // Fetch seedlings data if available
      let fetchedSeedlings = [];
      if (recommendation.recommendedSeedlings && recommendation.recommendedSeedlings.length > 0) {
        fetchedSeedlings = recommendation.recommendedSeedlings;
      } else if (recommendation.seedlingOptions && recommendation.seedlingOptions.length > 0) {
        // Fallback to seedlingOptions if recommendedSeedlings not available
        fetchedSeedlings = recommendation.seedlingOptions.map(option => ({
          id: option.split('/').pop(),
          seedling_commonName: 'Seedling ' + option.split('/').pop(),
          seedling_scientificName: 'Scientific name pending',
          seedling_isNative: true
        }));
      }

      setCurrentRecommendation({
        id: recommendation.id,
        ...recommendation
      });
      setSeedlings(fetchedSeedlings);
      
      console.log('✓ Recommendation loaded successfully');
      
    } catch (error) {
      console.error('❌ Error loading recommendation:', error);
      setError('Error loading recommendation: ' + error.message);
    }
  };

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
        title: "Seedling Assigned",
        notif_message: `Your seedling has been assigned for planting at ${request.locationName}`,
        type: "assignment",
        notification_type: "pending",
        targetRole: "planter",
        targetUser: request.userRef,
        priority: "high",
        data: {
          requestId: request.id,
          locationName: request.locationName,
          recommendationId: currentRecommendation.id,
          seedlingName: seedlingDetails.seedling_commonName
        }
      });
    } catch (error) {
      console.error('Error creating notification:', error);
      throw new Error('Failed to create notification: ' + error.message);
    }
  };

  const handleAssignSeedling = (request) => {
    if (!currentRecommendation) {
      setError('Please select a recommendation first');
      setRecoDialogOpen(true);
      return;
    }
    setSelectedRequest(request);
    setAssignDialogOpen(true);
  };

  const handleConfirmAssignment = async () => {
    if (!selectedRequest || !currentRecommendation) return;

    setSaving(true);
    try {
      console.log('========== CONFIRMING ASSIGNMENT ==========');
      
      const recommendedSeedlings = getRecommendedSeedlings();
      
      if (recommendedSeedlings.length === 0) {
        setError('No recommended seedlings available');
        return;
      }

      // Use the first recommended seedling
      const assignedSeedling = recommendedSeedlings[0];

      // Create planting record
      const recordData = {
        requestId: selectedRequest.id,
        userRef: selectedRequest.userRef,
        locationRef: selectedRequest.locationRef,
        seedlingRef: assignedSeedling.id,
        record_date: selectedRequest.preferred_date,
        seedlingDetails: assignedSeedling
      };

      const recordResponse = await apiService.createPlantingRecord(recordData);
      console.log('✓ Planting record created:', recordResponse);

      // Create planting task with recommendation reference
      const taskData = {
        userRef: selectedRequest.userRef,
        locationRef: selectedRequest.locationRef,
        reqRef: `plantingrequests/${selectedRequest.id}`, 
        recoRef: `recommendations/${currentRecommendation.id}`,
        task_status: 'assigned',
        task_date: selectedRequest.preferred_date,
        seedling_assigned: assignedSeedling.id,
        recommendation_data: {
          confidenceScore: currentRecommendation.reco_confidenceScore,
          seedlingOptions: currentRecommendation.seedlingOptions,
          locationData: currentRecommendation.locationData
        }
      };

      const taskResponse = await apiService.createPlantingTask(taskData);
      console.log('✓ Planting task created:', taskResponse);

      // Update the planting request status
      await apiService.updateRequestStatus(selectedRequest.id, 'assigned_seedling');
      console.log('✓ Request status updated to assigned_seedling');

      // Create notification
      await createSeedlingAssignmentNotification(selectedRequest, assignedSeedling);
      console.log('✓ Notification created');

      // Update local state
      setPlantingRequests(prev => prev.map(req => 
        req.id === selectedRequest.id 
          ? { ...req, status: 'assigned_seedling' }
          : req
      ));

      // Refresh planting records to reflect new assignment
      const updatedRecords = await apiService.getPlantingRecords();
      setPlantingRecords(updatedRecords);

      setAssignDialogOpen(false);
      setSelectedRequest(null);
      setSuccess(`${assignedSeedling.seedling_commonName} assigned to ${selectedRequest.planterName} successfully!`);

    } catch (err) {
      console.error('❌ Error assigning seedling:', err);
      setError('Failed to assign seedling: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleViewRequest = (request) => {
    setSelectedRequest(request);
    setDetailDialogOpen(true);
  };

  const handleSelectRecommendation = (recommendation) => {
    setCurrentRecommendation(recommendation);
    
    // Fetch seedlings for the selected recommendation
    let fetchedSeedlings = [];
    if (recommendation.recommendedSeedlings && recommendation.recommendedSeedlings.length > 0) {
      fetchedSeedlings = recommendation.recommendedSeedlings;
    } else if (recommendation.seedlingOptions && recommendation.seedlingOptions.length > 0) {
      fetchedSeedlings = recommendation.seedlingOptions.map(option => ({
        id: option.split('/').pop(),
        seedling_commonName: 'Seedling ' + option.split('/').pop(),
        seedling_scientificName: 'Scientific name pending',
        seedling_isNative: true
      }));
    }
    
    setSeedlings(fetchedSeedlings);
    setRecoDialogOpen(false);
    setSuccess(`Recommendation ${recommendation.id.substring(0, 12)}... selected successfully!`);
    
    // Update URL without page reload
    navigate(`/tasks/${recommendation.id}`, { replace: true });
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
              startIcon={saving ? <CircularProgress size={16} /> : <AssignIcon />}
              onClick={() => handleAssignSeedling(request)}
              color={isAssigned ? "success" : "primary"}
              sx={{ minWidth: '100px' }}
              disabled={recommendedSeedlings.length === 0 || saving || !currentRecommendation}
            >
              {isAssigned ? "Reassign" : "Assign"}
            </Button>
          </Box>
        </Box>
      </Paper>
    );
  };

  if (!user) {
    return (
      <Box sx={{ display: "flex" }}>
        <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={user} />
        <Navigation mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} isMobile={isMobile} />
        <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - ${drawerWidth}px)` } }}>
          <Toolbar />
          <Alert severity="warning">Please log in to access seedling assignments.</Alert>
        </Box>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', bgcolor: '#f8fafc', minHeight: '100vh' }}>
        <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={user} onLogout={logout} />
        <Navigation mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} isMobile={isMobile} />
        <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - ${drawerWidth}px)` } }}>
          <Toolbar />
          <LinearProgress />
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <CircularProgress size={40} sx={{ color: '#2e7d32', mr: 2 }} />
            <Typography variant="body1" color="textSecondary">
              Loading planting requests...
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', bgcolor: '#f8fafc', minHeight: '100vh' }}>
      <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={user} onLogout={logout} />
      <Navigation mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} isMobile={isMobile} />

      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - ${drawerWidth}px)` } }}>
        <Toolbar />

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Header Section */}
        <Box sx={{ width: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h4" sx={{ color: '#2e7d32', fontWeight: 600 }}>
                Assign Seedlings to Planters
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Manage planting requests and assign seedlings from recommendations
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button
                variant={currentRecommendation ? "outlined" : "contained"}
                startIcon={<SelectRecoIcon />}
                onClick={() => setRecoDialogOpen(true)}
                color={currentRecommendation ? "success" : "primary"}
              >
                {currentRecommendation ? "Change Recommendation" : "Select Recommendation"}
              </Button>
              
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

          {/* Current Recommendation Banner */}
          {currentRecommendation && (
            <Paper sx={{ mb: 3, p: 2, bgcolor: 'success.light', borderRadius: 2 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={8}>
                  <Typography variant="h6" fontWeight="600">
                    Active Recommendation: {currentRecommendation.id.substring(0, 12)}...
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    <strong>Available Seedlings:</strong> {seedlings.map(s => s.seedling_commonName).join(', ')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                    Confidence Score: {currentRecommendation.reco_confidenceScore}% • 
                    Location: {currentRecommendation.locationData?.location_name || 'Unknown'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4} sx={{ textAlign: { md: 'right' } }}>
                  <Button 
                    startIcon={<CloseIcon />} 
                    variant="outlined"
                    onClick={() => {
                      setCurrentRecommendation(null);
                      setSeedlings([]);
                      navigate('/tasks', { replace: true });
                    }}
                  >
                    Clear Selection
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          )}

          {/* No Recommendation Warning */}
          {!currentRecommendation && (
            <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
              <Typography variant="body2">
                <strong>No recommendation selected.</strong> Please select a recommendation to assign seedlings to planting requests.
              </Typography>
            </Alert>
          )}
            
          {/* Search and Filters */}
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
                  {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''}
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* Planting Requests List */}
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

        {/* Recommendation Selection Dialog */}
        <Dialog open={recoDialogOpen} onClose={() => setRecoDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ 
            bgcolor: 'primary.main', 
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SelectRecoIcon /> Select Recommendation
            </Box>
            <IconButton 
              onClick={() => setRecoDialogOpen(false)} 
              sx={{ color: 'white' }}
              size="small"
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Choose a recommendation to assign seedlings to planting requests
            </Typography>
            
            {recommendations.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  No recommendations available. Please generate recommendations first.
                </Typography>
                <Button 
                  variant="contained" 
                  sx={{ mt: 2 }}
                  onClick={() => navigate('/recommendations')}
                >
                  Go to Recommendations
                </Button>
              </Paper>
            ) : (
              <List>
                {recommendations.map((reco) => (
                  <ListItem 
                    key={reco.id} 
                    divider
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                    onClick={() => handleSelectRecommendation(reco)}
                  >
                    <ListItemText
                      primary={
                        <Typography variant="h6">
                          Recommendation: {reco.id.substring(0, 12)}...
                        </Typography>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2">
                            Location: {reco.locationData?.location_name || 'Unknown Location'}
                          </Typography>
                          <Typography variant="body2">
                            Confidence: {reco.reco_confidenceScore}% • Seedlings: {reco.seedlingCount || 0}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Generated: {reco.reco_generatedAt ? new Date(reco.reco_generatedAt).toLocaleDateString() : 'N/A'}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Chip 
                        label={reco.status} 
                        color={reco.status === 'Approved' ? 'success' : 'warning'}
                        sx={{ mr: 2 }}
                      />
                      <Button
                        variant="contained"
                        onClick={() => handleSelectRecommendation(reco)}
                      >
                        Select
                      </Button>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setRecoDialogOpen(false)}>Cancel</Button>
          </DialogActions>
        </Dialog>

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
            <Button onClick={() => setAssignDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button 
              variant="contained" 
              color="success"
              startIcon={saving ? <CircularProgress size={20} /> : <AssignIcon />}
              onClick={handleConfirmAssignment}
              disabled={!selectedRequest || getRecommendedSeedlings().length === 0 || saving}
              sx={{ minWidth: '140px' }}
            >
              {saving ? 'Assigning...' : 'Confirm & Notify'}
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
                {/* ... (keep your existing detail dialog content) ... */}
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
              disabled={getRecommendedSeedlings().length === 0 || !currentRecommendation}
            >
              Assign Seedling
            </Button>
            <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Success Snackbar */}
        <Snackbar
          open={!!success}
          autoHideDuration={4000}
          onClose={() => setSuccess(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            severity="success" 
            onClose={() => setSuccess(null)} 
            sx={{ width: '100%', borderRadius: 2 }}
            icon={<CheckCircleIcon />}
          >
            {success}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
};

export default SeedlingAssignmentPage;