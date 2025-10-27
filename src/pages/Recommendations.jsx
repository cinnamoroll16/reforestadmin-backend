// src/pages/Recommendations.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Avatar,
  alpha,
  Toolbar,
  Alert,
  CircularProgress,
  Snackbar
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  PlayArrow as ExecuteIcon,
  TrendingUp as ConfidenceIcon,
  Science as AlgorithmIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useTheme, useMediaQuery } from '@mui/material';
import ReForestAppBar from './AppBar.jsx';
import Navigation from './Navigation.jsx';
import { useAuth } from '../context/AuthContext.js';
import { apiService } from '../services/api.js';

const drawerWidth = 240;

function Recommendations() {
  const { user, logout } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [filter, setFilter] = useState('');
  const [selectedReco, setSelectedReco] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recoToDelete, setRecoToDelete] = useState(null);
  const navigate = useNavigate();
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  // Generate status based on confidence score
  const generateStatus = (confidenceScore) => {
    const score = typeof confidenceScore === 'string' ? parseFloat(confidenceScore) : confidenceScore;
    const scorePercent = score > 1 ? score : score * 100;
    
    if (scorePercent >= 85) return 'Approved';
    if (scorePercent >= 70) return 'Pending';
    if (scorePercent >= 50) return 'Under Review';
    return 'Needs Review';
  };

  // Handle implementing recommendation (creating planting task)
  const handleImplementRecommendation = async (reco) => {
    if (!user) {
      setError('Please log in to implement recommendations');
      return;
    }

    setSaving(true);
    try {
      const taskData = {
        user_id: user.uid,
        reco_id: reco.reco_id,
        location_id: reco.locationData?.locationId || 'LOC001',
        task_status: 'Assigned',
        recommendation_data: {
          sensorDataRef: reco.sensorDataRef,
          locationRef: reco.locationRef,
          confidenceScore: reco.reco_confidenceScore,
          seedlingCount: reco.seedlingCount,
          sensorData: reco.sensorData,
          locationData: reco.locationData,
          recommendedSeedlings: reco.recommendedSeedlings
        }
      };

      await apiService.createPlantingTask(taskData);
      
      setSuccess(`Planting task created for recommendation ${reco.reco_id}`);
      
      // Navigate to Task page with the recommendation ID
      navigate(`/tasks/${reco.id}`);
      
    } catch (error) {
      console.error('Error creating planting task:', error);
      setError('Failed to create planting task: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle row click to view details
  const handleRowClick = (reco) => {
    setSelectedReco(reco);
    setOpenDialog(true);
  };

  // Handle delete recommendation
  const handleDeleteClick = (reco, event) => {
    event.stopPropagation();
    setRecoToDelete(reco);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!recoToDelete) return;

    setSaving(true);
    try {
      await apiService.deleteRecommendation(recoToDelete.id);
      
      setSuccess('Recommendation deleted successfully');
      setDeleteDialogOpen(false);
      setRecoToDelete(null);
      
      // Refresh recommendations
      loadRecommendations();
      
    } catch (error) {
      console.error('Error deleting recommendation:', error);
      setError('Failed to delete recommendation: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setRecoToDelete(null);
  };

  // Load recommendations using API service
  const loadRecommendations = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      console.log('========== LOADING RECOMMENDATIONS ==========');
      setLoading(true);
      
      const recommendationsData = await apiService.getRecommendations();
      console.log('✓ Recommendations data loaded from API:', recommendationsData);

      // The data is already transformed by the backend, so we can use it directly
      // Just ensure all fields are properly set
      const transformedRecos = recommendationsData.map(reco => ({
        id: reco.id,
        reco_id: reco.reco_id || reco.id,
        locationRef: reco.locationRef,
        sensorDataRef: reco.sensorDataRef,
        reco_confidenceScore: reco.reco_confidenceScore || 0,
        reco_generatedAt: reco.reco_generatedAt,
        season: reco.season,
        sensorConditions: reco.sensorConditions || {},
        seedlingOptions: reco.seedlingOptions || [],
        locationData: reco.locationData || null,
        sensorData: reco.sensorData || null,
        recommendedSeedlings: reco.recommendedSeedlings || [],
        seedlingCount: reco.seedlingCount || (reco.recommendedSeedlings ? reco.recommendedSeedlings.length : 0),
        status: reco.status || generateStatus(reco.reco_confidenceScore || 0),
        deleted: reco.deleted || false
      }));
      
      console.log('✓ Transformed recommendations:', transformedRecos);
      setRecommendations(transformedRecos);
      
    } catch (error) {
      console.error('❌ Error loading recommendations:', error);
      setError('Failed to load recommendations: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch recommendations on component mount
  useEffect(() => {
    loadRecommendations();

    // Set up polling for real-time updates
    const pollInterval = setInterval(() => {
      loadRecommendations();
    }, 30000); // Poll every 30 seconds

    return () => {
      clearInterval(pollInterval);
    };
  }, [user]);

  // Handle filtering (exclude deleted recommendations)
  const filteredRecommendations = recommendations.filter(reco => {
    if (reco.deleted) return false;
    
    const matchesSearch = reco.reco_id.toLowerCase().includes(filter.toLowerCase()) ||
                         (reco.locationData?.location_name || '').toLowerCase().includes(filter.toLowerCase()) ||
                         (reco.sensorData?.sensorId || '').toLowerCase().includes(filter.toLowerCase());
    const matchesStatus = filterStatus === 'all' || reco.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Status chip color
  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved': return 'success';
      case 'Pending': return 'warning';
      case 'Under Review': return 'info';
      case 'Needs Review': return 'error';
      case 'Implemented': return 'primary';
      case 'Rejected': return 'error';
      default: return 'default';
    }
  };

  // Confidence score color
  const getConfidenceColor = (score) => {
    if (score >= 85) return 'success';
    if (score >= 70) return 'warning';
    return 'error';
  };

  // Open/close detail dialog
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedReco(null);
  };

  // Unique statuses for filter dropdown
  const statusTypes = [...new Set(recommendations.map(reco => reco.status))];

  if (!user) {
    return (
      <Box sx={{ display: "flex" }}>
        <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={user} />
        <Navigation mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} isMobile={isMobile} />
        <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - ${drawerWidth}px)` } }}>
          <Toolbar />
          <Alert severity="warning">Please log in to access recommendations.</Alert>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', bgcolor: '#f8fafc', minHeight: '100vh' }}>
      {/* App Bar */}
      <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={user} onLogout={logout} />

      {/* Side Navigation */}
      <Navigation mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} isMobile={isMobile} />

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - ${drawerWidth}px)` } }}>
        <Toolbar />
        
        <Box sx={{ width: '100%' }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h4" sx={{ color: '#2e7d32', fontWeight: 600 }}>
                Planting Recommendations
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {recommendations.length} recommendation{recommendations.length !== 1 ? 's' : ''} generated by ML algorithm
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              sx={{ backgroundColor: '#2e7d32' }}
              onClick={() => navigate('/sensor')}
            >
              Generate New
            </Button>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Loading State */}
          {loading && <LinearProgress sx={{ mb: 2 }} />}

          {/* Filters */}
          <Paper sx={{ mb: 2, p: 2, borderRadius: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Search recommendations"
                  variant="outlined"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Search by ID, Location, or Sensor"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status Filter</InputLabel>
                  <Select value={filterStatus} label="Status Filter" onChange={(e) => setFilterStatus(e.target.value)}>
                    <MenuItem value="all">All Status</MenuItem>
                    {statusTypes.map(status => (
                      <MenuItem key={status} value={status}>{status}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>

          {/* Loading or Empty State */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
              <CircularProgress size={40} sx={{ color: '#2e7d32', mr: 2 }} />
              <Typography variant="body1" color="textSecondary">
                Loading recommendations...
              </Typography>
            </Box>
          ) : recommendations.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
              <Typography variant="body1" color="textSecondary">
                No recommendations found in the database.
              </Typography>
            </Box>
          ) : (
            <>
              {/* Recommendations Table */}
              <Paper sx={{ width: '100%', mb: 2, borderRadius: 2, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: theme.palette.grey[50] }}>
                        <TableCell><Typography variant="subtitle2" fontWeight="bold">Recommendation ID</Typography></TableCell>
                        <TableCell><Typography variant="subtitle2" fontWeight="bold">Location</Typography></TableCell>
                        <TableCell><Typography variant="subtitle2" fontWeight="bold">Sensor Data</Typography></TableCell>
                        <TableCell><Typography variant="subtitle2" fontWeight="bold">Seedlings Count</Typography></TableCell>
                        <TableCell><Typography variant="subtitle2" fontWeight="bold">Confidence</Typography></TableCell>
                        <TableCell><Typography variant="subtitle2" fontWeight="bold">Generated</Typography></TableCell>
                        <TableCell><Typography variant="subtitle2" fontWeight="bold">Status</Typography></TableCell>
                        <TableCell align="center"><Typography variant="subtitle2" fontWeight="bold">Actions</Typography></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredRecommendations.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((reco) => (
                        <TableRow 
                          key={reco.id} 
                          hover 
                          sx={{ 
                            '&:hover': { bgcolor: 'rgba(46, 125, 50, 0.04)', cursor: 'pointer' },
                            transition: 'background-color 0.2s'
                          }}
                          onClick={() => handleRowClick(reco)}
                        >
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">{reco.reco_id}</Typography>
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {reco.locationData?.location_name || 'Unknown Location'}
                              </Typography>
                              {reco.locationData && (
                                <Typography variant="caption" color="text.secondary">
                                  {reco.locationData.location_latitude}, {reco.locationData.location_longitude}
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box>
                              {reco.sensorData ? (
                                <>
                                  <Typography variant="body2" fontWeight="medium">
                                    Sensor {reco.sensorData.sensorId || 'Unknown'}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    Moisture: {reco.sensorData.soilMoisture || reco.sensorConditions?.soilMoisture || 'N/A'}%
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    Temp: {reco.sensorData.temperature || reco.sensorConditions?.temperature || 'N/A'}°C
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    pH: {reco.sensorData.pH || reco.sensorConditions?.ph || 'N/A'}
                                  </Typography>
                                </>
                              ) : reco.sensorConditions ? (
                                <>
                                  <Typography variant="body2" fontWeight="medium">
                                    Sensor Data
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    Moisture: {reco.sensorConditions.soilMoisture || 'N/A'}%
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    Temp: {reco.sensorConditions.temperature || 'N/A'}°C
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    pH: {reco.sensorConditions.ph || 'N/A'}
                                  </Typography>
                                </>
                              ) : (
                                <Typography variant="body2" color="text.secondary">No sensor data</Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={`${reco.seedlingCount} seedlings`} 
                              color="primary" 
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ width: '100%' }}>
                              <LinearProgress
                                variant="determinate"
                                value={reco.reco_confidenceScore}
                                color={getConfidenceColor(reco.reco_confidenceScore)}
                                sx={{ height: 8, borderRadius: 4 }}
                              />
                              <Typography variant="body2" sx={{ mt: 0.5, textAlign: 'center' }}>
                                {reco.reco_confidenceScore}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {reco.reco_generatedAt
                                ? new Date(reco.reco_generatedAt).toLocaleDateString()
                                : 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={reco.status} color={getStatusColor(reco.status)} size="small" />
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title="Implement Recommendation">
                              <IconButton 
                                color="primary" 
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleImplementRecommendation(reco);
                                }}
                                disabled={saving}
                                sx={{ 
                                  '&:hover': { 
                                    backgroundColor: 'rgba(46, 125, 50, 0.1)' 
                                  } 
                                }}
                              >
                                {saving ? <CircularProgress size={20} /> : <ExecuteIcon />}
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Recommendation">
                              <IconButton 
                                color="error" 
                                size="small"
                                onClick={(e) => handleDeleteClick(reco, e)}
                                sx={{ 
                                  '&:hover': { 
                                    backgroundColor: 'rgba(211, 47, 47, 0.1)' 
                                  } 
                                }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25]}
                  component="div"
                  count={filteredRecommendations.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                />
              </Paper>
            </>
          )}

          {/* Detail Dialog */}
          <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
            <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AlgorithmIcon /> Recommendation Details
              </Box>
            </DialogTitle>
            <DialogContent>
              {selectedReco && (
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>{selectedReco.reco_id}</Typography>
                    <Chip label={selectedReco.status} color={getStatusColor(selectedReco.status)} sx={{ mb: 2 }} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom>Source Data</Typography>
                    <Typography variant="body2">
                      Sensor: {selectedReco.sensorData ? selectedReco.sensorData.sensorId : 'N/A'}
                    </Typography>
                    <Typography variant="body2">
                      Location: {selectedReco.locationData?.location_name || 'N/A'}
                    </Typography>
                    <Typography variant="body2">
                      Generated: {selectedReco.reco_generatedAt 
                        ? new Date(selectedReco.reco_generatedAt).toLocaleString() 
                        : 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom>Environmental Conditions</Typography>
                    {selectedReco.sensorData ? (
                      <>
                        <Typography variant="body2">Soil Moisture: {selectedReco.sensorData.soilMoisture}%</Typography>
                        <Typography variant="body2">Temperature: {selectedReco.sensorData.temperature}°C</Typography>
                        <Typography variant="body2">pH Level: {selectedReco.sensorData.pH}</Typography>
                        <Typography variant="body2">
                          Recorded: {selectedReco.sensorData.timestamp ? 
                            new Date(selectedReco.sensorData.timestamp).toLocaleString() : 'N/A'}
                        </Typography>
                      </>
                    ) : (
                      <Typography variant="body2" color="text.secondary">No sensor data available</Typography>
                    )}
                    {selectedReco.locationData && (
                      <>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          Coordinates: {selectedReco.locationData.location_latitude}, {selectedReco.locationData.location_longitude}
                        </Typography>
                      </>
                    )}
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>Recommended Seedlings ({selectedReco.recommendedSeedlings?.length || 0})</Typography>
                    <Grid container spacing={2}>
                      {(selectedReco.recommendedSeedlings || []).map((seedling, idx) => (
                        <Grid item xs={12} sm={6} md={4} key={seedling.id || idx}>
                          <Card variant="outlined" sx={{ p: 2, height: '100%' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <Avatar sx={{ bgcolor: 'primary.main', mr: 1, width: 32, height: 32 }}>
                                {idx + 1}
                              </Avatar>
                              <Chip 
                                size="small" 
                                label={seedling.seedling_isNative ? 'Native' : 'Non-native'} 
                                color={seedling.seedling_isNative ? 'success' : 'default'}
                                variant="outlined"
                              />
                            </Box>
                            <Typography variant="body2" fontWeight="medium" gutterBottom>
                              {seedling.seedling_commonName || 'Unknown'}
                            </Typography>
                            <Typography variant="caption" color="textSecondary" gutterBottom sx={{ display: 'block' }}>
                              {seedling.seedling_scientificName || 'No scientific name'}
                            </Typography>
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="caption" display="block">
                                Moisture: {seedling.seedling_prefMoisture || 'N/A'}%
                              </Typography>
                              <Typography variant="caption" display="block">
                                Temp: {seedling.seedling_prefTemp || 'N/A'}°C
                              </Typography>
                              <Typography variant="caption" display="block">
                                pH: {seedling.seedling_prefpH || 'N/A'}
                              </Typography>
                            </Box>
                            <Box sx={{ mt: 1 }}>
                              <LinearProgress
                                variant="determinate"
                                value={seedling.confidenceScore * 100 || 50}
                                color={getConfidenceColor(seedling.confidenceScore * 100 || 50)}
                                sx={{ height: 6, borderRadius: 3 }}
                              />
                              <Typography variant="caption" sx={{ mt: 0.5, display: 'block', textAlign: 'center' }}>
                                {Math.round(seedling.confidenceScore * 100) || 50}% confidence
                              </Typography>
                            </Box>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>Overall Algorithm Confidence</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ width: '100%' }}>
                        <LinearProgress
                          variant="determinate"
                          value={selectedReco.reco_confidenceScore}
                          color={getConfidenceColor(selectedReco.reco_confidenceScore)}
                          sx={{ height: 10, borderRadius: 4 }}
                        />
                      </Box>
                      <Typography variant="h6">{selectedReco.reco_confidenceScore}%</Typography>
                    </Box>
                  </Grid>
                </Grid>
              )}
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={handleCloseDialog}>Close</Button>
              <Button 
                variant="contained" 
                onClick={() => {
                  handleImplementRecommendation(selectedReco);
                  handleCloseDialog();
                }} 
                disabled={saving}
                startIcon={saving ? <CircularProgress size={20} /> : <ExecuteIcon />}
                sx={{ bgcolor: '#2e7d32' }}
              >
                {saving ? 'Implementing...' : 'Implement'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <Dialog open={deleteDialogOpen} onClose={cancelDelete} maxWidth="sm" fullWidth>
            <DialogTitle>Delete Recommendation</DialogTitle>
            <DialogContent>
              <Typography>
                Are you sure you want to delete recommendation <strong>"{recoToDelete?.reco_id}"</strong>?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                This action will mark the recommendation as deleted and it will no longer appear in the list.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={cancelDelete}>Cancel</Button>
              <Button 
                onClick={confirmDelete} 
                color="error" 
                variant="contained"
                disabled={saving}
                startIcon={saving ? <CircularProgress size={20} /> : <DeleteIcon />}
              >
                {saving ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>

        {/* Success Snackbar */}
        <Snackbar
          open={!!success}
          autoHideDuration={4000}
          onClose={() => setSuccess(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            severity="success" 
            onClose={() => setSuccess(false)} 
            sx={{ width: '100%', borderRadius: 2 }}
            icon={<CheckCircleIcon />}
          >
            {success}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
}

export default Recommendations;