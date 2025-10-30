// src/pages/AdminDashboard.js
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
import { collection, getDocs, getDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { ref, get } from 'firebase/database';
import { firestore, rtdb } from '../firebase.js';
import ReForestAppBar from "../pages/AppBar.jsx";
import Navigation from "./Navigation.jsx";
import { useAuth } from '../context/AuthContext.js';
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

function AdminDashboard() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [mapView, setMapView] = useState('both'); // 'sensors', 'sites', or 'both'
  const [dashboardData, setDashboardData] = useState({
    users: {
      total: 0,
      admins: 0,
      fieldUsers: 0,
      denrStaff: 0
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

  // Fetch sensor locations using API service
  const fetchSensorLocations = async () => {
    try {
      console.log('🔍 Fetching sensors via API...');
      const sensors = await apiService.getSensors();
      
      const sensorsWithLocations = await Promise.all(
        sensors.map(async (sensor) => {
          try {
            // Fetch location data if available
            let locationData = null;
            if (sensor.locationId) {
              try {
                // You might need to add a getLocationById method to your API service
                const locationDocRef = doc(firestore, 'locations', sensor.locationId);
                const locationDocSnap = await getDoc(locationDocRef);
                
                if (locationDocSnap.exists()) {
                  locationData = locationDocSnap.data();
                }
              } catch (err) {
                console.error(`Error fetching location for sensor ${sensor.id}:`, err.message);
              }
            }

            // Fetch latest sensor reading from RTDB (keep existing RTDB logic)
            let latestReading = null;
            try {
              const rtdbPath = `sensors/${sensor.id}/sensordata`;
              const sensorDataRef = ref(rtdb, rtdbPath);
              const snapshot = await get(sensorDataRef);
              
              if (snapshot.exists()) {
                const allReadings = snapshot.val();
                const readingKeys = Object.keys(allReadings).sort();
                const latestKey = readingKeys[readingKeys.length - 1];
                
                latestReading = {
                  id: latestKey,
                  ...allReadings[latestKey]
                };
              }
            } catch (err) {
              console.error(`RTDB error for sensor ${sensor.id}:`, err.message);
            }

            // Build sensor object
            const enhancedSensor = {
              id: sensor.id,
              name: locationData?.location_name || sensor.name || `Sensor ${sensor.id?.slice(0, 8)}`,
              lat: locationData ? parseFloat(locationData.location_latitude) : (sensor.latitude || sensor.lat || null),
              lng: locationData ? parseFloat(locationData.location_longitude) : (sensor.longitude || sensor.lng || null),
              sensorType: sensor.sensorType || 'Multi-parameter',
              status: sensor.status || sensor.sensor_status || 'offline',
              lastCalibration: sensor.lastCalibration || sensor.sensor_lastCalibrationDate,
              latestReading: latestReading ? {
                temperature: latestReading.temperature || 'N/A',
                soilMoisture: latestReading.soilMoisture || 'N/A',
                pH: latestReading.pH || 'N/A',
                timestamp: latestReading.timestamp || null
              } : null,
              locationId: sensor.locationId,
              locationPath: sensor.locationPath
            };
            
            return enhancedSensor;
          } catch (error) {
            console.error(`Error processing sensor ${sensor.id}:`, error);
            return null;
          }
        })
      );

      // Filter valid sensors
      const validSensors = sensorsWithLocations.filter(sensor => 
        sensor && sensor.lat && sensor.lng && !isNaN(sensor.lat) && !isNaN(sensor.lng)
      );
      
      console.log(`✅ Loaded ${validSensors.length} valid sensors`);
      return validSensors;

    } catch (error) {
      console.error('❌ Error fetching sensors via API:', error);
      // Fallback to direct Firestore if API fails
      try {
        console.log('🔄 Falling back to direct Firestore sensor fetch...');
        const sensorsSnapshot = await getDocs(collection(firestore, 'sensors'));
        const fallbackSensors = sensorsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        return fallbackSensors.filter(sensor => 
          sensor.lat && sensor.lng && !isNaN(sensor.lat) && !isNaN(sensor.lng)
        );
      } catch (fallbackError) {
        console.error('❌ Fallback sensor fetch also failed:', fallbackError);
        return [];
      }
    }
  };

  // Fetch all dashboard data using API services
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading dashboard data via API...');
      
      // 1. Fetch Users via API
      let usersData = [];
      try {
        usersData = await apiService.getUsers();
        console.log(`✅ Loaded ${usersData.length} users via API`);
      } catch (userError) {
        console.warn('⚠ API users fetch failed, falling back to Firestore:', userError.message);
        // Fallback to direct Firestore
        const usersSnapshot = await getDocs(collection(firestore, 'users'));
        usersData = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }

      // Calculate user breakdown by role
      const userBreakdown = usersData.reduce((acc, userData) => {
        acc.total++;
        const role = userData.role_id || userData.roles || userData.role || 'unknown';
        const roleLower = role.toLowerCase();
        if (roleLower.includes('admin')) acc.admins++;
        else if (roleLower.includes('field') || roleLower.includes('planter')) acc.fieldUsers++;
        else if (roleLower.includes('denr')) acc.denrStaff++;
        return acc;
      }, { total: 0, admins: 0, fieldUsers: 0, denrStaff: 0 });

      // 2. Fetch Planting Requests
      let allRequests = [];
      try {
        // Try to get planting requests via API
        const requestsData = await apiService.getPlantingRequests();
        allRequests = requestsData.map(request => ({
          id: request.id,
          requesterName: request.requesterName || `${request.user_Firstname || ''} ${request.user_Lastname || ''}`.trim() || 'Unknown User',
          type: 'Planting Request',
          site: request.locationName || request.site || 'Not specified',
          date: request.request_date || request.createdAt,
          preferredDate: request.preferred_date || request.preferredDate || 'Not specified',
          remarks: request.request_remarks || request.remarks || '-',
          status: request.request_status || request.status || 'pending',
          ...request
        }));
        console.log(`✅ Loaded ${allRequests.length} planting requests via API`);
      } catch (requestError) {
        console.warn('⚠ API planting requests fetch failed, falling back to Firestore:', requestError.message);
        
        // Fallback to direct Firestore
        const allRequestsSnapshot = await getDocs(collection(firestore, 'plantingrequests'));
        allRequests = await Promise.all(
          allRequestsSnapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();
            
            // Fetch user name
            let requesterName = 'Unknown User';
            if (data.userRef) {
              try {
                const userPath = typeof data.userRef === 'string' ? data.userRef : data.userRef.path;
                const userId = userPath.split('/').pop();
                
                const userDocRef = doc(firestore, 'users', userId);
                const userDocSnap = await getDoc(userDocRef);
                
                if (userDocSnap.exists()) {
                  const userData = userDocSnap.data();
                  requesterName = `${userData.user_Firstname || ''} ${userData.user_Lastname || ''}`.trim() || 
                                `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 
                                'Unknown User';
                }
              } catch (err) {
                console.error('Error fetching user:', err);
              }
            }

            // Fetch location name
            let locationName = 'Not specified';
            if (data.locationRef) {
              try {
                const locationPath = typeof data.locationRef === 'string' ? data.locationRef : data.locationRef.path;
                const locationId = locationPath.split('/').pop();
                
                const locationDocRef = doc(firestore, 'locations', locationId);
                const locationDocSnap = await getDoc(locationDocRef);
                
                if (locationDocSnap.exists()) {
                  locationName = locationDocSnap.data().location_name || 'Unknown Location';
                }
              } catch (err) {
                console.error('Error fetching location:', err);
              }
            }

            return {
              id: docSnap.id,
              requesterName,
              type: 'Planting Request',
              site: locationName,
              date: data.request_date,
              preferredDate: data.preferred_date || 'Not specified',
              remarks: data.request_remarks || '-',
              status: data.request_status || 'pending',
              ...data
            };
          })
        );
      }

      // Filter only pending requests
      const pendingRequests = allRequests.filter(req => 
        (req.request_status || req.status || '').toLowerCase() === 'pending'
      );

      // 3. Fetch Planting Records and Tasks
      const plantingTasks = {
        active: 0,
        completed: 0,
        pending: 0,
        cancelled: 0
      };

      try {
        // Try API first for planting records
        const recordsData = await apiService.getPlantingRecords();
        plantingTasks.completed = recordsData.length;
        console.log(`✅ Loaded ${recordsData.length} planting records via API`);
      } catch (recordsError) {
        console.warn('⚠ API planting records fetch failed, falling back to Firestore:', recordsError.message);
        // Fallback to Firestore
        const recordsSnapshot = await getDocs(collection(firestore, 'plantingrecords'));
        plantingTasks.completed = recordsSnapshot.docs.length;
      }

      try {
        // Try API for planting tasks
        const tasksData = await apiService.getPlantingTasks();
        tasksData.forEach(task => {
          const status = (task.task_status || task.status || '').toLowerCase();
          if (status === 'pending') plantingTasks.pending++;
          else if (status === 'cancelled') plantingTasks.cancelled++;
          else if (status === 'active') plantingTasks.active++;
        });
        console.log(`✅ Loaded planting tasks via API`);
      } catch (tasksError) {
        console.warn('⚠ API planting tasks fetch failed, falling back to Firestore:', tasksError.message);
        // Fallback to Firestore
        const tasksSnapshot = await getDocs(collection(firestore, 'plantingtasks'));
        tasksSnapshot.docs.forEach(taskDoc => {
          const taskData = taskDoc.data();
          const status = (taskData.task_status || '').toLowerCase();
          if (status === 'pending') plantingTasks.pending++;
          else if (status === 'cancelled') plantingTasks.cancelled++;
          else if (status === 'active') plantingTasks.active++;
        });
      }

      // 4. Fetch Planting Sites (Locations)
      let plantingSites = [];
      try {
        // Try API for locations
        const locationsData = await apiService.getLocations();
        plantingSites = locationsData.map(location => ({
          id: location.id,
          name: location.location_name || location.name || 'Unnamed Location',
          lat: parseFloat(location.location_latitude || location.latitude) || null,
          lng: parseFloat(location.location_longitude || location.longitude) || null,
          status: location.status || 'active',
          ...location
        })).filter(site => site.lat && site.lng && !isNaN(site.lat) && !isNaN(site.lng));
        console.log(`✅ Loaded ${plantingSites.length} planting sites via API`);
      } catch (locationsError) {
        console.warn('⚠ API locations fetch failed, falling back to Firestore:', locationsError.message);
        // Fallback to Firestore
        const locationsSnapshot = await getDocs(collection(firestore, 'locations'));
        plantingSites = locationsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.location_name || 'Unnamed Location',
            lat: parseFloat(data.location_latitude) || null,
            lng: parseFloat(data.location_longitude) || null,
            status: 'active',
            ...data
          };
        }).filter(site => site.lat && site.lng && !isNaN(site.lat) && !isNaN(site.lng));
      }

      // 5. Fetch Sensor Locations
      const sensors = await fetchSensorLocations();

      // 6. Generate Monthly Requests Data (last 6 months)
      const monthlyRequestsData = generateMonthlyData(allRequests);

      // 7. Task distribution for pie chart
      const taskDistribution = [
        { name: 'Active', value: plantingTasks.active, color: COLORS[0] },
        { name: 'Completed', value: plantingTasks.completed, color: COLORS[1] },
        { name: 'Pending', value: plantingTasks.pending, color: COLORS[2] },
        { name: 'Cancelled', value: plantingTasks.cancelled, color: COLORS[3] }
      ].filter(item => item.value > 0);

      setDashboardData({
        users: userBreakdown,
        pendingRequests,
        plantingTasks,
        plantingSites,
        sensors,
        monthlyRequestsData,
        taskDistribution
      });

      console.log('✅ Dashboard data loaded successfully');
      setSnackbar({
        open: true,
        message: 'Dashboard data refreshed successfully',
        severity: 'success'
      });

    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      setSnackbar({
        open: true,
        message: 'Error loading dashboard data: ' + error.message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate monthly data for charts
  const generateMonthlyData = (requests) => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentDate = new Date();
    const monthlyData = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthName = monthNames[date.getMonth()];
      
      const count = requests.filter(request => {
        let requestDate;
        if (request.request_date?.toDate) {
          requestDate = request.request_date.toDate();
        } else if (request.request_date) {
          requestDate = new Date(request.request_date);
        } else if (request.date?.toDate) {
          requestDate = request.date.toDate();
        } else if (request.date) {
          requestDate = new Date(request.date);
        } else {
          return false;
        }
        
        return requestDate && 
               requestDate.getMonth() === date.getMonth() && 
               requestDate.getFullYear() === date.getFullYear();
      }).length;

      monthlyData.push({
        month: monthName,
        requests: count
      });
    }

    return monthlyData;
  };

  // Handle request approval/rejection using API
  const handleRequestAction = async (requestId, action) => {
    try {
      console.log(`🔄 Updating request ${requestId} to status: ${action}`);
      
      // Try API first
      try {
        await apiService.updatePlantingRequest(requestId, {
          request_status: action,
          reviewedBy: user?.name || user?.user_firstname || 'Admin',
          reviewedAt: new Date().toISOString()
        });
        console.log(`✅ Request ${action} via API`);
      } catch (apiError) {
        console.warn('⚠ API request update failed, falling back to Firestore:', apiError.message);
        // Fallback to direct Firestore update
        const requestRef = doc(firestore, 'plantingrequests', requestId);
        await updateDoc(requestRef, {
          request_status: action,
          reviewedBy: user?.name || user?.user_firstname || 'Admin',
          reviewedAt: Timestamp.now()
        });
      }
      
      setSnackbar({
        open: true,
        message: `Request ${action} successfully!`,
        severity: 'success'
      });
      
      // Refresh data
      fetchDashboardData();
    } catch (error) {
      console.error('❌ Error updating request:', error);
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
      subtitle: `Admins: ${dashboardData.users.admins} | Field: ${dashboardData.users.fieldUsers} | DENR: ${dashboardData.users.denrStaff}`,
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
                ReForest Admin Dashboard
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Welcome back, {user?.name || user?.user_firstname || 'Admin'}! Manage and monitor reforestation activities.
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
          <Grid item xs={12} lg={8}>
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
                                    Temp: {sensor.latestReading.temperature}°C
                                  </Typography>
                                  <Typography variant="caption" display="block">
                                    Moisture: {sensor.latestReading.soilMoisture}%
                                  </Typography>
                                  <Typography variant="caption" display="block">
                                    pH: {sensor.latestReading.pH}
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

          {/* Pending Requests - Side Panel */}
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
                            {request.requesterName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {request.site}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {request.preferredDate}
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

export default AdminDashboard;