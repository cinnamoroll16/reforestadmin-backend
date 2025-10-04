// src/utils/datasetLoader.js - Enhanced with ML Features
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
// CACHING CONFIGURATION
// ============================================================================
const CACHE_KEY = 'reforest_tree_dataset';
const CACHE_EXPIRY_KEY = 'reforest_tree_dataset_expiry';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Function to parse range strings from your dataset
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

// Helper function to calculate range-based compatibility
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

// Haversine formula for distance calculation
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Calculate trend from array of values (Linear Regression)
const calculateTrend = (values) => {
  const n = values.length;
  if (n === 0) return { slope: 0, intercept: 0, r2: 0 };
  
  const indices = Array.from({length: n}, (_, i) => i);
  
  // Simple linear regression
  const sumX = indices.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = indices.reduce((sum, x, i) => sum + x * values[i], 0);
  const sumX2 = indices.reduce((sum, x) => sum + x * x, 0);
  
  const denominator = (n * sumX2 - sumX * sumX);
  if (denominator === 0) return { slope: 0, intercept: sumY / n, r2: 0 };
  
  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  
  // Calculate R²
  const yMean = sumY / n;
  const ssTotal = values.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
  const ssResidual = values.reduce((sum, y, i) => 
    sum + Math.pow(y - (slope * i + intercept), 2), 0
  );
  const r2 = ssTotal > 0 ? 1 - (ssResidual / ssTotal) : 0;
  
  return { slope, intercept, r2 };
};

// ============================================================================
// CORE DATASET LOADING
// ============================================================================

// Load and parse complete Excel dataset with caching
export const loadTreeDataset = async () => {
  try {
    // Check cache first
    const cachedData = localStorage.getItem(CACHE_KEY);
    const cacheExpiry = localStorage.getItem(CACHE_EXPIRY_KEY);
    
    if (cachedData && cacheExpiry && Date.now() < parseInt(cacheExpiry)) {
      console.log('Using cached tree dataset');
      return JSON.parse(cachedData);
    }
    
    console.log('Loading tree dataset from Excel file...');
    
    // Try multiple possible paths
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
      throw new Error('Excel file not found in any expected location');
    }
    
    console.log(`Successfully loaded Excel file from: ${usedPath}`);
    
    const arrayBuffer = await response.arrayBuffer();
    
    // Parse Excel file
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
    
    // Convert to JSON
    const rawData = XLSX.utils.sheet_to_json(worksheet);
    console.log(`Loaded ${rawData.length} tree species from Excel dataset`);
    
    // Parse and clean the data
    const parsedDataset = rawData.map((species, index) => {
      const moistureRange = parseRange(species["Soil Moisture"] || species["Moisture"] || species["Preferred Moisture"]);
      const pHRange = parseRange(species["pH Range"] || species["pH"] || species["Preferred pH"]);
      const tempRange = parseRange(species["Temperature"] || species["Preferred Temperature"]);
      
      if (!moistureRange.valid || !pHRange.valid || !tempRange.valid) {
        console.warn(`Invalid data for species at row ${index + 2}, skipping...`);
        return null;
      }
      
      // Calculate optimal values as midpoint
      const prefMoisture = (moistureRange.min + moistureRange.max) / 2;
      const prefTemp = (tempRange.min + tempRange.max) / 2;
      const prefpH = (pHRange.min + pHRange.max) / 2;
      
      // Create tolerance ranges
      const moistureTolerance = Math.max(5, prefMoisture * 0.2);
      const tempTolerance = Math.max(2, prefTemp * 0.15);
      const pHTolerance = Math.max(0.5, prefpH * 0.1);
      
      // Determine native status
      const nativeValue = species["Native"] || species["Is Native"] || '';
      const isNative = ['true', 'yes', 'y', '1', 'native'].includes(
        String(nativeValue).toLowerCase().trim()
      );
      
      return {
        id: `seed_${index + 1}`,
        commonName: species["Common Name"] || 'Unknown',
        scientificName: species["Scientific Name"] || 'Unknown',
        soilType: species["Soil Type"] || 'Various soil types',
        
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
        category: species["Category"] || (isNative ? 'native' : 'non-native'),
        successRate: parseInt(species["Success Rate (%)"] || species["Success Rate"]) || (isNative ? 85 : 75),
        adaptabilityScore: parseInt(species["Adaptability Score"]) || (isNative ? 90 : 80),
        climateSuitability: species["Climate Suitability"] || 'Tropical',
        isNative,
        growthRate: species["Growth Rate"] || 'Medium',
        uses: species["Uses"] || 'Reforestation'
      };
    });
    
    // Filter out invalid entries
    const validDataset = parsedDataset.filter(tree => 
      tree !== null &&
      tree.commonName !== 'Unknown' && 
      tree.scientificName !== 'Unknown' &&
      tree.moistureMin >= 0 && tree.moistureMax > tree.moistureMin &&
      tree.pHMin > 0 && tree.pHMax > tree.pHMin &&
      tree.tempMin < tree.tempMax
    );
    
    if (validDataset.length === 0) {
      throw new Error('No valid tree species found in Excel file after parsing');
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
    console.error('Error loading tree dataset:', error);
    
    // Try to use cached data as fallback
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData) {
      console.warn('Using expired cached data due to loading error');
      return JSON.parse(cachedData);
    }
    
    throw new Error(`Failed to load tree dataset: ${error.message}`);
  }
};

