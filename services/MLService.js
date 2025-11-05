// services/MLService.js - WITH RANDOM FOREST ML + CUSTOM IDs
const admin = require('firebase-admin');

class MLService {
  constructor(datasetService, db) {
    this.datasetService = datasetService;
    this.db = db;
    
    this.SEASONAL_FACTORS = {
      dry: { moisture: 0.8, temperature: 1.1, ph: 1.0 },
      wet: { moisture: 1.2, temperature: 0.9, ph: 1.0 },
      moderate: { moisture: 1.0, temperature: 1.0, ph: 1.0 }
    };
  }

  async generateRecommendations({ sensorId, sensorData, location, coordinates }) {
    const { ph, soilMoisture, temperature } = sensorData;
    
    // Validate sensor data
    const validation = this.validateSensorData(sensorData);
    if (!validation.isValid) {
      throw new Error(`Invalid sensor data: ${validation.errors.join(', ')}`);
    }

    // Check if Random Forest model is trained
    if (!this.datasetService.isModelTrained()) {
      throw new Error('Machine learning model not trained. Please upload dataset first.');
    }

    // Get current season
    const season = this.getCurrentSeason();
    const seasonalFactors = this.SEASONAL_FACTORS[season];

    console.log('🤖 Using Random Forest ML model for predictions...');

    // Generate recommendations using Random Forest
    const recommendations = await this.calculateRecommendationsWithML(
      { ph, soilMoisture, temperature },
      seasonalFactors,
      location
    );

    // Save to Firestore with correct structure
    const savedReco = await this.saveRecommendation({
      sensorId,
      sensorData,
      recommendations,
      location,
      coordinates,
      season
    });

    return {
      success: true,
      recommendationId: savedReco.id,
      recommendations: recommendations.slice(0, 3),
      sensorData,
      season,
      generatedAt: new Date().toISOString(),
      confidence: parseFloat((recommendations[0]?.confidenceScore * 100).toFixed(2)),
      mlModel: 'Random Forest',
      modelInfo: this.datasetService.getModelInfo()
    };
  }

  /**
   * Calculate recommendations using Random Forest ML model
   */
  async calculateRecommendationsWithML(sensorData, seasonalFactors, location) {
    const { ph, soilMoisture, temperature } = sensorData;
    
    console.log('🌲 Running Random Forest prediction...');
    console.log(`📊 Input: pH=${ph}, Moisture=${soilMoisture}%, Temp=${temperature}°C`);

    // Use Random Forest to predict tree suitability
    const rfPredictions = this.datasetService.predictWithRandomForest(
      { ph, soilMoisture, temperature },
      seasonalFactors
    );

    console.log(`✅ Random Forest generated ${rfPredictions.length} predictions`);

    // Enhance predictions with additional metrics
    const enhancedPredictions = rfPredictions.map(tree => {
      // Calculate individual compatibility scores for transparency
      const pHScore = this.datasetService.calculateRangeCompatibility(
        ph, tree.pHMin, tree.pHMax, seasonalFactors.ph
      );
      
      const moistureScore = this.datasetService.calculateRangeCompatibility(
        soilMoisture, tree.moistureMin, tree.moistureMax, seasonalFactors.moisture
      );
      
      const tempScore = this.datasetService.calculateRangeCompatibility(
        temperature, tree.tempMin, tree.tempMax, seasonalFactors.temperature
      );

      const successFactor = tree.successRate / 100;
      const adaptabilityFactor = tree.adaptabilityScore / 100;
      const nativeBonus = tree.isNative ? 0.1 : 0;

      // Use RF confidence score as primary, with slight adjustment
      const finalConfidence = Math.min(1.0, tree.confidenceScore + nativeBonus);
      
      // Overall score combines ML prediction with tree characteristics
      const overallScore = (tree.confidenceScore * 0.7) + (successFactor * 0.15) + (adaptabilityFactor * 0.15);

      return {
        ...tree,
        confidenceScore: Math.max(0.05, finalConfidence),
        pHCompatibility: pHScore,
        moistureCompatibility: moistureScore,
        tempCompatibility: tempScore,
        overallScore,
        isNative: tree.isNative,
        nativeBonus,
        mlPredicted: true,
        rfScore: tree.rfScore,
        numTreesVoted: tree.numTreesVoted
      };
    });

    // Sort by overall score
    return enhancedPredictions.sort((a, b) => {
      const scoreDiff = b.overallScore - a.overallScore;
      if (Math.abs(scoreDiff) > 0.05) return scoreDiff;
      
      if (a.isNative !== b.isNative) return b.isNative ? 1 : -1;
      
      const confDiff = b.confidenceScore - a.confidenceScore;
      if (Math.abs(confDiff) > 0.03) return confDiff;
      
      return b.successRate - a.successRate;
    });
  }

