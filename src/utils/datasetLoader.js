// src/utils/datasetLoader.js - Complete Production-Ready Version
import * as XLSX from 'xlsx';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp 
} from 'firebase/firestore';
import { firestore } from '../firebase.js';

// ============================================================================
// CONFIGURATION
// ============================================================================
const CONFIG = {
  CACHE_KEY: 'reforest_tree_dataset',
  CACHE_EXPIRY_KEY: 'reforest_tree_dataset_expiry',
  CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours
  DATASET_PATH: '/data/Tree_Seedling_Dataset.xlsx',
  NEARBY_RADIUS_KM: 5,
  MIN_READINGS_FOR_TREND: 7,
  EARTH_RADIUS_KM: 6371
};

// Validation ranges for sensor data
const SENSOR_RANGES = {
  ph: { min: 0, max: 14, optimal: [6.0, 8.0] },
  soilMoisture: { min: 0, max: 100, optimal: [30, 70] },
  temperature: { min: -10, max: 60, optimal: [20, 35] }
};

// Seasonal multipliers for Philippines climate
const SEASONAL_FACTORS = {
  dry: { moisture: 0.8, temperature: 1.1, ph: 1.0 },
  wet: { moisture: 1.2, temperature: 0.9, ph: 1.0 },
  moderate: { moisture: 1.0, temperature: 1.0, ph: 1.0 }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Parse range strings from dataset (handles various formats)
 * @param {string|number} rangeStr - Range string like "20-30", "25", "20–30°C"
 * @returns {Object} { min, max, valid }
 */
export const parseRange = (rangeStr) => {
  if (!rangeStr || rangeStr === 'N/A' || rangeStr === '' || rangeStr === null) {
    return { min: 0, max: 0, valid: false };
  }
  
  try {
    // Convert to string and clean
    let cleaned = String(rangeStr)
      .replace(/°C/gi, '')
      .replace(/%/g, '')
      .replace(/[–—−]/g, '-') // Handle different dash types
      .replace(/\s+/g, '')
      .trim();
    
    // Handle scientific notation (e.g., 1.5e2)
    if (/[eE]/.test(cleaned)) {
      const value = parseFloat(cleaned);
      if (isNaN(value)) {
        return { min: 0, max: 0, valid: false };
      }
      return { min: value, max: value, valid: true };
    }
    
    // Handle single values
    if (!cleaned.includes('-')) {
      const value = parseFloat(cleaned);
      if (isNaN(value)) {
        return { min: 0, max: 0, valid: false };
      }
      return { min: value, max: value, valid: true };
    }
    
    // Handle ranges (e.g., "20-30")
    const parts = cleaned.split('-').filter(p => p.length > 0);
    
    if (parts.length === 2) {
      const min = parseFloat(parts[0]);
      const max = parseFloat(parts[1]);
      
      if (isNaN(min) || isNaN(max)) {
        return { min: 0, max: 0, valid: false };
      }
      
      // Ensure min is always less than max
      return {
        min: Math.min(min, max),
        max: Math.max(min, max),
        valid: true
      };
    }
    
    // Invalid format
    return { min: 0, max: 0, valid: false };
    
  } catch (error) {
    console.error('Error parsing range:', rangeStr, error);
    return { min: 0, max: 0, valid: false };
  }
};

/**
 * Calculate compatibility score based on sensor value vs optimal range
 * @param {number} value - Current sensor value
 * @param {number} min - Minimum optimal value
 * @param {number} max - Maximum optimal value
 * @param {number} seasonalMultiplier - Seasonal adjustment factor
 * @returns {number} Compatibility score (0-1)
 */
export const calculateRangeCompatibility = (value, min, max, seasonalMultiplier = 1.0) => {
  // Handle invalid ranges
  if (min === 0 && max === 0) return 0.3; // Default low score for missing data
  if (isNaN(value) || isNaN(min) || isNaN(max)) return 0;
  
  // Apply seasonal adjustment
  const adjustedMin = min * seasonalMultiplier;
  const adjustedMax = max * seasonalMultiplier;
  
  // Value within optimal range
  if (value >= adjustedMin && value <= adjustedMax) {
    // Perfect match - score higher for values closer to center
    const center = (adjustedMin + adjustedMax) / 2;
    const distanceFromCenter = Math.abs(value - center);
    const rangeSize = adjustedMax - adjustedMin;
    
    if (rangeSize === 0) return 1.0; // Single value match
    
    // Score decreases as we move away from center
    return Math.max(0.8, 1.0 - (distanceFromCenter / rangeSize) * 0.2);
  }
  
  // Value outside optimal range - calculate degraded score
  const distance = value < adjustedMin 
    ? adjustedMin - value 
    : value - adjustedMax;
  
  const rangeSize = adjustedMax - adjustedMin;
  const tolerance = Math.max(rangeSize * 0.8, 5); // At least 5 units tolerance
  
  // Exponential decay for values outside range
  const score = Math.exp(-distance / tolerance);
  
  return Math.max(0, Math.min(1, score));
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude 1
 * @param {number} lon1 - Longitude 1
 * @param {number} lat2 - Latitude 2
 * @param {number} lon2 - Longitude 2
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  // Validate inputs
  if ([lat1, lon1, lat2, lon2].some(coord => isNaN(coord) || coord === null)) {
    return Infinity;
  }
  
  const toRad = (deg) => deg * Math.PI / 180;
  
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = CONFIG.EARTH_RADIUS_KM * c;
  
  return distance;
};

/**
 * Calculate linear regression trend from array of values
 * @param {number[]} values - Array of numerical values
 * @returns {Object} { slope, intercept, r2 }
 */
export const calculateTrend = (values) => {
  const n = values.length;
  
  if (n === 0 || values.some(v => isNaN(v))) {
    return { slope: 0, intercept: 0, r2: 0 };
  }
  
  if (n === 1) {
    return { slope: 0, intercept: values[0], r2: 1 };
  }
  
  const indices = Array.from({length: n}, (_, i) => i);
  
  // Calculate sums for linear regression
  const sumX = indices.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = indices.reduce((sum, x, i) => sum + x * values[i], 0);
  const sumX2 = indices.reduce((sum, x) => sum + x * x, 0);
  
  const denominator = (n * sumX2 - sumX * sumX);
  
  if (denominator === 0) {
    return { slope: 0, intercept: sumY / n, r2: 0 };
  }
  
  // Calculate slope and intercept
  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  
  // Calculate R² (coefficient of determination)
  const yMean = sumY / n;
  const ssTotal = values.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
  const ssResidual = values.reduce((sum, y, i) => 
    sum + Math.pow(y - (slope * i + intercept), 2), 0
  );
  
  const r2 = ssTotal > 0 ? Math.max(0, 1 - (ssResidual / ssTotal)) : 0;
  
  return { slope, intercept, r2 };
};

/**
 * Safe localStorage operations with error handling
 */
const safeLocalStorage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn('localStorage.getItem failed:', error);
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn('localStorage.setItem failed:', error);
      return false;
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn('localStorage.removeItem failed:', error);
      return false;
    }
  }
};

