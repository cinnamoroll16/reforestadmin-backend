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
  TableSortLabel,
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
  Avatar
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  PlayArrow as ExecuteIcon,
  TrendingUp as ConfidenceIcon,
  Science as AlgorithmIcon,
  EmojiNature as SeedlingIcon
} from '@mui/icons-material';
import { useTheme, useMediaQuery } from '@mui/material';
import ReForestAppBar from './AppBar.js';
import Navigation from './Navigation.js';
import { auth } from '../firebase.js';

// Sample recommendation data
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
  const [recommendations, setRecommendations] = useState(initialRecommendations);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [order, setOrder] = useState('desc');
  const [orderBy, setOrderBy] = useState('reco_generatedAt');
  const [filter, setFilter] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedReco, setSelectedReco] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [mobileOpen, setMobileOpen] = useState(false);
  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  
  const user = auth.currentUser;
  const handleLogout = () => auth.signOut();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));


  // Handle sorting
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Handle filtering
  const filteredRecommendations = recommendations.filter(reco => {
    const matchesSearch = reco.reco_id.toLowerCase().includes(filter.toLowerCase()) ||
                         reco.sensorData_id.toLowerCase().includes(filter.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || reco.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Sort recommendations
  const sortedRecommendations = filteredRecommendations.sort((a, b) => {
    if (a[orderBy] < b[orderBy]) {
      return order === 'asc' ? -1 : 1;
    }
    if (a[orderBy] > b[orderBy]) {
      return order === 'asc' ? 1 : -1;
    }
    return 0;
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

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Box sx={{ display: 'flex' }}>
          {/* App Bar */}
          <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={user} onLogout={handleLogout} />
    
          {/* Side Navigation */}
          <Navigation mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} isMobile={isMobile} />
    
    <Box sx={{ width: '100%', p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, color: '#2e7d32', fontWeight: 600 }}>
        Planting Recommendations
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Recommendations
              </Typography>
              <Typography variant="h4" component="div">
                {recommendations.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Average Confidence
              </Typography>
              <Typography variant="h4" component="div">
                {Math.round(recommendations.reduce((sum, reco) => sum + reco.reco_confidenceScore, 0) / recommendations.length)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Pending Review
              </Typography>
              <Typography variant="h4" component="div">
                {recommendations.filter(r => r.status === 'Pending').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Implemented
              </Typography>
              <Typography variant="h4" component="div">
                {recommendations.filter(r => r.status === 'Implemented').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters and Controls */}
      <Paper sx={{ mb: 2, p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Search Recommendations"
              variant="outlined"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search by Recommendation ID or Sensor ID"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
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
          <Grid item xs={12} sm={2}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              fullWidth
              sx={{ py: 1.5, backgroundColor: '#2e7d32' }}
            >
              Generate New
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Recommendations Table */}
      <Paper sx={{ width: '100%', mb: 2 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sortDirection={orderBy === 'reco_id' ? order : false}>
                  <TableSortLabel
                    active={orderBy === 'reco_id'}
                    direction={orderBy === 'reco_id' ? order : 'asc'}
                    onClick={() => handleRequestSort('reco_id')}
                  >
                    Recommendation ID
                  </TableSortLabel>
                </TableCell>
                <TableCell>Sensor ID</TableCell>
                <TableCell>Inventory ID</TableCell>
                <TableCell>Recommended Seedlings</TableCell>
                <TableCell sortDirection={orderBy === 'reco_confidenceScore' ? order : false}>
                  <TableSortLabel
                    active={orderBy === 'reco_confidenceScore'}
                    direction={orderBy === 'reco_confidenceScore' ? order : 'asc'}
                    onClick={() => handleRequestSort('reco_confidenceScore')}
                  >
                    Confidence Score
                  </TableSortLabel>
                </TableCell>
                <TableCell sortDirection={orderBy === 'reco_generatedAt' ? order : false}>
                  <TableSortLabel
                    active={orderBy === 'reco_generatedAt'}
                    direction={orderBy === 'reco_generatedAt' ? order : 'asc'}
                    onClick={() => handleRequestSort('reco_generatedAt')}
                  >
                    Generated At
                  </TableSortLabel>
                </TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedRecommendations
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
                          icon={<SeedlingIcon />}
                        />
                        <Chip 
                          size="small" 
                          label={seedlingData[reco.seedling_Id2]?.name || reco.seedling_Id2} 
                          variant="outlined"
                          icon={<SeedlingIcon />}
                        />
                        <Chip 
                          size="small" 
                          label={seedlingData[reco.seedling_Id3]?.name || reco.seedling_Id3} 
                          variant="outlined"
                          icon={<SeedlingIcon />}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ConfidenceIcon color={getConfidenceColor(reco.reco_confidenceScore)} />
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
                    <TableCell>{formatDate(reco.reco_generatedAt)}</TableCell>
                    <TableCell>
                      <Chip 
                        label={reco.status} 
                        color={getStatusColor(reco.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="View Details">
                        <IconButton onClick={() => handleViewClick(reco)}>
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Execute Recommendation">
                        <IconButton color="primary">
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
          count={sortedRecommendations.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Recommendation Detail Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AlgorithmIcon color="primary" />
            Recommendation Details
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedReco && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
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
                <Typography variant="subtitle2" color="textSecondary">
                  Source Data
                </Typography>
                <Typography>Sensor: {selectedReco.sensorData_id}</Typography>
                <Typography>Inventory: {selectedReco.inventory_Id}</Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Environmental Conditions
                </Typography>
                <Typography>Soil: {selectedReco.soilConditions}</Typography>
                <Typography>Rainfall: {selectedReco.rainfall}</Typography>
                <Typography>Temperature: {selectedReco.temperature}</Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Recommended Seedlings (Priority Order)
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Avatar sx={{ bgcolor: 'primary.main', mx: 'auto', mb: 1 }}>
                          1
                        </Avatar>
                        <Typography variant="h6">
                          {seedlingData[selectedReco.seedling_Id1]?.name || selectedReco.seedling_Id1}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {seedlingData[selectedReco.seedling_Id1]?.type}
                        </Typography>
                        <Typography variant="caption">
                          Growth: {seedlingData[selectedReco.seedling_Id1]?.growthRate}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Avatar sx={{ bgcolor: 'secondary.main', mx: 'auto', mb: 1 }}>
                          2
                        </Avatar>
                        <Typography variant="h6">
                          {seedlingData[selectedReco.seedling_Id2]?.name || selectedReco.seedling_Id2}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {seedlingData[selectedReco.seedling_Id2]?.type}
                        </Typography>
                        <Typography variant="caption">
                          Growth: {seedlingData[selectedReco.seedling_Id2]?.growthRate}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Avatar sx={{ bgcolor: 'info.main', mx: 'auto', mb: 1 }}>
                          3
                        </Avatar>
                        <Typography variant="h6">
                          {seedlingData[selectedReco.seedling_Id3]?.name || selectedReco.seedling_Id3}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {seedlingData[selectedReco.seedling_Id3]?.type}
                        </Typography>
                        <Typography variant="caption">
                          Growth: {seedlingData[selectedReco.seedling_Id3]?.growthRate}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">
                  Algorithm Confidence
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <ConfidenceIcon color={getConfidenceColor(selectedReco.reco_confidenceScore)} />
                  <Box sx={{ width: '100%' }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={selectedReco.reco_confidenceScore} 
                      sx={{
                        height: 10,
                        borderRadius: 4,
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: selectedReco.reco_confidenceScore >= 90 ? 'green' :
                                          selectedReco.reco_confidenceScore >= 75 ? 'orange' : 'red'
                        }
                      }}
                    />  
                  </Box>
                  <Typography variant="h6">
                    {selectedReco.reco_confidenceScore}%
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="caption" color="textSecondary">
                  Generated at: {formatDate(selectedReco.reco_generatedAt)}
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
          <Button variant="contained" onClick={handleCloseDialog}>
            Implement Recommendation
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
    </Box>
  );
}

export default Recommendations;