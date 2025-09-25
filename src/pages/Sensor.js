// src/pages/Sensors.js - Enhanced ReForest Implementation
import React, { useState, useEffect } from 'react';
import { ref, onValue, push, set } from 'firebase/database';
import { rtdb, auth, firestore } from '../firebase.js';
import {
  collection,
  doc,
  setDoc,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import * as XLSX from 'xlsx';
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
  CloudDownload as DownloadIcon
} from '@mui/icons-material';
import ReForestAppBar from './AppBar.js';
import Navigation from './Navigation.js';
import { useNavigate } from 'react-router-dom';

const drawerWidth = 240;

// Enhanced data validation
const validateSensorData = (sensorData) => {
  const { ph, soilMoisture, temperature } = sensorData;
  
  const validations = {
    ph: ph !== "N/A" && ph >= 0 && ph <= 14,
    soilMoisture: soilMoisture !== "N/A" && soilMoisture >= 0 && soilMoisture <= 100,
    temperature: temperature !== "N/A" && temperature >= -10 && temperature <= 60
  };
  
  const isValid = Object.values(validations).every(v => v);
  const errors = Object.entries(validations)
    .filter(([key, valid]) => !valid)
    .map(([key]) => key);
    
  return { isValid, errors };
};

// Improved range parsing with better error handling
const parseRange = (rangeStr) => {
  if (!rangeStr || rangeStr === 'N/A' || rangeStr === '') {
    return { min: 0, max: 0, valid: false };
  }
  
  try {
    let cleaned = rangeStr.toString()
      .replace(/°C/g, '')
      .replace(/%/g, '')
      .replace(/\s+/g, '')
      .trim();
    
    // Handle single values
    if (!cleaned.includes('–') && !cleaned.includes('-')) {
      const value = parseFloat(cleaned);
      if (isNaN(value)) return { min: 0, max: 0, valid: false };
      return { min: value, max: value, valid: true };
    }
    
    // Handle ranges
    const parts = cleaned.split(/[–-]/);
    if (parts.length === 2) {
      const min = parseFloat(parts[0]);
      const max = parseFloat(parts[1]);
      
      if (isNaN(min) || isNaN(max)) {
        return { min: 0, max: 0, valid: false };
      }
      
      return {
        min: Math.min(min, max),
        max: Math.max(min, max),
        valid: true
      };
    }
    
    return { min: 0, max: 0, valid: false };
  } catch (error) {
    console.error('Error parsing range:', rangeStr, error);
    return { min: 0, max: 0, valid: false };
  }
};