// ============================================================================
// CORE DATASET LOADING
// ============================================================================

/**
 * Load and parse tree dataset from Excel file with caching
 * @returns {Promise<Array>} Array of tree species objects
 */
export const loadTreeDataset = async () => {
  try {
    // Check cache first
    const cachedData = safeLocalStorage.getItem(CONFIG.CACHE_KEY);
    const cacheExpiry = safeLocalStorage.getItem(CONFIG.CACHE_EXPIRY_KEY);
    
    if (cachedData && cacheExpiry && Date.now() < parseInt(cacheExpiry)) {
      console.log('Using cached tree dataset');
      try {
        const parsed = JSON.parse(cachedData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (parseError) {
        console.warn('Cached data corrupted, reloading...');
        safeLocalStorage.removeItem(CONFIG.CACHE_KEY);
        safeLocalStorage.removeItem(CONFIG.CACHE_EXPIRY_KEY);
      }
    }
    
    console.log('Loading tree dataset from Excel file...');
    
    // Try multiple possible paths
    const possiblePaths = [
      CONFIG.DATASET_PATH,
      '/public/data/Tree_Seedling_Dataset.xlsx',
      'data/Tree_Seedling_Dataset.xlsx',
      './data/Tree_Seedling_Dataset.xlsx',
      '../public/data/Tree_Seedling_Dataset.xlsx'
    ];
    
    let response = null;
    let usedPath = null;
    let lastError = null;
    
    for (const path of possiblePaths) {
      try {
        response = await fetch(path);
        if (response.ok) {
          usedPath = path;
          console.log(`Successfully loaded Excel file from: ${usedPath}`);
          break;
        }
      } catch (error) {
        lastError = error;
        console.warn(`Failed to load from ${path}:`, error.message);
      }
    }
    
    if (!response || !response.ok) {
      throw new Error(
        `Excel file not found. Tried paths: ${possiblePaths.join(', ')}. ` +
        `Last error: ${lastError?.message || 'Unknown'}. ` +
        `Please ensure Tree_Seedling_Dataset.xlsx is in /public/data/ folder.`
      );
    }
    
    const arrayBuffer = await response.arrayBuffer();
    
    // Parse Excel file
    const workbook = XLSX.read(arrayBuffer, {
      type: 'array',
      cellDates: true,
      cellNF: false,
      cellText: false
    });
    
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('Excel file does not contain any worksheets');
    }
    
    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    if (!worksheet) {
      throw new Error(`Worksheet "${sheetName}" is empty or invalid`);
    }
    
    // Convert to JSON
    const rawData = XLSX.utils.sheet_to_json(worksheet, { 
      defval: null,
      blankrows: false 
    });
    
    if (!rawData || rawData.length === 0) {
      throw new Error('Excel file contains no data rows');
    }
    
    console.log(`Loaded ${rawData.length} rows from Excel dataset`);
    
    // Parse and validate each species
    const parsedDataset = rawData.map((species, index) => {
      try {
        // Parse ranges with multiple possible column names
        const moistureRange = parseRange(
          species["Soil Moisture"] || 
          species["Moisture"] || 
          species["Preferred Moisture"] ||
          species["moisture"]
        );
        
        const pHRange = parseRange(
          species["pH Range"] || 
          species["pH"] || 
          species["Preferred pH"] ||
          species["ph"]
        );
        
        const tempRange = parseRange(
          species["Temperature"] || 
          species["Preferred Temperature"] ||
          species["Temp"] ||
          species["temperature"]
        );
        
        // Validate all ranges
        if (!moistureRange.valid || !pHRange.valid || !tempRange.valid) {
          console.warn(
            `Row ${index + 2}: Invalid range data - ` +
            `Moisture: ${moistureRange.valid}, pH: ${pHRange.valid}, Temp: ${tempRange.valid}`
          );
          return null;
        }
        
        // Calculate optimal values as range midpoint
        const prefMoisture = (moistureRange.min + moistureRange.max) / 2;
        const prefTemp = (tempRange.min + tempRange.max) / 2;
        const prefpH = (pHRange.min + pHRange.max) / 2;
        
        // Calculate tolerance ranges (±20% for moisture, ±15% for temp, ±10% for pH)
        const moistureTolerance = Math.max(5, prefMoisture * 0.2);
        const tempTolerance = Math.max(2, prefTemp * 0.15);
        const pHTolerance = Math.max(0.5, prefpH * 0.1);
        
        // Determine native status (multiple possible values)
        const nativeValue = String(
          species["Native"] || 
          species["Is Native"] || 
          species["native"] || 
          ''
        ).toLowerCase().trim();
        
        const isNative = ['true', 'yes', 'y', '1', 'native'].includes(nativeValue);
        
        // Extract other fields with defaults
        const commonName = species["Common Name"] || species["common_name"] || 'Unknown';
        const scientificName = species["Scientific Name"] || species["scientific_name"] || 'Unknown';
        
        if (commonName === 'Unknown' || scientificName === 'Unknown') {
          console.warn(`Row ${index + 2}: Missing species name`);
          return null;
        }
        
        return {
          id: `seed_${String(index + 1).padStart(3, '0')}`,
          commonName,
          scientificName,
          soilType: species["Soil Type"] || species["soil_type"] || 'Various soil types',
          
          // ML-compatible ranges (with tolerance)
          moistureMin: Math.max(0, prefMoisture - moistureTolerance),
          moistureMax: Math.min(100, prefMoisture + moistureTolerance),
          pHMin: Math.max(0, prefpH - pHTolerance),
          pHMax: Math.min(14, prefpH + pHTolerance),
          tempMin: prefTemp - tempTolerance,
          tempMax: prefTemp + tempTolerance,
          
          // Optimal values (for display)
          prefMoisture: Math.round(prefMoisture * 10) / 10,
          prefTemp: Math.round(prefTemp * 10) / 10,
          prefpH: Math.round(prefpH * 10) / 10,
          
          // Additional attributes
          category: species["Category"] || species["category"] || (isNative ? 'native' : 'non-native'),
          successRate: parseInt(species["Success Rate (%)"] || species["Success Rate"] || species["success_rate"]) || (isNative ? 85 : 75),
          adaptabilityScore: parseInt(species["Adaptability Score"] || species["adaptability_score"]) || (isNative ? 90 : 80),
          climateSuitability: species["Climate Suitability"] || species["climate_suitability"] || 'Tropical',
          isNative,
          growthRate: species["Growth Rate"] || species["growth_rate"] || 'Medium',
          uses: species["Uses"] || species["uses"] || 'Reforestation',
          
          // Original ranges (for reference)
          originalRanges: {
            moisture: `${moistureRange.min}-${moistureRange.max}`,
            pH: `${pHRange.min}-${pHRange.max}`,
            temperature: `${tempRange.min}-${tempRange.max}`
          }
        };
      } catch (error) {
        console.error(`Error parsing row ${index + 2}:`, error);
        return null;
      }
    });
    
    // Filter out invalid entries
    const validDataset = parsedDataset.filter(tree => {
      if (!tree) return false;
      
      // Additional validation
      const isValid = 
        tree.commonName !== 'Unknown' && 
        tree.scientificName !== 'Unknown' &&
        tree.moistureMin >= 0 && 
        tree.moistureMax > tree.moistureMin &&
        tree.moistureMax <= 100 &&
        tree.pHMin > 0 && 
        tree.pHMax > tree.pHMin &&
        tree.pHMax <= 14 &&
        tree.tempMin < tree.tempMax &&
        tree.successRate > 0 && 
        tree.successRate <= 100;
      
      if (!isValid) {
        console.warn(`Invalid tree entry: ${tree?.commonName}`);
      }
      
      return isValid;
    });
    
    if (validDataset.length === 0) {
      throw new Error(
        'No valid tree species found after parsing. ' +
        'Please check Excel file format and column names.'
      );
    }
    
    console.log(`${validDataset.length} valid tree species ready for ML processing`);
    
    // Cache the processed data
    const cacheSuccess = safeLocalStorage.setItem(
      CONFIG.CACHE_KEY, 
      JSON.stringify(validDataset)
    );
    
    if (cacheSuccess) {
      safeLocalStorage.setItem(
        CONFIG.CACHE_EXPIRY_KEY, 
        (Date.now() + CONFIG.CACHE_DURATION).toString()
      );
      console.log('Tree dataset cached successfully');
    }
    
    return validDataset;
    
  } catch (error) {
    console.error('Error loading tree dataset:', error);
    
    // Try to use cached data as fallback (even if expired)
    const cachedData = safeLocalStorage.getItem(CONFIG.CACHE_KEY);
    if (cachedData) {
      console.warn('Using expired cached data due to loading error');
      try {
        return JSON.parse(cachedData);
      } catch (parseError) {
        console.error('Cached data is corrupted');
      }
    }
    
    throw new Error(`Failed to load tree dataset: ${error.message}`);
  }
};

// ============================================================================
// ADVANCED ML FEATURES
// ============================================================================

/**
 * Get nearby sensors within specified radius
 * @param {Object} currentLocation - { latitude, longitude }
 * @param {number} radiusKm - Search radius in kilometers
 * @returns {Promise<Array>} Array of nearby sensors with distances
 */
export const getNearbySernsorsData = async (currentLocation, radiusKm = CONFIG.NEARBY_RADIUS_KM) => {
  try {
    if (!currentLocation || !currentLocation.latitude || !currentLocation.longitude) {
      return [];
    }
    
    const locationsSnapshot = await getDocs(collection(firestore, 'locations'));
    const nearbySensors = [];
    
    locationsSnapshot.forEach(doc => {
      const location = doc.data();
      const lat = parseFloat(location.location_latitude);
      const lon = parseFloat(location.location_longitude);
      
      if (isNaN(lat) || isNaN(lon)) return;
      
      const distance = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        lat,
        lon
      );
      
      if (distance <= radiusKm && !isNaN(distance) && distance !== Infinity) {
        nearbySensors.push({
          locationId: doc.id,
          distance: Math.round(distance * 100) / 100, // Round to 2 decimals
          ...location
        });
      }
    });
    
    // Sort by distance (closest first)
    nearbySensors.sort((a, b) => a.distance - b.distance);
    
    return nearbySensors;
    
  } catch (error) {
    console.error('Error fetching nearby sensors:', error);
    return [];
  }
};

