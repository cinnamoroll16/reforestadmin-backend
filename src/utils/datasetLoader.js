import * as XLSX from 'xlsx';

// Function to parse range strings from your dataset
const parseRange = (rangeStr) => {
  if (!rangeStr || rangeStr === 'N/A') return { min: 0, max: 0 };
  
  let cleaned = rangeStr.toString()
    .replace(/°C/g, '')
    .replace(/%/g, '')
    .replace(/\s+/g, '')
    .trim();
  
  if (!cleaned.includes('–') && !cleaned.includes('-')) {
    const value = parseFloat(cleaned);
    return { min: value, max: value };
  }
  
  const parts = cleaned.split(/[–-]/);
  if (parts.length === 2) {
    return {
      min: parseFloat(parts[0]),
      max: parseFloat(parts[1])
    };
  }
  
  return { min: 0, max: 0 };
};

// Load and parse your complete Excel dataset
export const loadTreeDataset = async () => {
  try {
    console.log('Loading tree dataset from Excel file...');
    
    // Fetch the Excel file from public folder
    const response = await fetch('/data/Tree_Seedling_Dataset.xlsx');
    if (!response.ok) {
      throw new Error(`Failed to fetch dataset: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    
    // Parse Excel file
    const workbook = XLSX.read(arrayBuffer, {
      cellDates: true,
      cellNF: false,
      cellText: false
    });
    
    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const rawData = XLSX.utils.sheet_to_json(worksheet);
    console.log(`Loaded ${rawData.length} tree species from Excel dataset`);
    
    // Parse and clean the data
    const parsedDataset = rawData.map(species => {
      const moistureRange = parseRange(species["Soil Moisture"]);
      const pHRange = parseRange(species["pH Range"]);
      const tempRange = parseRange(species["Temperature"]);
      
      return {
        commonName: species["Common Name"] || 'Unknown',
        scientificName: species["Scientific Name"] || 'Unknown',
        soilType: species["Soil Type"] || 'Various soil types',
        moistureMin: moistureRange.min,
        moistureMax: moistureRange.max,
        pHMin: pHRange.min,
        pHMax: pHRange.max,
        tempMin: tempRange.min,
        tempMax: tempRange.max,
        category: species["Category"] || 'general',
        successRate: parseInt(species["Success Rate (%)"]) || 0,
        adaptabilityScore: parseInt(species["Adaptability Score"]) || 0,
        climateSuitability: species["Climate Suitability"] || 'Unknown'
      };
    });
    
    // Filter out any species with invalid data
    const validDataset = parsedDataset.filter(tree => 
      tree.commonName !== 'Unknown' && 
      tree.scientificName !== 'Unknown' &&
      tree.moistureMin > 0 && tree.moistureMax > 0 &&
      tree.pHMin > 0 && tree.pHMax > 0 &&
      tree.tempMin > 0 && tree.tempMax > 0
    );
    
    console.log(`${validDataset.length} valid tree species ready for ML processing`);
    return validDataset;
    
  } catch (error) {
    console.error('Error loading tree dataset:', error);
    throw new Error(`Failed to load tree dataset: ${error.message}`);
  }
};

// ML Algorithm using your complete dataset
export const generateSeedlingRecommendations = async (sensorData) => {
  const { ph, soilMoisture, temperature, location } = sensorData;
  
  // Load your actual tree dataset
  const dataset = await loadTreeDataset();
  
  if (dataset.length === 0) {
    throw new Error('Tree dataset could not be loaded or is empty');
  }
  
  console.log(`Analyzing ${dataset.length} tree species for optimal recommendations...`);
  console.log(`Sensor conditions: pH=${ph}, Moisture=${soilMoisture}%, Temperature=${temperature}°C`);
  
  // Calculate compatibility scores for each tree species
  const scoredTrees = dataset.map(tree => {
    // pH compatibility (25% weight)
    const pHScore = calculateRangeCompatibility(ph, tree.pHMin, tree.pHMax);
    
    // Soil moisture compatibility (30% weight) - most important factor
    const moistureScore = calculateRangeCompatibility(soilMoisture, tree.moistureMin, tree.moistureMax);
    
    // Temperature compatibility (25% weight)
    const tempScore = calculateRangeCompatibility(temperature, tree.tempMin, tree.tempMax);
    
    // Success rate factor (10% weight)
    const successFactor = tree.successRate / 100;
    
    // Adaptability factor (10% weight)
    const adaptabilityFactor = tree.adaptabilityScore / 100;
    
    // Calculate weighted confidence score
    const confidenceScore = Math.min(1, 
      (pHScore * 0.25) + 
      (moistureScore * 0.30) + 
      (tempScore * 0.25) + 
      (successFactor * 0.10) + 
      (adaptabilityFactor * 0.10)
    );
    
    return {
      commonName: tree.commonName,
      scientificName: tree.scientificName,
      category: tree.category,
      successRate: tree.successRate,
      adaptabilityScore: tree.adaptabilityScore,
      climateSuitability: tree.climateSuitability,
      soilType: tree.soilType,
      
      // Optimal growing conditions (midpoint of ranges)
      prefMoisture: Math.round((tree.moistureMin + tree.moistureMax) / 2),
      prefpH: parseFloat(((tree.pHMin + tree.pHMax) / 2).toFixed(1)),
      prefTemp: Math.round((tree.tempMin + tree.tempMax) / 2),
      
      // Compatibility scores
      confidenceScore: Math.max(0.05, confidenceScore), // Minimum 5% confidence
      pHCompatibility: pHScore,
      moistureCompatibility: moistureScore,
      tempCompatibility: tempScore,
      
      // Native species preference (hardwood trees are typically native)
      isNative: tree.category === 'hardwood',
      
      // Range information for display
      moistureRange: `${tree.moistureMin}-${tree.moistureMax}%`,
      pHRange: `${tree.pHMin}-${tree.pHMax}`,
      tempRange: `${tree.tempMin}-${tree.tempMax}°C`,
      
      // Overall suitability score
      overallScore: (confidenceScore * 0.7) + (successFactor * 0.3)
    };
  });
  
  // Sort by multiple criteria for best recommendations
  const topRecommendations = scoredTrees
    .sort((a, b) => {
      // Primary: Overall score
      if (Math.abs(b.overallScore - a.overallScore) > 0.05) {
        return b.overallScore - a.overallScore;
      }
      // Secondary: Confidence score
      if (Math.abs(b.confidenceScore - a.confidenceScore) > 0.03) {
        return b.confidenceScore - a.confidenceScore;
      }
      // Tertiary: Success rate
      if (Math.abs(b.successRate - a.successRate) > 5) {
        return b.successRate - a.successRate;
      }
      // Quaternary: Adaptability score
      return b.adaptabilityScore - a.adaptabilityScore;
    })
    .slice(0, 3); // Top 3 recommendations
  
  console.log('Top 3 tree recommendations generated:');
  topRecommendations.forEach((tree, index) => {
    console.log(`${index + 1}. ${tree.commonName}: ${(tree.confidenceScore * 100).toFixed(1)}% confidence, ${tree.successRate}% success rate`);
  });
  
  return topRecommendations;
};

// Helper function to calculate range-based compatibility
const calculateRangeCompatibility = (value, min, max) => {
  if (min === 0 && max === 0) return 0.3; // Handle invalid range data
  
  if (value >= min && value <= max) {
    // Perfect match within optimal range
    return 1.0;
  } else {
    // Calculate how far the value is from the optimal range
    let distance;
    if (value < min) {
      distance = min - value;
    } else {
      distance = value - max;
    }
    
    const rangeSize = max - min;
    const tolerance = rangeSize * 0.8; // Allow 80% tolerance outside optimal range
    
    // Score decreases linearly with distance from optimal range
    const score = Math.max(0, 1 - (distance / tolerance));
    return score;
  }
};