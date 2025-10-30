// src/pages/Sensors.js - BACKEND ONLY (NO DIRECT FIREBASE)
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { apiService } from '../services/api';
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
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Card,
  CardContent,
  Grid,
  Alert,
  Snackbar,
  Tooltip,
  Tab,
  Tabs,
  useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { 
  SensorsOutlined as SensorsIcon, 
  CheckCircle as CheckCircleIcon, 
  Warning as WarningIcon,
  Science as ScienceIcon,
  Close as CloseIcon,
  LocationOn as LocationIcon,
  Thermostat as ThermostatIcon,
  WaterDrop as WaterDropIcon,
  Science as pHIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import ReForestAppBar from './AppBar.jsx';
import Navigation from './Navigation.jsx';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const drawerWidth = 240;

// ============================================================================
// BACKEND API CONFIGURATION
// ============================================================================
const BACKEND_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  ENDPOINTS: {
    RECOMMENDATIONS: '/api/recommendations/generate',
    RECOMMENDATIONS_SAVE: '/api/recommendations',
    SENSORS: '/api/sensors',
    SENSOR_DATA: (sensorId) => `/api/sensors/${sensorId}/data`,
    LOCATIONS: '/api/locations',
    HEALTH: '/health'
  }
};

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================
const SensorDataSchema = {
  pH: { min: 0, max: 14, required: true, optimal: [6.0, 8.0] },
  soilMoisture: { min: 0, max: 100, required: true, optimal: [30, 70] },
  temperature: { min: -10, max: 60, required: true, optimal: [20, 35] }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Get current season for Philippines
const getCurrentSeason = () => {
  const month = new Date().getMonth() + 1;
  return (month >= 11 || month <= 5) ? 'dry' : 'wet';
};

// Enhanced validation with warnings
const validateSensorData = (sensorData) => {
  const { pH, soilMoisture, temperature } = sensorData;
  const errors = [];
  const warnings = [];
  
  // Handle "N/A" values
  if (pH === "N/A" || soilMoisture === "N/A" || temperature === "N/A") {
    errors.push('Sensor data contains N/A values');
    return { isValid: false, errors, warnings, hasWarnings: false };
  }
  
  Object.entries(SensorDataSchema).forEach(([field, rules]) => {
    const value = sensorData[field];
    
    // Check if required and valid
    if (rules.required && (value === null || value === undefined)) {
      errors.push(`${field} is missing or unavailable`);
      return;
    }
    
    const numValue = parseFloat(value);
    
    // Check range validity
    if (isNaN(numValue)) {
      errors.push(`${field} must be a number`);
    } else if (numValue < rules.min || numValue > rules.max) {
      errors.push(`${field} (${numValue}) is outside valid range (${rules.min}-${rules.max})`);
    } else if (rules.optimal) {
      // Check optimal range for warnings
      const [optMin, optMax] = rules.optimal;
      if (numValue < optMin || numValue > optMax) {
        warnings.push(`${field} (${numValue}) is outside optimal range (${optMin}-${optMax})`);
      }
    }
  });
  
  return { 
    isValid: errors.length === 0, 
    errors, 
    warnings,
    hasWarnings: warnings.length > 0
  };
};

// Backend API service
const backendService = {
  // Generate recommendations via backend
  async generateRecommendations(sensorData, options = {}) {
    try {
      console.log('Sending to backend:', { sensorData, options });
      const response = await fetch(`${BACKEND_CONFIG.BASE_URL}${BACKEND_CONFIG.ENDPOINTS.RECOMMENDATIONS}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sensorData, options })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Backend response:', result);
      return result;
      
    } catch (error) {
      console.error('Backend API Error:', error);
      throw new Error(`Backend service unavailable: ${error.message}`);
    }
  },

  // Save recommendations to backend
  async saveRecommendation(recommendationData) {
    try {
      const response = await fetch(`${BACKEND_CONFIG.BASE_URL}${BACKEND_CONFIG.ENDPOINTS.RECOMMENDATIONS_SAVE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(recommendationData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Save recommendation error:', error);
      throw error;
    }
  },

  // Health check
  async healthCheck() {
    try {
      const response = await fetch(`${BACKEND_CONFIG.BASE_URL}${BACKEND_CONFIG.ENDPOINTS.HEALTH}`);
      return response.ok;
    } catch (error) {
      console.warn('Backend health check failed:', error.message);
      return false;
    }
  }
};

// Format timestamp
const formatTimestamp = (timestamp) => {
  if (!timestamp) return "N/A";
  
  try {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return "Invalid date";
  }
};

// Format value with units
const formatValue = (value, unit = '') => {
  if (value === "N/A" || value === null || value === undefined) {
    return "N/A";
  }
  const numValue = parseFloat(value);
  return isNaN(numValue) ? "N/A" : `${numValue.toFixed(1)}${unit}`;
};

// Get status color
const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'active': return 'success';
    case 'inactive': return 'error';
    case 'under maintenance': return 'warning';
    default: return 'default';
  }
};

// Get status icon
const getStatusIcon = (status) => {
  switch (status?.toLowerCase()) {
    case 'active': return <CheckCircleIcon />;
    case 'inactive': return <WarningIcon />;
    default: return <InfoIcon />;
  }
};

// ============================================================================
// SENSOR HISTORY GRID COMPONENT
// ============================================================================
const SensorHistoryGrid = ({ readings }) => {
  const [historyPage, setHistoryPage] = useState(0);
  const [historyRowsPerPage, setHistoryRowsPerPage] = useState(10);

  const handleHistoryPageChange = (event, newPage) => {
    setHistoryPage(newPage);
  };

  const handleHistoryRowsPerPageChange = (event) => {
    setHistoryRowsPerPage(parseInt(event.target.value, 10));
    setHistoryPage(0);
  };

  const sortedReadings = useMemo(() => {
    return [...readings].sort((a, b) => {
      if (!a.timestamp) return 1;
      if (!b.timestamp) return -1;
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
  }, [readings]);

  const paginatedReadings = useMemo(() => {
    return sortedReadings.slice(
      historyPage * historyRowsPerPage,
      historyPage * historyRowsPerPage + historyRowsPerPage
    );
  }, [sortedReadings, historyPage, historyRowsPerPage]);

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <HistoryIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6">
          Sensor History ({readings.length} readings)
        </Typography>
      </Box>

      {readings.length === 0 ? (
        <Card variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No historical data available for this sensor
          </Typography>
        </Card>
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell><Typography variant="subtitle2" fontWeight="bold">Timestamp</Typography></TableCell>
                  <TableCell align="center"><Typography variant="subtitle2" fontWeight="bold">pH</Typography></TableCell>
                  <TableCell align="center"><Typography variant="subtitle2" fontWeight="bold">Moisture (%)</Typography></TableCell>
                  <TableCell align="center"><Typography variant="subtitle2" fontWeight="bold">Temp (°C)</Typography></TableCell>
                  <TableCell><Typography variant="subtitle2" fontWeight="bold">Reading ID</Typography></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedReadings.map((reading, index) => (
                  <TableRow key={reading.id || index}>
                    <TableCell>
                      <Typography variant="body2">
                        {formatTimestamp(reading.timestamp)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {formatValue(reading.pH)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {formatValue(reading.soilMoisture, '%')}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {formatValue(reading.temperature, '°C')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                        {reading.id || `reading_${index}`}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={readings.length}
            rowsPerPage={historyRowsPerPage}
            page={historyPage}
            onPageChange={handleHistoryPageChange}
            onRowsPerPageChange={handleHistoryRowsPerPageChange}
          />
        </>
      )}
    </Box>
  );
};

// ============================================================================
// TAB PANEL COMPONENT FOR DIALOG
// ============================================================================
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`sensor-detail-tabpanel-${index}`}
      aria-labelledby={`sensor-detail-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
function Sensors() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // UI State
  const [mobileOpen, setMobileOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  
  // Data State
  const [sensors, setSensors] = useState([]);
  const [locations, setLocations] = useState({});
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // ML Processing State
  const [processingMLSensor, setProcessingMLSensor] = useState(null);
  const [mlProgress, setMlProgress] = useState({ step: '', percent: 0 });
  
  // Modal State
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [sensorDetailOpen, setSensorDetailOpen] = useState(false);
  const [dialogTab, setDialogTab] = useState(0);
  
  // Backend State
  const [backendStatus, setBackendStatus] = useState('checking');
  
  // Error/Notification State
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  // ============================================================================
  // NOTIFICATION HELPER
  // ============================================================================
  const showNotification = useCallback((message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // ============================================================================
  // BACKEND HEALTH CHECK
  // ============================================================================
  useEffect(() => {
    const checkBackendHealth = async () => {
      try {
        const isHealthy = await backendService.healthCheck();
        setBackendStatus(isHealthy ? 'healthy' : 'unavailable');
        
        if (!isHealthy) {
          console.warn('⚠️ Backend server is unavailable.');
          showNotification('Backend server unavailable. ML recommendations will not work.', 'warning');
        } else {
          console.log('✅ Backend server is healthy');
        }
      } catch (error) {
        setBackendStatus('unavailable');
        console.error('Backend health check failed:', error);
      }
    };

    checkBackendHealth();
  }, [showNotification]);

  // ============================================================================
  // FETCH SENSORS FROM BACKEND (Backend fetches from RTDB)
  // ============================================================================
  const fetchSensorsFromBackend = useCallback(async () => {
    try {
      console.log('📡 Fetching sensors from backend API...');
      
      // Backend handles RTDB connection
      const sensorsData = await apiService.getSensors();
      
      if (!Array.isArray(sensorsData) || sensorsData.length === 0) {
        console.warn('No sensors found');
        return [];
      }
      
      // Process sensor data from backend response
      const processedSensors = sensorsData.map(sensor => {
        const latestReading = sensor.latest_reading || {};
        
        return {
          id: sensor.id,
          location_id: sensor.location_id,
          latitude: sensor.latitude,
          longitude: sensor.longitude,
          sensor_status: sensor.sensor_status || 'active',
          sensor_lastCalibrationDate: sensor.sensor_lastCalibrationDate,
          sensor_location: sensor.sensor_location,
          sensor_type: sensor.sensor_type,
          coordinates: {
            latitude: sensor.latitude,
            longitude: sensor.longitude
          },
          // Current readings from latest_reading
          pH: latestReading.pH !== undefined ? parseFloat(latestReading.pH) : "N/A",
          soilMoisture: latestReading.soilMoisture !== undefined ? parseFloat(latestReading.soilMoisture) : "N/A",
          temperature: latestReading.temperature !== undefined ? parseFloat(latestReading.temperature) : "N/A",
          timestamp: latestReading.timestamp || null,
          // Historical data placeholder (will be loaded on demand)
          readings: [],
          readingsLoaded: false
        };
      });
      
      console.log(`✅ Loaded ${processedSensors.length} sensors from backend`);
      return processedSensors;
      
    } catch (error) {
      console.error('❌ Error fetching sensors from backend:', error);
      throw error;
    }
  }, []);

  // ============================================================================
  // FETCH SENSOR HISTORY (on-demand when viewing details)
  // ============================================================================
  const fetchSensorHistory = async (sensorId) => {
    try {
      console.log(`📊 Fetching history for sensor ${sensorId}...`);
      const historyData = await apiService.getSensorData(sensorId, { limit: 100 });
      
      console.log(`✅ Loaded ${historyData.length} readings for sensor ${sensorId}`);
      return historyData;
    } catch (error) {
      console.error('❌ Error fetching sensor history:', error);
      showNotification('Failed to load sensor history', 'warning');
      return [];
    }
  };

  // ============================================================================
  // FETCH LOCATIONS FROM BACKEND
  // ============================================================================
  const fetchLocations = useCallback(async () => {
    try {
      console.log('📍 Fetching locations from backend...');
      const locationsData = await apiService.getLocations();
      
      const locationsMap = {};
      locationsData.forEach((location) => {
        locationsMap[location.id] = location;
      });
      
      console.log(`✅ Loaded ${Object.keys(locationsMap).length} locations`);
      return locationsMap;
    } catch (error) {
      console.error('❌ Error fetching locations:', error);
      showNotification('Failed to load location data', 'warning');
      return {};
    }
  }, [showNotification]);

  // ============================================================================
  // INITIALIZE DATA
  // ============================================================================
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [sensorsData, locationsData] = await Promise.all([
          fetchSensorsFromBackend(),
          fetchLocations()
        ]);

        // Process sensors with location information
        const processedSensors = sensorsData.map(sensor => {
          const locationInfo = locationsData[sensor.location_id];
          
          return {
            ...sensor,
            location: locationInfo?.location_name || sensor.sensor_location || `Location ${sensor.location_id}`,
            locationRef: sensor.location_id ? `/locations/${sensor.location_id}` : null,
            status: sensor.sensor_status || "Unknown",
            statusDescription: `Sensor is currently ${sensor.sensor_status || 'Unknown'}`,
            lastCalibration: sensor.sensor_lastCalibrationDate || null,
          };
        });

        setSensors(processedSensors);
        setLocations(locationsData);
        console.log(`🎯 Processed ${processedSensors.length} sensors with location data`);

      } catch (error) {
        console.error("Error fetching data:", error);
        setError('Failed to fetch sensor data: ' + error.message);
        showNotification('Error loading sensors: ' + error.message, 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [fetchSensorsFromBackend, fetchLocations, showNotification]);

  // ============================================================================
  // REFRESH HANDLER
  // ============================================================================
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    
    try {
      const [sensorsData, locationsData] = await Promise.all([
        fetchSensorsFromBackend(),
        fetchLocations()
      ]);

      const processedSensors = sensorsData.map(sensor => {
        const locationInfo = locationsData[sensor.location_id];
        
        return {
          ...sensor,
          location: locationInfo?.location_name || sensor.sensor_location || `Location ${sensor.location_id}`,
          locationRef: sensor.location_id ? `/locations/${sensor.location_id}` : null,
          status: sensor.sensor_status || "Unknown",
          statusDescription: `Sensor is currently ${sensor.sensor_status || 'Unknown'}`,
          lastCalibration: sensor.sensor_lastCalibrationDate || null,
        };
      });

      setSensors(processedSensors);
      setLocations(locationsData);
      showNotification('Data refreshed successfully', 'success');
    } catch (error) {
      console.error('❌ Refresh failed:', error);
      showNotification('Failed to refresh data', 'error');
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  // ============================================================================
  // BACKEND ML GENERATION
  // ============================================================================
  const handleGenerateML = async (sensor) => {
    const sensorId = sensor.id;
    
    try {
      setProcessingMLSensor(sensorId);
      setMlProgress({ step: 'Initializing...', percent: 10 });
      
      const { pH, soilMoisture, temperature } = sensor;
      
      // ========== STEP 1: VALIDATION ==========
      setMlProgress({ step: 'Validating sensor data...', percent: 20 });
      
      const validation = validateSensorData({ pH, soilMoisture, temperature });
      
      if (!validation.isValid) {
        throw new Error(`Invalid sensor data: ${validation.errors.join(', ')}`);
      }
      
      if (validation.hasWarnings) {
        showNotification(
          `Data warnings: ${validation.warnings.join('; ')}`,
          'warning'
        );
      }
      
      // ========== STEP 2: PREPARE DATA FOR BACKEND ==========
      setMlProgress({ step: 'Preparing data for ML processing...', percent: 30 });
      
      const sensorData = {
        ph: parseFloat(pH),
        soilMoisture: parseFloat(soilMoisture),
        temperature: parseFloat(temperature),
        location: sensor.location
      };
      
      const options = {
        algorithm: 'hybrid',
        useHistoricalLearning: true,
        season: getCurrentSeason(),
        coordinates: sensor.coordinates,
        location: sensor.locationRef
      };
      
      // ========== STEP 3: CALL BACKEND API ==========
      setMlProgress({ step: 'Sending to ML backend...', percent: 50 });
      
      console.log('Calling backend with:', { sensorData, options });
      const result = await backendService.generateRecommendations(sensorData, options);
      
      if (!result.success) {
        throw new Error(result.error || 'Backend processing failed');
      }
      
      console.log('✅ Backend recommendations received:', result.recommendations);
      
      // ========== STEP 4: SAVE TO BACKEND (Backend saves to Firestore) ==========
      setMlProgress({ step: 'Saving recommendations...', percent: 80 });
      
      const recommendationData = {
        sensorId: sensorId,
        locationId: sensor.location_id,
        sensorData: sensorData,
        recommendations: result.recommendations,
        algorithm: result.algorithm,
        confidenceScore: result.recommendations[0]?.confidenceScore || 0,
        season: getCurrentSeason(),
        backendProcessed: true
      };

      // Backend handles saving to Firestore
      const savedRecommendation = await backendService.saveRecommendation(recommendationData);
      
      console.log(`💾 Recommendation saved via backend:`, savedRecommendation);

      // ========== STEP 5: COMPLETE ==========
      setMlProgress({ step: 'Complete!', percent: 100 });

      const topTree = result.recommendations[0];
      showNotification(
        `✅ ML Complete! Top recommendation: ${topTree.commonName} (${(topTree.confidenceScore * 100).toFixed(1)}% confidence)`,
        'success'
      );

      // Navigate after delay
      setTimeout(() => {
        navigate('/recommendations');
      }, 2000);

    } catch (error) {
      console.error('❌ ML Generation failed:', error);
      
      let errorMessage = 'ML recommendation failed: ';
      
      if (error.message.includes('Invalid sensor data')) {
        errorMessage += error.message;
      } else if (error.message.includes('Backend service unavailable')) {
        errorMessage += 'Backend server is unavailable. Please ensure the backend is running.';
      } else {
        errorMessage += error.message || 'Unknown error occurred.';
      }
      
      showNotification(errorMessage, 'error');
      
    } finally {
      setProcessingMLSensor(null);
      setMlProgress({ step: '', percent: 0 });
    }
  };

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const handleLogout = () => logout();
  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSensorClick = async (sensor) => {
    // Load sensor history if not already loaded
    if (!sensor.readingsLoaded) {
      const history = await fetchSensorHistory(sensor.id);
      sensor.readings = history;
      sensor.readingsLoaded = true;
    }
    
    setSelectedSensor(sensor);
    setSensorDetailOpen(true);
    setDialogTab(0);
  };

  const handleCloseSensorDetail = () => {
    setSensorDetailOpen(false);
    setSelectedSensor(null);
    setDialogTab(0);
  };

  const handleDialogTabChange = (event, newValue) => {
    setDialogTab(newValue);
  };

  // ============================================================================
  // MEMOIZED VALUES
  // ============================================================================
  const displayedSensors = useMemo(() => {
    return sensors.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [sensors, page, rowsPerPage]);

  // Backend status indicator
  const getBackendStatusInfo = () => {
    switch (backendStatus) {
      case 'healthy':
        return { color: 'success', text: 'Backend Connected', icon: <CheckCircleIcon /> };
      case 'unavailable':
        return { color: 'warning', text: 'Backend Unavailable', icon: <WarningIcon /> };
      default:
        return { color: 'info', text: 'Checking Backend...', icon: <InfoIcon /> };
    }
  };

  const backendStatusInfo = getBackendStatusInfo();

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <Box sx={{ display: 'flex', bgcolor: '#f8fafc', minHeight: '100vh' }}>
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

      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - ${drawerWidth}px)` } }}>
        <Toolbar />

        {/* ========== HEADER ========== */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ color: '#2e7d32', fontWeight: 600, mb: 1 }}>
              ReForest Sensors
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {sensors.length} sensor{sensors.length !== 1 ? 's' : ''} 
              {Object.keys(locations).length > 0 && ` • ${Object.keys(locations).length} locations`}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip
              label={backendStatusInfo.text}
              color={backendStatusInfo.color}
              icon={backendStatusInfo.icon}
              size="small"
              variant={backendStatus === 'healthy' ? 'filled' : 'outlined'}
            />
            <Tooltip title="Refresh all data">
              <Button 
                variant="outlined" 
                onClick={handleRefresh} 
                disabled={isRefreshing || loading}
                startIcon={isRefreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
              >
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
            </Tooltip>
          </Box>
        </Box>

        {/* ========== LOADING BAR ========== */}
        {(isRefreshing || loading) && <LinearProgress sx={{ mb: 2 }} />}
        
        {/* ========== ERROR ALERT ========== */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Backend Status Warning */}
        {backendStatus === 'unavailable' && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Backend server is unavailable. ML recommendations will not work. Please ensure the backend is running on {BACKEND_CONFIG.BASE_URL}.
          </Alert>
        )}

        {/* ========== MAIN CONTENT ========== */}
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300 }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="body1" color="textSecondary">
              Loading sensors from backend (RTDB via API)...
            </Typography>
          </Box>
        ) : sensors.length === 0 ? (
          <Card sx={{ p: 4, textAlign: 'center' }}>
            <SensorsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No sensors found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Ensure sensors are configured in the Realtime Database and the backend is running.
            </Typography>
            <Button variant="outlined" onClick={handleRefresh} startIcon={<RefreshIcon />}>
              Retry
            </Button>
          </Card>
        ) : (
          <Paper sx={{ width: '100%', mb: 2, borderRadius: 2, overflow: 'hidden', boxShadow: 3 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: theme.palette.grey[50] }}>
                    <TableCell><Typography variant="subtitle2" fontWeight="bold">Sensor ID</Typography></TableCell>
                    <TableCell><Typography variant="subtitle2" fontWeight="bold">Location</Typography></TableCell>
                    <TableCell><Typography variant="subtitle2" fontWeight="bold">pH</Typography></TableCell>
                    <TableCell><Typography variant="subtitle2" fontWeight="bold">Moisture (%)</Typography></TableCell>
                    <TableCell><Typography variant="subtitle2" fontWeight="bold">Temp (°C)</Typography></TableCell>
                    <TableCell><Typography variant="subtitle2" fontWeight="bold">Last Reading</Typography></TableCell>
                    <TableCell><Typography variant="subtitle2" fontWeight="bold">Status</Typography></TableCell>
                    <TableCell align="center"><Typography variant="subtitle2" fontWeight="bold">Actions</Typography></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayedSensors.map((sensor) => {
                    const validation = validateSensorData({
                      pH: sensor.pH,
                      soilMoisture: sensor.soilMoisture,
                      temperature: sensor.temperature
                    });

                    const canGenerateML = validation.isValid && backendStatus === 'healthy';

                    return (
                      <TableRow 
                        key={sensor.id} 
                        hover 
                        onClick={() => handleSensorClick(sensor)}
                        sx={{ 
                          '&:hover': { bgcolor: 'rgba(46, 125, 50, 0.04)' },
                          cursor: 'pointer'
                        }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <SensorsIcon sx={{ mr: 1, color: 'primary.main', fontSize: 20 }} />
                            <Typography variant="body2" fontWeight="medium">{sensor.id}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                              {sensor.location}
                            </Typography>
                            {sensor.coordinates && (
                              <Typography variant="caption" color="text.secondary">
                                {sensor.coordinates.latitude.toFixed(4)}°, {sensor.coordinates.longitude.toFixed(4)}°
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: sensor.pH !== "N/A" && sensor.pH >= SensorDataSchema.pH.optimal[0] && sensor.pH <= SensorDataSchema.pH.optimal[1] 
                                ? 'success.main' 
                                : sensor.pH !== "N/A" ? 'warning.main' : 'text.secondary',
                              fontWeight: sensor.pH !== "N/A" ? 'medium' : 'normal'
                            }}
                          >
                            {formatValue(sensor.pH)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography 
                            variant="body2"
                            sx={{ 
                              color: sensor.soilMoisture !== "N/A" && sensor.soilMoisture >= SensorDataSchema.soilMoisture.optimal[0] 
                                ? 'success.main' 
                                : sensor.soilMoisture !== "N/A" ? 'error.main' : 'text.secondary',
                              fontWeight: sensor.soilMoisture !== "N/A" ? 'medium' : 'normal'
                            }}
                          >
                            {formatValue(sensor.soilMoisture, '%')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography 
                            variant="body2"
                            sx={{ 
                              color: sensor.temperature !== "N/A" && sensor.temperature >= SensorDataSchema.temperature.optimal[0] && sensor.temperature <= SensorDataSchema.temperature.optimal[1]
                                ? 'success.main' 
                                : sensor.temperature !== "N/A" ? 'warning.main' : 'text.secondary',
                              fontWeight: sensor.temperature !== "N/A" ? 'medium' : 'normal'
                            }}
                          >
                            {formatValue(sensor.temperature, '°C')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatTimestamp(sensor.timestamp)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={sensor.status}
                            color={getStatusColor(sensor.status)}
                            icon={getStatusIcon(sensor.status)}
                            size="small"
                            sx={{ minWidth: 100 }}
                          />
                        </TableCell>
                        <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                          <Tooltip title={
                            !canGenerateML 
                              ? backendStatus !== 'healthy' 
                                ? 'Backend server unavailable' 
                                : `Cannot generate: ${validation.errors.join(', ')}`
                              : "Generate ML recommendations with backend processing"
                          }>
                            <span>
                              <Button 
                                variant="contained" 
                                size="small" 
                                onClick={() => handleGenerateML(sensor)}
                                disabled={
                                  processingMLSensor === sensor.id ||
                                  loading || 
                                  !canGenerateML
                                }
                                sx={{ 
                                  minWidth: 100,
                                  bgcolor: '#2e7d32',
                                  '&:hover': { bgcolor: '#1b5e20' },
                                }}
                                startIcon={
                                  processingMLSensor === sensor.id 
                                    ? <CircularProgress size={16} color="inherit" /> 
                                    : <ScienceIcon />
                                }
                              >
                                {processingMLSensor === sensor.id ? `${mlProgress.percent}%` : 'Generate ML'}
                              </Button>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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

        {/* ========== SENSOR DETAIL DIALOG ========== */}
        <Dialog 
          open={sensorDetailOpen} 
          onClose={handleCloseSensorDetail}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">
                Sensor Details: {selectedSensor?.id}
              </Typography>
              <IconButton onClick={handleCloseSensorDetail} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
            <Tabs value={dialogTab} onChange={handleDialogTabChange} sx={{ mt: 1 }}>
              <Tab label="Overview" />
              <Tab label={`History (${selectedSensor?.readings?.length || 0})`} />
            </Tabs>
          </DialogTitle>
          <DialogContent dividers>
            {selectedSensor && (
              <>
                {/* OVERVIEW TAB */}
                <TabPanel value={dialogTab} index={0}>
                  <Grid container spacing={3}>
                    {/* Location Info */}
                    <Grid item xs={12}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            <LocationIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                            Location
                          </Typography>
                          <Typography variant="h6">{selectedSensor.location}</Typography>
                          {selectedSensor.coordinates && (
                            <Typography variant="body2" color="text.secondary">
                              Coordinates: {selectedSensor.coordinates.latitude.toFixed(6)}°, {selectedSensor.coordinates.longitude.toFixed(6)}°
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Current Readings */}
                    <Grid item xs={12} md={4}>
                      <Card variant="outlined" sx={{ bgcolor: '#e3f2fd' }}>
                        <CardContent>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            <pHIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                            pH Level
                          </Typography>
                          <Typography variant="h4">{formatValue(selectedSensor.pH)}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Optimal: {SensorDataSchema.pH.optimal.join(' - ')}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <Card variant="outlined" sx={{ bgcolor: '#e8f5e9' }}>
                        <CardContent>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            <WaterDropIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                            Soil Moisture
                          </Typography>
                          <Typography variant="h4">{formatValue(selectedSensor.soilMoisture, '%')}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Optimal: {SensorDataSchema.soilMoisture.optimal.join(' - ')}%
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <Card variant="outlined" sx={{ bgcolor: '#fff3e0' }}>
                        <CardContent>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            <ThermostatIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                            Temperature
                          </Typography>
                          <Typography variant="h4">{formatValue(selectedSensor.temperature, '°C')}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Optimal: {SensorDataSchema.temperature.optimal.join(' - ')}°C
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Status */}
                    <Grid item xs={12}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Status & Calibration
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                            <Chip
                              label={selectedSensor.status}
                              color={getStatusColor(selectedSensor.status)}
                              icon={getStatusIcon(selectedSensor.status)}
                            />
                            <Typography variant="body2" color="text.secondary">
                              Last calibration: {selectedSensor.lastCalibration || 'N/A'}
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </TabPanel>

                {/* HISTORY TAB */}
                <TabPanel value={dialogTab} index={1}>
                  <SensorHistoryGrid readings={selectedSensor.readings || []} />
                </TabPanel>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseSensorDetail}>Close</Button>
            {selectedSensor && validateSensorData({
              pH: selectedSensor.pH,
              soilMoisture: selectedSensor.soilMoisture,
              temperature: selectedSensor.temperature
            }).isValid && backendStatus === 'healthy' && (
              <Button 
                variant="contained" 
                onClick={() => {
                  handleCloseSensorDetail();
                  handleGenerateML(selectedSensor);
                }}
                startIcon={<ScienceIcon />}
                sx={{ bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' } }}
              >
                Generate ML Recommendations
              </Button>
            )}
          </DialogActions>
        </Dialog>

        {/* ========== ML PROGRESS DIALOG ========== */}
        <Dialog 
          open={processingMLSensor !== null}
          maxWidth="sm"
          fullWidth
        >
          <DialogContent sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Processing ML Algorithm
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {mlProgress.step}
            </Typography>
            <LinearProgress variant="determinate" value={mlProgress.percent} sx={{ height: 8, borderRadius: 4 }} />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {mlProgress.percent}% Complete
            </Typography>
            {backendStatus === 'healthy' && (
              <Typography variant="caption" color="primary" sx={{ mt: 1, display: 'block' }}>
                Using backend ML processing (RTDB via API)
              </Typography>
            )}
          </DialogContent>
        </Dialog>

        {/* ========== NOTIFICATIONS ========== */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            onClose={handleCloseSnackbar} 
            severity={snackbar.severity} 
            sx={{ width: '100%', minWidth: 300 }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
}

export default Sensors;