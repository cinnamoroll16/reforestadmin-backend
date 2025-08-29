import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Box,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  Grid,
  Typography
} from '@mui/material';
import {
  Search,
  Refresh,
  WarningAmber,
  Sensors,
  LocationOn,
  CalendarMonth,
  WbSunny,
  Opacity,
  Air
} from '@mui/icons-material';

// Generate mock sensor data
const generateMockSensorData = () => {
  const sensorTypes = ['Temperature/Humidity', 'Soil Moisture', 'CO2 Level', 'Light Intensity', 'Rainfall'];
  const locations = ['North Forest Zone A', 'South Forest Zone B', 'East Forest Zone C', 'West Forest Zone D', 'Central Forest Zone E', 'Northwest Forest Zone F'];
  const statuses = ['active', 'offline', 'error'];
  
  const sensors = [];
  
  for (let i = 1; i <= 15; i++) {
    const randomType = sensorTypes[Math.floor(Math.random() * sensorTypes.length)];
    const randomLocation = locations[Math.floor(Math.random() * locations.length)];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    // Generate a random date within the last year
    const randomDate = new Date();
    randomDate.setMonth(randomDate.getMonth() - Math.floor(Math.random() * 12));
    
    sensors.push({
      id: i,
      sensor_id: `SF-${1000 + i}`,
      sensor_location: randomLocation,
      sensor_type: randomType,
      sensor_lastCalibrationDate: randomDate.toISOString().split('T')[0],
      status: randomStatus
    });
  }
  
  return sensors;
};

