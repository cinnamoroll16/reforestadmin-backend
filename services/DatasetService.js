const XLSX = require('xlsx');
const fs = require('fs');

class DatasetService {
  constructor() {
    this.dataset = null;
    this.datasetPath = null;
    this.lastUpdateTime = null;
    this.rfModel = null; // Random Forest model
    this.featureScalers = null; // For normalizing input features
  }

  // ==================== FILE LOADING METHODS ====================

  /**
   * Load dataset from file path (for local development)
   */
  async loadDatasetFromFile(filePath) {
    try {
      console.log(`📊 Loading dataset from file: ${filePath}`);
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      const rawData = XLSX.utils.sheet_to_json(worksheet, { 
        defval: null,
        blankrows: false 
      });

      if (!rawData || rawData.length === 0) {
        throw new Error('Excel file contains no data rows');
      }

      this.dataset = this.parseDataset(rawData);
      this.datasetPath = filePath;
      this.lastUpdateTime = new Date();
      
      // Train Random Forest model after loading dataset
      await this.trainRandomForestModel();
      
      console.log(`✅ Successfully loaded ${this.dataset.length} tree species`);
      console.log(`🌲 Random Forest model trained with ${this.rfModel.trees.length} decision trees`);
      return this.dataset;
    } catch (error) {
      console.error('❌ Error loading dataset from file:', error);
      throw error;
    }
  }

  /**
   * Load dataset from buffer (for Vercel/serverless environments)
   * This is the critical method for Vercel deployment
   */
  async loadDatasetFromBuffer(buffer, filename) {
  try {
    console.log(`📊 Loading dataset from buffer: ${filename}`);
    console.log(`📦 Buffer size: ${(buffer.length / 1024).toFixed(2)} KB`);
    
    // Read workbook from buffer
    const workbook = XLSX.read(buffer, { 
      type: 'buffer',
      cellDates: true,
      cellNF: false,
      cellText: false
    });
    
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const rawData = XLSX.utils.sheet_to_json(worksheet, { 
      defval: null,
      blankrows: false 
    });

    this.dataset = this.parseDataset(rawData);
    this.datasetPath = filename;
    this.lastUpdateTime = new Date();
    
    await this.trainRandomForestModel();
    
    console.log(`✅ Successfully loaded ${this.dataset.length} tree species from buffer`);
    return this.dataset;
  } catch (error) {
    console.error('❌ Error loading dataset from buffer:', error);
    throw new Error(`Dataset processing failed: ${error.message}`);
  }
}

  // ==================== DATASET PARSING ====================

  parseDataset(rawData) {
    const parsed = rawData.map((species, index) => {
      try {
        const moistureRange = this.parseRange(
          species["Soil Moisture"] || species["Moisture"] || species["Preferred Moisture"]
        );
        
        const pHRange = this.parseRange(
          species["pH Range"] || species["pH"] || species["Preferred pH"]
        );
        
        const tempRange = this.parseRange(
          species["Temperature"] || species["Preferred Temperature"] || species["Temp"]
        );

        if (!moistureRange.valid || !pHRange.valid || !tempRange.valid) {
          console.warn(`Row ${index + 2}: Invalid range data`);
          return null;
        }

        const prefMoisture = (moistureRange.min + moistureRange.max) / 2;
        const prefTemp = (tempRange.min + tempRange.max) / 2;
        const prefpH = (pHRange.min + pHRange.max) / 2;

        const moistureTolerance = Math.max(5, prefMoisture * 0.2);
        const tempTolerance = Math.max(2, prefTemp * 0.15);
        const pHTolerance = Math.max(0.5, prefpH * 0.1);

        const nativeValue = String(species["Native"] || species["Is Native"] || '').toLowerCase().trim();
        const isNative = ['true', 'yes', 'y', '1', 'native'].includes(nativeValue);

        const commonName = species["Common Name"] || species["common_name"] || 'Unknown';
        const scientificName = species["Scientific Name"] || species["scientific_name"] || 'Unknown';

        if (commonName === 'Unknown' || scientificName === 'Unknown') {
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
          uses: species["Uses"] || species["uses"] || 'Reforestation'
        };
      } catch (error) {
        console.error(`Error parsing row ${index + 2}:`, error);
        return null;
      }
    }).filter(tree => tree !== null);

    console.log(`📈 Parsed ${parsed.length} valid tree species from ${rawData.length} rows`);
    return parsed;
  }

  parseRange(rangeStr) {
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
      
      if (!cleaned.includes('-')) {
        const value = parseFloat(cleaned);
        if (isNaN(value)) return { min: 0, max: 0, valid: false };
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
      return { min: 0, max: 0, valid: false };
    }
  }

