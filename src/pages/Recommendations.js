import { useState } from 'react';
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
  Science as AlgorithmIcon
} from '@mui/icons-material';
import { useTheme, useMediaQuery } from '@mui/material';
import ReForestAppBar from './AppBar.js';
import Navigation from './Navigation.js';
import { auth } from '../firebase.js';

const drawerWidth = 240;

// Sample recommendation data with validation
const initialRecommendations = [
  { 
    id: 1, 
    reco_id: 'REC-001', 
    sensorData_id: 'SEN-001', 
    inventory_Id: 'INV-045', 
    seedling_Id1: 'SD-101', 
    seedling_Id2: 'SD-107', 
    seedling_Id3: 'SD-112', 
    reco_confidenceScore: 92, 
    reco_generatedAt: '2024-03-15T10:30:00',
    status: 'Approved',
    soilConditions: 'Loamy, pH 6.2',
    rainfall: '1200mm/year',
    temperature: '22-28°C'
  },
  { 
    id: 2, 
    reco_id: 'REC-002', 
    sensorData_id: 'SEN-003', 
    inventory_Id: 'INV-028', 
    seedling_Id1: 'SD-205', 
    seedling_Id2: 'SD-210', 
    seedling_Id3: 'SD-201', 
    reco_confidenceScore: 85, 
    reco_generatedAt: '2024-03-14T14:45:00',
    status: 'Pending',
    soilConditions: 'Sandy, pH 5.8',
    rainfall: '900mm/year',
    temperature: '25-32°C'
  },
  { 
    id: 3, 
    reco_id: 'REC-003', 
    sensorData_id: 'SEN-002', 
    inventory_Id: 'INV-033', 
    seedling_Id1: 'SD-305', 
    seedling_Id2: 'SD-308', 
    seedling_Id3: 'SD-312', 
    reco_confidenceScore: 96, 
    reco_generatedAt: '2024-03-15T09:15:00',
    status: 'Implemented',
    soilConditions: 'Clay, pH 6.5',
    rainfall: '1500mm/year',
    temperature: '18-25°C'
  },
  { 
    id: 4, 
    reco_id: 'REC-004', 
    sensorData_id: 'SEN-005', 
    inventory_Id: 'INV-019', 
    seedling_Id1: 'SD-401', 
    seedling_Id2: 'SD-405', 
    seedling_Id3: 'SD-410', 
    reco_confidenceScore: 78, 
    reco_generatedAt: '2024-03-13T16:20:00',
    status: 'Rejected',
    soilConditions: 'Rocky, pH 6.0',
    rainfall: '800mm/year',
    temperature: '20-30°C'
  },
  { 
    id: 5, 
    reco_id: 'REC-005', 
    sensorData_id: 'SEN-004', 
    inventory_Id: 'INV-052', 
    seedling_Id1: 'SD-501', 
    seedling_Id2: 'SD-505', 
    seedling_Id3: 'SD-510', 
    reco_confidenceScore: 89, 
    reco_generatedAt: '2024-03-15T11:00:00',
    status: 'Pending',
    soilConditions: 'Volcanic, pH 6.8',
    rainfall: '2000mm/year',
    temperature: '15-22°C'
  },
];

// Validate recommendation data structure
const validateRecommendation = (reco) => {
  const requiredFields = [
    'reco_id', 
    'sensorData_id', 
    'inventory_Id', 
    'seedling_Id1', 
    'seedling_Id2', 
    'seedling_Id3', 
    'reco_confidenceScore', 
    'reco_generatedAt'
  ];
  
  return requiredFields.every(field => reco.hasOwnProperty(field) && reco[field] !== undefined && reco[field] !== null);
};

// Filter out invalid recommendations
const validRecommendations = initialRecommendations.filter(validateRecommendation);