// ============================================================================
// ADVANCED ML FEATURES
// ============================================================================

// Get nearby sensors within radius
export const getNearbySernsorsData = async (currentLocation, radiusKm = 5) => {
  try {
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
      
      if (distance <= radiusKm && !isNaN(distance)) {
        nearbySensors.push({
          locationId: doc.id,
          distance,
          ...location
        });
      }
    });
    
    return nearbySensors;
  } catch (error) {
    console.error('Error fetching nearby sensors:', error);
    return [];
  }
};

// Aggregate sensor data with weighted averaging
export const aggregateSensorData = (sensorReadings, distances) => {
  if (!sensorReadings || sensorReadings.length === 0) {
    return null;
  }
  
  let weightedPh = 0, weightedMoisture = 0, weightedTemp = 0;
  let totalWeight = 0;
  
  sensorReadings.forEach((reading, index) => {
    const weight = 1 / (1 + (distances[index] || 0)); // Closer sensors get more weight
    weightedPh += (reading.ph || 0) * weight;
    weightedMoisture += (reading.soilMoisture || 0) * weight;
    weightedTemp += (reading.temperature || 0) * weight;
    totalWeight += weight;
  });
  
  if (totalWeight === 0) return null;
  
  return {
    ph: weightedPh / totalWeight,
    soilMoisture: weightedMoisture / totalWeight,
    temperature: weightedTemp / totalWeight,
    dataPoints: sensorReadings.length
  };
};

// Analyze soil trends from historical readings
export const analyzeSoilTrends = (historicalReadings) => {
  if (!historicalReadings || historicalReadings.length < 7) {
    return { 
      trends: null,
      alerts: [], 
      confidence: 0,
      message: 'insufficient_data' 
    };
  }
  
  // Sort by timestamp
  const sortedReadings = [...historicalReadings].sort((a, b) => 
    new Date(a.timestamp) - new Date(b.timestamp)
  );
  
  // Extract valid values
  const moistureValues = sortedReadings.map(r => r.soilMoisture).filter(v => v != null && v > 0);
  const phValues = sortedReadings.map(r => r.pH).filter(v => v != null && v > 0);
  const tempValues = sortedReadings.map(r => r.temperature).filter(v => v != null);
  
  // Calculate trends for each parameter
  const trends = {
    moisture: calculateTrend(moistureValues),
    ph: calculateTrend(phValues),
    temperature: calculateTrend(tempValues)
  };
  
  // Generate alerts
  const alerts = [];
  
  if (trends.moisture.slope < -2) {
    alerts.push({
      type: 'moisture_declining',
      severity: 'warning',
      message: 'Soil moisture declining rapidly. Consider irrigation.',
      currentValue: moistureValues[moistureValues.length - 1]
    });
  }
  
  if (Math.abs(trends.ph.slope) > 0.3) {
    alerts.push({
      type: 'ph_unstable',
      severity: 'warning',
      message: 'pH levels showing significant change. Monitor closely.',
      currentValue: phValues[phValues.length - 1]
    });
  }
  
  if (trends.temperature.slope > 0.5) {
    alerts.push({
      type: 'temperature_rising',
      severity: 'info',
      message: 'Temperature trend increasing. Monitor for heat stress.',
      currentValue: tempValues[tempValues.length - 1]
    });
  }
  
  return { 
    trends, 
    alerts, 
    confidence: (trends.moisture.r2 + trends.ph.r2 + trends.temperature.r2) / 3 
  };
};

// Get planting history for location
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
      const species = data.seedling_commonName || 'Unknown';
      speciesCount[species] = (speciesCount[species] || 0) + 1;
    });
    
    console.log(`Found ${Object.keys(speciesCount).length} species in planting history for ${locationId}`);
    return speciesCount;
  } catch (error) {
    console.error('Error fetching planting history:', error);
    return {};
  }
};

// Ensure biodiversity by penalizing over-represented species
export const ensureBiodiversity = (recommendations, existingSpeciesInArea) => {
  if (!existingSpeciesInArea || Object.keys(existingSpeciesInArea).length === 0) {
    return recommendations;
  }
  
  return recommendations.map(tree => {
    const existingCount = existingSpeciesInArea[tree.commonName] || 0;
    const diversityPenalty = Math.min(0.3, existingCount * 0.05);
    
    return {
      ...tree,
      confidenceScore: tree.confidenceScore * (1 - diversityPenalty),
      diversityScore: 1 - diversityPenalty,
      existingInArea: existingCount
    };
  });
};