  // ==================== RANDOM FOREST IMPLEMENTATION ====================

  /**
   * Train Random Forest model from dataset
   */
  async trainRandomForestModel() {
    if (!this.dataset || this.dataset.length === 0) {
      throw new Error('Cannot train model: dataset is empty');
    }

    console.log('🌲 Training Random Forest model...');

    // Generate synthetic training data from tree preferences
    const trainingData = this.generateTrainingData();
    
    // Calculate feature scalers for normalization
    this.featureScalers = this.calculateFeatureScalers(trainingData);

    // Train Random Forest with multiple decision trees
    const numTrees = 50; // Number of trees in the forest
    const maxDepth = 10; // Maximum depth of each tree
    const minSamplesSplit = 5; // Minimum samples to split a node
    const maxFeatures = 3; // Number of features to consider at each split (sqrt of total features)

    this.rfModel = {
      trees: [],
      numTrees,
      maxDepth,
      minSamplesSplit,
      maxFeatures
    };

    // Build multiple decision trees with bootstrap sampling
    for (let i = 0; i < numTrees; i++) {
      const bootstrapSample = this.bootstrapSample(trainingData);
      const tree = this.buildDecisionTree(
        bootstrapSample,
        0,
        maxDepth,
        minSamplesSplit,
        maxFeatures
      );
      this.rfModel.trees.push(tree);
    }

    console.log(`✅ Random Forest trained with ${numTrees} trees`);
  }

  /**
   * Generate synthetic training data from tree specifications
   * For each tree, create multiple samples within their optimal ranges
   */
  generateTrainingData() {
    const trainingData = [];
    const samplesPerTree = 30; // Generate 30 samples per tree

    this.dataset.forEach(tree => {
      for (let i = 0; i < samplesPerTree; i++) {
        // Generate random samples within the tree's optimal ranges
        const moisture = this.randomInRange(tree.moistureMin, tree.moistureMax);
        const ph = this.randomInRange(tree.pHMin, tree.pHMax);
        const temp = this.randomInRange(tree.tempMin, tree.tempMax);

        // Calculate suitability score (label for training)
        const suitability = this.calculateSuitabilityScore(
          { moisture, ph, temp },
          tree
        );

        trainingData.push({
          features: [moisture, ph, temp],
          label: suitability,
          treeId: tree.id,
          treeIndex: this.dataset.indexOf(tree)
        });
      }
    });

    // Add some negative samples (conditions outside optimal ranges)
    this.dataset.forEach(tree => {
      for (let i = 0; i < 10; i++) {
        const moisture = this.randomOutsideRange(tree.moistureMin, tree.moistureMax, 0, 100);
        const ph = this.randomOutsideRange(tree.pHMin, tree.pHMax, 0, 14);
        const temp = this.randomOutsideRange(tree.tempMin, tree.tempMax, -10, 60);

        const suitability = this.calculateSuitabilityScore(
          { moisture, ph, temp },
          tree
        );

        trainingData.push({
          features: [moisture, ph, temp],
          label: suitability,
          treeId: tree.id,
          treeIndex: this.dataset.indexOf(tree)
        });
      }
    });

    return trainingData;
  }

  /**
   * Calculate suitability score for training
   */
  calculateSuitabilityScore(conditions, tree) {
    const { moisture, ph, temp } = conditions;

    // Calculate how well each condition matches the tree's preferences
    const moistureScore = this.gaussianScore(moisture, tree.prefMoisture, (tree.moistureMax - tree.moistureMin) / 4);
    const phScore = this.gaussianScore(ph, tree.prefpH, (tree.pHMax - tree.pHMin) / 4);
    const tempScore = this.gaussianScore(temp, tree.prefTemp, (tree.tempMax - tree.tempMin) / 4);

    // Weighted combination
    const baseScore = (moistureScore * 0.35 + phScore * 0.30 + tempScore * 0.35);
    
    // Add tree characteristics
    const successBonus = (tree.successRate / 100) * 0.1;
    const adaptabilityBonus = (tree.adaptabilityScore / 100) * 0.1;
    const nativeBonus = tree.isNative ? 0.15 : 0;

    return Math.min(1.0, baseScore + successBonus + adaptabilityBonus + nativeBonus);
  }

  /**
   * Gaussian scoring function for continuous features
   */
  gaussianScore(value, optimal, stdDev) {
    const exponent = -Math.pow(value - optimal, 2) / (2 * Math.pow(stdDev, 2));
    return Math.exp(exponent);
  }