// Seedling information mapping
const seedlingData = {
  'SD-101': { name: 'Narra', type: 'Native Hardwood', growthRate: 'Medium' },
  'SD-107': { name: 'Mahogany', type: 'Timber', growthRate: 'Fast' },
  'SD-112': { name: 'Acacia', type: 'Pioneer Species', growthRate: 'Fast' },
  'SD-205': { name: 'Bamboo', type: 'Grass', growthRate: 'Very Fast' },
  'SD-210': { name: 'Rattan', type: 'Climbing Palm', growthRate: 'Medium' },
  'SD-201': { name: 'Ipil-ipil', type: 'Nitrogen Fixer', growthRate: 'Fast' },
  'SD-305': { name: 'Mango', type: 'Fruit Tree', growthRate: 'Slow' },
  'SD-308': { name: 'Coconut', type: 'Palm', growthRate: 'Medium' },
  'SD-312': { name: 'Coffee', type: 'Cash Crop', growthRate: 'Medium' },
  'SD-401': { name: 'Pine', type: 'Conifer', growthRate: 'Slow' },
  'SD-405': { name: 'Eucalyptus', type: 'Fast-growing Timber', growthRate: 'Fast' },
  'SD-410': { name: 'Teak', type: 'Premium Timber', growthRate: 'Slow' },
  'SD-501': { name: 'Banana', type: 'Fruit Plant', growthRate: 'Very Fast' },
  'SD-505': { name: 'Papaya', type: 'Fruit Tree', growthRate: 'Fast' },
  'SD-510': { name: 'Avocado', type: 'Fruit Tree', growthRate: 'Slow' },
};

