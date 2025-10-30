// services/datasetLoader.js - Complete Production-Ready Version with Random Forest-backend
import * as XLSX from 'xlsx';


// ============================================================================
// CONFIGURATION
// ============================================================================
const CONFIG = {
  CACHE_KEY: 'reforest_tree_dataset',
  CACHE_EXPIRY_KEY: 'reforest_tree_dataset_expiry',
  CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours
  DATASET_PATH: process.env.REACT_APP_DATASET_PATH || '/data/Tree_Seedling_Dataset.xlsx',
  NEARBY_RADIUS_KM: 5,
  MIN_READINGS_FOR_TREND: 7,
  EARTH_RADIUS_KM: 6371,
  // Random Forest Configuration
  RF_NUM_TREES: 100,
  RF_MAX_DEPTH: 10,
  RF_MIN_SAMPLES_SPLIT: 2
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
// RANDOM FOREST IMPLEMENTATION
// ============================================================================

/**
 * Decision Tree Node Class
 */
class TreeNode {
  constructor() {
    this.featureIndex = null;
    this.threshold = null;
    this.left = null;
    this.right = null;
    this.value = null; // For leaf nodes
    this.isLeaf = false;
  }
}

/**
 * Random Forest Classifier
 */
class RandomForest {
  constructor(numTrees = CONFIG.RF_NUM_TREES, maxDepth = CONFIG.RF_MAX_DEPTH, minSamplesSplit = CONFIG.RF_MIN_SAMPLES_SPLIT) {
    this.numTrees = numTrees;
    this.maxDepth = maxDepth;
    this.minSamplesSplit = minSamplesSplit;
    this.trees = [];
    this.featureImportances = {};
  }

  /**
   * Bootstrap sampling with replacement
   */
  bootstrapSample(X, y) {
    const n = X.length;
    const indices = Array.from({ length: n }, () => 
      Math.floor(Math.random() * n)
    );
    
    const XSample = indices.map(i => X[i]);
    const ySample = indices.map(i => y[i]);
    
    return { XSample, ySample, indices };
  }

  /**
   * Calculate Gini impurity
   */
  giniImpurity(y) {
    if (y.length === 0) return 0;
    
    const classCounts = {};
    y.forEach(label => {
      classCounts[label] = (classCounts[label] || 0) + 1;
    });
    
    let impurity = 1;
    Object.values(classCounts).forEach(count => {
      const probability = count / y.length;
      impurity -= probability * probability;
    });
    
    return impurity;
  }

  /**
   * Find best split for a node
   */
  findBestSplit(X, y) {
    const nFeatures = X[0].length;
    const nSamples = X.length;
    
    if (nSamples <= this.minSamplesSplit) {
      return null;
    }
    
    let bestGini = Infinity;
    let bestFeature = null;
    let bestThreshold = null;
    
    // Random feature selection (sqrt of total features)
    const numFeaturesToTry = Math.max(1, Math.floor(Math.sqrt(nFeatures)));
    const featureIndices = Array.from({ length: nFeatures }, (_, i) => i)
      .sort(() => Math.random() - 0.5)
      .slice(0, numFeaturesToTry);
    
    for (const featureIndex of featureIndices) {
      // Get unique values for this feature
      const featureValues = [...new Set(X.map(sample => sample[featureIndex]))].sort((a, b) => a - b);
      
      // Try potential thresholds
      for (let i = 0; i < featureValues.length - 1; i++) {
        const threshold = (featureValues[i] + featureValues[i + 1]) / 2;
        
        // Split data
        const leftIndices = [];
        const rightIndices = [];
        
        X.forEach((sample, index) => {
          if (sample[featureIndex] <= threshold) {
            leftIndices.push(index);
          } else {
            rightIndices.push(index);
          }
        });
        
        if (leftIndices.length === 0 || rightIndices.length === 0) {
          continue;
        }
        
        // Calculate weighted Gini impurity
        const leftGini = this.giniImpurity(leftIndices.map(i => y[i]));
        const rightGini = this.giniImpurity(rightIndices.map(i => y[i]));
        
        const weightedGini = 
          (leftIndices.length / nSamples) * leftGini + 
          (rightIndices.length / nSamples) * rightGini;
        
        if (weightedGini < bestGini) {
          bestGini = weightedGini;
          bestFeature = featureIndex;
          bestThreshold = threshold;
        }
      }
    }
    
    return bestFeature !== null ? { featureIndex: bestFeature, threshold: bestThreshold, gini: bestGini } : null;
  }

  /**
   * Build a decision tree recursively
   */
  buildTree(X, y, depth = 0) {
    const node = new TreeNode();
    
    // Stopping conditions
    if (depth >= this.maxDepth || 
        y.length <= this.minSamplesSplit || 
        new Set(y).size === 1) {
      node.isLeaf = true;
      node.value = this.calculateLeafValue(y);
      return node;
    }
    
    // Find best split
    const split = this.findBestSplit(X, y);
    if (!split) {
      node.isLeaf = true;
      node.value = this.calculateLeafValue(y);
      return node;
    }
    
    // Split data
    const leftIndices = [];
    const rightIndices = [];
    
    X.forEach((sample, index) => {
      if (sample[split.featureIndex] <= split.threshold) {
        leftIndices.push(index);
      } else {
        rightIndices.push(index);
      }
    });
    
    // Update feature importance
    this.featureImportances[split.featureIndex] = 
      (this.featureImportances[split.featureIndex] || 0) + split.gini;
    
    // Recursively build left and right subtrees
    node.featureIndex = split.featureIndex;
    node.threshold = split.threshold;
    node.left = this.buildTree(
      leftIndices.map(i => X[i]),
      leftIndices.map(i => y[i]),
      depth + 1
    );
    node.right = this.buildTree(
      rightIndices.map(i => X[i]),
      rightIndices.map(i => y[i]),
      depth + 1
    );
    
    return node;
  }

  /**
   * Calculate leaf node value (most common class)
   */
  calculateLeafValue(y) {
    const classCounts = {};
    y.forEach(label => {
      classCounts[label] = (classCounts[label] || 0) + 1;
    });
    
    return Object.keys(classCounts).reduce((a, b) => 
      classCounts[a] > classCounts[b] ? a : b
    );
  }

  /**
   * Predict single sample using one tree
   */
  predictSingle(tree, sample) {
    if (tree.isLeaf) {
      return tree.value;
    }
    
    if (sample[tree.featureIndex] <= tree.threshold) {
      return this.predictSingle(tree.left, sample);
    } else {
      return this.predictSingle(tree.right, sample);
    }
  }

  /**
   * Fit Random Forest to training data
   */
  fit(X, y) {
    this.trees = [];
    this.featureImportances = {};
    
    for (let i = 0; i < this.numTrees; i++) {
      const { XSample, ySample } = this.bootstrapSample(X, y);
      const tree = this.buildTree(XSample, ySample);
      this.trees.push(tree);
    }
    
    // Normalize feature importances
    const totalImportance = Object.values(this.featureImportances).reduce((a, b) => a + b, 0);
    Object.keys(this.featureImportances).forEach(featureIndex => {
      this.featureImportances[featureIndex] /= totalImportance;
    });
  }

  /**
   * Predict using Random Forest (majority vote)
   */
  predict(X) {
    return X.map(sample => {
      const votes = {};
      this.trees.forEach(tree => {
        const prediction = this.predictSingle(tree, sample);
        votes[prediction] = (votes[prediction] || 0) + 1;
      });
      
      return Object.keys(votes).reduce((a, b) => 
        votes[a] > votes[b] ? a : b
      );
    });
  }

  /**
   * Predict probabilities
   */
  predictProba(X) {
    return X.map(sample => {
      const votes = {};
      this.trees.forEach(tree => {
        const prediction = this.predictSingle(tree, sample);
        votes[prediction] = (votes[prediction] || 0) + 1;
      });
      
      const probabilities = {};
      Object.keys(votes).forEach(label => {
        probabilities[label] = votes[label] / this.numTrees;
      });
      
      return probabilities;
    });
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Parse range strings from dataset (handles various formats)
 */
export const parseRange = (rangeStr) => {
  if (!rangeStr || rangeStr === 'N/A' || rangeStr === '' || rangeStr === null) {
    return { min: 0, max: 0, valid: false };
  }
  
  try {
    let cleaned = String(rangeStr)
      .replace(/°C/gi, '')
      .replace(/%/g, '')
      .replace(/[–—−]/g, '-')
      .replace(/\s+/g, '')
      .trim();
    
    if (/[eE]/.test(cleaned)) {
      const value = parseFloat(cleaned);
      if (isNaN(value)) {
        return { min: 0, max: 0, valid: false };
      }
      return { min: value, max: value, valid: true };
    }
    
    if (!cleaned.includes('-')) {
      const value = parseFloat(cleaned);
      if (isNaN(value)) {
        return { min: 0, max: 0, valid: false };
      }
      return { min: value, max: value, valid: true };
    }
    
    const parts = cleaned.split('-').filter(p => p.length > 0);
    
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

/**
 * Calculate compatibility score
 */
export const calculateRangeCompatibility = (value, min, max, seasonalMultiplier = 1.0) => {
  if (min === 0 && max === 0) return 0.3;
  if (isNaN(value) || isNaN(min) || isNaN(max)) return 0;
  
  const adjustedMin = min * seasonalMultiplier;
  const adjustedMax = max * seasonalMultiplier;
  
  if (value >= adjustedMin && value <= adjustedMax) {
    const center = (adjustedMin + adjustedMax) / 2;
    const distanceFromCenter = Math.abs(value - center);
    const rangeSize = adjustedMax - adjustedMin;
    
    if (rangeSize === 0) return 1.0;
    
    return Math.max(0.8, 1.0 - (distanceFromCenter / rangeSize) * 0.2);
  }
  
  const distance = value < adjustedMin 
    ? adjustedMin - value 
    : value - adjustedMax;
  
  const rangeSize = adjustedMax - adjustedMin;
  const tolerance = Math.max(rangeSize * 0.8, 5);
  
  const score = Math.exp(-distance / tolerance);
  
  return Math.max(0, Math.min(1, score));
};

/**
 * Calculate distance between coordinates
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
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
 * Calculate linear regression trend
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
  
  const sumX = indices.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = indices.reduce((sum, x, i) => sum + x * values[i], 0);
  const sumX2 = indices.reduce((sum, x) => sum + x * x, 0);
  
  const denominator = (n * sumX2 - sumX * sumX);
  
  if (denominator === 0) {
    return { slope: 0, intercept: sumY / n, r2: 0 };
  }
  
  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  
  const yMean = sumY / n;
  const ssTotal = values.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
  const ssResidual = values.reduce((sum, y, i) => 
    sum + Math.pow(y - (slope * i + intercept), 2), 0
  );
  
  const r2 = ssTotal > 0 ? Math.max(0, 1 - (ssResidual / ssTotal)) : 0;
  
  return { slope, intercept, r2 };
};

/**
 * Safe localStorage operations
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
    const workbook = XLSX.read(arrayBuffer, {
      type: 'array',
      cellDates: true,
      cellNF: false,
      cellText: false
    });
    
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('Excel file does not contain any worksheets');
    }
    
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    if (!worksheet) {
      throw new Error(`Worksheet "${sheetName}" is empty or invalid`);
    }
    
    const rawData = XLSX.utils.sheet_to_json(worksheet, { 
      defval: null,
      blankrows: false 
    });
    
    if (!rawData || rawData.length === 0) {
      throw new Error('Excel file contains no data rows');
    }
    
    console.log(`Loaded ${rawData.length} rows from Excel dataset`);
    
    const parsedDataset = rawData.map((species, index) => {
      try {
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
        
        if (!moistureRange.valid || !pHRange.valid || !tempRange.valid) {
          console.warn(
            `Row ${index + 2}: Invalid range data - ` +
            `Moisture: ${moistureRange.valid}, pH: ${pHRange.valid}, Temp: ${tempRange.valid}`
          );
          return null;
        }
        
        const prefMoisture = (moistureRange.min + moistureRange.max) / 2;
        const prefTemp = (tempRange.min + tempRange.max) / 2;
        const prefpH = (pHRange.min + pHRange.max) / 2;
        
        const moistureTolerance = Math.max(5, prefMoisture * 0.2);
        const tempTolerance = Math.max(2, prefTemp * 0.15);
        const pHTolerance = Math.max(0.5, prefpH * 0.1);
        
        const nativeValue = String(
          species["Native"] || 
          species["Is Native"] || 
          species["native"] || 
          ''
        ).toLowerCase().trim();
        
        const isNative = ['true', 'yes', 'y', '1', 'native'].includes(nativeValue);
        
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
          
          moistureMin: Math.max(0, prefMoisture - moistureTolerance),
          moistureMax: Math.min(100, prefMoisture + moistureTolerance),
          pHMin: Math.max(0, prefpH - pHTolerance),
          pHMax: Math.min(14, prefpH + pHTolerance),
          tempMin: prefTemp - tempTolerance,
          tempMax: prefTemp + tempTolerance,
          
          prefMoisture: Math.round(prefMoisture * 10) / 10,
          prefTemp: Math.round(prefTemp * 10) / 10,
          prefpH: Math.round(prefpH * 10) / 10,
          
          category: species["Category"] || species["category"] || (isNative ? 'native' : 'non-native'),
          successRate: parseInt(species["Success Rate (%)"] || species["Success Rate"] || species["success_rate"]) || (isNative ? 85 : 75),
          adaptabilityScore: parseInt(species["Adaptability Score"] || species["adaptability_score"]) || (isNative ? 90 : 80),
          climateSuitability: species["Climate Suitability"] || species["climate_suitability"] || 'Tropical',
          isNative,
          growthRate: species["Growth Rate"] || species["growth_rate"] || 'Medium',
          uses: species["Uses"] || species["uses"] || 'Reforestation',
          
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
    
    const validDataset = parsedDataset.filter(tree => {
      if (!tree) return false;
      
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
 */
export const getNearbySensorsData = async (currentLocation, radiusKm = CONFIG.NEARBY_RADIUS_KM) => {
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
          distance: Math.round(distance * 100) / 100,
          ...location
        });
      }
    });
    
    nearbySensors.sort((a, b) => a.distance - b.distance);
    
    return nearbySensors;
    
  } catch (error) {
    console.error('Error fetching nearby sensors:', error);
    return [];
  }
};

