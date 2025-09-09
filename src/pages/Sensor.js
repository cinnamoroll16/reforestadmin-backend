// src/pages/Sensors.js
import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { rtdb, auth } from '../firebase.js';
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
  Typography,
  Button,
  LinearProgress,
  Toolbar,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { SensorsOutlined as SensorsIcon, CheckCircle as CheckCircleIcon, Warning as WarningIcon } from '@mui/icons-material';
import ReForestAppBar from './AppBar.js';
import Navigation from './Navigation.js';
import { useNavigate } from 'react-router-dom';

const drawerWidth = 240;

function Sensors() {
  const theme = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const navigate = useNavigate();

  const user = auth.currentUser;
  const handleLogout = () => auth.signOut();

  const [sensors, setSensors] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    
    const sensorsRef = ref(rtdb, "sensors");
    const statusRef = ref(rtdb, "sensorStatus");

    // First, get the status data
    const statusUnsubscribe = onValue(statusRef, (statusSnap) => {
      const statusData = statusSnap.val() || {};
      console.log("Status data:", statusData); // Debug log

      // Then get the sensors data
      const sensorsUnsubscribe = onValue(sensorsRef, (sensorsSnap) => {
        const sensorsObj = sensorsSnap.val() || {};
        console.log("Sensors data:", sensorsObj); // Debug log

        if (Object.keys(sensorsObj).length === 0) {
          console.log("No sensors found in database");
          setSensors([]);
          setLoading(false);
          return;
        }

        const sensorsArray = Object.entries(sensorsObj).map(([id, sensor]) => {
          console.log(`Processing sensor ${id}:`, sensor); // Debug log
          
          // Extract location information from nested Location object
          let locationName = "N/A";
          let coordinates = null;
          
          if (sensor.Location && typeof sensor.Location === 'object') {
            const locationEntries = Object.entries(sensor.Location);
            if (locationEntries.length > 0) {
              const [locationId, locationData] = locationEntries[0]; // Get first location
              locationName = locationData.location_name || "N/A";
              coordinates = {
                latitude: locationData.location_latitude,
                longitude: locationData.location_longitude
              };
            }
          }
          
          const readingsObj = sensor.sensorData || {};
          console.log(`Readings for ${id}:`, readingsObj); // Debug log

          // Convert readings to array with IDs
          const readingsArr = Object.entries(readingsObj).map(([rid, r]) => ({
            readingId: rid,
            ...r,
          }));

          // Sort readings by timestamp DESC (latest first)
          readingsArr.sort(
            (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
          );

          // Pick latest reading
          const latest = readingsArr[0] || {};
          console.log(`Latest reading for ${id}:`, latest); // Debug log

          return {
            id,
            location: locationName,
            coordinates: coordinates,
            status: statusData[sensor.sensorStat_id]?.status_name || "Unknown",
            statusDescription: statusData[sensor.sensorStat_id]?.description || "",
            lastCalibration: sensor.sensor_lastCalibrationDate || null,

            // Latest values from the most recent reading
            ph: latest.pH !== undefined ? latest.pH : "N/A",
            soilMoisture: latest.soilMoisture !== undefined ? latest.soilMoisture : "N/A",
            temperature: latest.temperature !== undefined ? latest.temperature : "N/A",

            // Keep all readings if needed later
            readings: readingsArr,
            
            // Additional metadata
            timestamp: latest.timestamp || null,
          };
        });

        console.log("Processed sensors array:", sensorsArray); // Debug log
        setSensors(sensorsArray);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching sensors:", error);
        setLoading(false);
      });

      // Clean up sensors listener when component unmounts
      return () => sensorsUnsubscribe();
    }, (error) => {
      console.error("Error fetching sensor status:", error);
      setLoading(false);
    });

    // Clean up status listener when component unmounts
    return () => statusUnsubscribe();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Force a refresh by setting loading state
    setLoading(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setLoading(false);
    }, 1000);
  };

  const handleGenerateML = (sensor) => {
    navigate('/ml', { state: { sensor } });
  };

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Format values for display
  const formatValue = (value, unit = '') => {
    if (value === "N/A" || value === null || value === undefined) {
      return "N/A";
    }
    return `${value}${unit}`;
  };

  // Get status color based on status name
  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'error';
      case 'under maintenance':
        return 'warning';
      default:
        return 'info';
    }
  };

  // Get status icon based on status name
  const getStatusIcon = (status) => {
    switch (status.toLowerCase()) {
      case 'active':
        return <CheckCircleIcon />;
      case 'inactive':
        return <WarningIcon />;
      case 'under maintenance':
        return <WarningIcon />;
      default:
        return <WarningIcon />;
    }
  };

  return (
    <Box sx={{ display: 'flex', bgcolor: '#f8fafc', minHeight: '100vh' }}>
      <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={user} onLogout={handleLogout} />
      <Navigation mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} isMobile={false} />

      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - ${drawerWidth}px)` } }}>
        <Toolbar />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" sx={{ color: '#2e7d32', fontWeight: 600, mb: 1 }}>
              Sensor Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {sensors.length} sensor{sensors.length !== 1 ? 's' : ''} found
            </Typography>
          </Box>
          <Button 
            variant="outlined" 
            onClick={handleRefresh} 
            disabled={isRefreshing || loading}
            sx={{ minWidth: 100 }}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Box>

        {(isRefreshing || loading) && <LinearProgress sx={{ mb: 2 }} />}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <Typography variant="body1" color="textSecondary">
              Loading sensors data...
            </Typography>
          </Box>
        ) : sensors.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <Typography variant="body1" color="textSecondary">
              No sensors found in the database.
            </Typography>
          </Box>
        ) : (
          <Paper sx={{ width: '100%', mb: 2, borderRadius: 2, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: theme.palette.grey[50] }}>
                    <TableCell><Typography variant="subtitle2" fontWeight="bold">Sensor ID</Typography></TableCell>
                    <TableCell><Typography variant="subtitle2" fontWeight="bold">Location</Typography></TableCell>
                    <TableCell><Typography variant="subtitle2" fontWeight="bold">pH</Typography></TableCell>
                    <TableCell><Typography variant="subtitle2" fontWeight="bold">Soil Moisture (%)</Typography></TableCell>
                    <TableCell><Typography variant="subtitle2" fontWeight="bold">Temperature (°C)</Typography></TableCell>
                    <TableCell><Typography variant="subtitle2" fontWeight="bold">Last Reading</Typography></TableCell>
                    <TableCell><Typography variant="subtitle2" fontWeight="bold">Status</Typography></TableCell>
                    <TableCell align="center"><Typography variant="subtitle2" fontWeight="bold">Actions</Typography></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sensors.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((sensor) => (
                    <TableRow key={sensor.id} hover sx={{ '&:hover': { bgcolor: 'rgba(46, 125, 50, 0.04)' } }}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <SensorsIcon sx={{ mr: 1, color: 'primary.main', fontSize: 20 }} />
                          <Typography variant="body2" fontWeight="medium">{sensor.id}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 200 }} title={sensor.location}>
                          {sensor.location}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ 
                          color: sensor.ph !== "N/A" ? (sensor.ph >= 6.0 && sensor.ph <= 8.0 ? 'success.main' : 'warning.main') : 'text.secondary' 
                        }}>
                          {formatValue(sensor.ph)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ 
                          color: sensor.soilMoisture !== "N/A" ? (sensor.soilMoisture >= 30 ? 'success.main' : 'error.main') : 'text.secondary' 
                        }}>
                          {formatValue(sensor.soilMoisture, '%')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ 
                          color: sensor.temperature !== "N/A" ? (sensor.temperature >= 20 && sensor.temperature <= 35 ? 'success.main' : 'warning.main') : 'text.secondary' 
                        }}>
                          {formatValue(sensor.temperature, '°C')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {sensor.timestamp
                            ? new Date(sensor.timestamp).toLocaleString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : "N/A"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="outlined"
                          color={getStatusColor(sensor.status)}
                          startIcon={getStatusIcon(sensor.status)}
                          sx={{ minWidth: 120 }}
                          title={sensor.statusDescription}
                        >
                          {sensor.status}
                        </Button>
                      </TableCell>
                      <TableCell align="center">
                        <Button 
                          variant="contained" 
                          size="small" 
                          onClick={() => handleGenerateML(sensor)}
                          sx={{ 
                            minWidth: 80,
                            bgcolor: '#2e7d32',
                            '&:hover': { bgcolor: '#1b5e20' }
                          }}
                        >
                          Generate
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
              count={sensors.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </Paper>
        )}
      </Box>
    </Box>
  );
}

export default Sensors;