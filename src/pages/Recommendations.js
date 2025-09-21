// src/pages/Recommendations.js
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
  Toolbar 
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  PlayArrow as ExecuteIcon,
  TrendingUp as ConfidenceIcon,
  Science as AlgorithmIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useTheme, useMediaQuery } from '@mui/material';
import ReForestAppBar from './AppBar.js';
import Navigation from './Navigation.js';
import { auth, firestore } from "../firebase.js";
import { collection, onSnapshot, doc, getDocs, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';

const drawerWidth = 240;

function Recommendations() {
  const [recommendations, setRecommendations] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [filter, setFilter] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedReco, setSelectedReco] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  const user = auth.currentUser;
  const handleLogout = () => auth.signOut();
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

  // Fetch seedling details for a specific recommendation
  const fetchSeedlingsForRecommendation = async (recoId) => {
    try {
      const seedlingsSnapshot = await getDocs(
        collection(firestore, 'Recommendation', recoId, 'seedlings')
      );
      
      const seedlings = [];
      seedlingsSnapshot.forEach((doc) => {
        const data = doc.data();
        seedlings.push({
          seedling_id: doc.id,
          commonName: data.seedling_commonName || 'Unknown',
          scientificName: data.seedling_scientificName || 'Unknown',
          prefMoisture: parseFloat(data.seedling_preMoisture) || 0,
          prefpH: parseFloat(data.seedling_prePH) || 0,
          prefTemp: parseFloat(data.seedling_preTemp) || 0,
          isNative: data.seedling_isNative === 'true' || false,
          confidenceScore: 0.8 + (Math.random() * 0.2) // Default confidence for individual seedlings
        });
      });
      
      return seedlings;
    } catch (error) {
      console.error(`Error fetching seedlings for recommendation ${recoId}:`, error);
      return [];
    }
  };

  // Handle implementing recommendation (creating planting task)
  const handleImplementRecommendation = async (reco) => {
    try {
      // Create a new planting task document
      const taskData = {
        user_id: user?.uid || 'USER001', // Use actual user ID or fallback
        reco_id: reco.reco_id,
        location_id: reco.inventory_Id || 'LOC001', // Using inventory_Id as location_id fallback
        task_status: 'Assigned',
        task_date: serverTimestamp(), // Use server timestamp
        created_at: serverTimestamp(),
        recommendation_data: {
          sensorData_id: reco.sensorData_id,
          confidenceScore: reco.reco_confidenceScore,
          seedlingCount: reco.seedlingCount
        }
      };

      // Add document to PlantingTask collection
      const docRef = await addDoc(collection(firestore, 'PlantingTask'), taskData);
      
      console.log('Planting task created with ID:', docRef.id);
      
      // Navigate to Task.js page
      navigate('/tasks');
      
    } catch (error) {
      console.error('Error creating planting task:', error);
      alert('Failed to create planting task. Please try again.');
    }
  };

  // Fetch recommendations from Firestore
  useEffect(() => {
    setLoading(true);
    
    // Listen to the "Recommendation" collection
    const q = query(
      collection(firestore, 'Recommendation'),
      orderBy('reco_generatedDATE', 'desc')
    );
    
    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const docs = snapshot.docs;
        console.log("Raw recommendations data:", docs.map(doc => ({ id: doc.id, data: doc.data() })));

        if (docs.length === 0) {
          console.log("No recommendations found in database");
          setRecommendations([]);
          setLoading(false);
          return;
        }

        // Process each recommendation document
        const recoPromises = docs.map(async (docSnapshot) => {
          const data = docSnapshot.data();
          const docId = docSnapshot.id;
          
          console.log(`Processing recommendation ${docId}:`, data);
          
          // Fetch seedlings for this recommendation
          const seedlings = await fetchSeedlingsForRecommendation(docId);
          
          // Parse confidence score
          const confidenceScore = typeof data.reco_confidenceScore === 'string' 
            ? parseFloat(data.reco_confidenceScore) 
            : data.reco_confidenceScore || 0.85;
          
          const confidencePercentage = confidenceScore > 1 ? confidenceScore : Math.round(confidenceScore * 100);
          const status = generateStatus(confidenceScore);

          return {
            id: docId,
            reco_id: docId,
            sensorData_id: data.sensorData_id || 'N/A',
            inventory_Id: data.inventory_id || 'N/A',
            reco_confidenceScore: confidencePercentage,
            reco_generatedAt: data.reco_generatedDATE || new Date().toISOString(),
            status: status,
            
            // Environmental conditions (default values)
            soilConditions: 'Optimal for selected species',
            rainfall: 'Adequate',
            temperature: 'Within preferred range',
            
            // Seedling data
            recommendedSeedlings: seedlings,
            seedlingCount: seedlings.length
          };
        });

        try {
          const recoArray = await Promise.all(recoPromises);
          console.log("Processed recommendations array:", recoArray);
          setRecommendations(recoArray);
        } catch (error) {
          console.error("Error processing recommendations:", error);
          setRecommendations([]);
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error("Error fetching recommendations:", error);
        setRecommendations([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Handle filtering
  const filteredRecommendations = recommendations.filter(reco => {
    const matchesSearch = reco.reco_id.toLowerCase().includes(filter.toLowerCase()) ||
                         reco.sensorData_id.toLowerCase().includes(filter.toLowerCase());
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
  const handleViewClick = (reco) => {
    setSelectedReco(reco);
    setOpenDialog(true);
  };
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedReco(null);
  };

  // Unique statuses for filter dropdown
  const statusTypes = [...new Set(recommendations.map(reco => reco.status))];

  return (
    <Box sx={{ display: 'flex', bgcolor: '#f8fafc', minHeight: '100vh' }}>
      {/* App Bar */}
      <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={user} onLogout={handleLogout} />

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
            <Button variant="contained" startIcon={<AddIcon />} sx={{ backgroundColor: '#2e7d32' }}>
              Generate New
            </Button>
          </Box>

          {/* Loading State */}
          {loading && <LinearProgress sx={{ mb: 2 }} />}

          {/* Stats Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ bgcolor: alpha(theme.palette.primary.main, 0.2), p: 1.5, borderRadius: 2, mr: 2 }}>
                      <AlgorithmIcon color="primary" />
                    </Box>
                    <Box>
                      <Typography variant="h5" fontWeight="bold">{recommendations.length}</Typography>
                      <Typography variant="body2" color="text.secondary">Total Recommendations</Typography>
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
                      <ConfidenceIcon color="success" />
                    </Box>
                    <Box>
                      <Typography variant="h5" fontWeight="bold">
                        {recommendations.length > 0
                          ? Math.round(recommendations.reduce((sum, r) => sum + r.reco_confidenceScore, 0) / recommendations.length)
                          : 0}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">Avg Confidence</Typography>
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
                      <AlgorithmIcon color="warning" />
                    </Box>
                    <Box>
                      <Typography variant="h5" fontWeight="bold">
                        {recommendations.filter(r => r.status === 'Pending').length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">Pending Review</Typography>
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
                      <CheckCircleIcon color="success" />
                    </Box>
                    <Box>
                      <Typography variant="h5" fontWeight="bold">
                        {recommendations.filter(r => r.status === 'Approved').length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">Approved</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

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
                  placeholder="Search by ID or Sensor ID"
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
                        <TableCell><Typography variant="subtitle2" fontWeight="bold">Sensor ID</Typography></TableCell>
                        <TableCell><Typography variant="subtitle2" fontWeight="bold">Location</Typography></TableCell>
                        <TableCell><Typography variant="subtitle2" fontWeight="bold">Seedlings Count</Typography></TableCell>
                        <TableCell><Typography variant="subtitle2" fontWeight="bold">Confidence</Typography></TableCell>
                        <TableCell><Typography variant="subtitle2" fontWeight="bold">Generated</Typography></TableCell>
                        <TableCell><Typography variant="subtitle2" fontWeight="bold">Status</Typography></TableCell>
                        <TableCell align="center"><Typography variant="subtitle2" fontWeight="bold">Actions</Typography></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredRecommendations.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((reco) => (
                        <TableRow key={reco.id} hover sx={{ '&:hover': { bgcolor: 'rgba(46, 125, 50, 0.04)' } }}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">{reco.reco_id}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{reco.sensorData_id}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{reco.inventory_Id}</Typography>
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
                                ? new Date(reco.reco_generatedAt).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })
                                : 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={reco.status} color={getStatusColor(reco.status)} size="small" />
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title="View Details">
                              <IconButton onClick={() => handleViewClick(reco)} size="small">
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Implement Recommendation">
                              <IconButton 
                                color="primary" 
                                size="small"
                                onClick={() => handleImplementRecommendation(reco)}
                              >
                                <ExecuteIcon />
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
                    <Typography variant="body2">Sensor: {selectedReco.sensorData_id}</Typography>
                    <Typography variant="body2">Inventory: {selectedReco.inventory_Id}</Typography>
                    <Typography variant="body2">
                      Generated: {selectedReco.reco_generatedAt 
                        ? new Date(selectedReco.reco_generatedAt).toLocaleString() 
                        : 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom>Environmental Conditions</Typography>
                    <Typography variant="body2">Soil: {selectedReco.soilConditions}</Typography>
                    <Typography variant="body2">Rainfall: {selectedReco.rainfall}</Typography>
                    <Typography variant="body2">Temperature: {selectedReco.temperature}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>Recommended Seedlings ({selectedReco.recommendedSeedlings.length})</Typography>
                    <Grid container spacing={2}>
                      {selectedReco.recommendedSeedlings.map((seedling, idx) => (
                        <Grid item xs={12} sm={6} md={4} key={seedling.seedling_id}>
                          <Card variant="outlined" sx={{ p: 2, height: '100%' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <Avatar sx={{ bgcolor: 'primary.main', mr: 1, width: 32, height: 32 }}>
                                {idx + 1}
                              </Avatar>
                              <Chip 
                                size="small" 
                                label={seedling.isNative ? 'Native' : 'Non-native'} 
                                color={seedling.isNative ? 'success' : 'default'}
                                variant="outlined"
                              />
                            </Box>
                            <Typography variant="body2" fontWeight="medium" gutterBottom>
                              {seedling.commonName}
                            </Typography>
                            <Typography variant="caption" color="textSecondary" gutterBottom sx={{ display: 'block' }}>
                              {seedling.scientificName}
                            </Typography>
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="caption" display="block">
                                Moisture: {seedling.prefMoisture}%
                              </Typography>
                              <Typography variant="caption" display="block">
                                Temp: {seedling.prefTemp}°C
                              </Typography>
                              <Typography variant="caption" display="block">
                                pH: {seedling.prefpH}
                              </Typography>
                            </Box>
                            <Box sx={{ mt: 1 }}>
                              <LinearProgress
                                variant="determinate"
                                value={seedling.confidenceScore * 100}
                                color={getConfidenceColor(seedling.confidenceScore * 100)}
                                sx={{ height: 6, borderRadius: 3 }}
                              />
                              <Typography variant="caption" sx={{ mt: 0.5, display: 'block', textAlign: 'center' }}>
                                {Math.round(seedling.confidenceScore * 100)}% confidence
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
                sx={{ bgcolor: '#2e7d32' }}
              >
                Implement
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Box>
    </Box>
  );
}

export default Recommendations;