function Recommendations() {
  const [recommendations] = useState(validRecommendations);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [filter, setFilter] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedReco, setSelectedReco] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [mobileOpen, setMobileOpen] = useState(false);
  
  const user = auth.currentUser;
  const handleLogout = () => auth.signOut();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  // Handle filtering
  const filteredRecommendations = recommendations.filter(reco => {
    const matchesSearch = reco.reco_id.toLowerCase().includes(filter.toLowerCase()) ||
                         reco.sensorData_id.toLowerCase().includes(filter.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || reco.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Status chip color
  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved': return 'success';
      case 'Pending': return 'warning';
      case 'Implemented': return 'info';
      case 'Rejected': return 'error';
      default: return 'default';
    }
  };

  // Confidence score color
  const getConfidenceColor = (score) => {
    if (score >= 90) return 'success';
    if (score >= 75) return 'warning';
    return 'error';
  };

  // Open detail dialog
  const handleViewClick = (reco) => {
    setSelectedReco(reco);
    setOpenDialog(true);
  };

  // Close dialog
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedReco(null);
  };

  // Get unique statuses for filter
  const statusTypes = [...new Set(recommendations.map(reco => reco.status))];

  return (
    <Box sx={{ display: 'flex', bgcolor: '#f8fafc', minHeight: '100vh' }}>
      {/* App Bar */}
      <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={user} onLogout={handleLogout} />
  
      {/* Side Navigation */}
      <Navigation mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} isMobile={isMobile} />
  
      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - ${drawerWidth}px)` } }}>
        <Toolbar /> {/* This adds the necessary spacing below the app bar */}
        
        <Box sx={{ width: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" sx={{ color: '#2e7d32', fontWeight: 600 }}>
              Planting Recommendations
            </Typography>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />}
              sx={{ backgroundColor: '#2e7d32' }}
            >
              Generate New
            </Button>
          </Box>

          {/* Stats Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ 
                      bgcolor: alpha(theme.palette.primary.main, 0.2), 
                      p: 1.5, 
                      borderRadius: 2,
                      mr: 2
                    }}>
                      <AlgorithmIcon color="primary" />
                    </Box>
                    <Box>
                      <Typography variant="h5" fontWeight="bold">
                        {recommendations.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Recommendations
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ 
                      bgcolor: alpha(theme.palette.success.main, 0.2), 
                      p: 1.5, 
                      borderRadius: 2,
                      mr: 2
                    }}>
                      <ConfidenceIcon color="success" />
                    </Box>
                    <Box>
                      <Typography variant="h5" fontWeight="bold">
                        {Math.round(recommendations.reduce((sum, reco) => sum + reco.reco_confidenceScore, 0) / recommendations.length)}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Avg Confidence
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ 
                      bgcolor: alpha(theme.palette.warning.main, 0.2), 
                      p: 1.5, 
                      borderRadius: 2,
                      mr: 2
                    }}>
                      <AlgorithmIcon color="warning" />
                    </Box>
                    <Box>
                      <Typography variant="h5" fontWeight="bold">
                        {recommendations.filter(r => r.status === 'Pending').length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Pending Review
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ 
                      bgcolor: alpha(theme.palette.info.main, 0.2), 
                      p: 1.5, 
                      borderRadius: 2,
                      mr: 2
                    }}>
                      <AlgorithmIcon color="info" />
                    </Box>
                    <Box>
                      <Typography variant="h5" fontWeight="bold">
                        {recommendations.filter(r => r.status === 'Implemented').length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Implemented
                      </Typography>
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
                  <Select
                    value={filterStatus}
                    label="Status Filter"
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <MenuItem value="all">All Status</MenuItem>
                    {statusTypes.map(status => (
                      <MenuItem key={status} value={status}>{status}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>

          {/* Recommendations Table */}
          <Paper sx={{ width: '100%', mb: 2, borderRadius: 2, overflow: 'hidden' }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: theme.palette.grey[50] }}>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight="bold">Recommendation ID</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight="bold">Sensor ID</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight="bold">Inventory ID</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight="bold">Recommended Seedlings</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight="bold">Confidence</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight="bold">Generated</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight="bold">Status</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="subtitle2" fontWeight="bold">Actions</Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRecommendations
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((reco) => (
                      <TableRow key={reco.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {reco.reco_id}
                          </Typography>
                        </TableCell>
                        <TableCell>{reco.sensorData_id}</TableCell>
                        <TableCell>{reco.inventory_Id}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Chip 
                              size="small" 
                              label={seedlingData[reco.seedling_Id1]?.name || reco.seedling_Id1} 
                              variant="outlined"
                            />
                            <Chip 
                              size="small" 
                              label={seedlingData[reco.seedling_Id2]?.name || reco.seedling_Id2} 
                              variant="outlined"
                            />
                            <Chip 
                              size="small" 
                              label={seedlingData[reco.seedling_Id3]?.name || reco.seedling_Id3} 
                              variant="outlined"
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: '100%' }}>
                              <LinearProgress 
                                variant="determinate" 
                                value={reco.reco_confidenceScore} 
                                color={getConfidenceColor(reco.reco_confidenceScore)}
                                sx={{ height: 8, borderRadius: 4 }}
                              />
                              <Typography variant="body2" sx={{ mt: 0.5 }}>
                                {reco.reco_confidenceScore}%
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(reco.reco_generatedAt).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={reco.status} 
                            color={getStatusColor(reco.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="View Details">
                            <IconButton onClick={() => handleViewClick(reco)} size="small">
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Execute">
                            <IconButton color="primary" size="small">
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

          {/* Recommendation Detail Dialog */}
          <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
            <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AlgorithmIcon />
                Recommendation Details
              </Box>
            </DialogTitle>
            <DialogContent>
              {selectedReco && (
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      {selectedReco.reco_id}
                    </Typography>
                    <Chip 
                      label={selectedReco.status} 
                      color={getStatusColor(selectedReco.status)}
                      sx={{ mb: 2 }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                      Source Data
                    </Typography>
                    <Typography variant="body2">Sensor: {selectedReco.sensorData_id}</Typography>
                    <Typography variant="body2">Inventory: {selectedReco.inventory_Id}</Typography>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                      Environmental Conditions
                    </Typography>
                    <Typography variant="body2">Soil: {selectedReco.soilConditions}</Typography>
                    <Typography variant="body2">Rainfall: {selectedReco.rainfall}</Typography>
                    <Typography variant="body2">Temperature: {selectedReco.temperature}</Typography>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                      Recommended Seedlings
                    </Typography>
                    <Grid container spacing={1}>
                      {[selectedReco.seedling_Id1, selectedReco.seedling_Id2, selectedReco.seedling_Id3].map((seedlingId, index) => (
                        <Grid item xs={12} sm={4} key={index}>
                          <Card variant="outlined" sx={{ textAlign: 'center', p: 1 }}>
                            <Avatar sx={{ bgcolor: 'primary.main', mx: 'auto', mb: 1, width: 32, height: 32 }}>
                              {index + 1}
                            </Avatar>
                            <Typography variant="body2" fontWeight="medium">
                              {seedlingData[seedlingId]?.name || seedlingId}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {seedlingData[seedlingId]?.type}
                            </Typography>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                      Algorithm Confidence
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ width: '100%' }}>
                        <LinearProgress 
                          variant="determinate" 
                          value={selectedReco.reco_confidenceScore} 
                          color={getConfidenceColor(selectedReco.reco_confidenceScore)}
                          sx={{ height: 10, borderRadius: 4 }}
                        />  
                      </Box>
                      <Typography variant="h6">
                        {selectedReco.reco_confidenceScore}%
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              )}
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={handleCloseDialog}>Close</Button>
              <Button variant="contained" onClick={handleCloseDialog}>
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