/**
 * Aggregate sensor data with inverse-distance weighted averaging
 * @param {Array} sensorReadings - Array of sensor reading objects
 * @param {Array} distances - Corresponding distances for each reading
 * @returns {Object|null} Aggregated sensor data
 */
export const aggregateSensorData = (sensorReadings, distances) => {
  if (!sensorReadings || sensorReadings.length === 0) {
    return null;
  }
  
  if (!distances || distances.length !== sensorReadings.length) {
    console.warn('Distances array length mismatch');
    return null;
  }
  
  let weightedPh = 0, weightedMoisture = 0, weightedTemp = 0;
  let totalWeight = 0;
  
  sensorReadings.forEach((reading, index) => {
    const distance = distances[index] || 1; // Avoid division by zero
    const weight = 1 / (1 + distance); // Inverse distance weighting
    
    const ph = parseFloat(reading.ph || reading.pH || 0);
    const moisture = parseFloat(reading.soilMoisture || reading.moisture || 0);
    const temp = parseFloat(reading.temperature || reading.temp || 0);
    
    if (!isNaN(ph) && ph > 0) {
      weightedPh += ph * weight;
      totalWeight += weight;
    }
    
    if (!isNaN(moisture) && moisture > 0) {
      weightedMoisture += moisture * weight;
    }
    
    if (!isNaN(temp)) {
      weightedTemp += temp * weight;
    }
  });
  
  if (totalWeight === 0) return null;
  
  return {
    ph: Math.round((weightedPh / totalWeight) * 10) / 10,
    soilMoisture: Math.round((weightedMoisture / totalWeight) * 10) / 10,
    temperature: Math.round((weightedTemp / totalWeight) * 10) / 10,
    dataPoints: sensorReadings.length,
    aggregationMethod: 'inverse_distance_weighted'
  };
};

