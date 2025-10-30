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

    // Get dataset
    const dataset = this.datasetService.getDataset();
    if (!dataset || dataset.length === 0) {
      throw new Error('Tree dataset is empty or unavailable');
    }

    // Get current season
    const season = this.getCurrentSeason();
    const seasonalFactors = this.SEASONAL_FACTORS[season];

    // Generate recommendations
    const recommendations = await this.calculateRecommendations(
      { ph, soilMoisture, temperature },
      dataset,
      seasonalFactors,
      location
    );

    // Save to Firestore
    const savedReco = await this.saveRecommendation({
      sensorId,
      sensorData,
      recommendations,
      location,
      coordinates,
      season
    });

    return {
      recommendationId: savedReco.id,
      recommendations: recommendations.slice(0, 3),
      sensorData,
      season,
      generatedAt: new Date().toISOString(),
      confidence: parseFloat((recommendations[0]?.confidenceScore * 100).toFixed(2))
    };
  }

  async calculateRecommendations(sensorData, dataset, seasonalFactors, location) {
    const { ph, soilMoisture, temperature } = sensorData;
    
    const scoredTrees = dataset.map(tree => {
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

      const baseConfidence = 
        (pHScore * 0.25) +
        (moistureScore * 0.30) +
        (tempScore * 0.25) +
        (successFactor * 0.10) +
        (adaptabilityFactor * 0.10);

      const confidenceScore = Math.min(1, baseConfidence + nativeBonus);
      const overallScore = (confidenceScore * 0.6) + (successFactor * 0.2) + (adaptabilityFactor * 0.2);

      return {
        ...tree,
        confidenceScore: Math.max(0.05, confidenceScore),
        pHCompatibility: pHScore,
        moistureCompatibility: moistureScore,
        tempCompatibility: tempScore,
        overallScore,
        isNative: tree.isNative,
        nativeBonus
      };
    });

    return scoredTrees.sort((a, b) => {
      const scoreDiff = b.overallScore - a.overallScore;
      if (Math.abs(scoreDiff) > 0.05) return scoreDiff;
      
      if (a.isNative !== b.isNative) return b.isNative ? 1 : -1;
      
      const confDiff = b.confidenceScore - a.confidenceScore;
      if (Math.abs(confDiff) > 0.03) return confDiff;
      
      return b.successRate - a.successRate;
    });
  }

  async saveRecommendation({ sensorId, sensorData, recommendations, location, coordinates, season }) {
    const topRecommendations = recommendations.slice(0, 3);
    const avgConfidence = topRecommendations.reduce((sum, tree) => 
      sum + tree.confidenceScore, 0
    ) / topRecommendations.length;

    // Save recommendation document
    const recommendationData = {
      sensorId,
      sensorData,
      location,
      coordinates,
      season,
      recommendations: topRecommendations,
      confidenceScore: parseFloat((avgConfidence * 100).toFixed(2)),
      generatedAt: new Date().toISOString(),
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    };

    const recoRef = await this.db.collection('recommendations').add(recommendationData);

    // Save tree seedlings
    const seedlingsBatch = this.db.batch();
    const seedlingRefs = [];

    topRecommendations.forEach((tree, index) => {
      const tsId = `ts${Date.now()}${index}`;
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
        sourceRecommendationId: recoRef.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      seedlingRefs.push(seedlingRef);
    });

    await seedlingsBatch.commit();

    // Update recommendation with seedling references
    await recoRef.update({
      seedlingOptions: seedlingRefs.map(ref => ref.path)
    });

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

    // Basic trend analysis implementation
    // You can expand this with more sophisticated analysis
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