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
  TableSortLabel,
  TextField,
  Typography,
  Chip,
  Toolbar,
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
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  CalendarMonth as CalendarIcon,
  LocationOn as LocationIcon,
  Build as BuildIcon,
} from '@mui/icons-material';
import ReForestAppBar from './AppBar.js';
import Navigation from './Navigation.js';
import { auth } from '../firebase.js';

const drawerWidth = 240;

// Sample sensor data
const initialSensors = [
  { id: 1, sensor_id: 'SEN-001', location: 'North Field', type: 'Soil Moisture', lastCalibration: '2024-01-15', status: 'Active' },
  { id: 2, sensor_id: 'SEN-002', location: 'South Field', type: 'Temperature', lastCalibration: '2024-02-20', status: 'Active' },
  { id: 3, sensor_id: 'SEN-003', location: 'East Slope', type: 'Temperature', lastCalibration: '2023-12-10', status: 'Needs Calibration' },
  { id: 4, sensor_id: 'SEN-004', location: 'West Slope', type: 'Soil Moisture', lastCalibration: '2024-03-05', status: 'Active' },
  { id: 5, sensor_id: 'SEN-005', location: 'Central Valley', type: 'pH level', lastCalibration: '2023-11-30', status: 'Maintenance Required' },
];

function Sensors() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);


  const user = auth.currentUser;
  const handleLogout = () => auth.signOut();

  const [sensors, setSensors] = useState(initialSensors);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('sensor_id');
  const [filter, setFilter] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Sorting
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
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

  const sortedSensors = filteredSensors.sort((a, b) => {
    if (a[orderBy] < b[orderBy]) return order === 'asc' ? -1 : 1;
    if (a[orderBy] > b[orderBy]) return order === 'asc' ? 1 : -1;
    return 0;
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

  const handleEditClick = (sensor) => {
    setSelectedSensor(sensor);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedSensor(null);
  };

  const handleSaveSensor = () => {
    if (selectedSensor) {
      setSensors(sensors.map(sensor => sensor.id === selectedSensor.id ? selectedSensor : sensor));
    }
    handleCloseDialog();
  };

  const sensorTypes = [...new Set(sensors.map(sensor => sensor.type))];
  const statusTypes = [...new Set(sensors.map(sensor => sensor.status))];

  return (
    <Box sx={{ display: 'flex' }}>
      {/* App Bar */}
      <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={user} onLogout={handleLogout} />

      {/* Side Navigation */}
      <Navigation mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} isMobile={isMobile} />

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - ${drawerWidth}px)` } }}>
        <Toolbar />

        <Box sx={{ width: '100%', p: 3 }}>
          <Typography variant="h4" gutterBottom sx={{ mb: 3, color: '#2e7d32', fontWeight: 600 }}>
            Sensor Management
          </Typography>

          {/* Filters */}
          <Paper sx={{ mb: 2, p: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Search Sensors"
                  variant="outlined"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Search by ID, location, or type"
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth>
                  <InputLabel>Sensor Type</InputLabel>
                  <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} label="Sensor Type">
                    <MenuItem value="all">All Types</MenuItem>
                    {sensorTypes.map(type => <MenuItem key={type} value={type}>{type}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} label="Status">
                    <MenuItem value="all">All Status</MenuItem>
                    {statusTypes.map(status => <MenuItem key={status} value={status}>{status}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={2}>
                <Button variant="contained" startIcon={<AddIcon />} fullWidth sx={{ py: 1.5, backgroundColor: '#2e7d32' }}>
                  Add Sensor
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* Sensor Table */}
          <Paper sx={{ width: '100%', mb: 2 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sortDirection={orderBy === 'sensor_id' ? order : false}>
                      <TableSortLabel active={orderBy === 'sensor_id'} direction={order} onClick={() => handleRequestSort('sensor_id')}>
                        Sensor ID
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}><LocationIcon sx={{ mr: 1, fontSize: 20 }} />Location</Box>
                    </TableCell>
                    <TableCell sortDirection={orderBy === 'type' ? order : false}>
                      <TableSortLabel active={orderBy === 'type'} direction={order} onClick={() => handleRequestSort('type')}>Type</TableSortLabel>
                    </TableCell>
                    <TableCell sortDirection={orderBy === 'lastCalibration' ? order : false}>
                      <TableSortLabel active={orderBy === 'lastCalibration'} direction={order} onClick={() => handleRequestSort('lastCalibration')}>Last Calibration</TableSortLabel>
                    </TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedSensors.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(sensor => (
                    <TableRow key={sensor.id}>
                      <TableCell>{sensor.sensor_id}</TableCell>
                      <TableCell>{sensor.location}</TableCell>
                      <TableCell>{sensor.type}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CalendarIcon sx={{ mr: 1, fontSize: 18, color: 'text.secondary' }} />
                          {new Date(sensor.lastCalibration).toLocaleDateString()}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={sensor.status} color={getStatusColor(sensor.status)} size="small" />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Edit Sensor">
                          <IconButton onClick={() => handleEditClick(sensor)}><EditIcon /></IconButton>
                        </Tooltip>
                        <Tooltip title="Schedule Calibration">
                          <IconButton><BuildIcon /></IconButton>
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
              count={sortedSensors.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </Paper>

          {/* Edit Dialog */}
          <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
            <DialogTitle>Edit Sensor</DialogTitle>
            <DialogContent>
              {selectedSensor && (
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12}>
                    <TextField fullWidth label="Sensor ID" value={selectedSensor.sensor_id} disabled />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth label="Location" value={selectedSensor.location} onChange={(e) => setSelectedSensor({ ...selectedSensor, location: e.target.value })} />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Type</InputLabel>
                      <Select value={selectedSensor.type} onChange={(e) => setSelectedSensor({ ...selectedSensor, type: e.target.value })}>
                        {sensorTypes.map(type => <MenuItem key={type} value={type}>{type}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth label="Last Calibration" type="date" value={selectedSensor.lastCalibration} onChange={(e) => setSelectedSensor({ ...selectedSensor, lastCalibration: e.target.value })} InputLabelProps={{ shrink: true }} />
                  </Grid>
                </Grid>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>Cancel</Button>
              <Button onClick={handleSaveSensor} variant="contained">Save Changes</Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Box>
    </Box>
  );
}

export default Sensors;