/**
 * Analyze soil trends from historical readings
 * @param {Array} historicalReadings - Array of historical sensor readings
 * @returns {Object} Trend analysis results
 */
export const analyzeSoilTrends = (historicalReadings) => {
  if (!historicalReadings || historicalReadings.length < CONFIG.MIN_READINGS_FOR_TREND) {
    return { 
      trends: null,
      alerts: [], 
      confidence: 0,
      message: 'insufficient_data',
      readingsCount: historicalReadings?.length || 0,
      requiredReadings: CONFIG.MIN_READINGS_FOR_TREND
    };
  }
  
  try {
    // Sort by timestamp
    const sortedReadings = [...historicalReadings].sort((a, b) => {
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);
      return dateA - dateB;
    });
    
    // Extract valid values (filter out null, undefined, "N/A")
    const moistureValues = sortedReadings
      .map(r => parseFloat(r.soilMoisture))
      .filter(v => !isNaN(v) && v > 0);
    
    const phValues = sortedReadings
      .map(r => parseFloat(r.pH || r.ph))
      .filter(v => !isNaN(v) && v > 0);
    
    const tempValues = sortedReadings
      .map(r => parseFloat(r.temperature))
      .filter(v => !isNaN(v));
    
    if (moistureValues.length < 3 || phValues.length < 3 || tempValues.length < 3) {
      return {
        trends: null,
        alerts: [],
        confidence: 0,
        message: 'insufficient_valid_data'
      };
    }
    
    // Calculate trends for each parameter
    const trends = {
      moisture: calculateTrend(moistureValues),
      ph: calculateTrend(phValues),
      temperature: calculateTrend(tempValues)
    };
    
    // Generate alerts based on trends
    const alerts = [];
    
    // Moisture alerts
    if (trends.moisture.slope < -2 && trends.moisture.r2 > 0.5) {
      alerts.push({
        type: 'moisture_declining',
        severity: 'warning',
        message: 'Soil moisture declining rapidly. Consider irrigation.',
        currentValue: moistureValues[moistureValues.length - 1],
        trend: trends.moisture.slope.toFixed(2)
      });
    } else if (trends.moisture.slope < -1 && trends.moisture.r2 > 0.3) {
      alerts.push({
        type: 'moisture_declining_moderate',
        severity: 'info',
        message: 'Soil moisture showing declining trend.',
        currentValue: moistureValues[moistureValues.length - 1],
        trend: trends.moisture.slope.toFixed(2)
      });
    }
    
    // pH alerts
    if (Math.abs(trends.ph.slope) > 0.3 && trends.ph.r2 > 0.5) {
      alerts.push({
        type: 'ph_unstable',
        severity: 'warning',
        message: 'pH levels showing significant change. Monitor closely.',
        currentValue: phValues[phValues.length - 1],
        trend: trends.ph.slope.toFixed(2)
      });
    }
    
    // Temperature alerts
    if (trends.temperature.slope > 0.5 && trends.temperature.r2 > 0.5) {
      alerts.push({
        type: 'temperature_rising',
        severity: 'warning',
        message: 'Temperature trend increasing. Monitor for heat stress.',
        currentValue: tempValues[tempValues.length - 1],
        trend: trends.temperature.slope.toFixed(2)
      });
    } else if (trends.temperature.slope < -0.5 && trends.temperature.r2 > 0.5) {
      alerts.push({
        type: 'temperature_falling',
        severity: 'info',
        message: 'Temperature showing declining trend.',
        currentValue: tempValues[tempValues.length - 1],
        trend: trends.temperature.slope.toFixed(2)
      });
    }
    
    // Calculate overall confidence (average R²)
    const confidence = (trends.moisture.r2 + trends.ph.r2 + trends.temperature.r2) / 3;
    
    return { 
      trends, 
      alerts, 
      confidence: Math.round(confidence * 100) / 100,
      message: 'success',
      dataQuality: {
        moisturePoints: moistureValues.length,
        phPoints: phValues.length,
        temperaturePoints: tempValues.length
      }
    };
    
  } catch (error) {
    console.error('Error analyzing soil trends:', error);
    return {
      trends: null,
      alerts: [],
      confidence: 0,
      message: 'analysis_error',
      error: error.message
    };
  }
};