// Apply historical learning based on past performance
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
    if (snapshot.empty) return 1.0; // No history, neutral multiplier
    
    let avgSuccess = 0;
    snapshot.forEach(doc => {
      avgSuccess += (doc.data().survivalRate || 0) / 100;
    });
    avgSuccess /= snapshot.size;
    
    // Boost or reduce confidence based on past success
    return 0.8 + (avgSuccess * 0.4); // Range: 0.8 to 1.2
  } catch (error) {
    console.error('Error fetching historical data:', error);
    return 1.0;
  }
};

// Update recommendation performance (for future learning)
export const updateRecommendationPerformance = async (recommendationId, actualOutcome) => {
  try {
    const performanceRef = doc(firestore, 'recommendation_performance', recommendationId);
    await setDoc(performanceRef, {
      recommendationId,
      species: actualOutcome.species,
      survivalRate: actualOutcome.survivalRate, // e.g., 85%
      growthRate: actualOutcome.growthRate, // slow/medium/fast
      healthScore: actualOutcome.healthScore, // 1-10
      plantingDate: actualOutcome.plantingDate,
      evaluationDate: serverTimestamp(),
      location: actualOutcome.location,
      conditions: actualOutcome.initialConditions
    });
    
    console.log('Performance data saved for future learning');
    return true;
  } catch (error) {
    console.error('Error saving performance data:', error);
    return false;
  }
};

// ============================================================================
// MAIN ML ALGORITHM
// ============================================================================

// Generate seedling recommendations with advanced features
export const generateSeedlingRecommendations = async (sensorData, additionalContext = {}) => {
  const { ph, soilMoisture, temperature, location } = sensorData;
  const { season = 'dry', elevation = 0, useHistoricalLearning = false } = additionalContext;
  
  // Load your actual tree dataset
  const dataset = await loadTreeDataset();
  
  if (dataset.length === 0) {
    throw new Error('Tree dataset could not be loaded or is empty');
  }
  
  console.log(`Analyzing ${dataset.length} tree species for optimal recommendations...`);
  console.log(`Sensor conditions: pH=${ph}, Moisture=${soilMoisture}%, Temperature=${temperature}°C, Season=${season}`);
  
  // Seasonal adjustments for Philippines climate
  const seasonalFactors = {
    dry: { moisture: 0.8, temperature: 1.1, ph: 1.0 },
    wet: { moisture: 1.2, temperature: 0.9, ph: 1.0 },
    moderate: { moisture: 1.0, temperature: 1.0, ph: 1.0 }
  };
  
  const currentSeasonFactors = seasonalFactors[season] || seasonalFactors.moderate;
  
  // Calculate compatibility scores for each tree species
  const scoredTrees = await Promise.all(dataset.map(async tree => {
    // Environmental compatibility scores with seasonal adjustments
    const pHScore = calculateRangeCompatibility(ph, tree.pHMin, tree.pHMax, currentSeasonFactors.ph);
    const moistureScore = calculateRangeCompatibility(soilMoisture, tree.moistureMin, tree.moistureMax, currentSeasonFactors.moisture);
    const tempScore = calculateRangeCompatibility(temperature, tree.tempMin, tree.tempMax, currentSeasonFactors.temperature);
    
    // Success factors
    const successFactor = tree.successRate / 100;
    const adaptabilityFactor = tree.adaptabilityScore / 100;
    
    // Native species bonus
    const nativeBonus = tree.isNative ? 0.1 : 0;
    
    // Calculate base confidence score
    const baseConfidence = 
      (pHScore * 0.25) + 
      (moistureScore * 0.30) + 
      (tempScore * 0.25) + 
      (successFactor * 0.10) + 
      (adaptabilityFactor * 0.10);
    
    // Apply historical learning if enabled
    let historicalMultiplier = 1.0;
    if (useHistoricalLearning && location) {
      historicalMultiplier = await applyHistoricalLearning(tree.commonName, location);
    }
    
    const confidenceScore = Math.min(1, (baseConfidence + nativeBonus) * historicalMultiplier);
    
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
      confidenceScore: Math.max(0.05, confidenceScore), // Minimum 5% confidence
      pHCompatibility: pHScore,
      moistureCompatibility: moistureScore,
      tempCompatibility: tempScore,
      
      // Native status and bonuses
      isNative: tree.isNative,
      nativeBonus: nativeBonus,
      historicalMultiplier: historicalMultiplier,
      
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
  }));
  
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
    console.log(`${index + 1}. ${tree.commonName}: ${(tree.confidenceScore * 100).toFixed(1)}% confidence, ${tree.successRate}% success rate, Native: ${tree.isNative}`);
  });
  
  return topRecommendations;
};

// ============================================================================
// EXPORT ALL FUNCTIONS
// ============================================================================

export default {
  loadTreeDataset,
  generateSeedlingRecommendations,
  analyzeSoilTrends,
  getNearbySernsorsData,
  aggregateSensorData,
  getLocationPlantingHistory,
  ensureBiodiversity,
  applyHistoricalLearning,
  updateRecommendationPerformance,
  calculateDistance,
  parseRange
};