// Retry mechanism for failed operations
const retryOperation = async (operation, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.warn(`Operation failed, retrying... (${i + 1}/${maxRetries})`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Enhanced tree dataset loading with caching and fallback
const loadTreeDataset = async () => {
  const CACHE_KEY = 'reforest_tree_dataset';
  const CACHE_EXPIRY_KEY = 'reforest_tree_dataset_expiry';
  const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  
  try {
    // Check cache first
    const cachedData = localStorage.getItem(CACHE_KEY);
    const cacheExpiry = localStorage.getItem(CACHE_EXPIRY_KEY);
    
    if (cachedData && cacheExpiry && Date.now() < parseInt(cacheExpiry)) {
      console.log('Using cached tree dataset');
      return JSON.parse(cachedData);
    }
    
    console.log('Loading tree seedlings from Excel file...');
    
    // Try multiple possible paths for the Excel file
    const possiblePaths = [
      '/data/Tree_Seedling_Dataset.xlsx',
      'data/Tree_Seedling_Dataset.xlsx',
      '/public/data/Tree_Seedling_Dataset.xlsx',
      'public/data/Tree_Seedling_Dataset.xlsx'
    ];
    
    let response = null;
    let usedPath = null;
    
    for (const path of possiblePaths) {
      try {
        response = await fetch(path);
        if (response.ok) {
          usedPath = path;
          break;
        }
      } catch (error) {
        console.warn(`Failed to load from ${path}:`, error.message);
      }
    }
    
    if (!response || !response.ok) {
      throw new Error(`Excel file not found in any of the expected locations: ${possiblePaths.join(', ')}`);
    }
    
    console.log(`Successfully loaded Excel file from: ${usedPath}`);
    
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { 
      type: 'array',
      cellDates: true,
      cellNF: false,
      cellText: false
    });
    
    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    if (!worksheet) {
      throw new Error('Excel file does not contain any worksheets');
    }
    
    // Convert to JSON with headers
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (rawData.length < 2) {
      throw new Error('Excel file must contain at least a header row and one data row');
    }
    
    // Extract and validate headers
    const headers = rawData[0];
    console.log('Excel headers found:', headers);
    
    // Required columns mapping (flexible naming)
    const requiredColumns = {
      commonName: ['Common Name', 'common_name', 'CommonName', 'Name'],
      scientificName: ['Scientific Name', 'scientific_name', 'ScientificName', 'Scientific'],
      moisture: ['Preferred Moisture', 'Moisture', 'moisture', 'Soil Moisture', 'Moisture Range'],
      temperature: ['Preferred Temperature', 'Temperature', 'temperature', 'Temp', 'Temperature Range'],
      ph: ['Preferred pH', 'pH', 'PH', 'ph', 'pH Range', 'PH Range']
    };
    
    // Map column indexes
    const columnMap = {};
    Object.entries(requiredColumns).forEach(([key, possibleNames]) => {
      const foundIndex = headers.findIndex(header => 
        possibleNames.some(name => 
          header && header.toString().toLowerCase().trim() === name.toLowerCase().trim()
        )
      );
      if (foundIndex !== -1) {
        columnMap[key] = foundIndex;
      }
    });
    
    // Validate required columns exist
    const missingColumns = Object.keys(requiredColumns).filter(key => columnMap[key] === undefined);
    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(', ')}. Available columns: ${headers.join(', ')}`);
    }
    
    // Convert rows to objects
    const seedlingsData = rawData.slice(1).map((row, index) => {
      if (!row || row.length === 0) return null;
      
      return {
        id: `seed_${index + 1}`,
        commonName: row[columnMap.commonName] || 'Unknown',
        scientificName: row[columnMap.scientificName] || 'Unknown',
        moisture: row[columnMap.moisture],
        temperature: row[columnMap.temperature],
        ph: row[columnMap.ph],
        // Optional columns
        native: row[headers.findIndex(h => h && h.toLowerCase().includes('native'))],
        successRate: row[headers.findIndex(h => h && h.toLowerCase().includes('success'))],
        category: row[headers.findIndex(h => h && h.toLowerCase().includes('category'))],
        uses: row[headers.findIndex(h => h && h.toLowerCase().includes('use'))],
        growthRate: row[headers.findIndex(h => h && h.toLowerCase().includes('growth'))],
        soilType: row[headers.findIndex(h => h && h.toLowerCase().includes('soil') && h.toLowerCase().includes('type'))]
      };
    }).filter(row => row !== null);
    
    console.log(`Loaded ${seedlingsData.length} raw records from Excel`);
    
    // Parse and validate the data
    const parsedDataset = seedlingsData.map((seedling, index) => {
      // Parse preferred values
      const moistureRange = parseRange(seedling.moisture);
      const tempRange = parseRange(seedling.temperature);
      const pHRange = parseRange(seedling.ph);
      
      if (!moistureRange.valid || !tempRange.valid || !pHRange.valid) {
        console.warn(`Invalid data for ${seedling.commonName}, skipping...`);
        return null;
      }
      
      // Calculate optimal values as midpoint of ranges
      const prefMoisture = (moistureRange.min + moistureRange.max) / 2;
      const prefTemp = (tempRange.min + tempRange.max) / 2;
      const prefpH = (pHRange.min + pHRange.max) / 2;
      
      // Create tolerance ranges for ML compatibility
      const moistureTolerance = Math.max(5, prefMoisture * 0.2);
      const tempTolerance = Math.max(2, prefTemp * 0.15);
      const pHTolerance = Math.max(0.5, prefpH * 0.1);
      
      // Determine native status
      const isNative = ['true', 'yes', 'y', '1', 'native'].includes(
        String(seedling.native || '').toLowerCase().trim()
      );
      
      return {
        id: seedling.id,
        commonName: seedling.commonName,
        scientificName: seedling.scientificName,
        
        // ML-compatible ranges
        moistureMin: Math.max(0, prefMoisture - moistureTolerance),
        moistureMax: Math.min(100, prefMoisture + moistureTolerance),
        pHMin: Math.max(0, prefpH - pHTolerance),
        pHMax: Math.min(14, prefpH + pHTolerance),
        tempMin: prefTemp - tempTolerance,
        tempMax: prefTemp + tempTolerance,
        
        // Optimal values
        prefMoisture: Math.round(prefMoisture),
        prefTemp: Math.round(prefTemp),
        prefpH: parseFloat(prefpH.toFixed(1)),
        
        // Additional attributes
        isNative,
        category: seedling.category || (isNative ? 'native' : 'non-native'),
        successRate: parseInt(seedling.successRate) || (isNative ? 85 : 75),
        adaptabilityScore: parseInt(seedling.adaptabilityScore) || (isNative ? 90 : 80),
        climateSuitability: seedling.climateSuitability || 'Tropical',
        soilType: seedling.soilType || 'Various soil types',
        growthRate: seedling.growthRate || 'Medium',
        uses: seedling.uses || 'Reforestation'
      };
    }).filter(tree => tree !== null);
    
    // Final validation
    const validDataset = parsedDataset.filter(tree => 
      tree.commonName !== 'Unknown' && 
      tree.scientificName !== 'Unknown' &&
      tree.moistureMin >= 0 && tree.moistureMax > tree.moistureMin &&
      tree.pHMin > 0 && tree.pHMax > tree.pHMin &&
      tree.tempMin < tree.tempMax
    );
    
    if (validDataset.length === 0) {
      throw new Error('No valid tree species found in Excel file after parsing and validation');
    }
    
    console.log(`${validDataset.length} valid tree species ready for ML processing`);
    
    // Cache the processed data
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(validDataset));
      localStorage.setItem(CACHE_EXPIRY_KEY, (Date.now() + CACHE_DURATION).toString());
      console.log('Tree dataset cached successfully');
    } catch (cacheError) {
      console.warn('Failed to cache dataset:', cacheError);
    }
    
    return validDataset;
    
  } catch (error) {
    console.error('Error loading tree dataset from Excel:', error);
    
    // Try to use cached data as fallback
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData) {
      console.warn('Using expired cached data due to loading error');
      return JSON.parse(cachedData);
    }
    
    throw new Error(`Failed to load tree dataset: ${error.message}`);
  }
};

// Enhanced compatibility calculation with seasonal factors
const calculateRangeCompatibility = (value, min, max, seasonalMultiplier = 1.0) => {
  if (min === 0 && max === 0) return 0.3;
  
  // Adjust ranges based on seasonal factors
  const adjustedMin = min * seasonalMultiplier;
  const adjustedMax = max * seasonalMultiplier;
  
  if (value >= adjustedMin && value <= adjustedMax) {
    // Perfect match - give higher score for values closer to optimal center
    const center = (adjustedMin + adjustedMax) / 2;
    const distanceFromCenter = Math.abs(value - center);
    const rangeSize = adjustedMax - adjustedMin;
    return Math.max(0.8, 1.0 - (distanceFromCenter / rangeSize) * 0.2);
  } else {
    // Outside optimal range - calculate degraded score
    let distance;
    if (value < adjustedMin) {
      distance = adjustedMin - value;
    } else {
      distance = value - adjustedMax;
    }
    
    const rangeSize = adjustedMax - adjustedMin;
    const tolerance = rangeSize * 0.8; // 80% tolerance
    
    const score = Math.max(0, 1 - (distance / tolerance));
    return score;
  }
};

// Enhanced ML algorithm with confidence intervals
const generateSeedlingRecommendations = async (sensorData, additionalContext = {}) => {
  const { ph, soilMoisture, temperature, location } = sensorData;
  const { season = 'dry', elevation = 0, previousSuccess = [] } = additionalContext;
  
  // Load the tree dataset
  const dataset = await loadTreeDataset();
  
  if (dataset.length === 0) {
    throw new Error('Tree seedlings could not be loaded from Excel file or file is empty');
  }
  
  console.log(`Analyzing ${dataset.length} tree species from Excel for optimal recommendations...`);
  console.log(`Conditions: pH=${ph}, Moisture=${soilMoisture}%, Temperature=${temperature}°C, Season=${season}`);
  
  // Seasonal adjustments
  const seasonalFactors = {
    dry: { moisture: 0.8, temperature: 1.1, ph: 1.0 },
    wet: { moisture: 1.2, temperature: 0.9, ph: 1.0 },
    moderate: { moisture: 1.0, temperature: 1.0, ph: 1.0 }
  };
  
  const currentSeasonFactors = seasonalFactors[season] || seasonalFactors.moderate;
  
  // Calculate compatibility scores for each tree species
  const scoredTrees = dataset.map(tree => {
    // Environmental compatibility scores with seasonal adjustments
    const pHScore = calculateRangeCompatibility(ph, tree.pHMin, tree.pHMax, currentSeasonFactors.ph);
    const moistureScore = calculateRangeCompatibility(soilMoisture, tree.moistureMin, tree.moistureMax, currentSeasonFactors.moisture);
    const tempScore = calculateRangeCompatibility(temperature, tree.tempMin, tree.tempMax, currentSeasonFactors.temperature);
    
    // Success factors
    const successFactor = tree.successRate / 100;
    const adaptabilityFactor = tree.adaptabilityScore / 100;
    
    // Native species bonus
    const nativeBonus = tree.isNative ? 0.1 : 0;
    
    // Calculate weighted confidence score
    const baseConfidence = 
      (pHScore * 0.25) + 
      (moistureScore * 0.30) + 
      (tempScore * 0.25) + 
      (successFactor * 0.10) + 
      (adaptabilityFactor * 0.10);
    
    const confidenceScore = Math.min(1, baseConfidence + nativeBonus);
    
    // Calculate overall suitability
    const overallScore = (confidenceScore * 0.6) + (successFactor * 0.2) + (adaptabilityFactor * 0.2);
    
    return {
      id: tree.id,
      commonName: tree.commonName,
      scientificName: tree.scientificName,
      category: tree.category,
      successRate: tree.successRate,
      adaptabilityScore: tree.adaptabilityScore,
      climateSuitability: tree.climateSuitability,
      soilType: tree.soilType,
      growthRate: tree.growthRate,
      uses: tree.uses,
      
      // Optimal growing conditions
      prefMoisture: tree.prefMoisture,
      prefpH: tree.prefpH,
      prefTemp: tree.prefTemp,
      
      // Compatibility scores
      confidenceScore: Math.max(0.05, confidenceScore),
      pHCompatibility: pHScore,
      moistureCompatibility: moistureScore,
      tempCompatibility: tempScore,
      
      // Native status and bonuses
      isNative: tree.isNative,
      nativeBonus: nativeBonus,
      
      // Range information for display
      moistureRange: `${tree.moistureMin.toFixed(1)}-${tree.moistureMax.toFixed(1)}%`,
      pHRange: `${tree.pHMin.toFixed(1)}-${tree.pHMax.toFixed(1)}`,
      tempRange: `${tree.tempMin.toFixed(1)}-${tree.tempMax.toFixed(1)}°C`,
      
      // Scores
      overallScore: overallScore,
      
      // Seasonal adjustment info
      seasonalAdjustment: season,
      adjustmentFactors: currentSeasonFactors
    };
  });
  
  // Sort by multiple criteria for best recommendations
  const topRecommendations = scoredTrees
    .sort((a, b) => {
      // Primary: Overall score
      if (Math.abs(b.overallScore - a.overallScore) > 0.05) {
        return b.overallScore - a.overallScore;
      }
      // Secondary: Native species preference
      if (a.isNative !== b.isNative) {
        return b.isNative - a.isNative;
      }
      // Tertiary: Confidence score
      if (Math.abs(b.confidenceScore - a.confidenceScore) > 0.03) {
        return b.confidenceScore - a.confidenceScore;
      }
      // Quaternary: Success rate
      return b.successRate - a.successRate;
    })
    .slice(0, 3); // Top 3 recommendations
  
  console.log('Top 3 tree recommendations generated:');
  topRecommendations.forEach((tree, index) => {
    console.log(`${index + 1}. ${tree.commonName}: ${(tree.confidenceScore * 100).toFixed(1)}% confidence, Native: ${tree.isNative}, Overall: ${(tree.overallScore * 100).toFixed(1)}%`);
  });
  
  return topRecommendations;
};

function Sensors() {
  const theme = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const navigate = useNavigate();

  const user = auth.currentUser;
  const handleLogout = () => auth.signOut();

  // State management
  const [sensors, setSensors] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processingMLSensor, setProcessingMLSensor] = useState(null);
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [sensorDetailOpen, setSensorDetailOpen] = useState(false);
  const [locations, setLocations] = useState({});
  
  // Error handling
  const [error, setError] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');

  // Show notification
  const showNotification = (message, severity = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  // Fetch locations from Firestore with error handling
  const fetchLocations = async () => {
    try {
      console.log('Fetching locations from Firestore...');
      const locationsCollection = collection(firestore, 'locations');
      const locationsSnapshot = await getDocs(locationsCollection);
      const locationsData = {};
      
      locationsSnapshot.forEach((doc) => {
        locationsData[doc.id] = {
          id: doc.id,
          ...doc.data()
        };
      });
      
      console.log(`Loaded ${Object.keys(locationsData).length} locations from Firestore`);
      setLocations(locationsData);
      return locationsData;
    } catch (error) {
      console.error('Error fetching locations from Firestore:', error);
      showNotification('Failed to load location data', 'warning');
      return {};
    }
  };

  // Initialize data with better error handling
  useEffect(() => {
    setLoading(true);
    setError(null);
    
    const initializeData = async () => {
      try {
        // Fetch locations and sensors data
        const locationsData = await fetchLocations();
        
        // Set up sensors listener
        const sensorsRef = ref(rtdb, "sensors");
        
        const sensorsUnsubscribe = onValue(sensorsRef, (sensorsSnap) => {
          try {
            const sensorsObj = sensorsSnap.val() || {};
            console.log("Raw sensors data:", Object.keys(sensorsObj).length, "sensors found");

            if (Object.keys(sensorsObj).length === 0) {
              console.log("No sensors found in database");
              setSensors([]);
              setLoading(false);
              return;
            }

            const sensorsArray = Object.entries(sensorsObj).map(([id, sensor]) => {
              // Process sensor location
              let locationName = "Unknown Location";
              let locationRef = null;
              let coordinates = null;
              
              if (sensor.sensor_location && typeof sensor.sensor_location === 'string') {
                locationRef = sensor.sensor_location;
                const locationParts = sensor.sensor_location.split('/');
                const locationId = locationParts[locationParts.length - 1];
                
                if (locationsData[locationId]) {
                  const locationData = locationsData[locationId];
                  locationName = locationData.location_name || "Unknown Location";
                  coordinates = {
                    latitude: parseFloat(locationData.location_latitude),
                    longitude: parseFloat(locationData.location_longitude)
                  };
                } else {
                  locationName = locationId;
                }
              }
              
              // Process sensor readings
              const readingsObj = sensor.sensordata || {};
              const readingsArr = Object.entries(readingsObj).map(([rid, r]) => ({
                readingId: rid,
                ...r,
              }));

              // Sort by timestamp (latest first)
              readingsArr.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
              
              const latest = readingsArr[0] || {};
              
              return {
                id,
                location: locationName,
                locationRef: locationRef,
                coordinates: coordinates,
                status: sensor.sensor_status || "Unknown",
                statusDescription: `Sensor is currently ${sensor.sensor_status || 'Unknown'}`,
                lastCalibration: sensor.sensor_lastCalibrationDate || null,

                // Latest sensor values
                ph: latest.pH !== undefined ? latest.pH : "N/A",
                soilMoisture: latest.soilMoisture !== undefined ? latest.soilMoisture : "N/A",
                temperature: latest.temperature !== undefined ? latest.temperature : "N/A",

                readings: readingsArr,
                timestamp: latest.timestamp || null,
              };
            });

            console.log(`Processed ${sensorsArray.length} sensors successfully`);
            setSensors(sensorsArray);
            setLoading(false);
            
            if (sensorsArray.length > 0) {
              showNotification(`Loaded ${sensorsArray.length} sensors`, 'success');
            }
            
          } catch (processingError) {
            console.error("Error processing sensors data:", processingError);
            setError('Failed to process sensor data');
            setLoading(false);
            showNotification('Error processing sensor data', 'error');
          }
        }, (error) => {
          console.error("Error fetching sensors:", error);
          setError('Failed to fetch sensor data');
          setLoading(false);
          showNotification('Failed to connect to sensor database', 'error');
        });

        return () => sensorsUnsubscribe();
        
      } catch (error) {
        console.error("Error initializing data:", error);
        setError('Failed to initialize application');
        setLoading(false);
        showNotification('Application initialization failed', 'error');
      }
    };

    initializeData();
  }, []);

  // Enhanced refresh functionality
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    
    try {
      // Clear cache to force fresh data load
      localStorage.removeItem('reforest_tree_dataset');
      localStorage.removeItem('reforest_tree_dataset_expiry');
      
      // Reload locations
      await fetchLocations();
      
      showNotification('Data refreshed successfully', 'success');
    } catch (error) {
      console.error('Refresh failed:', error);
      showNotification('Failed to refresh data', 'error');
    }
    
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  const handleGenerateML = async (sensor) => {
  try {
    setProcessingMLSensor(sensor.id);

    const { ph, soilMoisture, temperature } = sensor;

    const validation = validateSensorData({ ph, soilMoisture, temperature });
    if (!validation.isValid) {
      showNotification(
        `Invalid sensor data: ${validation.errors.join(', ')}. Please check sensor readings.`,
        'warning'
      );
      setProcessingMLSensor(null);
      return;
    }

    showNotification('Processing ML algorithm with tree dataset... This may take a few seconds.', 'info');

    const recommendedTrees = await retryOperation(async () => {
      return await generateSeedlingRecommendations({
        ph: parseFloat(ph),
        soilMoisture: parseFloat(soilMoisture),
        temperature: parseFloat(temperature),
        location: sensor.location
      }, { season: 'dry', elevation: 0 });
    }, 3);

    if (recommendedTrees.length === 0) {
      showNotification(
        'No suitable tree species found for these soil conditions. The sensor readings may be outside optimal ranges.',
        'warning'
      );
      setProcessingMLSensor(null);
      return;
    }

    const avgConfidence = recommendedTrees.reduce((sum, tree) => sum + tree.confidenceScore, 0) / recommendedTrees.length;

    const latestReading = sensor.readings[0];
    const sensorDataRef = `/sensors/${sensor.id}/sensordata/${latestReading?.readingId || 'latest'}`;

    // Save recommendation doc first
    const recommendationData = {
      sensorDataRef,
      locationRef: sensor.locationRef || `/locations/${sensor.location}`,
      seedlingOptions: [],
      reco_confidenceScore: parseFloat((avgConfidence * 100).toFixed(2)),
      reco_generatedAt: new Date().toISOString()
    };

    const recommendationsRef = collection(firestore, "recommendations");
    const recoDocRef = await addDoc(recommendationsRef, recommendationData);

    const seedlingsRef = collection(firestore, "treeseedlings");

    // Fetch all existing tsXXX and find the max index
    const allSeedlingsSnapshot = await getDocs(seedlingsRef);
    let maxIndex = 0;
    allSeedlingsSnapshot.forEach(doc => {
      const id = doc.id; // tsXXX
      if (id.startsWith('ts')) {
        const num = parseInt(id.replace('ts', ''), 10);
        if (num > maxIndex) maxIndex = num;
      }
    });

    const seedlingOptions = [];

    // Save each seedling with incremented tsId
    for (let i = 0; i < recommendedTrees.length; i++) {
      const tree = recommendedTrees[i];
      const tsId = `ts${String(maxIndex + i + 1).padStart(3, '0')}`;
      const seedlingDocRef = doc(seedlingsRef, tsId);

      await setDoc(seedlingDocRef, {
        seedling_scientificName: tree.scientificName,
        seedling_commonName: tree.commonName,
        seedling_prefMoisture: parseFloat(tree.moistureCompatibility),
        seedling_prefTemp: parseFloat(tree.tempCompatibility),
        seedling_prefpH: parseFloat(tree.pHCompatibility),
        seedling_isNative: tree.isNative,
        sourceRecommendationId: recoDocRef.id,
        createdAt: serverTimestamp()
      });

      seedlingOptions.push(`/treeseedlings/${tsId}`);
    }

    // Update recommendation with seedlingOptions
    await updateDoc(recoDocRef, { seedlingOptions });

    setProcessingMLSensor(null);

    const topTree = recommendedTrees[0];
    showNotification(
      `ML Analysis Complete! Top recommendation: ${topTree.commonName} (${(topTree.confidenceScore * 100).toFixed(1)}% confidence)`,
      'success'
    );

    setTimeout(() => {
      navigate('/recommendations');
    }, 2000);

  } catch (error) {
    console.error('Error generating ML recommendations:', error);
    let errorMessage = 'Failed to generate recommendations. ';
    if (error.message.includes('Excel') || error.message.includes('dataset')) {
      errorMessage += 'Please ensure Tree_Seedling_Dataset.xlsx is properly formatted and accessible.';
    } else {
      errorMessage += 'Please try again or check your internet connection.';
    }
    showNotification(errorMessage, 'error');
    setProcessingMLSensor(null);
  }
};

  // Event handlers
  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSensorClick = (sensor) => {
    setSelectedSensor(sensor);
    setSensorDetailOpen(true);
  };

  const handleCloseSensorDetail = () => {
    setSensorDetailOpen(false);
    setSelectedSensor(null);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  // Utility functions
  const formatValue = (value, unit = '') => {
    if (value === "N/A" || value === null || value === undefined) {
      return "N/A";
    }
    return `${value}${unit}`;
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'active': return 'success';
      case 'inactive': return 'error';
      case 'under maintenance': return 'warning';
      default: return 'info';
    }
  };

  const getStatusIcon = (status) => {
    switch (status.toLowerCase()) {
      case 'active': return <CheckCircleIcon />;
      case 'inactive': return <WarningIcon />;
      case 'under maintenance': return <WarningIcon />;
      default: return <WarningIcon />;
    }
  };

  // Main render
  return (
    <Box sx={{ display: 'flex', bgcolor: '#f8fafc', minHeight: '100vh' }}>
      <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={user} onLogout={handleLogout} />
      <Navigation mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} isMobile={false} />

      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - ${drawerWidth}px)` } }}>
        <Toolbar />

        {/* Header Section */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" sx={{ color: '#2e7d32', fontWeight: 600, mb: 1 }}>
              ReForest Sensor Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {sensors.length} sensor{sensors.length !== 1 ? 's' : ''} found
              {locations && Object.keys(locations).length > 0 && 
                ` • ${Object.keys(locations).length} locations loaded`
              }
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Tooltip title="Refresh all data">
              <Button 
                variant="outlined" 
                onClick={handleRefresh} 
                disabled={isRefreshing || loading}
                startIcon={<RefreshIcon />}
                sx={{ minWidth: 120 }}
              >
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
            </Tooltip>
            <Tooltip title="Download sensor data">
              <Button 
                variant="contained" 
                disabled={loading || sensors.length === 0}
                startIcon={<DownloadIcon />}
                sx={{ 
                  bgcolor: '#2e7d32',
                  '&:hover': { bgcolor: '#1b5e20' }
                }}
                onClick={() => {
                  // TODO: Implement CSV export functionality
                  showNotification('Export functionality coming soon!', 'info');
                }}
              >
                Export
              </Button>
            </Tooltip>
          </Box>
        </Box>

        {/* Loading and Error States */}
        {(isRefreshing || loading) && <LinearProgress sx={{ mb: 2 }} />}
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Main Content */}
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300 }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="body1" color="textSecondary">
              Loading sensors and location data...
            </Typography>
          </Box>
        ) : sensors.length === 0 ? (
          <Card sx={{ p: 4, textAlign: 'center' }}>
            <SensorsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No sensors found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Make sure your sensors are properly configured and connected to the database.
            </Typography>
            <Button variant="outlined" onClick={handleRefresh} startIcon={<RefreshIcon />}>
              Try Again
            </Button>
          </Card>
        ) : (
          <Paper sx={{ width: '100%', mb: 2, borderRadius: 2, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
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
                          <Typography variant="body2" sx={{ maxWidth: 150 }} title={sensor.location}>
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
                        <Typography variant="body2" sx={{ 
                          color: sensor.ph !== "N/A" ? (sensor.ph >= 6.0 && sensor.ph <= 8.0 ? 'success.main' : 'warning.main') : 'text.secondary',
                          fontWeight: sensor.ph !== "N/A" ? 'medium' : 'normal'
                        }}>
                          {formatValue(sensor.ph)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ 
                          color: sensor.soilMoisture !== "N/A" ? (sensor.soilMoisture >= 30 ? 'success.main' : 'error.main') : 'text.secondary',
                          fontWeight: sensor.soilMoisture !== "N/A" ? 'medium' : 'normal'
                        }}>
                          {formatValue(sensor.soilMoisture, '%')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ 
                          color: sensor.temperature !== "N/A" ? (sensor.temperature >= 20 && sensor.temperature <= 35 ? 'success.main' : 'warning.main') : 'text.secondary',
                          fontWeight: sensor.temperature !== "N/A" ? 'medium' : 'normal'
                        }}>
                          {formatValue(sensor.temperature, '°C')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {sensor.timestamp
                            ? new Date(sensor.timestamp).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : "N/A"}
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
                        <Tooltip title="Generate ML tree recommendations">
                          <span>
                            <Button 
                              variant="contained" 
                              size="small" 
                              onClick={() => handleGenerateML(sensor)}
                              disabled={
                                processingMLSensor === sensor.id ||
                                loading || 
                                sensor.ph === "N/A" || 
                                sensor.soilMoisture === "N/A" || 
                                sensor.temperature === "N/A"
                              }
                              sx={{ 
                                minWidth: 100,
                                bgcolor: '#2e7d32',
                                '&:hover': { bgcolor: '#1b5e20' },
                                '&:disabled': { 
                                  bgcolor: '#cccccc',
                                  color: '#666666'
                                }
                              }}
                              startIcon={processingMLSensor === sensor.id ? <CircularProgress size={16} color="inherit" /> : <ScienceIcon />}
                            >
                              {processingMLSensor === sensor.id ? 'Processing...' : 'Generate ML'}
                            </Button>
                          </span>
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
              count={sensors.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </Paper>
        )}

        {/* Sensor Detail Modal - Enhanced */}
        <Dialog
          open={sensorDetailOpen}
          onClose={handleCloseSensorDetail}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: { borderRadius: 2, minHeight: '70vh' }
          }}
        >
          <DialogTitle sx={{ bgcolor: '#2e7d32', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <SensorsIcon sx={{ mr: 2 }} />
              <Box>
                <Typography variant="h6" fontWeight="bold">
                  Sensor Details: {selectedSensor?.id}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {selectedSensor?.location}
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={handleCloseSensorDetail} sx={{ color: 'white' }}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          
          <DialogContent sx={{ p: 3 }}>
            {selectedSensor && (
              <Box>
                {/* Enhanced Sensor Overview */}
                <Grid container spacing={3} sx={{ mb: 3 }}>
                  <Grid item xs={12} md={4}>
                    <Card sx={{ height: '100%', bgcolor: '#f8fafc' }}>
                      <CardContent>
                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 2, color: '#2e7d32' }}>
                          <LocationIcon sx={{ mr: 1 }} />
                          Location Information
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          <strong>Location:</strong> {selectedSensor.location}
                        </Typography>
                        {selectedSensor.locationRef && (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            <strong>Reference:</strong> {selectedSensor.locationRef}
                          </Typography>
                        )}
                        {selectedSensor.coordinates && (
                          <Typography variant="body2" color="text.secondary">
                            <strong>GPS:</strong> {selectedSensor.coordinates.latitude.toFixed(6)}°, {selectedSensor.coordinates.longitude.toFixed(6)}°
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <Card sx={{ height: '100%', bgcolor: '#f8fafc' }}>
                      <CardContent>
                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 2, color: '#2e7d32' }}>
                          <CalendarIcon sx={{ mr: 1 }} />
                          Status & Maintenance
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                            <strong>Status:</strong>
                          </Typography>
                          <Chip
                            label={selectedSensor.status}
                            color={getStatusColor(selectedSensor.status)}
                            icon={getStatusIcon(selectedSensor.status)}
                            size="small"
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          <strong>Last Calibration:</strong> {selectedSensor.lastCalibration || 'Not recorded'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Data Points:</strong> {selectedSensor.readings.length} readings
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Card sx={{ height: '100%', bgcolor: '#f8fafc' }}>
                      <CardContent>
                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 2, color: '#2e7d32' }}>
                          <ScienceIcon sx={{ mr: 1 }} />
                          Data Quality
                        </Typography>
                        {selectedSensor.ph !== "N/A" && selectedSensor.soilMoisture !== "N/A" && selectedSensor.temperature !== "N/A" ? (
                          <>
                            <Typography variant="body2" color="success.main" sx={{ mb: 1 }}>
                              <strong>Status:</strong> Complete readings available
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Ready for ML analysis
                            </Typography>
                          </>
                        ) : (
                          <>
                            <Typography variant="body2" color="error.main" sx={{ mb: 1 }}>
                              <strong>Status:</strong> Incomplete data
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Missing: {[
                                selectedSensor.ph === "N/A" ? "pH" : null,
                                selectedSensor.soilMoisture === "N/A" ? "Moisture" : null,
                                selectedSensor.temperature === "N/A" ? "Temperature" : null
                              ].filter(Boolean).join(", ")}
                            </Typography>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {/* Enhanced Current Readings Display */}
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 3, color: '#2e7d32', display: 'flex', alignItems: 'center' }}>
                      Current Environmental Readings
                      {selectedSensor.timestamp && (
                        <Chip 
                          label={`Updated ${new Date(selectedSensor.timestamp).toLocaleString()}`}
                          size="small"
                          sx={{ ml: 2 }}
                        />
                      )}
                    </Typography>
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={4}>
                        <Card sx={{ 
                          p: 2, 
                          bgcolor: selectedSensor.ph !== "N/A" ? (selectedSensor.ph >= 6.0 && selectedSensor.ph <= 8.0 ? '#e8f5e8' : '#fff3e0') : '#f5f5f5',
                          border: '1px solid',
                          borderColor: selectedSensor.ph !== "N/A" ? (selectedSensor.ph >= 6.0 && selectedSensor.ph <= 8.0 ? '#4caf50' : '#ff9800') : '#e0e0e0'
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <pHIcon sx={{ mr: 2, color: '#1976d2', fontSize: 32 }} />
                            <Box>
                              <Typography variant="caption" color="text.secondary">pH Level</Typography>
                              <Typography variant="h5" fontWeight="bold">
                                {formatValue(selectedSensor.ph)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {selectedSensor.ph !== "N/A" && (
                                  selectedSensor.ph >= 6.0 && selectedSensor.ph <= 8.0 ? "Optimal" : "Needs attention"
                                )}
                              </Typography>
                            </Box>
                          </Box>
                        </Card>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Card sx={{ 
                          p: 2, 
                          bgcolor: selectedSensor.soilMoisture !== "N/A" ? (selectedSensor.soilMoisture >= 30 ? '#e8f5e8' : '#ffebee') : '#f5f5f5',
                          border: '1px solid',
                          borderColor: selectedSensor.soilMoisture !== "N/A" ? (selectedSensor.soilMoisture >= 30 ? '#4caf50' : '#f44336') : '#e0e0e0'
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <WaterDropIcon sx={{ mr: 2, color: '#0288d1', fontSize: 32 }} />
                            <Box>
                              <Typography variant="caption" color="text.secondary">Soil Moisture</Typography>
                              <Typography variant="h5" fontWeight="bold">
                                {formatValue(selectedSensor.soilMoisture, '%')}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {selectedSensor.soilMoisture !== "N/A" && (
                                  selectedSensor.soilMoisture >= 30 ? "Good" : "Low moisture"
                                )}
                              </Typography>
                            </Box>
                          </Box>
                        </Card>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Card sx={{ 
                          p: 2, 
                          bgcolor: selectedSensor.temperature !== "N/A" ? (selectedSensor.temperature >= 20 && selectedSensor.temperature <= 35 ? '#e8f5e8' : '#fff3e0') : '#f5f5f5',
                          border: '1px solid',
                          borderColor: selectedSensor.temperature !== "N/A" ? (selectedSensor.temperature >= 20 && selectedSensor.temperature <= 35 ? '#4caf50' : '#ff9800') : '#e0e0e0'
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <ThermostatIcon sx={{ mr: 2, color: '#f57c00', fontSize: 32 }} />
                            <Box>
                              <Typography variant="caption" color="text.secondary">Temperature</Typography>
                              <Typography variant="h5" fontWeight="bold">
                                {formatValue(selectedSensor.temperature, '°C')}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {selectedSensor.temperature !== "N/A" && (
                                  selectedSensor.temperature >= 20 && selectedSensor.temperature <= 35 ? "Optimal" : "Outside range"
                                )}
                              </Typography>
                            </Box>
                          </Box>
                        </Card>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {/* Historical Readings with Enhanced Display */}
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, color: '#2e7d32' }}>
                      Reading History ({selectedSensor.readings.length} readings)
                    </Typography>
                    {selectedSensor.readings.length > 0 ? (
                      <TableContainer sx={{ maxHeight: 400 }}>
                        <Table stickyHeader size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell><strong>Timestamp</strong></TableCell>
                              <TableCell align="center"><strong>pH</strong></TableCell>
                              <TableCell align="center"><strong>Moisture (%)</strong></TableCell>
                              <TableCell align="center"><strong>Temperature (°C)</strong></TableCell>
                              <TableCell align="center"><strong>Quality</strong></TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {selectedSensor.readings.map((reading, index) => {
                              const validation = validateSensorData({
                                ph: reading.pH,
                                soilMoisture: reading.soilMoisture,
                                temperature: reading.temperature
                              });
                              
                              return (
                                <TableRow key={reading.readingId || index} hover>
                                  <TableCell>
                                    <Typography variant="body2">
                                      {reading.timestamp
                                        ? new Date(reading.timestamp).toLocaleString('en-US', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })
                                        : "N/A"}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="center">
                                    <Typography variant="body2" sx={{ 
                                      color: reading.pH !== undefined ? (reading.pH >= 6.0 && reading.pH <= 8.0 ? 'success.main' : 'warning.main') : 'text.secondary',
                                      fontWeight: 'medium'
                                    }}>
                                      {reading.pH !== undefined ? reading.pH.toFixed(1) : "N/A"}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="center">
                                    <Typography variant="body2" sx={{ 
                                      color: reading.soilMoisture !== undefined ? (reading.soilMoisture >= 30 ? 'success.main' : 'error.main') : 'text.secondary',
                                      fontWeight: 'medium'
                                    }}>
                                      {reading.soilMoisture !== undefined ? `${reading.soilMoisture}%` : "N/A"}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="center">
                                    <Typography variant="body2" sx={{ 
                                      color: reading.temperature !== undefined ? (reading.temperature >= 20 && reading.temperature <= 35 ? 'success.main' : 'warning.main') : 'text.secondary',
                                      fontWeight: 'medium'
                                    }}>
                                      {reading.temperature !== undefined ? `${reading.temperature}°C` : "N/A"}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="center">
                                    <Chip
                                      label={validation.isValid ? "Valid" : "Invalid"}
                                      color={validation.isValid ? "success" : "error"}
                                      size="small"
                                    />
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                        No historical readings available for this sensor.
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Box>
            )}
          </DialogContent>
          
          <DialogActions sx={{ p: 3, bgcolor: '#f8fafc' }}>
            <Button onClick={handleCloseSensorDetail} variant="outlined">
              Close
            </Button>
            {selectedSensor && (
              <Button 
                variant="contained" 
                onClick={() => {
                  handleCloseSensorDetail();
                  handleGenerateML(selectedSensor);
                }}
                disabled={
                  processingMLSensor === selectedSensor?.id ||
                  loading || 
                  !validateSensorData({
                    ph: selectedSensor?.ph,
                    soilMoisture: selectedSensor?.soilMoisture,
                    temperature: selectedSensor?.temperature
                  }).isValid
                }
                sx={{ 
                  bgcolor: '#2e7d32',
                  '&:hover': { bgcolor: '#1b5e20' },
                  minWidth: 200
                }}
                startIcon={<ScienceIcon />}
              >
                Generate ML Recommendations
              </Button>
            )}
          </DialogActions>
        </Dialog>

        {/* Enhanced Snackbar Notifications */}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={60000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            onClose={handleCloseSnackbar} 
            severity={snackbarSeverity} 
            sx={{ width: '100%', minWidth: 300 }}
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
}

export default Sensors;