/**
 * Get planting history for a location
 * @param {string} locationRef - Location reference path
 * @returns {Promise<Object>} Species count object
 */
export const getLocationPlantingHistory = async (locationRef) => {
  try {
    if (!locationRef) return {};
    
    // Extract location ID from reference path
    const locationId = locationRef.includes('/') 
      ? locationRef.split('/').pop() 
      : locationRef;
    
    const plantingRecordsQuery = query(
      collection(firestore, 'plantingrecords'),
      where('location_id', '==', locationId)
    );
    
    const snapshot = await getDocs(plantingRecordsQuery);
    const speciesCount = {};
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const species = data.seedling_commonName || data.commonName || 'Unknown';
      speciesCount[species] = (speciesCount[species] || 0) + 1;
    });
    
    console.log(`Found ${Object.keys(speciesCount).length} species in planting history for ${locationId}`);
    return speciesCount;
    
  } catch (error) {
    console.error('Error fetching planting history:', error);
    return {};
  }
};

/**
 * Ensure biodiversity by penalizing over-represented species
 * @param {Array} recommendations - Array of tree recommendations
 * @param {Object} existingSpeciesInArea - Object with species counts
 * @returns {Array} Adjusted recommendations
 */
export const ensureBiodiversity = (recommendations, existingSpeciesInArea) => {
  if (!existingSpeciesInArea || Object.keys(existingSpeciesInArea).length === 0) {
    return recommendations.map(tree => ({
      ...tree,
      diversityScore: 1.0,
      existingInArea: 0
    }));
  }
  
  // Calculate total existing trees
  const totalExisting = Object.values(existingSpeciesInArea).reduce((sum, count) => sum + count, 0);
  
  return recommendations.map(tree => {
    const existingCount = existingSpeciesInArea[tree.commonName] || 0;
    
    // Calculate diversity penalty (increases with representation)
    const representationRatio = totalExisting > 0 ? existingCount / totalExisting : 0;
    const diversityPenalty = Math.min(0.4, representationRatio * 0.5); // Max 40% penalty
    
    const adjustedConfidence = tree.confidenceScore * (1 - diversityPenalty);
    
    return {
      ...tree,
      confidenceScore: Math.max(0.05, adjustedConfidence), // Minimum 5%
      diversityScore: 1 - diversityPenalty,
      existingInArea: existingCount,
      representationRatio: Math.round(representationRatio * 100)
    };
  });
};