  /**
   * Get the next recommendation ID in sequence (reco101, reco102, etc.)
   */
  async getNextRecommendationId() {
    const counterRef = this.db.collection('counters').doc('recommendations');
    
    try {
      const newId = await this.db.runTransaction(async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        
        let nextNumber;
        if (!counterDoc.exists) {
          nextNumber = 101;
          transaction.set(counterRef, { 
            currentId: nextNumber, 
            lastUpdated: admin.firestore.FieldValue.serverTimestamp() 
          });
        } else {
          nextNumber = (counterDoc.data().currentId || 100) + 1;
          transaction.update(counterRef, { 
            currentId: nextNumber,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
          });
        }
        
        return `reco${nextNumber}`;
      });
      
      return newId;
    } catch (error) {
      console.error('Error getting next recommendation ID:', error);
      throw new Error('Failed to generate recommendation ID');
    }
  }

  /**
   * Save recommendation with CUSTOM ID (reco101, reco102, etc.)
   */
  async saveRecommendation({ sensorId, sensorData, recommendations, location, coordinates, season }) {
    const topRecommendations = recommendations.slice(0, 3);
    const avgConfidence = topRecommendations.reduce((sum, tree) => 
      sum + tree.confidenceScore, 0
    ) / topRecommendations.length;

    const timestamp = Date.now();
    
    // ========== STEP 1: Create tree seedlings FIRST ==========
    const seedlingsBatch = this.db.batch();
    const seedlingPaths = [];

    topRecommendations.forEach((tree, index) => {
      const tsId = `ts${timestamp}${String(index).padStart(2, '0')}`;
      const seedlingRef = this.db.collection('treeseedlings').doc(tsId);
      
      seedlingsBatch.set(seedlingRef, {
        seedling_scientificName: tree.scientificName,
        seedling_commonName: tree.commonName,
        seedling_prefMoisture: tree.prefMoisture,
        seedling_prefTemp: tree.prefTemp,
        seedling_prefpH: tree.prefpH,
        seedling_isNative: tree.isNative,
        seedling_category: tree.category,
        seedling_successRate: tree.successRate,
        seedling_adaptabilityScore: tree.adaptabilityScore,
        seedling_confidenceScore: parseFloat((tree.confidenceScore * 100).toFixed(2)),
        
        // ML-specific fields
        ml_predicted: true,
        ml_rfScore: parseFloat((tree.rfScore * 100).toFixed(2)),
        ml_numTreesVoted: tree.numTreesVoted,
        ml_model: 'Random Forest',
        
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        generatedBy: 'ml-backend-rf'
      });

      seedlingPaths.push(`/treeseedlings/${tsId}`);
    });

    await seedlingsBatch.commit();
    console.log(`✅ Created ${seedlingPaths.length} ML-predicted tree seedlings`);

    // ========== STEP 2: Get custom recommendation ID ==========
    const recommendationId = await this.getNextRecommendationId();

    // ========== STEP 3: Extract location ID from sensorId ==========
    const locationId = location.startsWith('LOC_') ? location : `LOC_${sensorId}`;
    
    // ========== STEP 4: Create sensorDataRef path ==========
    const sensorDataRef = `/sensors/${sensorId}/sensordata/data_001`;

    // ========== STEP 5: Create recommendation document with CUSTOM ID ==========
    const recommendationData = {
      locationRef: `/locations/${locationId}`,
      reco_confidenceScore: parseFloat((avgConfidence * 100).toFixed(2)),
      reco_generatedAt: new Date().toISOString(),
      season: season,
      seedlingOptions: seedlingPaths,
      sensorConditions: {
        ph: parseFloat(sensorData.ph),
        soilMoisture: parseFloat(sensorData.soilMoisture),
        temperature: parseFloat(sensorData.temperature)
      },
      sensorDataRef: sensorDataRef,
      
      // ML model information
      algorithm: 'random-forest',
      mlModel: 'Random Forest',
      modelInfo: this.datasetService.getModelInfo(),
      
      sensorId: sensorId,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    };

    if (coordinates && coordinates.latitude && coordinates.longitude) {
      recommendationData.coordinates = {
        latitude: parseFloat(coordinates.latitude),
        longitude: parseFloat(coordinates.longitude)
      };
    }

    // Use custom ID instead of auto-generated
    const recoRef = this.db.collection('recommendations').doc(recommendationId);
    await recoRef.set(recommendationData);
    
    console.log(`✅ ML Recommendation saved with ID: ${recommendationId}`);
    console.log(`🤖 Model: Random Forest with ${this.datasetService.getModelInfo().numTrees} trees`);
    console.log(`📍 Location: ${recommendationData.locationRef}`);
    console.log(`🌱 Seedlings: ${seedlingPaths.join(', ')}`);

    return recoRef;
  }

  validateSensorData(sensorData) {
    const { ph, soilMoisture, temperature } = sensorData;
    const errors = [];
    const warnings = [];

    const ranges = {
      ph: { min: 0, max: 14, optimal: [6.0, 8.0] },
      soilMoisture: { min: 0, max: 100, optimal: [30, 70] },
      temperature: { min: -10, max: 60, optimal: [20, 35] }
    };

    Object.entries(ranges).forEach(([field, rules]) => {
      const value = sensorData[field];
      
      if (value === null || value === undefined || isNaN(value)) {
        errors.push(`${field} is missing or invalid`);
        return;
      }
      
      if (value < rules.min || value > rules.max) {
        errors.push(`${field} (${value}) is outside valid range (${rules.min}-${rules.max})`);
      } else if (rules.optimal && (value < rules.optimal[0] || value > rules.optimal[1])) {
        warnings.push(`${field} (${value}) is outside optimal range (${rules.optimal.join('-')})`);
      }
    });

    return { 
      isValid: errors.length === 0, 
      errors, 
      warnings,
      hasWarnings: warnings.length > 0
    };
  }

  getCurrentSeason() {
    const month = new Date().getMonth() + 1;
    return (month >= 11 || month <= 5) ? 'dry' : 'wet';
  }

  analyzeSoilTrends(readings) {
    if (!readings || readings.length < 7) {
      return { 
        trends: null,
        alerts: [], 
        confidence: 0,
        message: 'insufficient_data',
        readingsCount: readings?.length || 0,
        requiredReadings: 7
      };
    }

    const sortedReadings = [...readings].sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );

    const moistureValues = sortedReadings.map(r => parseFloat(r.soilMoisture)).filter(v => !isNaN(v));
    const phValues = sortedReadings.map(r => parseFloat(r.pH)).filter(v => !isNaN(v));
    const tempValues = sortedReadings.map(r => parseFloat(r.temperature)).filter(v => !isNaN(v));

    const trends = {
      moisture: this.calculateSimpleTrend(moistureValues),
      ph: this.calculateSimpleTrend(phValues),
      temperature: this.calculateSimpleTrend(tempValues)
    };

    return {
      trends,
      alerts: this.generateAlerts(trends, sortedReadings[sortedReadings.length - 1]),
      confidence: 0.8,
      message: 'analysis_complete',
      readingsAnalyzed: readings.length
    };
  }

  calculateSimpleTrend(values) {
    if (values.length < 2) return { slope: 0, direction: 'stable' };
    
    const first = values[0];
    const last = values[values.length - 1];
    const slope = (last - first) / values.length;
    
    return {
      slope,
      direction: slope > 0.5 ? 'rising' : slope < -0.5 ? 'falling' : 'stable',
      change: last - first
    };
  }

  generateAlerts(trends, currentReading) {
    const alerts = [];
    
    if (trends.moisture.direction === 'falling' && currentReading.soilMoisture < 30) {
      alerts.push({
        type: 'low_moisture_trend',
        severity: 'warning',
        message: 'Soil moisture declining and below optimal range',
        currentValue: currentReading.soilMoisture
      });
    }
    
    if (trends.ph.direction === 'rising' && currentReading.pH > 8.0) {
      alerts.push({
        type: 'high_ph_trend',
        severity: 'warning',
        message: 'pH trending upward and above optimal range',
        currentValue: currentReading.pH
      });
    }
    
    return alerts;
  }
}

module.exports = MLService;