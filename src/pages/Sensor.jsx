// src/pages/Sensors.js - Updated with Sensor History Grid
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ref, onValue } from 'firebase/database';
import { rtdb, auth, firestore } from '../firebase.js';
import {
  collection,
  doc,
  setDoc,
  addDoc,
  getDocs,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
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
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tab,
  Tabs
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { 
  SensorsOutlined as SensorsIcon, 
  CheckCircle as CheckCircleIcon, 
  Warning as WarningIcon,
  Science as ScienceIcon,
  Close as CloseIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  Thermostat as ThermostatIcon,
  WaterDrop as WaterDropIcon,
  Science as pHIcon,
  Refresh as RefreshIcon,
  CloudDownload as DownloadIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Timeline as TimelineIcon,
  BubbleChart as BubbleChartIcon,
  Eco as EcoIcon,
  Info as InfoIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import ReForestAppBar from './AppBar.jsx';
import Navigation from './Navigation.jsx';
import { useNavigate } from 'react-router-dom';

// Import ML functions from datasetLoader
import {
  loadTreeDataset,
  generateSeedlingRecommendations,
  analyzeSoilTrends,
  getNearbySernsorsData,
  aggregateSensorData,
  getLocationPlantingHistory,
  ensureBiodiversity
} from '../utils/datasetLoader.js';

const drawerWidth = 240;

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================
const SensorDataSchema = {
  ph: { min: 0, max: 14, required: true, optimal: [6.0, 8.0] },
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
  const { ph, soilMoisture, temperature } = sensorData;
  const errors = [];
  const warnings = [];
  
  Object.entries(SensorDataSchema).forEach(([field, rules]) => {
    const value = sensorData[field];
    
    // Check if required and valid
    if (rules.required && (value === "N/A" || value === null || value === undefined)) {
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

// Retry mechanism with exponential backoff
const retryOperation = async (operation, maxRetries = 3, baseDelay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      const delay = baseDelay * Math.pow(2, i);
      console.warn(`Operation failed, retrying in ${delay}ms... (${i + 1}/${maxRetries})`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
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
// TREND INDICATOR COMPONENT
// ============================================================================
const TrendIndicator = ({ trend, parameter }) => {
  if (!trend || trend.r2 === undefined) return null;
  
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
      <Typography variant="caption" color="text.secondary">
        {parameter}:
      </Typography>
      {trend.slope > 0.5 ? (
        <Chip label="Rising" size="small" color="warning" icon={<TrendingUpIcon />} />
      ) : trend.slope < -0.5 ? (
        <Chip label="Falling" size="small" color="error" icon={<TrendingDownIcon />} />
      ) : (
        <Chip label="Stable" size="small" color="success" />
      )}
      <Typography variant="caption" color="text.secondary">
        R²={trend.r2.toFixed(2)}
      </Typography>
    </Box>
  );
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

  const getReadingQuality = (reading) => {
    const validation = validateSensorData({
      ph: reading.pH,
      soilMoisture: reading.soilMoisture,
      temperature: reading.temperature
    });
    
    if (!validation.isValid) return 'error';
    if (validation.hasWarnings) return 'warning';
    return 'success';
  };

  const getQualityColor = (quality) => {
    switch (quality) {
      case 'success': return 'success.main';
      case 'warning': return 'warning.main';
      case 'error': return 'error.main';
      default: return 'text.secondary';
    }
  };

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
                  <TableCell align="center"><Typography variant="subtitle2" fontWeight="bold">Quality</Typography></TableCell>
                  <TableCell><Typography variant="subtitle2" fontWeight="bold">Reading ID</Typography></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedReadings.map((reading, index) => {
                  const quality = getReadingQuality(reading);
                  const qualityColor = getQualityColor(quality);
                  
                  return (
                    <TableRow 
                      key={reading.readingId || index}
                      sx={{ 
                        '&:last-child td, &:last-child th': { border: 0 },
                        bgcolor: quality === 'error' ? 'error.light' : quality === 'warning' ? 'warning.light' : 'transparent'
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2">
                          {formatTimestamp(reading.timestamp)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: reading.pH !== undefined && reading.pH >= SensorDataSchema.ph.optimal[0] && reading.pH <= SensorDataSchema.ph.optimal[1] 
                              ? 'success.main' 
                              : 'text.secondary',
                            fontWeight: 'medium'
                          }}
                        >
                          {formatValue(reading.pH)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography 
                          variant="body2"
                          sx={{ 
                            color: reading.soilMoisture !== undefined && reading.soilMoisture >= SensorDataSchema.soilMoisture.optimal[0] 
                              ? 'success.main' 
                              : 'text.secondary',
                            fontWeight: 'medium'
                          }}
                        >
                          {formatValue(reading.soilMoisture, '%')}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography 
                          variant="body2"
                          sx={{ 
                            color: reading.temperature !== undefined && reading.temperature >= SensorDataSchema.temperature.optimal[0] && reading.temperature <= SensorDataSchema.temperature.optimal[1]
                              ? 'success.main' 
                              : 'text.secondary',
                            fontWeight: 'medium'
                          }}
                        >
                          {formatValue(reading.temperature, '°C')}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={quality === 'success' ? 'Good' : quality === 'warning' ? 'Warning' : 'Error'}
                          color={quality === 'success' ? 'success' : quality === 'warning' ? 'warning' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                          {reading.readingId || `reading_${index}`}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
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
            sx={{ borderTop: '1px solid', borderColor: 'divider' }}
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
  const user = auth.currentUser;

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
  const [trendAnalysis, setTrendAnalysis] = useState(null);
  const [dialogTab, setDialogTab] = useState(0);
  
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
  // FETCH LOCATIONS
  // ============================================================================
  const fetchLocations = useCallback(async () => {
    try {
      console.log('📍 Fetching locations from Firestore...');
      const locationsCollection = collection(firestore, 'locations');
      const locationsSnapshot = await getDocs(locationsCollection);
      const locationsData = {};
      
      locationsSnapshot.forEach((doc) => {
        locationsData[doc.id] = {
          id: doc.id,
          ...doc.data()
        };
      });
      
      console.log(`✅ Loaded ${Object.keys(locationsData).length} locations`);
      setLocations(locationsData);
      return locationsData;
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
    let unsubscribeSensors = null;

    const initializeData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Load locations first
        const locationsData = await fetchLocations();
        
        // Listen to sensors
        const sensorsRef = ref(rtdb, "sensors");
        
        unsubscribeSensors = onValue(
          sensorsRef,
          (sensorsSnap) => {
            try {
              const sensorsObj = sensorsSnap.val() || {};
              console.log(`🔍 Found ${Object.keys(sensorsObj).length} sensors`);

              if (Object.keys(sensorsObj).length === 0) {
                setSensors([]);
                setLoading(false);
                return;
              }

              const sensorsArray = Object.entries(sensorsObj).map(([id, sensor]) => {
                let locationName = "Unknown Location";
                let locationRef = null;
                let coordinates = null;
                
                // Parse location reference
                if (sensor.sensor_location && typeof sensor.sensor_location === 'string') {
                  locationRef = sensor.sensor_location;
                  const locationParts = sensor.sensor_location.split('/');
                  const locationId = locationParts[locationParts.length - 1];
                  
                  if (locationsData[locationId]) {
                    const locationData = locationsData[locationId];
                    locationName = locationData.location_name || "Unknown Location";
                    
                    const lat = parseFloat(locationData.location_latitude);
                    const lon = parseFloat(locationData.location_longitude);
                    
                    if (!isNaN(lat) && !isNaN(lon)) {
                      coordinates = { latitude: lat, longitude: lon };
                    }
                  } else {
                    locationName = locationId;
                  }
                }
                
                // Process readings
                const readingsObj = sensor.sensordata || {};
                const readingsArr = Object.entries(readingsObj)
                  .map(([rid, r]) => ({
                    readingId: rid,
                    ...r,
                    timestamp: r.timestamp || null
                  }))
                  .sort((a, b) => {
                    if (!a.timestamp) return 1;
                    if (!b.timestamp) return -1;
                    return new Date(b.timestamp) - new Date(a.timestamp);
                  });

                const latest = readingsArr[0] || {};
                
                return {
                  id,
                  location: locationName,
                  locationRef: locationRef,
                  coordinates: coordinates,
                  status: sensor.sensor_status || "Unknown",
                  statusDescription: `Sensor is currently ${sensor.sensor_status || 'Unknown'}`,
                  lastCalibration: sensor.sensor_lastCalibrationDate || null,
                  
                  // Latest readings
                  ph: latest.pH !== undefined ? parseFloat(latest.pH) : "N/A",
                  soilMoisture: latest.soilMoisture !== undefined ? parseFloat(latest.soilMoisture) : "N/A",
                  temperature: latest.temperature !== undefined ? parseFloat(latest.temperature) : "N/A",
                  
                  readings: readingsArr,
                  timestamp: latest.timestamp || null,
                  latestReadingId: latest.readingId || null
                };
              });

              console.log(`✅ Processed ${sensorsArray.length} sensors`);
              setSensors(sensorsArray);
              setLoading(false);
              
            } catch (processingError) {
              console.error("❌ Error processing sensors:", processingError);
              setError('Failed to process sensor data');
              setLoading(false);
              showNotification('Error processing sensor data', 'error');
            }
          },
          (error) => {
            console.error("❌ Error fetching sensors:", error);
            setError('Failed to fetch sensor data');
            setLoading(false);
            showNotification('Failed to connect to sensor database', 'error');
          }
        );

      } catch (error) {
        console.error("❌ Error initializing:", error);
        setError('Failed to initialize application');
        setLoading(false);
        showNotification('Application initialization failed', 'error');
      }
    };

    initializeData();

    // Cleanup
    return () => {
      if (unsubscribeSensors) {
        unsubscribeSensors();
      }
    };
  }, [fetchLocations, showNotification]);

  // ============================================================================
  // REFRESH HANDLER
  // ============================================================================
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    
    try {
      // Clear dataset cache
      localStorage.removeItem('reforest_tree_dataset');
      localStorage.removeItem('reforest_tree_dataset_expiry');
      
      await fetchLocations();
      showNotification('Data refreshed successfully', 'success');
    } catch (error) {
      console.error('❌ Refresh failed:', error);
      showNotification('Failed to refresh data', 'error');
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  // ============================================================================
  // ML GENERATION WITH COMPLETE INTEGRATION
  // ============================================================================
  const handleGenerateML = async (sensor) => {
    const sensorId = sensor.id;
    
    try {
      setProcessingMLSensor(sensorId);
      setMlProgress({ step: 'Initializing...', percent: 0 });
      
      const { ph, soilMoisture, temperature } = sensor;
      
      // ========== STEP 1: VALIDATION ==========
      setMlProgress({ step: 'Validating sensor data...', percent: 10 });
      
      const validation = validateSensorData({ ph, soilMoisture, temperature });
      
      if (!validation.isValid) {
        throw new Error(`Invalid sensor data:\n${validation.errors.join('\n')}`);
      }
      
      if (validation.hasWarnings) {
        showNotification(
          `⚠️ Data warnings: ${validation.warnings.join('; ')}`,
          'warning'
        );
      }
      
      // ========== STEP 2: LOAD DATASET ==========
      setMlProgress({ step: 'Loading tree species dataset...', percent: 20 });
      
      const dataset = await retryOperation(async () => {
        return await loadTreeDataset();
      }, 3);
      
      if (!dataset || dataset.length === 0) {
        throw new Error('Tree dataset is empty or unavailable');
      }
      
      console.log(`📊 Loaded ${dataset.length} tree species`);
      
      // ========== STEP 3: NEARBY SENSORS (Optional) ==========
      setMlProgress({ step: 'Analyzing nearby sensors...', percent: 30 });
      
      let nearbySensorsData = [];
      if (sensor.coordinates) {
        try {
          const timeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 5000)
          );
          
          nearbySensorsData = await Promise.race([
            getNearbySernsorsData(sensor.coordinates, 5),
            timeout
          ]);
          
          console.log(`📡 Found ${nearbySensorsData.length} nearby sensors`);
          
          if (nearbySensorsData.length > 0) {
            showNotification(
              `Using ${nearbySensorsData.length} nearby sensor(s) for context`,
              'info'
            );
          }
        } catch (error) {
          console.warn('⚠️ Nearby sensors unavailable:', error.message);
          // Continue without nearby sensor data
        }
      }
      
      // ========== STEP 4: SOIL TRENDS (if enough data) ==========
      setMlProgress({ step: 'Analyzing soil trends...', percent: 40 });
      
      let trends = null;
      if (sensor.readings.length >= 7) {
        try {
          const trendAnalysis = analyzeSoilTrends(sensor.readings);
          trends = trendAnalysis.trends;
          
          console.log('📈 Soil trends:', trends);
          console.log('🎯 Trend confidence:', trendAnalysis.confidence);
          
          // Show alerts
          if (trendAnalysis.alerts && trendAnalysis.alerts.length > 0) {
            trendAnalysis.alerts.forEach(alert => {
              showNotification(alert.message, alert.severity);
            });
          }
          
          setTrendAnalysis(trendAnalysis);
        } catch (error) {
          console.warn('⚠️ Trend analysis failed:', error.message);
        }
      } else {
        console.log(`ℹ️ Only ${sensor.readings.length} readings. Need 7+ for trends.`);
      }
      
      // ========== STEP 5: GENERATE RECOMMENDATIONS ==========
      setMlProgress({ step: 'Generating ML recommendations...', percent: 50 });
      
      const recommendedTrees = await retryOperation(async () => {
        return await generateSeedlingRecommendations(
          {
            ph: parseFloat(ph),
            soilMoisture: parseFloat(soilMoisture),
            temperature: parseFloat(temperature),
            location: sensor.location
          },
          {
            season: getCurrentSeason(),
            elevation: 0,
            coordinates: sensor.coordinates,
            useHistoricalLearning: true
          }
        );
      }, 3);
      
      if (!recommendedTrees || recommendedTrees.length === 0) {
        throw new Error('No suitable tree species found for current conditions');
      }
      
      console.log(`🌳 Generated ${recommendedTrees.length} recommendations`);
      
      // ========== STEP 6: BIODIVERSITY FILTER ==========
      setMlProgress({ step: 'Applying biodiversity filter...', percent: 60 });
      
      let finalRecommendations = recommendedTrees;
      
      if (sensor.locationRef) {
        try {
          const existingSpecies = await getLocationPlantingHistory(sensor.locationRef);
          
          if (Object.keys(existingSpecies).length > 0) {
            console.log('🌿 Existing species:', existingSpecies);
            finalRecommendations = ensureBiodiversity(recommendedTrees, existingSpecies);
            showNotification('Biodiversity analysis applied', 'info');
          }
        } catch (error) {
          console.warn('⚠️ Planting history unavailable:', error.message);
        }
      }
      
      // ========== STEP 7: SAVE TO FIRESTORE ==========
      setMlProgress({ step: 'Saving recommendations...', percent: 80 });
      
      const avgConfidence = finalRecommendations.reduce((sum, tree) => 
        sum + tree.confidenceScore, 0
      ) / finalRecommendations.length;
      
      const sensorDataRef = `/sensors/${sensorId}/sensordata/${sensor.latestReadingId || 'latest'}`;

      const recommendationData = {
        sensorDataRef,
        locationRef: sensor.locationRef || `/locations/${sensor.location}`,
        seedlingOptions: [],
        reco_confidenceScore: parseFloat((avgConfidence * 100).toFixed(2)),
        reco_generatedAt: new Date().toISOString(),
        season: getCurrentSeason(),
        sensorConditions: {
          ph: parseFloat(ph),
          soilMoisture: parseFloat(soilMoisture),
          temperature: parseFloat(temperature)
        },
        ...(trends && { soilTrends: trends })
      };

      const recommendationsRef = collection(firestore, "recommendations");
      const recoDocRef = await addDoc(recommendationsRef, recommendationData);
      
      console.log(`💾 Recommendation saved: ${recoDocRef.id}`);

      // ========== STEP 8: SAVE TREE SEEDLINGS ==========
      setMlProgress({ step: 'Saving tree seedlings...', percent: 90 });
      
      const seedlingsRef = collection(firestore, "treeseedlings");
      const allSeedlingsSnapshot = await getDocs(seedlingsRef);
      
      let maxIndex = 0;
      allSeedlingsSnapshot.forEach(doc => {
        const id = doc.id;
        if (id.startsWith('ts')) {
          const num = parseInt(id.replace('ts', ''), 10);
          if (!isNaN(num) && num > maxIndex) maxIndex = num;
        }
      });

      const seedlingOptions = [];

      for (let i = 0; i < finalRecommendations.length; i++) {
        const tree = finalRecommendations[i];
        const tsId = `ts${String(maxIndex + i + 1).padStart(3, '0')}`;
        const seedlingDocRef = doc(seedlingsRef, tsId);

        await setDoc(seedlingDocRef, {
          seedling_scientificName: tree.scientificName,
          seedling_commonName: tree.commonName,
          seedling_prefMoisture: parseFloat(tree.prefMoisture),
          seedling_prefTemp: parseFloat(tree.prefTemp),
          seedling_prefpH: parseFloat(tree.prefpH),
          seedling_isNative: tree.isNative,
          seedling_category: tree.category,
          seedling_successRate: tree.successRate,
          seedling_adaptabilityScore: tree.adaptabilityScore,
          sourceRecommendationId: recoDocRef.id,
          diversityScore: tree.diversityScore || 1.0,
          existingInArea: tree.existingInArea || 0,
          createdAt: serverTimestamp()
        });

        seedlingOptions.push(`/treeseedlings/${tsId}`);
        
        console.log(`🌱 Saved: ${tree.commonName} (${tsId})`);
      }

      // Update recommendation with seedling references
      await updateDoc(recoDocRef, { seedlingOptions });

      // ========== STEP 9: COMPLETE ==========
      setMlProgress({ step: 'Complete!', percent: 100 });

      const topTree = finalRecommendations[0];
      showNotification(
        `✅ ML Complete! Top: ${topTree.commonName} (${(topTree.confidenceScore * 100).toFixed(1)}%)${topTree.isNative ? ' 🌿 Native' : ''}`,
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
      } else if (error.message.includes('Excel') || error.message.includes('dataset')) {
        errorMessage += 'Tree dataset unavailable. Ensure Tree_Seedling_Dataset.xlsx is in /public/data/ folder.';
      } else if (error.message.includes('No suitable tree')) {
        errorMessage += 'No trees match current conditions. Check sensor readings.';
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
  const handleLogout = () => auth.signOut();
  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSensorClick = (sensor) => {
    setSelectedSensor(sensor);
    setSensorDetailOpen(true);
    setDialogTab(0); // Reset to first tab
    
    // Analyze trends if enough data
    if (sensor.readings.length >= 7) {
      try {
        const analysis = analyzeSoilTrends(sensor.readings);
        setTrendAnalysis(analysis);
      } catch (error) {
        console.warn('Trend analysis failed:', error);
        setTrendAnalysis(null);
      }
    } else {
      setTrendAnalysis(null);
    }
  };

  const handleCloseSensorDetail = () => {
    setSensorDetailOpen(false);
    setSelectedSensor(null);
    setTrendAnalysis(null);
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
        isMobile={false} 
      />

      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - ${drawerWidth}px)` } }}>
        <Toolbar />

        {/* ========== HEADER ========== */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" sx={{ color: '#2e7d32', fontWeight: 600, mb: 1 }}>
              ReForest Sensor  
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {sensors.length} sensor{sensors.length !== 1 ? 's' : ''} 
              {Object.keys(locations).length > 0 && ` • ${Object.keys(locations).length} locations`}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Tooltip title="Refresh all data and clear cache">
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

        {/* ========== MAIN CONTENT ========== */}
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300 }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="body1" color="textSecondary">
              Loading sensors and locations...
            </Typography>
          </Box>
        ) : sensors.length === 0 ? (
          <Card sx={{ p: 4, textAlign: 'center' }}>
            <SensorsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No sensors found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Ensure sensors are configured in the database.
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
                      ph: sensor.ph,
                      soilMoisture: sensor.soilMoisture,
                      temperature: sensor.temperature
                    });

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
                              color: sensor.ph !== "N/A" && sensor.ph >= SensorDataSchema.ph.optimal[0] && sensor.ph <= SensorDataSchema.ph.optimal[1] 
                                ? 'success.main' 
                                : sensor.ph !== "N/A" ? 'warning.main' : 'text.secondary',
                              fontWeight: sensor.ph !== "N/A" ? 'medium' : 'normal'
                            }}
                          >
                            {formatValue(sensor.ph)}
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
                            !validation.isValid 
                              ? `Cannot generate: ${validation.errors.join(', ')}`
                              : "Generate ML recommendations with advanced analysis"
                          }>
                            <span>
                              <Button 
                                variant="contained" 
                                size="small" 
                                onClick={() => handleGenerateML(sensor)}
                                disabled={
                                  processingMLSensor === sensor.id ||
                                  loading || 
                                  !validation.isValid
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
          sx={{ '& .MuiDialog-paper': { minHeight: '70vh' } }}
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
                          <Typography variant="h4">{formatValue(selectedSensor.ph)}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Optimal: {SensorDataSchema.ph.optimal.join(' - ')}
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

                    {/* Trend Analysis */}
                    {trendAnalysis && trendAnalysis.trends && (
                      <Grid item xs={12}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="subtitle2" gutterBottom>
                              <TimelineIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                              Soil Trend Analysis ({selectedSensor.readings.length} readings)
                            </Typography>
                            <Divider sx={{ my: 1 }} />
                            <TrendIndicator trend={trendAnalysis.trends.moisture} parameter="Moisture" />
                            <TrendIndicator trend={trendAnalysis.trends.ph} parameter="pH" />
                            <TrendIndicator trend={trendAnalysis.trends.temperature} parameter="Temperature" />
                            
                            {trendAnalysis.alerts && trendAnalysis.alerts.length > 0 && (
                              <Box sx={{ mt: 2 }}>
                                <Typography variant="caption" color="text.secondary">Alerts:</Typography>
                                <List dense>
                                  {trendAnalysis.alerts.map((alert, idx) => (
                                    <ListItem key={idx}>
                                      <ListItemIcon>
                                        <WarningIcon color={alert.severity} fontSize="small" />
                                      </ListItemIcon>
                                      <ListItemText 
                                        primary={alert.message}
                                        secondary={`Current: ${alert.currentValue}`}
                                      />
                                    </ListItem>
                                  ))}
                                </List>
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    )}

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
                  <SensorHistoryGrid readings={selectedSensor.readings} />
                </TabPanel>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseSensorDetail}>Close</Button>
            {selectedSensor && validateSensorData({
              ph: selectedSensor.ph,
              soilMoisture: selectedSensor.soilMoisture,
              temperature: selectedSensor.temperature
            }).isValid && (
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