/**
 * Apply historical learning based on past performance
 * @param {string} treeName - Tree species common name
 * @param {string} location - Location identifier
 * @returns {Promise<number>} Historical performance multiplier (0.8-1.2)
 */
export const applyHistoricalLearning = async (treeName, location) => {
  try {
    const performanceQuery = query(
      collection(firestore, 'recommendation_performance'),
      where('species', '==', treeName),
      where('location', '==', location),
      orderBy('evaluationDate', 'desc'),
      limit(5)
    );
    
    const snapshot = await getDocs(performanceQuery);
    
    if (snapshot.empty) {
      return 1.0; // Neutral multiplier (no history)
    }
    
    let totalSuccess = 0;
    let count = 0;
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const survivalRate = parseFloat(data.survivalRate) || 0;
      totalSuccess += survivalRate / 100;
      count++;
    });
    
    const avgSuccess = totalSuccess / count;
    
    // Convert to multiplier range: 0.8 (poor) to 1.2 (excellent)
    // avgSuccess ranges from 0 to 1
    const multiplier = 0.8 + (avgSuccess * 0.4);
    
    console.log(`Historical learning for ${treeName} at ${location}: ${(multiplier * 100).toFixed(0)}%`);
    
    return multiplier;
    
  } catch (error) {
    console.error('Error fetching historical performance:', error);
    return 1.0; // Neutral on error
  }
};