  /**
   * Random value within range
   */
  randomInRange(min, max) {
    return min + Math.random() * (max - min);
  }

  /**
   * Random value outside range
   */
  randomOutsideRange(min, max, absMin, absMax) {
    const range = max - min;
    const buffer = range * 0.5;
    
    if (Math.random() < 0.5) {
      // Below range
      return Math.max(absMin, min - Math.random() * buffer);
    } else {
      // Above range
      return Math.min(absMax, max + Math.random() * buffer);
    }
  }

  /**
   * Bootstrap sampling for Random Forest
   */
  bootstrapSample(data) {
    const sample = [];
    const n = data.length;
    for (let i = 0; i < n; i++) {
      const randomIndex = Math.floor(Math.random() * n);
      sample.push(data[randomIndex]);
    }
    return sample;
  }

  /**
   * Calculate feature scalers (min-max normalization)
   */
  calculateFeatureScalers(data) {
    const numFeatures = data[0].features.length;
    const scalers = [];

    for (let i = 0; i < numFeatures; i++) {
      const values = data.map(d => d.features[i]);
      scalers.push({
        min: Math.min(...values),
        max: Math.max(...values)
      });
    }

    return scalers;
  }

  /**
   * Normalize features using min-max scaling
   */
  normalizeFeatures(features) {
    return features.map((value, i) => {
      const scaler = this.featureScalers[i];
      const range = scaler.max - scaler.min;
      if (range === 0) return 0;
      return (value - scaler.min) / range;
    });
  }

  /**
   * Build a single decision tree (CART algorithm)
   */
  buildDecisionTree(data, depth, maxDepth, minSamplesSplit, maxFeatures) {
    // Stopping criteria
    if (depth >= maxDepth || data.length < minSamplesSplit) {
      return this.createLeafNode(data);
    }

    // Find best split
    const bestSplit = this.findBestSplit(data, maxFeatures);

    if (!bestSplit || bestSplit.gain <= 0) {
      return this.createLeafNode(data);
    }

    // Split data
    const leftData = data.filter(d => d.features[bestSplit.featureIndex] <= bestSplit.threshold);
    const rightData = data.filter(d => d.features[bestSplit.featureIndex] > bestSplit.threshold);

    // Recursively build subtrees
    return {
      type: 'split',
      featureIndex: bestSplit.featureIndex,
      threshold: bestSplit.threshold,
      left: this.buildDecisionTree(leftData, depth + 1, maxDepth, minSamplesSplit, maxFeatures),
      right: this.buildDecisionTree(rightData, depth + 1, maxDepth, minSamplesSplit, maxFeatures)
    };
  }

  /**
   * Create leaf node with prediction
   */
  createLeafNode(data) {
    // Group by tree and average suitability scores
    const treeScores = {};
    
    data.forEach(d => {
      if (!treeScores[d.treeIndex]) {
        treeScores[d.treeIndex] = { sum: 0, count: 0 };
      }
      treeScores[d.treeIndex].sum += d.label;
      treeScores[d.treeIndex].count += 1;
    });

    // Calculate average scores
    const predictions = Object.entries(treeScores).map(([treeIndex, stats]) => ({
      treeIndex: parseInt(treeIndex),
      score: stats.sum / stats.count,
      count: stats.count
    }));

    return {
      type: 'leaf',
      predictions: predictions.sort((a, b) => b.score - a.score)
    };
  }

  /**
   * Find best split using information gain
   */
  findBestSplit(data, maxFeatures) {
    const numFeatures = data[0].features.length;
    
    // Randomly select features to consider
    const featureIndices = this.randomFeatureSubset(numFeatures, maxFeatures);
    
    let bestSplit = null;
    let bestGain = -Infinity;

    featureIndices.forEach(featureIndex => {
      const values = [...new Set(data.map(d => d.features[featureIndex]))].sort((a, b) => a - b);
      
      // Try different thresholds
      for (let i = 0; i < values.length - 1; i++) {
        const threshold = (values[i] + values[i + 1]) / 2;
        
        const leftData = data.filter(d => d.features[featureIndex] <= threshold);
        const rightData = data.filter(d => d.features[featureIndex] > threshold);

        if (leftData.length === 0 || rightData.length === 0) continue;

        const gain = this.calculateInformationGain(data, leftData, rightData);

        if (gain > bestGain) {
          bestGain = gain;
          bestSplit = { featureIndex, threshold, gain };
        }
      }
    });

    return bestSplit;
  }