/**
 * Aggregate sensor data with inverse-distance weighted averaging
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
    const distance = distances[index] || 1;
    const weight = 1 / (1 + distance);
    
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
    const sortedReadings = [...historicalReadings].sort((a, b) => {
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);
      return dateA - dateB;
    });
    
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
    
    const trends = {
      moisture: calculateTrend(moistureValues),
      ph: calculateTrend(phValues),
      temperature: calculateTrend(tempValues)
    };
    
    const alerts = [];
    
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
    
    if (Math.abs(trends.ph.slope) > 0.3 && trends.ph.r2 > 0.5) {
      alerts.push({
        type: 'ph_unstable',
        severity: 'warning',
        message: 'pH levels showing significant change. Monitor closely.',
        currentValue: phValues[phValues.length - 1],
        trend: trends.ph.slope.toFixed(2)
      });
    }
    
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
 */
export const getLocationPlantingHistory = async (locationRef) => {
  try {
    if (!locationRef) return {};
    
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
 */
export const ensureBiodiversity = (recommendations, existingSpeciesInArea) => {
  if (!existingSpeciesInArea || Object.keys(existingSpeciesInArea).length === 0) {
    return recommendations.map(tree => ({
      ...tree,
      diversityScore: 1.0,
      existingInArea: 0
    }));
  }
  
  const totalExisting = Object.values(existingSpeciesInArea).reduce((sum, count) => sum + count, 0);
  
  return recommendations.map(tree => {
    const existingCount = existingSpeciesInArea[tree.commonName] || 0;
    const representationRatio = totalExisting > 0 ? existingCount / totalExisting : 0;
    const diversityPenalty = Math.min(0.4, representationRatio * 0.5);
    
    const adjustedConfidence = tree.confidenceScore * (1 - diversityPenalty);
    
    return {
      ...tree,
      confidenceScore: Math.max(0.05, adjustedConfidence),
      diversityScore: 1 - diversityPenalty,
      existingInArea: existingCount,
      representationRatio: Math.round(representationRatio * 100)
    };
  });
};

/**
 * Apply historical learning based on past performance
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
      return 1.0;
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
    const multiplier = 0.8 + (avgSuccess * 0.4);
    
    console.log(`Historical learning for ${treeName} at ${location}: ${(multiplier * 100).toFixed(0)}%`);
    
    return multiplier;
    
  } catch (error) {
    console.error('Error fetching historical performance:', error);
    return 1.0;
  }
};

/**
 * Update recommendation performance (for future learning)
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
// RANDOM FOREST RECOMMENDATION ALGORITHM
// ============================================================================

/**
 * Train Random Forest model on tree dataset
 */
export const trainRandomForestModel = async () => {
  try {
    const dataset = await loadTreeDataset();
    
    if (!dataset || dataset.length === 0) {
      throw new Error('No dataset available for training');
    }
    
    // Prepare features and labels for training
    const features = [];
    const labels = [];
    
    dataset.forEach(tree => {
      const featureVector = [
        tree.prefMoisture,
        tree.prefpH,
        tree.prefTemp,
        tree.successRate,
        tree.adaptabilityScore,
        tree.isNative ? 1 : 0
      ];
      
      features.push(featureVector);
      labels.push(tree.commonName); // Use common name as label
    });
    
    // Train Random Forest
    const rf = new RandomForest();
    rf.fit(features, labels);
    
    console.log('Random Forest model trained successfully');
    console.log('Feature importances:', rf.featureImportances);
    
    return rf;
    
  } catch (error) {
    console.error('Error training Random Forest model:', error);
    throw error;
  }
};

/**
 * Generate recommendations using Random Forest
 */
export const generateRFRecommendations = async (sensorData, additionalContext = {}) => {
  try {
    const { ph, soilMoisture, temperature } = sensorData;
    const { 
      season = 'moderate',
      useHistoricalLearning = false,
      location = null
    } = additionalContext;
    
    // Validate input
    if ([ph, soilMoisture, temperature].some(v => v === null || v === undefined || isNaN(v))) {
      throw new Error('Invalid sensor data: pH, soilMoisture, and temperature are required');
    }
    
    // Load dataset and train model
    const dataset = await loadTreeDataset();
    const rfModel = await trainRandomForestModel();
    
    if (!dataset || dataset.length === 0) {
      throw new Error('Tree dataset is empty or could not be loaded');
    }
    
    console.log(`Generating recommendations using Random Forest for ${dataset.length} species...`);
    
    // Prepare input features for prediction
    const inputFeatures = dataset.map(tree => [
      tree.prefMoisture,
      tree.prefpH,
      tree.prefTemp,
      tree.successRate,
      tree.adaptabilityScore,
      tree.isNative ? 1 : 0,
      ph,
      soilMoisture,
      temperature
    ]);
    
    // Get predictions and probabilities
    const predictions = rfModel.predict(inputFeatures);
    const probabilities = rfModel.predictProba(inputFeatures);
    
    // Combine results with tree data
    const scoredTrees = await Promise.all(dataset.map(async (tree, index) => {
      const probability = probabilities[index][tree.commonName] || 0;
      
      // Apply historical learning if enabled
      let historicalMultiplier = 1.0;
      if (useHistoricalLearning && location) {
        historicalMultiplier = await applyHistoricalLearning(tree.commonName, location);
      }
      
      const confidenceScore = Math.min(1, probability * historicalMultiplier);
      
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
        
        // ML scores
        confidenceScore: Math.max(0.05, confidenceScore),
        rfProbability: probability,
        historicalMultiplier: historicalMultiplier,
        
        // Range information
        moistureRange: `${tree.moistureMin.toFixed(1)}-${tree.moistureMax.toFixed(1)}%`,
        pHRange: `${tree.pHMin.toFixed(1)}-${tree.pHMax.toFixed(1)}`,
        tempRange: `${tree.tempMin.toFixed(1)}-${tree.tempMax.toFixed(1)}°C`,
        
        // Native status
        isNative: tree.isNative,
        
        // Prediction info
        predictedBy: 'Random Forest',
        featureImportance: rfModel.featureImportances
      };
    }));
    
    // Sort by confidence score
    const sortedTrees = scoredTrees.sort((a, b) => b.confidenceScore - a.confidenceScore);
    
    // Get top 3 recommendations
    const topRecommendations = sortedTrees.slice(0, 3);
    
    console.log('Random Forest Top 3 recommendations:');
    topRecommendations.forEach((tree, idx) => {
      console.log(
        `${idx + 1}. ${tree.commonName}: ` +
        `${(tree.confidenceScore * 100).toFixed(1)}% confidence, ` +
        `${(tree.rfProbability * 100).toFixed(1)}% RF probability, ` +
        `Native: ${tree.isNative}`
      );
    });
    
    return topRecommendations;
    
  } catch (error) {
    console.error('Error generating Random Forest recommendations:', error);
    throw error;
  }
};

/**
 * Hybrid recommendation system (combines traditional and RF)
 */
export const generateHybridRecommendations = async (sensorData, additionalContext = {}) => {
  try {
    // Generate both traditional and RF recommendations
    const [traditionalRecs, rfRecs] = await Promise.all([
      generateSeedlingRecommendations(sensorData, additionalContext).catch(() => []),
      generateRFRecommendations(sensorData, additionalContext).catch(() => [])
    ]);
    
    // Combine and deduplicate recommendations
    const allRecs = [...traditionalRecs, ...rfRecs];
    const uniqueRecs = [];
    const seenNames = new Set();
    
    allRecs.forEach(rec => {
      if (!seenNames.has(rec.commonName)) {
        seenNames.add(rec.commonName);
        uniqueRecs.push(rec);
      }
    });
    
    // Sort by confidence score
    uniqueRecs.sort((a, b) => b.confidenceScore - a.confidenceScore);
    
    return uniqueRecs.slice(0, 3);
    
  } catch (error) {
    console.error('Error generating hybrid recommendations:', error);
    // Fallback to traditional method
    return generateSeedlingRecommendations(sensorData, additionalContext);
  }
};

// ============================================================================
// MAIN ML RECOMMENDATION ALGORITHM (ORIGINAL)
// ============================================================================

/**
 * Generate tree seedling recommendations using traditional algorithm
 */
export const generateSeedlingRecommendations = async (sensorData, additionalContext = {}) => {
  try {
    const { ph, soilMoisture, temperature, location } = sensorData;
    const { 
      season = 'moderate', 
      useHistoricalLearning = false
    } = additionalContext;
    
    if ([ph, soilMoisture, temperature].some(v => v === null || v === undefined || isNaN(v))) {
      throw new Error('Invalid sensor data: pH, soilMoisture, and temperature are required');
    }
    
    const dataset = await loadTreeDataset();
    
    if (!dataset || dataset.length === 0) {
      throw new Error('Tree dataset is empty or could not be loaded');
    }
    
    console.log(`Analyzing ${dataset.length} tree species...`);
    
    const seasonalFactors = SEASONAL_FACTORS[season] || SEASONAL_FACTORS.moderate;
    
    const scoredTrees = await Promise.all(dataset.map(async tree => {
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
      
      const successFactor = tree.successRate / 100;
      const adaptabilityFactor = tree.adaptabilityScore / 100;
      const nativeBonus = tree.isNative ? 0.1 : 0;
      
      const baseConfidence = 
        (pHScore * 0.25) +
        (moistureScore * 0.30) +
        (tempScore * 0.25) +
        (successFactor * 0.10) +
        (adaptabilityFactor * 0.10);
      
      let historicalMultiplier = 1.0;
      if (useHistoricalLearning && location) {
        historicalMultiplier = await applyHistoricalLearning(tree.commonName, location);
      }
      
      const confidenceScore = Math.min(1, (baseConfidence + nativeBonus) * historicalMultiplier);
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
        
        prefMoisture: tree.prefMoisture,
        prefpH: tree.prefpH,
        prefTemp: tree.prefTemp,
        
        confidenceScore: Math.max(0.05, confidenceScore),
        pHCompatibility: pHScore,
        moistureCompatibility: moistureScore,
        tempCompatibility: tempScore,
        
        isNative: tree.isNative,
        nativeBonus: nativeBonus,
        historicalMultiplier: historicalMultiplier,
        
        moistureRange: `${tree.moistureMin.toFixed(1)}-${tree.moistureMax.toFixed(1)}%`,
        pHRange: `${tree.pHMin.toFixed(1)}-${tree.pHMax.toFixed(1)}`,
        tempRange: `${tree.tempMin.toFixed(1)}-${tree.tempMax.toFixed(1)}°C`,
        
        overallScore: overallScore,
        
        seasonalAdjustment: season,
        adjustmentFactors: seasonalFactors,
        predictedBy: 'Traditional Algorithm'
      };
    }));
    
    const sortedTrees = scoredTrees.sort((a, b) => {
      const scoreDiff = b.overallScore - a.overallScore;
      if (Math.abs(scoreDiff) > 0.05) return scoreDiff;
      
      if (a.isNative !== b.isNative) {
        return b.isNative ? 1 : -1;
      }
      
      const confDiff = b.confidenceScore - a.confidenceScore;
      if (Math.abs(confDiff) > 0.03) return confDiff;
      
      return b.successRate - a.successRate;
    });
    
    const topRecommendations = sortedTrees.slice(0, 3);
    
    console.log('Traditional Algorithm Top 3 recommendations:');
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
 * Clear cached dataset
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
  generateRFRecommendations,
  generateHybridRecommendations,
  clearDatasetCache,
  
  // ML Models
  trainRandomForestModel,
  RandomForest,
  
  // Analysis functions
  analyzeSoilTrends,
  getNearbySensorsData, // Fixed typo
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