/**
 * Update recommendation performance (for future learning)
 * @param {string} recommendationId - Recommendation ID
 * @param {Object} actualOutcome - Actual planting outcome data
 * @returns {Promise<boolean>} Success status
 */
export const updateRecommendationPerformance = async (recommendationId, actualOutcome) => {
  try {
    if (!recommendationId || !actualOutcome) {
      throw new Error('Missing required parameters');
    }
    
    const performanceRef = doc(firestore, 'recommendation_performance', recommendationId);
    
    const performanceData = {
      recommendationId,
      species: actualOutcome.species,
      survivalRate: parseFloat(actualOutcome.survivalRate) || 0,
      growthRate: actualOutcome.growthRate || 'unknown',
      healthScore: parseFloat(actualOutcome.healthScore) || 0,
      plantingDate: actualOutcome.plantingDate,
      evaluationDate: serverTimestamp(),
      location: actualOutcome.location,
      conditions: actualOutcome.initialConditions || {},
      notes: actualOutcome.notes || ''
    };
    
    await setDoc(performanceRef, performanceData);
    
    console.log(`Performance data saved for ${actualOutcome.species}`);
    return true;
    
  } catch (error) {
    console.error('Error saving performance data:', error);
    return false;
  }
};

// ============================================================================
// MAIN ML RECOMMENDATION ALGORITHM
// ============================================================================

/**
 * Generate tree seedling recommendations using ML algorithm
 * @param {Object} sensorData - Current sensor readings
 * @param {Object} additionalContext - Optional context (season, elevation, etc.)
 * @returns {Promise<Array>} Top 3 tree recommendations
 */
