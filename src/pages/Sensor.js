// src/pages/Sensors.js
import React, { useState } from 'react';
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
  Toolbar,
  Button,
  Grid,
  useMediaQuery,
  useTheme,
  Card,
  CardContent,
  LinearProgress,
  InputAdornment,
  alpha
} from '@mui/material';
import {
  CalendarMonth as CalendarIcon,
  LocationOn as LocationIcon,
  Search as SearchIcon,
  SensorsOutlined as SensorsIcon,   // ✅ Use this instead
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import ReForestAppBar from './AppBar.js';
import Navigation from './Navigation.js';
import { auth } from '../firebase.js';

const drawerWidth = 240;

// Sample sensor data
const initialSensors = [
  { id: 1, sensor_id: 'SEN-001', location: 'North Field', type: 'Soil Moisture', lastCalibration: '2024-01-15', status: 'Active', reading: '32%' },
  { id: 2, sensor_id: 'SEN-002', location: 'South Field', type: 'Temperature', lastCalibration: '2024-02-20', status: 'Active', reading: '24°C' },
  { id: 3, sensor_id: 'SEN-003', location: 'East Slope', type: 'Temperature', lastCalibration: '2023-12-10', status: 'Needs Calibration', reading: '26°C' },
  { id: 4, sensor_id: 'SEN-004', location: 'West Slope', type: 'Soil Moisture', lastCalibration: '2024-03-05', status: 'Active', reading: '28%' },
  { id: 5, sensor_id: 'SEN-005', location: 'Central Valley', type: 'pH level', lastCalibration: '2023-11-30', status: 'Maintenance Required', reading: '6.8' },
];

function Sensors() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const navigate = useNavigate();

  const user = auth.currentUser;
  const handleLogout = () => auth.signOut();

  const [sensors, setSensors] = useState(initialSensors);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [filter, setFilter] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Simulate data refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  // Navigate to recommendations
  const handleViewRecommendations = (sensor) => {
    navigate('/recommendations', { state: { sensor } });
  };

  // Filtering
  const filteredSensors = sensors.filter(sensor => {
    const matchesSearch = sensor.sensor_id.toLowerCase().includes(filter.toLowerCase()) ||
                          sensor.location.toLowerCase().includes(filter.toLowerCase()) ||
                          sensor.type.toLowerCase().includes(filter.toLowerCase());
    const matchesType = filterType === 'all' || sensor.type === filterType;
    const matchesStatus = filterStatus === 'all' || sensor.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'success';
      case 'Needs Calibration': return 'warning';
      case 'Maintenance Required': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Active': return <CheckCircleIcon fontSize="small" />;
      case 'Needs Calibration': return <WarningIcon fontSize="small" />;
      case 'Maintenance Required': return <WarningIcon fontSize="small" />;
      default: return null;
    }
  };

  const sensorTypes = [...new Set(sensors.map(sensor => sensor.type))];
  const statusTypes = [...new Set(sensors.map(sensor => sensor.status))];

  // Statistics
  const activeSensors = sensors.filter(s => s.status === 'Active').length;
  const needsCalibration = sensors.filter(s => s.status === 'Needs Calibration').length;
  const needsMaintenance = sensors.filter(s => s.status === 'Maintenance Required').length;

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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" sx={{ color: '#2e7d32', fontWeight: 600 }}>
              Sensor Dashboard
            </Typography>
            <Button 
              variant="outlined" 
              startIcon={<RefreshIcon />} 
              onClick={handleRefresh}
              disabled={isRefreshing}
              size="small"
            >
              Refresh
            </Button>
          </Box>

          {/* Statistics Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ 
                      bgcolor: alpha(theme.palette.success.main, 0.2), 
                      p: 1.5, 
                      borderRadius: 2,
                      mr: 2
                    }}>
                      <SensorsIcon color="success" />
                    </Box>
                    <Box>
                      <Typography variant="h5" fontWeight="bold">
                        {sensors.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Sensors
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ 
                      bgcolor: alpha(theme.palette.success.main, 0.2), 
                      p: 1.5, 
                      borderRadius: 2,
                      mr: 2
                    }}>
                      <CheckCircleIcon color="success" />
                    </Box>
                    <Box>
                      <Typography variant="h5" fontWeight="bold">
                        {activeSensors}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Active Sensors
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ 
                      bgcolor: alpha(theme.palette.warning.main, 0.2), 
                      p: 1.5, 
                      borderRadius: 2,
                      mr: 2
                    }}>
                      <WarningIcon color="warning" />
                    </Box>
                    <Box>
                      <Typography variant="h5" fontWeight="bold">
                        {needsCalibration + needsMaintenance}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Need Attention
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
              <Grid item xs={12} md={5}>
                <TextField
                  fullWidth
                  size="small"
                  label="Search sensors"
                  variant="outlined"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Sensor Type"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  SelectProps={{
                    native: true,
                  }}
                >
                  <option value="all">All Types</option>
                  {sensorTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Status"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  SelectProps={{
                    native: true,
                  }}
                >
                  <option value="all">All Status</option>
                  {statusTypes.map(status => <option key={status} value={status}>{status}</option>)}
                </TextField>
              </Grid>
            </Grid>
          </Paper>

          {/* Sensor Table */}
          <Paper sx={{ width: '100%', mb: 2, borderRadius: 2, overflow: 'hidden' }}>
            {isRefreshing && <LinearProgress />}
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: theme.palette.grey[50] }}>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight="bold">Sensor ID</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight="bold">Location</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight="bold">Type</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight="bold">Reading</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight="bold">Last Calibration</Typography>
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
                  {filteredSensors.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(sensor => (
                    <TableRow 
                      key={sensor.id} 
                      hover 
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <SensorsIcon sx={{ mr: 1, color: 'primary.main', fontSize: 20 }} />
                          <Typography variant="body2">
                            {sensor.sensor_id}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <LocationIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                          <Typography variant="body2">
                            {sensor.location}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={sensor.type} 
                          size="small" 
                          variant="outlined"
                          color={
                            sensor.type === 'Temperature' ? 'primary' : 
                            sensor.type === 'Soil Moisture' ? 'success' : 'secondary'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Typography 
                          variant="body2" 
                          fontWeight="medium"
                          color={
                            sensor.type === 'Temperature' ? 'primary.main' : 
                            sensor.type === 'Soil Moisture' ? 'success.main' : 'secondary.main'
                          }
                        >
                          {sensor.reading}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CalendarIcon sx={{ mr: 1, fontSize: 18, color: 'text.secondary' }} />
                          <Typography variant="body2">
                            {new Date(sensor.lastCalibration).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          icon={getStatusIcon(sensor.status)}
                          label={sensor.status} 
                          color={getStatusColor(sensor.status)} 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Button 
                          variant="outlined" 
                          size="small" 
                          onClick={() => handleViewRecommendations(sensor)}
                        >
                          View Recommendations
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredSensors.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}

export default Sensors;