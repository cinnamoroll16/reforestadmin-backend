const XLSX = require('xlsx');
const fs = require('fs');

class DatasetService {
  constructor() {
    this.dataset = null;
    this.datasetPath = null;
    this.lastUpdateTime = null;
  }

  async loadDatasetFromFile(filePath) {
    try {
      console.log(`📊 Loading dataset from: ${filePath}`);
      
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
      
      console.log(`✅ Successfully loaded ${this.dataset.length} tree species`);
      return this.dataset;
    } catch (error) {
      console.error('❌ Error loading dataset:', error);
      throw error;
    }
  }

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

  calculateRangeCompatibility(value, min, max, seasonalMultiplier = 1.0) {
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

  getDataset() {
    if (!this.dataset) {
      throw new Error('Dataset not loaded. Please upload dataset first.');
    }
    return this.dataset;
  }

  isDatasetLoaded() {
    return this.dataset !== null && this.dataset.length > 0;
  }

  getLastUpdateTime() {
    return this.lastUpdateTime;
  }

  clearDataset() {
    this.dataset = null;
    this.datasetPath = null;
    this.lastUpdateTime = null;
  }
}

module.exports = DatasetService;