export const generateSeedlingRecommendations = async (sensorData, additionalContext = {}) => {
  try {
    const { ph, soilMoisture, temperature, location } = sensorData;
    const { 
      season = 'moderate', 
      elevation = 0, 
      useHistoricalLearning = false,
      coordinates = null
    } = additionalContext;
    
    // Validate input
    if ([ph, soilMoisture, temperature].some(v => v === null || v === undefined || isNaN(v))) {
      throw new Error('Invalid sensor data: pH, soilMoisture, and temperature are required');
    }
    
    // Load dataset
    const dataset = await loadTreeDataset();
    
    if (!dataset || dataset.length === 0) {
      throw new Error('Tree dataset is empty or could not be loaded');
    }
    
    console.log(`Analyzing ${dataset.length} tree species...`);
    console.log(`Conditions: pH=${ph}, Moisture=${soilMoisture}%, Temp=${temperature}°C, Season=${season}`);
    
    // Get seasonal adjustment factors
    const seasonalFactors = SEASONAL_FACTORS[season] || SEASONAL_FACTORS.moderate;
    
    // Calculate compatibility scores for each tree
    const scoredTrees = await Promise.all(dataset.map(async tree => {
      // Environmental compatibility with seasonal adjustments
      const pHScore = calculateRangeCompatibility(
        ph, 
        tree.pHMin, 
        tree.pHMax, 
        seasonalFactors.ph
      );
      
      const moistureScore = calculateRangeCompatibility(
        soilMoisture, 
        tree.moistureMin, 
        tree.moistureMax, 
        seasonalFactors.moisture
      );
      
      const tempScore = calculateRangeCompatibility(
        temperature, 
        tree.tempMin, 
        tree.tempMax, 
        seasonalFactors.temperature
      );
      
      // Success and adaptability factors
      const successFactor = tree.successRate / 100;
      const adaptabilityFactor = tree.adaptabilityScore / 100;
      
      // Native species bonus
      const nativeBonus = tree.isNative ? 0.1 : 0;
      
      // Calculate weighted base confidence
      const baseConfidence = 
        (pHScore * 0.25) +           // 25% weight
        (moistureScore * 0.30) +     // 30% weight (most important)
        (tempScore * 0.25) +         // 25% weight
        (successFactor * 0.10) +     // 10% weight
        (adaptabilityFactor * 0.10); // 10% weight
      
      // Apply historical learning multiplier
      let historicalMultiplier = 1.0;
      if (useHistoricalLearning && location) {
        historicalMultiplier = await applyHistoricalLearning(tree.commonName, location);
      }
      
      const confidenceScore = Math.min(1, (baseConfidence + nativeBonus) * historicalMultiplier);
      
      // Calculate overall suitability score
      const overallScore = 
        (confidenceScore * 0.6) + 
        (successFactor * 0.2) + 
        (adaptabilityFactor * 0.2);
      
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
        
        // Optimal conditions
        prefMoisture: tree.prefMoisture,
        prefpH: tree.prefpH,
        prefTemp: tree.prefTemp,
        
        // Compatibility scores
        confidenceScore: Math.max(0.05, confidenceScore),
        pHCompatibility: pHScore,
        moistureCompatibility: moistureScore,
        tempCompatibility: tempScore,
        
        // Native and bonuses
        isNative: tree.isNative,
        nativeBonus: nativeBonus,
        historicalMultiplier: historicalMultiplier,
        
        // Range information
        moistureRange: `${tree.moistureMin.toFixed(1)}-${tree.moistureMax.toFixed(1)}%`,
        pHRange: `${tree.pHMin.toFixed(1)}-${tree.pHMax.toFixed(1)}`,
        tempRange: `${tree.tempMin.toFixed(1)}-${tree.tempMax.toFixed(1)}°C`,
        
        // Overall score
        overallScore: overallScore,
        
        // Context
        seasonalAdjustment: season,
        adjustmentFactors: seasonalFactors
      };
    }));
    
    // Sort by multiple criteria
    const sortedTrees = scoredTrees.sort((a, b) => {
      // Primary: Overall score
      const scoreDiff = b.overallScore - a.overallScore;
      if (Math.abs(scoreDiff) > 0.05) return scoreDiff;
      
      // Secondary: Native preference
      if (a.isNative !== b.isNative) {
        return b.isNative ? 1 : -1;
      }
      
      // Tertiary: Confidence
      const confDiff = b.confidenceScore - a.confidenceScore;
      if (Math.abs(confDiff) > 0.03) return confDiff;
      
      // Quaternary: Success rate
      return b.successRate - a.successRate;
    });
    
    // Get top 3 recommendations
    const topRecommendations = sortedTrees.slice(0, 3);
    
    console.log('Top 3 recommendations:');
    topRecommendations.forEach((tree, idx) => {
      console.log(
        `${idx + 1}. ${tree.commonName}: ` +
        `${(tree.confidenceScore * 100).toFixed(1)}% confidence, ` +
        `${tree.successRate}% success rate, ` +
        `Native: ${tree.isNative}`
      );
    });
    
    return topRecommendations;
    
  } catch (error) {
    console.error('Error generating recommendations:', error);
    throw error;
  }
};

// ============================================================================
// CLEAR CACHE FUNCTION
// ============================================================================

/**
 * Clear cached dataset (useful for forcing refresh)
 * @returns {boolean} Success status
 */
export const clearDatasetCache = () => {
  console.log('Clearing dataset cache...');
  const removed1 = safeLocalStorage.removeItem(CONFIG.CACHE_KEY);
  const removed2 = safeLocalStorage.removeItem(CONFIG.CACHE_EXPIRY_KEY);
  return removed1 && removed2;
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Core functions
  loadTreeDataset,
  generateSeedlingRecommendations,
  clearDatasetCache,
  
  // Analysis functions
  analyzeSoilTrends,
  getNearbySernsorsData,
  aggregateSensorData,
  getLocationPlantingHistory,
  ensureBiodiversity,
  applyHistoricalLearning,
  updateRecommendationPerformance,
  
  // Utility functions
  calculateDistance,
  calculateTrend,
  parseRange,
  calculateRangeCompatibility,
  
  // Configuration
  CONFIG,
  SENSOR_RANGES,
  SEASONAL_FACTORS
};