  /**
   * Random feature subset for Random Forest
   */
  randomFeatureSubset(numFeatures, maxFeatures) {
    const indices = Array.from({ length: numFeatures }, (_, i) => i);
    const subset = [];
    
    for (let i = 0; i < Math.min(maxFeatures, numFeatures); i++) {
      const randomIndex = Math.floor(Math.random() * indices.length);
      subset.push(indices[randomIndex]);
      indices.splice(randomIndex, 1);
    }
    
    return subset;
  }

  /**
   * Calculate information gain (variance reduction for regression)
   */
  calculateInformationGain(parent, left, right) {
    const parentVariance = this.calculateVariance(parent);
    const leftVariance = this.calculateVariance(left);
    const rightVariance = this.calculateVariance(right);

    const n = parent.length;
    const nLeft = left.length;
    const nRight = right.length;

    const weightedChildVariance = (nLeft / n) * leftVariance + (nRight / n) * rightVariance;
    
    return parentVariance - weightedChildVariance;
  }

  /**
   * Calculate variance of labels
   */
  calculateVariance(data) {
    if (data.length === 0) return 0;
    
    const mean = data.reduce((sum, d) => sum + d.label, 0) / data.length;
    const variance = data.reduce((sum, d) => sum + Math.pow(d.label - mean, 2), 0) / data.length;
    
    return variance;
  }

  /**
   * Predict using Random Forest
   */
  predictWithRandomForest(sensorData, seasonalFactors = { moisture: 1.0, ph: 1.0, temperature: 1.0 }) {
    if (!this.rfModel) {
      throw new Error('Random Forest model not trained');
    }

    const { soilMoisture, ph, temperature } = sensorData;

    // Apply seasonal adjustments
    const adjustedFeatures = [
      soilMoisture * seasonalFactors.moisture,
      ph * seasonalFactors.ph,
      temperature * seasonalFactors.temperature
    ];

    // Get predictions from all trees
    const allPredictions = {};

    this.rfModel.trees.forEach(tree => {
      const treePredictions = this.predictWithTree(tree, adjustedFeatures);
      
      treePredictions.forEach(pred => {
        if (!allPredictions[pred.treeIndex]) {
          allPredictions[pred.treeIndex] = { scores: [], treeIndex: pred.treeIndex };
        }
        allPredictions[pred.treeIndex].scores.push(pred.score);
      });
    });

    // Average predictions across all trees
    const finalPredictions = Object.values(allPredictions).map(pred => {
      const avgScore = pred.scores.reduce((a, b) => a + b, 0) / pred.scores.length;
      const tree = this.dataset[pred.treeIndex];
      
      return {
        ...tree,
        confidenceScore: avgScore,
        rfScore: avgScore,
        numTreesVoted: pred.scores.length
      };
    });

    // Sort by confidence score
    return finalPredictions.sort((a, b) => b.confidenceScore - a.confidenceScore);
  }

  /**
   * Predict with a single decision tree
   */
  predictWithTree(node, features) {
    if (node.type === 'leaf') {
      return node.predictions;
    }

    if (features[node.featureIndex] <= node.threshold) {
      return this.predictWithTree(node.left, features);
    } else {
      return this.predictWithTree(node.right, features);
    }
  }

  // ==================== COMPATIBILITY METHODS ====================

  /**
   * Calculate compatibility (kept for backward compatibility)
   * Now uses Random Forest predictions internally
   */
  calculateRangeCompatibility(value, min, max, seasonalMultiplier = 1.0) {
    // This method is kept for backward compatibility but can be enhanced with RF
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
  }

  // ==================== PUBLIC API ====================

  getDataset() {
    if (!this.dataset) {
      throw new Error('Dataset not loaded. Please upload dataset first.');
    }
    return this.dataset;
  }

  isDatasetLoaded() {
    return this.dataset !== null && this.dataset.length > 0;
  }

  isModelTrained() {
    return this.rfModel !== null;
  }

  getLastUpdateTime() {
    return this.lastUpdateTime;
  }

  getModelInfo() {
    if (!this.rfModel) {
      return { trained: false };
    }

    return {
      trained: true,
      numTrees: this.rfModel.numTrees,
      maxDepth: this.rfModel.maxDepth,
      minSamplesSplit: this.rfModel.minSamplesSplit,
      maxFeatures: this.rfModel.maxFeatures,
      trainingDataSize: this.dataset.length * 40 // 30 positive + 10 negative samples per tree
    };
  }

  clearDataset() {
    this.dataset = null;
    this.datasetPath = null;
    this.lastUpdateTime = null;
    this.rfModel = null;
    this.featureScalers = null;
    console.log('🗑️ Dataset and model cleared');
  }
}

module.exports = DatasetService;
