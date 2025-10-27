// src/pages/Dashboard.js
import React, { useState, useEffect } from 'react';
import {
  LinearProgress,
  Box,
  Toolbar,
  useMediaQuery,
  useTheme,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Alert,
  Snackbar,
  Chip,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import {
  People,
  PendingActions,
  CheckCircle,
  LocationOn,
  TrendingUp,
  Refresh,
  Check,
  Clear,
  Sensors,
  Nature
} from '@mui/icons-material';
import ReForestAppBar from "../pages/AppBar.jsx";
import Navigation from "./Navigation.jsx";
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api.js';

// Recharts components
import {
  BarChart as RechartsBar,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer
} from 'recharts';

// Leaflet map components
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default marker icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Backend API URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Create custom icons for sensors and planting sites
const createCustomIcon = (color) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 30px;
        height: 30px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 10px;
          height: 10px;
          background-color: white;
          border-radius: 50%;
        "></div>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
};

const sensorIcon = createCustomIcon('#2196f3'); // Blue for sensors
const plantingSiteIcon = createCustomIcon('#4caf50'); // Green for planting sites

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const COLORS = ['#4caf50', '#2196f3', '#ff9800', '#f44336', '#9c27b0'];

function Dashboard() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [mapView, setMapView] = useState('both'); // 'sensors', 'sites', or 'both'
  const [dashboardData, setDashboardData] = useState({
    users: {
      total: 0,
      admins: 0,
      officers: 0,
      users: 0
    },
    pendingRequests: [],
    plantingTasks: {
      active: 0,
      completed: 0,
      pending: 0,
      cancelled: 0
    },
    plantingSites: [],
    sensors: [],
    monthlyRequestsData: [],
    taskDistribution: []
  });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Fetch data from your backend API
  // In Dashboard.js - Update fetchDashboardData
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Use the apiService for all requests
      const [
        usersData,
        pendingRequests,
        plantingTasks,
        locationsData,
        sensorsData
      ] = await Promise.all([
        apiService.getUsers(),
        apiService.getPlantingRequests('pending'),
        apiService.getPlantingTasks(),
        apiService.getLocations(),
        apiService.getSensors()
      ]);

      // Process users data for your backend structure
      const userBreakdown = usersData.reduce((acc, user) => {
        acc.total++;
        const role = user.roleRef?.split('/').pop() || 'user';
        if (role === 'admin') acc.admins++;
        else if (role === 'officer') acc.officers++;
        else if (role === 'user') acc.users++;
        return acc;
      }, { total: 0, admins: 0, officers: 0, users: 0 });

      // Process planting tasks
      const taskBreakdown = plantingTasks.reduce((acc, task) => {
        const status = (task.task_status || '').toLowerCase();
        if (status === 'active') acc.active++;
        else if (status === 'completed') acc.completed++;
        else if (status === 'pending') acc.pending++;
        else if (status === 'cancelled') acc.cancelled++;
        return acc;
      }, { active: 0, completed: 0, pending: 0, cancelled: 0 });

      // Process locations
      const plantingSites = locationsData.map(location => ({
        id: location.id,
        name: location.location_name || 'Unnamed Location',
        lat: parseFloat(location.latitude) || null,
        lng: parseFloat(location.longitude) || null,
        status: location.status || 'active',
        ...location
      })).filter(site => site.lat && site.lng && !isNaN(site.lat) && !isNaN(site.lng));

      // Process sensors
      const sensors = sensorsData.map(sensor => ({
        id: sensor.id,
        name: sensor.sensor_location || `Sensor ${sensor.id.slice(0, 8)}`,
        lat: parseFloat(sensor.latitude) || null,
        lng: parseFloat(sensor.longitude) || null,
        sensorType: sensor.sensor_type || 'Multi-parameter',
        status: sensor.sensor_status || 'offline',
        lastCalibration: sensor.sensor_lastCalibrationDate,
        latestReading: sensor.latest_reading || null,
        location_id: sensor.location_id
      })).filter(sensor => sensor.lat && sensor.lng && !isNaN(sensor.lat) && !isNaN(sensor.lng));

      setDashboardData({
        users: userBreakdown,
        pendingRequests: pendingRequests.slice(0, 10), // Limit for dashboard
        plantingTasks: taskBreakdown,
        plantingSites,
        sensors,
        monthlyRequestsData: generateMonthlyData(),
        taskDistribution: [
          { name: 'Active', value: taskBreakdown.active, color: COLORS[0] },
          { name: 'Completed', value: taskBreakdown.completed, color: COLORS[1] },
          { name: 'Pending', value: taskBreakdown.pending, color: COLORS[2] },
          { name: 'Cancelled', value: taskBreakdown.cancelled, color: COLORS[3] }
        ].filter(item => item.value > 0)
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setSnackbar({
        open: true,
        message: 'Error loading dashboard data: ' + error.message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate monthly data for charts (mock data for now)
  const generateMonthlyData = () => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthName = monthNames[date.getMonth()];
      
      // Mock data - in real app, you'd aggregate from actual requests
      const count = Math.floor(Math.random() * 20) + 5;

      monthlyData.push({
        month: monthName,
        requests: count
      });
    }

    return monthlyData;
  };

  // Handle request approval/rejection
  const handleRequestAction = async (requestId, action) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/planting-requests/${requestId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: action }),
      });

      if (!response.ok) {
        throw new Error('Failed to update request status');
      }

      setSnackbar({
        open: true,
        message: `Request ${action} successfully!`,
        severity: 'success'
      });
      
      // Refresh data
      fetchDashboardData();
    } catch (error) {
      console.error('Error updating request:', error);
      setSnackbar({
        open: true,
        message: 'Error updating request: ' + error.message,
        severity: 'error'
      });
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const handleLogout = () => logout();
  const handleRefresh = () => fetchDashboardData();

  // Overview Cards Data
  const overviewCards = [
    {
      title: 'Total Users',
      value: dashboardData.users.total,
      subtitle: `Admins: ${dashboardData.users.admins} | Officers: ${dashboardData.users.officers} | Users: ${dashboardData.users.users}`,
      icon: <People sx={{ fontSize: 40 }} />,
      color: '#4caf50'
    },
    {
      title: 'Active Sensors',
      value: dashboardData.sensors.length,
      subtitle: `Monitoring ${dashboardData.plantingSites.length} locations`,
      icon: <Sensors sx={{ fontSize: 40 }} />,
      color: '#2196f3'
    },
    {
      title: 'Pending Requests',
      value: dashboardData.pendingRequests.length,
      subtitle: 'Awaiting approval',
      icon: <PendingActions sx={{ fontSize: 40 }} />,
      color: '#ff9800'
    },
    {
      title: 'Completed Tasks',
      value: dashboardData.plantingTasks.completed,
      subtitle: 'Successfully finished',
      icon: <CheckCircle sx={{ fontSize: 40 }} />,
      color: '#ffc107'
    }
  ];

  // Calculate map center
  const defaultCenter = [10.3157, 123.8854]; // Cebu City
  let mapCenter = defaultCenter;
  
  if (mapView === 'sensors' && dashboardData.sensors.length > 0) {
    mapCenter = [dashboardData.sensors[0].lat, dashboardData.sensors[0].lng];
  } else if (mapView === 'sites' && dashboardData.plantingSites.length > 0) {
    mapCenter = [dashboardData.plantingSites[0].lat, dashboardData.plantingSites[0].lng];
  } else if (dashboardData.sensors.length > 0) {
    mapCenter = [dashboardData.sensors[0].lat, dashboardData.sensors[0].lng];
  } else if (dashboardData.plantingSites.length > 0) {
    mapCenter = [dashboardData.plantingSites[0].lat, dashboardData.plantingSites[0].lng];
  }

  // Determine what to show on map
  const showSensors = mapView === 'sensors' || mapView === 'both';
  const showSites = mapView === 'sites' || mapView === 'both';

  // Get user role for display
  const userRole = user?.roleRef?.split('/').pop() || 'user';
  const isAdmin = userRole === 'admin';
  const isOfficer = userRole === 'officer';

  return (
    <Box sx={{ display: "flex", minHeight: '100vh' }}>
      <ReForestAppBar
        handleDrawerToggle={handleDrawerToggle}
        user={user}
        onLogout={handleLogout}
      />

      <Navigation
        mobileOpen={mobileOpen}
        handleDrawerToggle={handleDrawerToggle}
        isMobile={isMobile}
        user={user}
      />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 3 },
          width: { md: "calc(100% - 240px)" },
          backgroundColor: '#f8f9fa'
        }}
      >
        <Toolbar />
        
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600, color: '#2e7d32' }}>
                ReForest Dashboard
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Welcome back, {user?.user_firstname || user?.displayName || 'User'}! 
                {isAdmin ? ' Manage and monitor reforestation activities.' : 
                 isOfficer ? ' Monitor planting activities and sensor data.' : 
                 ' Track your planting activities and progress.'}
              </Typography>
            </Box>
            <Button 
              startIcon={<Refresh />} 
              onClick={handleRefresh} 
              variant="outlined"
              disabled={loading}
            >
              Refresh Data
            </Button>
          </Box>
        </Box>

        {/* Loading State */}
        {loading && (
          <Box sx={{ mb: 3 }}>
            <LinearProgress sx={{ borderRadius: 1 }} />
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
              Loading dashboard data...
            </Typography>
          </Box>
        )}

        {/* Overview Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {overviewCards.map((card, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card 
                sx={{ 
                  height: '100%', 
                  background: `linear-gradient(135deg, ${card.color}20 0%, ${card.color}10 100%)`,
                  border: `1px solid ${card.color}30`,
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 3
                  }
                }}
              >
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="h4" fontWeight="bold" color={card.color}>
                        {card.value}
                      </Typography>
                      <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
                        {card.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {card.subtitle}
                      </Typography>
                    </Box>
                    <Box sx={{ color: card.color }}>
                      {card.icon}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Map and Pending Requests */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Interactive Map */}
          <Grid item xs={12} lg={isAdmin || isOfficer ? 8 : 12}>
            <Paper sx={{ p: 2, height: 500 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                  <LocationOn sx={{ mr: 1 }} />
                  Location Map
                </Typography>
                
                <ToggleButtonGroup
                  value={mapView}
                  exclusive
                  onChange={(e, newView) => newView && setMapView(newView)}
                  size="small"
                >
                  <ToggleButton value="both">Both</ToggleButton>
                  <ToggleButton value="sensors">Sensors ({dashboardData.sensors.length})</ToggleButton>
                  <ToggleButton value="sites">Sites ({dashboardData.plantingSites.length})</ToggleButton>
                </ToggleButtonGroup>
              </Box>

              <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <Chip 
                  icon={<Sensors />} 
                  label={`${dashboardData.sensors.length} Active Sensors`} 
                  color="primary" 
                  size="small"
                  sx={{ display: showSensors ? 'flex' : 'none' }}
                />
                <Chip 
                  icon={<Nature />} 
                  label={`${dashboardData.plantingSites.length} Planting Sites`} 
                  color="success" 
                  size="small"
                  sx={{ display: showSites ? 'flex' : 'none' }}
                />
              </Box>
              
              <Box sx={{ height: 380, borderRadius: 1, overflow: 'hidden' }}>
                {(dashboardData.sensors.length > 0 || dashboardData.plantingSites.length > 0) ? (
                  <MapContainer
                    center={mapCenter}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    
                    {/* Render IoT Sensors */}
                    {showSensors && dashboardData.sensors.map((sensor) => (
                      <React.Fragment key={`sensor-${sensor.id}`}>
                        <Marker 
                          position={[sensor.lat, sensor.lng]}
                          icon={sensorIcon}
                        >
                          <Popup>
                            <Box sx={{ minWidth: 200 }}>
                              <Typography variant="subtitle1" fontWeight="bold" color="primary">
                                🔵 IoT Sensor
                              </Typography>
                              <Divider sx={{ my: 1 }} />
                              <Typography variant="body2"><strong>Location:</strong> {sensor.name}</Typography>
                              <Typography variant="body2"><strong>Sensor ID:</strong> {sensor.id.slice(0, 12)}...</Typography>
                              <Typography variant="body2"><strong>Type:</strong> {sensor.sensorType}</Typography>
                              <Typography variant="body2">
                                <strong>Status:</strong> {' '}
                                <Chip 
                                  label={sensor.status === 'active' ? 'Online' : 'Offline'} 
                                  size="small" 
                                  color={sensor.status === 'active' ? 'success' : 'error'}
                                />
                              </Typography>
                              <Typography variant="body2" sx={{ mt: 1 }}>
                                <strong>Coordinates:</strong><br />
                                Lat: {sensor.lat.toFixed(6)}<br />
                                Lng: {sensor.lng.toFixed(6)}
                              </Typography>
                              
                              {sensor.latestReading && (
                                <>
                                  <Divider sx={{ my: 1 }} />
                                  <Typography variant="caption" fontWeight="bold">Latest Reading:</Typography>
                                  <Typography variant="caption" display="block">
                                    Temp: {sensor.latestReading.temperature || 'N/A'}°C
                                  </Typography>
                                  <Typography variant="caption" display="block">
                                    Moisture: {sensor.latestReading.soilMoisture || 'N/A'}%
                                  </Typography>
                                  <Typography variant="caption" display="block">
                                    pH: {sensor.latestReading.pH || 'N/A'}
                                  </Typography>
                                  {sensor.latestReading.timestamp && (
                                    <Typography variant="caption" display="block" color="text.secondary">
                                      {new Date(sensor.latestReading.timestamp).toLocaleString()}
                                    </Typography>
                                  )}
                                </>
                              )}
                              
                              <Button 
                                size="small" 
                                variant="outlined" 
                                fullWidth 
                                sx={{ mt: 1 }}
                                onClick={() => window.open(
                                  `https://www.google.com/maps/search/?api=1&query=${sensor.lat},${sensor.lng}`,
                                  '_blank'
                                )}
                              >
                                Open in Google Maps
                              </Button>
                            </Box>
                          </Popup>
                        </Marker>
                        
                        <Circle
                          center={[sensor.lat, sensor.lng]}
                          radius={50}
                          pathOptions={{
                            color: '#2196f3',
                            fillColor: '#2196f3',
                            fillOpacity: 0.1
                          }}
                        />
                      </React.Fragment>
                    ))}
                    
                    {/* Render Planting Sites */}
                    {showSites && dashboardData.plantingSites.map((site) => (
                      <Marker 
                        key={`site-${site.id}`} 
                        position={[site.lat, site.lng]}
                        icon={plantingSiteIcon}
                      >
                        <Popup>
                          <Box sx={{ minWidth: 180 }}>
                            <Typography variant="subtitle1" fontWeight="bold" color="success.main">
                              🌱 Planting Site
                            </Typography>
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="body2"><strong>{site.name}</strong></Typography>
                            <Typography variant="body2">Status: {site.status}</Typography>
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              <strong>Coordinates:</strong><br />
                              {site.lat.toFixed(6)}, {site.lng.toFixed(6)}
                            </Typography>
                            <Button 
                              size="small" 
                              variant="outlined" 
                              color="success"
                              fullWidth 
                              sx={{ mt: 1 }}
                              onClick={() => window.open(
                                `https://waze.com/ul?ll=${site.lat},${site.lng}&navigate=yes`,
                                '_blank'
                              )}
                            >
                              Navigate with Waze
                            </Button>
                          </Box>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                ) : (
                  <Box
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: '#f5f5f5',
                      borderRadius: 1
                    }}
                  >
                    <LocationOn sx={{ fontSize: 48, color: '#bdbdbd', mb: 2 }} />
                    <Typography color="text.secondary">
                      No sensors or planting sites with valid coordinates
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                      Deploy sensors and add locations with latitude and longitude
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>

          {/* Pending Requests - Side Panel (Only for Admin/Officer) */}
          {(isAdmin || isOfficer) && (
            <Grid item xs={12} lg={4}>
              <Paper sx={{ p: 2, height: 500 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                    <PendingActions sx={{ mr: 1 }} />
                    Pending Requests
                  </Typography>
                  <Chip 
                    label={dashboardData.pendingRequests.length} 
                    color="warning" 
                    size="small"
                  />
                </Box>
                <TableContainer sx={{ maxHeight: 420 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Details</strong></TableCell>
                        <TableCell align="center"><strong>Actions</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dashboardData.pendingRequests.map((request) => (
                        <TableRow key={request.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {request.fullName || request.requesterName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {request.locationRef || request.site}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {request.preferred_date || request.preferredDate}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <IconButton 
                              color="success" 
                              size="small"
                              onClick={() => handleRequestAction(request.id, 'approved')}
                              title="Approve"
                            >
                              <Check fontSize="small" />
                            </IconButton>
                            <IconButton 
                              color="error" 
                              size="small"
                              onClick={() => handleRequestAction(request.id, 'declined')}
                              title="Decline"
                            >
                              <Clear fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                      {dashboardData.pendingRequests.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={2} align="center">
                            <Typography color="text.secondary" sx={{ py: 3 }}>
                              No pending requests
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          )}
        </Grid>

        {/* Charts Section */}
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
              <TrendingUp sx={{ mr: 1 }} />
              Analytics Overview
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {/* Monthly Requests Bar Chart */}
            <Grid item xs={12} md={8}>
              <Box sx={{ p: 2, border: "1px solid #e0e0e0", borderRadius: 1 }}>
                <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                  Planting Requests (Last 6 Months)
                </Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsBar data={dashboardData.monthlyRequestsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="requests" fill="#4caf50" name="Requests" />
                  </RechartsBar>
                </ResponsiveContainer>
              </Box>
            </Grid>

            {/* Task Distribution Pie Chart */}
            <Grid item xs={12} md={4}>
              <Box sx={{ p: 2, border: "1px solid #e0e0e0", borderRadius: 1 }}>
                <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                  Task Status Distribution
                </Typography>
                {dashboardData.taskDistribution && dashboardData.taskDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={dashboardData.taskDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {dashboardData.taskDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Box sx={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography color="text.secondary">No task data available</Typography>
                  </Box>
                )}
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Box>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default Dashboard;