const Sensor = () => {
  const [sensors, setSensors] = useState([]);
  const [filteredSensors, setFilteredSensors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Initialize with mock data
  useEffect(() => {
    const mockSensorData = generateMockSensorData();
    setSensors(mockSensorData);
    setFilteredSensors(mockSensorData);
  }, []);

  // Filter sensors based on search term, status, and type
  useEffect(() => {
    let result = sensors;
    
    if (searchTerm) {
      result = result.filter(sensor => 
        sensor.sensor_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sensor.sensor_location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sensor.sensor_type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (statusFilter !== 'all') {
      result = result.filter(sensor => sensor.status === statusFilter);
    }
    
    if (typeFilter !== 'all') {
      result = result.filter(sensor => sensor.sensor_type === typeFilter);
    }
    
    setFilteredSensors(result);
  }, [searchTerm, statusFilter, typeFilter, sensors]);

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
  };

  const handleTypeFilterChange = (event) => {
    setTypeFilter(event.target.value);
  };

  const handleRefresh = () => {
    // Simulate data refresh
    const updatedSensors = sensors.map(sensor => {
      if (sensor.status === 'error' && Math.random() > 0.5) {
        return {...sensor, status: 'active'};
      }
      return sensor;
    });
    setSensors(updatedSensors);
  };

  const getStatusChip = (status) => {
    let color;
    switch (status) {
      case 'active':
        color = 'success';
        break;
      case 'offline':
        color = 'default';
        break;
      case 'error':
        color = 'error';
        break;
      default:
        color = 'default';
    }
    
    return <Chip label={status.charAt(0).toUpperCase() + status.slice(1)} color={color} size="small" />;
  };

  const needsCalibration = (dateString) => {
    const calibrationDate = new Date(dateString);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return calibrationDate < sixMonthsAgo;
  };

  const getSensorIcon = (type) => {
    switch (type) {
      case 'Temperature/Humidity':
        return <WbSunny sx={{ color: '#ff9800' }} />;
      case 'Soil Moisture':
        return <Opacity sx={{ color: '#2196f3' }} />;
      case 'CO2 Level':
        return <Air sx={{ color: '#9e9e9e' }} />;
      case 'Light Intensity':
        return <WbSunny sx={{ color: '#ffeb3b' }} />;
      case 'Rainfall':
        return <Opacity sx={{ color: '#03a9f4' }} />;
      default:
        return <Sensors sx={{ color: 'primary.main' }} />;
    }
  };

  // Count sensors by status
  const activeSensors = sensors.filter(s => s.status === 'active').length;
  const offlineSensors = sensors.filter(s => s.status === 'offline').length;
  const errorSensors = sensors.filter(s => s.status === 'error').length;

  return (
    <Box sx={{ py: 4 }}>
      <Typography 
        variant="h3" 
        component="h1" 
        gutterBottom 
        align="center"
        color="primary"
        sx={{ mb: 4 }}
      >
        Sensor Management
      </Typography>
      <Typography 
        variant="h6" 
        component="p" 
        gutterBottom 
        align="center"
        sx={{ mb: 4, color: 'text.secondary' }}
      >
        Monitor and manage environmental sensors for accurate data collection
      </Typography>
      
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" component="div" color="success.main">
                {activeSensors}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Sensors
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" component="div" color="text.secondary">
                {offlineSensors}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Offline Sensors
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" component="div" color="error.main">
                {errorSensors}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Needs Attention
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" component="div">
                {sensors.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Sensors
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <TextField
            placeholder="Search sensors..."
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ width: 300 }}
          />
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={handleStatusFilterChange}
                label="Status"
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="offline">Offline</MenuItem>
                <MenuItem value="error">Error</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={typeFilter}
                onChange={handleTypeFilterChange}
                label="Type"
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="Temperature/Humidity">Temperature/Humidity</MenuItem>
                <MenuItem value="Soil Moisture">Soil Moisture</MenuItem>
                <MenuItem value="CO2 Level">CO2 Level</MenuItem>
                <MenuItem value="Light Intensity">Light Intensity</MenuItem>
                <MenuItem value="Rainfall">Rainfall</MenuItem>
              </Select>
            </FormControl>
            
            <Tooltip title="Refresh sensor data">
              <IconButton onClick={handleRefresh} color="primary">
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        
        <TableContainer sx={{ maxHeight: 440 }}>
          <Table stickyHeader sx={{ minWidth: 650 }} aria-label="sensor table">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white' }}>Sensor ID</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white' }}>Location</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white' }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white' }}>Last Calibration</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredSensors.map((sensor) => (
                <TableRow
                  key={sensor.id}
                  sx={{ 
                    '&:last-child td, &:last-child th': { border: 0 },
                    backgroundColor: sensor.status === 'error' ? 'rgba(244, 67, 54, 0.08)' : 'inherit'
                  }}
                >
                  <TableCell component="th" scope="row">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Sensors sx={{ mr: 1, color: 'primary.main' }} />
                      {sensor.sensor_id}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <LocationOn sx={{ mr: 1, color: 'text.secondary', fontSize: 18 }} />
                      {sensor.sensor_location}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {getSensorIcon(sensor.sensor_type)}
                      <span style={{ marginLeft: 8 }}>{sensor.sensor_type}</span>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CalendarMonth sx={{ mr: 1, color: 'text.secondary', fontSize: 18 }} />
                      {sensor.sensor_lastCalibrationDate}
                      {needsCalibration(sensor.sensor_lastCalibrationDate) && (
                        <Tooltip title="Needs calibration">
                          <WarningAmber color="warning" sx={{ ml: 1 }} />
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{getStatusChip(sensor.status)}</TableCell>
                  <TableCell>
                    <Tooltip title="View sensor details">
                      <IconButton size="small" color="primary">
                        <span style={{ fontSize: '0.9rem' }}>Details</span>
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        
        {filteredSensors.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Sensors sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography variant="h6" color="text.secondary">
              No sensors found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try adjusting your search or filter criteria
            </Typography>
          </Box>
        )}
      </Paper>
      
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          ReForest Project © {new Date().getFullYear()} - Environmental Monitoring System
        </Typography>
      </Box>
    </Box>
  );
};

export default Sensor;