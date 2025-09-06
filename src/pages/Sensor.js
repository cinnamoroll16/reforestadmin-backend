// src/pages/Sensors.js
import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '../firebase.js';
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
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Toolbar,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { SensorsOutlined as SensorsIcon, CheckCircle as CheckCircleIcon, Warning as WarningIcon } from '@mui/icons-material';
import ReForestAppBar from './AppBar.js';
import Navigation from './Navigation.js';
import { auth } from '../firebase.js';
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

  // Fetch sensors from Firebase
  useEffect(() => {
    const sensorsRef = ref(rtdb, 'sensors');
    const unsubscribe = onValue(sensorsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Convert to array of one sensor
        const sensorsArray = [
          {
            id: 'SEN-001', // assign a static ID or use key if multiple sensors
            location: 'Default Field', // update if you have location
            ph: data.ph,
            soil_moisture: data.soil_moisture,
            temperature: data.temperature,
            lastCalibration: data.timestamp,
            status: 'Active', // default status
          }
        ];
        setSensors(sensorsArray);
      } else {
        setSensors([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleGenerateML = (sensor) => {
    navigate('/ml', { state: { sensor } }); // pass sensor data to ML page
  };

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box sx={{ display: 'flex', bgcolor: '#f8fafc', minHeight: '100vh' }}>
      <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={user} onLogout={handleLogout} />
      <Navigation mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} isMobile={false} />

      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - ${drawerWidth}px)` } }}>
        <Toolbar />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4" sx={{ color: '#2e7d32', fontWeight: 600 }}>
            Sensor Dashboard
          </Typography>
          <Button variant="outlined" onClick={handleRefresh} disabled={isRefreshing}>
            Refresh
          </Button>
        </Box>

        {isRefreshing && <LinearProgress sx={{ mb: 2 }} />}

        <Paper sx={{ width: '100%', mb: 2, borderRadius: 2, overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: theme.palette.grey[50] }}>
                  <TableCell><Typography variant="subtitle2" fontWeight="bold">Sensor ID</Typography></TableCell>
                  <TableCell><Typography variant="subtitle2" fontWeight="bold">Location</Typography></TableCell>
                  <TableCell><Typography variant="subtitle2" fontWeight="bold">pH</Typography></TableCell>
                  <TableCell><Typography variant="subtitle2" fontWeight="bold">Soil Moisture</Typography></TableCell>
                  <TableCell><Typography variant="subtitle2" fontWeight="bold">Temperature</Typography></TableCell>
                  <TableCell><Typography variant="subtitle2" fontWeight="bold">Last Calibration</Typography></TableCell>
                  <TableCell><Typography variant="subtitle2" fontWeight="bold">Status</Typography></TableCell>
                  <TableCell align="center"><Typography variant="subtitle2" fontWeight="bold">Actions</Typography></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sensors.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((sensor) => (
                  <TableRow key={sensor.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <SensorsIcon sx={{ mr: 1, color: 'primary.main', fontSize: 20 }} />
                        <Typography variant="body2">{sensor.id}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{sensor.location}</TableCell>
                    <TableCell>{sensor.ph}</TableCell>
                    <TableCell>{sensor.soil_moisture}%</TableCell>
                    <TableCell>{sensor.temperature}°C</TableCell>
                    <TableCell>{new Date(sensor.lastCalibration).toLocaleString()}</TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        variant="outlined"
                        color="success"
                        startIcon={<CheckCircleIcon />}
                      >
                        {sensor.status}
                      </Button>
                    </TableCell>
                    <TableCell align="center">
                      <Button variant="contained" size="small" onClick={() => handleGenerateML(sensor)}>
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
      </Box>
    </Box>
  );
}

export default Sensors;
