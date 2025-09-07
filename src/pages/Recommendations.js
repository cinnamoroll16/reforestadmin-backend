import { useState, useEffect } from 'react';
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
import { auth, rtdb } from '../firebase.js';
import { ref, onValue } from 'firebase/database';

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
  
  const user = auth.currentUser;
  const handleLogout = () => auth.signOut();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  // Calculate average confidence score from seedlings
  const calculateConfidenceScore = (seedlings) => {
    if (!seedlings || seedlings.length === 0) return 0;
    const totalScore = seedlings.reduce((sum, seedling) => sum + (seedling.confidenceScore * 100), 0);
    return Math.round(totalScore / seedlings.length);
  };

  // Generate status based on confidence score (since status is not in your JSON)
  const generateStatus = (confidenceScore) => {
    if (confidenceScore >= 85) return 'Approved';
    if (confidenceScore >= 70) return 'Pending';
    if (confidenceScore >= 50) return 'Under Review';
    return 'Needs Review';
  };

  // ✅ Fetch recommendations from Firebase
  useEffect(() => {
    setLoading(true);
    const recoRef = ref(rtdb, 'recommendations');
    
    const unsubscribe = onValue(recoRef, (snap) => {
      const data = snap.val() || {};
      console.log("Raw recommendations data:", data); // Debug log

      if (Object.keys(data).length === 0) {
        console.log("No recommendations found in database");
        setRecommendations([]);
        setLoading(false);
        return;
      }

      const recoArray = Object.entries(data).map(([id, reco]) => {
        console.log(`Processing recommendation ${id}:`, reco); // Debug log
        
        const seedlings = reco.recommendedSeedlings || [];
        const avgConfidence = calculateConfidenceScore(seedlings);
        const status = generateStatus(avgConfidence);

        return {
          id,
          reco_id: reco.reco_id || id,
          sensorData_id: reco.sensorData_id || 'N/A',
          inventory_Id: reco.inventory_id || 'N/A', // Note: using inventory_id from your JSON
          reco_confidenceScore: avgConfidence,
          reco_generatedAt: reco.reco_generateDATETIME || '', // Using your JSON field name
          status: status, // Generated based on confidence
          
          // Default values for fields not in your JSON
          soilConditions: 'Optimal for selected species',
          rainfall: 'Adequate',
          temperature: 'Within preferred range',
          
          // Seedling IDs for quick display
          seedling_Id1: seedlings[0]?.seeding_id || 'N/A',
          seedling_Id2: seedlings[1]?.seeding_id || 'N/A',
          seedling_Id3: seedlings[2]?.seeding_id || 'N/A',
          
          // Full seedling data
          recommendedSeedlings: seedlings
        };
      });

      console.log("Processed recommendations array:", recoArray); // Debug log
      setRecommendations(recoArray);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching recommendations:", error);
      setLoading(false);
    });

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
            <Typography variant="h4" sx={{ color: '#2e7d32', fontWeight: 600 }}>
              Planting Recommendations
            </Typography>
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
                      <AlgorithmIcon color="success" />
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
              <Paper sx={{ width: '100%', mb: 2, borderRadius: 2, overflow: 'hidden' }}>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: theme.palette.grey[50] }}>
                        <TableCell><Typography variant="subtitle2" fontWeight="bold">Recommendation ID</Typography></TableCell>
                        <TableCell><Typography variant="subtitle2" fontWeight="bold">Sensor ID</Typography></TableCell>
                        <TableCell><Typography variant="subtitle2" fontWeight="bold">Inventory ID</Typography></TableCell>
                        <TableCell><Typography variant="subtitle2" fontWeight="bold">Seedlings</Typography></TableCell>
                        <TableCell><Typography variant="subtitle2" fontWeight="bold">Confidence</Typography></TableCell>
                        <TableCell><Typography variant="subtitle2" fontWeight="bold">Generated</Typography></TableCell>
                        <TableCell><Typography variant="subtitle2" fontWeight="bold">Status</Typography></TableCell>
                        <TableCell align="center"><Typography variant="subtitle2" fontWeight="bold">Actions</Typography></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredRecommendations.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((reco) => (
                        <TableRow key={reco.id} hover>
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
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                              {reco.seedling_Id1 !== 'N/A' && <Chip size="small" label={reco.seedling_Id1} variant="outlined" />}
                              {reco.seedling_Id2 !== 'N/A' && <Chip size="small" label={reco.seedling_Id2} variant="outlined" />}
                              {reco.seedling_Id3 !== 'N/A' && <Chip size="small" label={reco.seedling_Id3} variant="outlined" />}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ width: '100%' }}>
                              <LinearProgress
                                variant="determinate"
                                value={reco.reco_confidenceScore}
                                color={getConfidenceColor(reco.reco_confidenceScore)}
                                sx={{ height: 8, borderRadius: 4 }}
                              />
                              <Typography variant="body2" sx={{ mt: 0.5 }}>{reco.reco_confidenceScore}%</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {reco.reco_generatedAt ? new Date(reco.reco_generatedAt).toLocaleDateString() : 'N/A'}
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
                            <Tooltip title="Execute">
                              <IconButton color="primary" size="small"><ExecuteIcon /></IconButton>
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
                    <Typography variant="body2">Generated: {selectedReco.reco_generatedAt ? new Date(selectedReco.reco_generatedAt).toLocaleString() : 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom>Environmental Conditions</Typography>
                    <Typography variant="body2">Soil: {selectedReco.soilConditions}</Typography>
                    <Typography variant="body2">Rainfall: {selectedReco.rainfall}</Typography>
                    <Typography variant="body2">Temperature: {selectedReco.temperature}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>Recommended Seedlings</Typography>
                    <Grid container spacing={2}>
                      {selectedReco.recommendedSeedlings?.map((seedling, idx) => (
                        <Grid item xs={12} sm={6} md={4} key={seedling.seeding_id}>
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
              <Button variant="contained" onClick={handleCloseDialog}>Implement</Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Box>
    </Box>
  );
}

export default Recommendations;