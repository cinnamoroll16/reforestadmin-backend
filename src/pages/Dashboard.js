// src/pages/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import {
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
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress as MuiCircularProgress,
  Alert,
  Snackbar,
  Chip,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import {
  People,
  PendingActions,
  Assignment,
  CheckCircle,
  LocationOn,
  ListAlt,
  BarChart,
  TrendingUp,
  Refresh,
  Check,
  Clear,
  Sensors,
  Nature
} from '@mui/icons-material';
import { collection, getDocs,  getDoc, query, where, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { ref, get, query as rtdbQuery, orderByChild, limitToLast } from 'firebase/database'; // ADD RTDB functions
import { firestore, rtdb } from '../firebase.js';
import ReForestAppBar from "../pages/AppBar.js";
import Navigation from "./Navigation.js";
import { useAuth } from '../context/AuthContext.js';

// Recharts components
import {
  BarChart as RechartsBar,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);
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
    activityLog: [],
    plantingSites: [],
    sensors: [], // NEW: Array to store sensor locations
    monthlyRequestsData: [],
    userTrendData: []
  });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // NEW: Fetch sensor locations from Firestore + RTDB sensor data
const fetchSensorLocations = async () => {
  try {
    console.log('========== STARTING SENSOR FETCH ==========');
    const sensorsSnapshot = await getDocs(collection(firestore, 'sensors'));
    console.log(`Found ${sensorsSnapshot.docs.length} sensors in Firestore`);
    
    const sensorsWithLocations = await Promise.all(
      sensorsSnapshot.docs.map(async (sensorDoc) => {
        const sensorData = sensorDoc.data();
        const sensorId = sensorDoc.id;
        
        console.log(`\n--- Processing Sensor: ${sensorId} ---`);
        
        // ========== 1. FETCH LOCATION FROM FIRESTORE ==========
        let locationData = null;
        let locationDocId = null;
        
        if (sensorData.sensor_location) {
          const locationPath = typeof sensorData.sensor_location === 'string' 
            ? sensorData.sensor_location 
            : sensorData.sensor_location.path;
          
          locationDocId = locationPath.split('/').filter(p => p).pop();
          
          console.log(`Fetching location: ${locationDocId}`);
          
          try {
            const locationDocRef = doc(firestore, 'locations', locationDocId);
            const locationDocSnap = await getDoc(locationDocRef);
            
            if (locationDocSnap.exists()) {
              locationData = locationDocSnap.data();
              console.log(`✓ Location: ${locationData.location_name}`);
            } else {
              console.warn(`✗ Location not found: ${locationDocId}`);
            }
          } catch (err) {
            console.error(`Error fetching location:`, err.message);
          }
        }

        // ========== 2. FETCH LATEST SENSOR READING FROM RTDB ==========
        let latestReading = null;
        
        try {
          // RTDB structure: sensors/{sensorId}/sensordata/{data_xxx}
          const rtdbPath = `sensors/${sensorId}/sensordata`;
          console.log(`Fetching from RTDB: ${rtdbPath}`);
          
          const sensorDataRef = ref(rtdb, rtdbPath);
          const snapshot = await get(sensorDataRef);
          
          if (snapshot.exists()) {
            const allReadings = snapshot.val();
            console.log(`✓ Found ${Object.keys(allReadings).length} readings`);
            
            // Get all reading keys and sort them to find the latest
            const readingKeys = Object.keys(allReadings).sort();
            const latestKey = readingKeys[readingKeys.length - 1];
            
            latestReading = {
              id: latestKey,
              ...allReadings[latestKey]
            };
            
            console.log(`✓ Latest reading (${latestKey}):`, latestReading);
          } else {
            console.warn(`✗ No sensordata found at: ${rtdbPath}`);
          }
          
        } catch (err) {
          console.error(`RTDB error for ${sensorId}:`, err.message);
        }

        // ========== 3. BUILD SENSOR OBJECT ==========
        const sensor = {
          id: sensorId,
          name: locationData?.location_name || `Sensor ${sensorId}`,
          lat: locationData ? parseFloat(locationData.location_latitude) : null,
          lng: locationData ? parseFloat(locationData.location_longitude) : null,
          
          // Sensor metadata
          sensorType: 'Multi-parameter',
          status: sensorData.sensor_status || 'offline',
          lastCalibration: sensorData.sensor_lastCalibrationDate,
          
          // Latest reading (directly use the field names from RTDB)
          latestReading: latestReading ? {
            temperature: latestReading.temperature || 'N/A',
            soilMoisture: latestReading.soilMoisture || 'N/A',
            pH: latestReading.pH || 'N/A',
            timestamp: latestReading.timestamp || null
          } : null,
          
          locationId: locationDocId,
          locationPath: sensorData.sensor_location
        };
        
        console.log(`✓ Sensor created:`, {
          id: sensor.id,
          name: sensor.name,
          hasCoords: !!(sensor.lat && sensor.lng),
          hasReading: !!sensor.latestReading,
          reading: sensor.latestReading
        });
        
        return sensor;
      })
    );

    // Filter valid sensors
    const validSensors = sensorsWithLocations.filter(sensor => {
      const hasValidCoords = sensor.lat && sensor.lng && 
                            !isNaN(sensor.lat) && !isNaN(sensor.lng);
      
      if (!hasValidCoords) {
        console.warn(`Sensor ${sensor.id} excluded: invalid coordinates`);
      }
      
      return hasValidCoords;
    });

    console.log('\n========== SENSOR FETCH SUMMARY ==========');
    console.log(`Total: ${sensorsSnapshot.docs.length}`);
    console.log(`Valid: ${validSensors.length}`);
    console.log(`With readings: ${validSensors.filter(s => s.latestReading).length}`);
    console.log('==========================================\n');
    
    return validSensors;

  } catch (error) {
    console.error('❌ CRITICAL ERROR:', error);
    return [];
  }
};
  // Fetch all dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch Users
      console.log('Fetching users...');
      const usersSnapshot = await getDocs(collection(firestore, 'users'));
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('Users fetched:', usersData.length);

      // Calculate user breakdown by role
      const userBreakdown = usersData.reduce((acc, userData) => {
        acc.total++;
        const role = userData.role_id || userData.roles || 'unknown';
        const roleLower = role.toLowerCase();
        if (roleLower.includes('admin')) acc.admins++;
        else if (roleLower.includes('field') || roleLower.includes('planter')) acc.fieldUsers++;
        else if (roleLower.includes('denr')) acc.denrStaff++;
        return acc;
      }, { total: 0, admins: 0, fieldUsers: 0, denrStaff: 0 });

      // 2. Fetch ALL Planting Requests
      console.log('Fetching planting requests...');
      const allRequestsSnapshot = await getDocs(collection(firestore, 'plantingrequests'));
      console.log('Total requests found:', allRequestsSnapshot.docs.length);

      // Map all requests with user and location data
      const allRequests = await Promise.all(
        allRequestsSnapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          
          // ========== FETCH USER NAME ==========
          let requesterName = 'Unknown User';
          if (data.userRef) {
            try {
              // Extract user ID from reference path (e.g., "/users/abc123" -> "abc123")
              const userPath = typeof data.userRef === 'string' ? data.userRef : data.userRef.path;
              const userId = userPath.split('/').pop();
              
              console.log(`Fetching user: ${userId}`);
              
              const userDocRef = doc(firestore, 'users', userId);
              const userDocSnap = await getDoc(userDocRef);
              
              if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                requesterName = `${userData.user_Firstname || ''} ${userData.user_Lastname || ''}`.trim() || 
                              `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 
                              'Unknown User';
                console.log(`✓ User found: ${requesterName}`);
              } else {
                console.warn(`✗ User not found: ${userId}`);
              }
            } catch (err) {
              console.error('Error fetching user:', err);
            }
          }

          // ========== FETCH LOCATION NAME ==========
          let locationName = 'Not specified';
          if (data.locationRef) {
            try {
              // Extract location ID from reference path
              const locationPath = typeof data.locationRef === 'string' ? data.locationRef : data.locationRef.path;
              const locationId = locationPath.split('/').pop();
              
              console.log(`Fetching location: ${locationId}`);
              
              const locationDocRef = doc(firestore, 'locations', locationId);
              const locationDocSnap = await getDoc(locationDocRef);
              
              if (locationDocSnap.exists()) {
                locationName = locationDocSnap.data().location_name || 'Unknown Location';
                console.log(`✓ Location found: ${locationName}`);
              } else {
                console.warn(`✗ Location not found: ${locationId}`);
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

      // Filter only pending requests
      const pendingRequests = allRequests.filter(req => 
        (req.request_status || '').toLowerCase() === 'pending'
      );
      console.log('Pending requests:', pendingRequests.length);
      
      // 3. Fetch Planting Records (completed plantings)
      console.log('========== FETCHING PLANTING RECORDS ==========');
      const recordsSnapshot = await getDocs(collection(firestore, 'plantingrecords'));
      const recordsData = recordsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log(`✓ Total planting records: ${recordsData.length}`);

      // Log sample record for debugging
      if (recordsData.length > 0) {
        console.log('Sample record:', recordsData[0]);
      }

      // Count completed tasks from plantingrecords
      const plantingTasks = {
        active: 0,
        completed: recordsData.length, // Each record = 1 completed task
        pending: 0,
        cancelled: 0
      };

      // Optionally fetch plantingtasks for pending/active/cancelled counts
      try {
        const tasksSnapshot = await getDocs(collection(firestore, 'plantingtasks'));
        
        tasksSnapshot.docs.forEach(taskDoc => {
          const taskData = taskDoc.data();
          const status = (taskData.task_status || '').toLowerCase();
          
          if (status === 'pending') plantingTasks.pending++;
          else if (status === 'cancelled') plantingTasks.cancelled++;
          else if (status === 'active') plantingTasks.active++;
        });
        
      } catch (error) {
        console.warn('⚠ plantingtasks collection not available:', error.message);
      }

      console.log('Final task breakdown:', plantingTasks);
      console.log('==============================================\n');
      // 4. Create Activity Log from requests (already has user names)
      const activityLog = allRequests
        .sort((a, b) => {
          const dateA = a.request_date?.toDate?.() || new Date(0);
          const dateB = b.request_date?.toDate?.() || new Date(0);
          return dateB - dateA;
        })
        .slice(0, 10)
        .map(request => ({
          id: request.id,
          action: `${request.requesterName} submitted a planting request for ${request.site}`,
          timestamp: request.request_date,
          status: request.status,
          type: 'request'
        }));

      // 5. Fetch Planting Sites from locations collection
      console.log('Fetching locations...');
      const locationsSnapshot = await getDocs(collection(firestore, 'locations'));
      const plantingSites = locationsSnapshot.docs.map(doc => {
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
      console.log('Planting sites with valid coordinates:', plantingSites.length);

      // 6. NEW: Fetch Sensor Locations with extensive logging
      console.log('\n========== STARTING SENSOR FETCH ==========');
      console.log('Firebase RTDB instance:', rtdb ? 'Connected' : 'NOT CONNECTED');
      console.log('Firestore instance:', firestore ? 'Connected' : 'NOT CONNECTED');

      const sensors = await fetchSensorLocations();

      console.log('========== SENSOR FETCH COMPLETE ==========');
      console.log(`Total sensors returned: ${sensors.length}`);
      if (sensors.length > 0) {
        console.log('First sensor sample:', sensors[0]);
      }
      console.log('============================================\n');

      // 7. Generate Monthly Requests Data (last 6 months)
      const monthlyRequestsData = generateMonthlyData(allRequests);

      // 8. Generate User Trend Data
      const userTrendData = generateUserTrendData(usersData);

      // 9. Task distribution for pie chart
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
        activityLog,
        plantingSites,
        sensors, // NEW: Add sensors to state
        monthlyRequestsData,
        userTrendData,
        taskDistribution
      });

      console.log('Dashboard data loaded successfully');

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

  // Generate monthly data for charts
  const generateMonthlyData = (requests) => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentDate = new Date();
    const monthlyData = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthName = monthNames[date.getMonth()];
      
      const count = requests.filter(request => {
        const docDate = request.request_date?.toDate?.();
        return docDate && 
               docDate.getMonth() === date.getMonth() && 
               docDate.getFullYear() === date.getFullYear();
      }).length;

      monthlyData.push({
        month: monthName,
        requests: count
      });
    }

    return monthlyData;
  };

  // Generate user trend data
  const generateUserTrendData = (usersData) => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return monthNames.map((month, index) => ({
      month,
      users: Math.floor(usersData.length * (0.6 + index * 0.08))
    }));
  };

  // Handle request approval/rejection
  const handleRequestAction = async (requestId, action) => {
    try {
      const requestRef = doc(firestore, 'plantingrequests', requestId);
      await updateDoc(requestRef, {
        request_status: action,
        reviewedBy: user?.name || 'Admin',
        reviewedAt: Timestamp.now()
      });
      
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

  // Overview Cards Data - Updated to include sensors
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

  // Calculate map center based on sensors or planting sites
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
                Welcome back, {user?.name || 'Admin'}! Manage and monitor reforestation activities.
              </Typography>
            </Box>
            <Button 
              startIcon={<Refresh />} 
              onClick={handleRefresh} 
              variant="outlined"
            >
              Refresh Data
            </Button>
          </Box>
        </Box>

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
        {/* Map and Activity */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Interactive Map with Sensors */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: 500 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
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
                  <ToggleButton value="both">
                    Both
                  </ToggleButton>
                  <ToggleButton value="sensors">
                    Sensors ({dashboardData.sensors.length})
                  </ToggleButton>
                  <ToggleButton value="sites">
                    Sites ({dashboardData.plantingSites.length})
                  </ToggleButton>
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
                        
                        {/* Add a circle around sensor for coverage area */}
                        <Circle
                          center={[sensor.lat, sensor.lng]}
                          radius={50} // 50 meters
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
    
          {/* Pending Requests Table */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                    <PendingActions sx={{ mr: 1 }} />
                    Pending Requests ({dashboardData.pendingRequests.length})
                  </Typography>
                </Box>
                <TableContainer sx={{ maxHeight: 400 }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Requester</strong></TableCell>
                        <TableCell><strong>Site</strong></TableCell>
                        <TableCell><strong>Preferred Date</strong></TableCell>
                        <TableCell><strong>Remarks</strong></TableCell>
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
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {request.site}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {request.preferredDate || 'Not specified'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                              {request.remarks || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <IconButton 
                              color="success" 
                              size="small"
                              onClick={() => handleRequestAction(request.id, 'approved')}
                              sx={{ mr: 1 }}
                              title="Approve"
                            >
                              <Check />
                            </IconButton>
                            <IconButton 
                              color="error" 
                              size="small"
                              onClick={() => handleRequestAction(request.id, 'declined')}
                              title="Decline"
                            >
                              <Clear />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                      {dashboardData.pendingRequests.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} align="center">
                            <Typography color="text.secondary" sx={{ py: 3 }}>
                              No pending requests at this time
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
            <Grid item xs={12} md={7} sx={{ display: "flex" }}>
            <Box sx={{ flex: 1, p: 2, border: "1px solid #e0e0e0", borderRadius: 1 }}>
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
            <Grid item xs={12} md={6} sx={{ display: "flex" }}>
              <Box sx={{ flex: 1, p: 2, border: "1px solid #e0e0e0", borderRadius: 1 }}>
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