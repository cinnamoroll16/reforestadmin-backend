// src/pages/Sensors.js
import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { rtdb, auth, firestore } from '../firebase.js';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
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
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { 
  SensorsOutlined as SensorsIcon, 
  CheckCircle as CheckCircleIcon, 
  Warning as WarningIcon,
  Science as ScienceIcon
} from '@mui/icons-material';
import ReForestAppBar from './AppBar.js';
import Navigation from './Navigation.js';
import { useNavigate } from 'react-router-dom';

const drawerWidth = 240;

// Function to parse range strings from dataset (handles multiple formats)
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

// Load and parse the Excel dataset
const loadTreeDataset = async () => {
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

// ML Algorithm using the complete dataset
const generateSeedlingRecommendations = async (sensorData) => {
  const { ph, soilMoisture, temperature, location } = sensorData;
  
  // Load the actual tree dataset
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

function Sensors() {
  const theme = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const navigate = useNavigate();

  const user = auth.currentUser;
  const handleLogout = () => auth.signOut();

  const [sensors, setSensors] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processingMLSensor, setProcessingMLSensor] = useState(null);

  useEffect(() => {
    setLoading(true);
    
    const sensorsRef = ref(rtdb, "sensors");
    const statusRef = ref(rtdb, "sensorStatus");

    // First, get the status data
    const statusUnsubscribe = onValue(statusRef, (statusSnap) => {
      const statusData = statusSnap.val() || {};
      console.log("Status data:", statusData); // Debug log

      // Then get the sensors data
      const sensorsUnsubscribe = onValue(sensorsRef, (sensorsSnap) => {
        const sensorsObj = sensorsSnap.val() || {};
        console.log("Sensors data:", sensorsObj); // Debug log

        if (Object.keys(sensorsObj).length === 0) {
          console.log("No sensors found in database");
          setSensors([]);
          setLoading(false);
          return;
        }

        const sensorsArray = Object.entries(sensorsObj).map(([id, sensor]) => {
          console.log(`Processing sensor ${id}:`, sensor); // Debug log
          
          // Extract location information from nested Location object
          let locationName = "N/A";
          let coordinates = null;
          
          if (sensor.Location && typeof sensor.Location === 'object') {
            const locationEntries = Object.entries(sensor.Location);
            if (locationEntries.length > 0) {
              const [locationId, locationData] = locationEntries[0]; // Get first location
              locationName = locationData.location_name || "N/A";
              coordinates = {
                latitude: locationData.location_latitude,
                longitude: locationData.location_longitude
              };
            }
          }
          
          const readingsObj = sensor.sensorData || {};
          console.log(`Readings for ${id}:`, readingsObj); // Debug log

          // Convert readings to array with IDs
          const readingsArr = Object.entries(readingsObj).map(([rid, r]) => ({
            readingId: rid,
            ...r,
          }));

          // Sort readings by timestamp DESC (latest first)
          readingsArr.sort(
            (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
          );

          // Pick latest reading
          const latest = readingsArr[0] || {};
          console.log(`Latest reading for ${id}:`, latest); // Debug log

          return {
            id,
            location: locationName,
            coordinates: coordinates,
            status: statusData[sensor.sensorStat_id]?.status_name || "Unknown",
            statusDescription: statusData[sensor.sensorStat_id]?.description || "",
            lastCalibration: sensor.sensor_lastCalibrationDate || null,

            // Latest values from the most recent reading
            ph: latest.pH !== undefined ? latest.pH : "N/A",
            soilMoisture: latest.soilMoisture !== undefined ? latest.soilMoisture : "N/A",
            temperature: latest.temperature !== undefined ? latest.temperature : "N/A",

            // Keep all readings if needed later
            readings: readingsArr,
            
            // Additional metadata
            timestamp: latest.timestamp || null,
          };
        });

        console.log("Processed sensors array:", sensorsArray); // Debug log
        setSensors(sensorsArray);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching sensors:", error);
        setLoading(false);
      });

      // Clean up sensors listener when component unmounts
      return () => sensorsUnsubscribe();
    }, (error) => {
      console.error("Error fetching sensor status:", error);
      setLoading(false);
    });

    // Clean up status listener when component unmounts
    return () => statusUnsubscribe();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Force a refresh by setting loading state
    setLoading(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setLoading(false);
    }, 1000);
  };

  const handleGenerateML = async (sensor) => {
    try {
      setProcessingMLSensor(sensor.id);
      
      const { ph, soilMoisture, temperature } = sensor;
      
      // Validate sensor data
      if (ph === "N/A" || soilMoisture === "N/A" || temperature === "N/A") {
        alert("This sensor doesn't have complete readings. Cannot generate recommendations.");
        setProcessingMLSensor(null);
        return;
      }
      
      console.log(`Generating ML recommendations for sensor ${sensor.id}...`);
      console.log(`Soil conditions: pH=${ph}, Moisture=${soilMoisture}%, Temperature=${temperature}°C`);
      
      // Show processing message
      const processingMsg = "Processing ML algorithm with your tree dataset...\n\nThis may take a few seconds.";
      alert(processingMsg);
      
      // Generate recommendations using Excel dataset
      const recommendedTrees = await generateSeedlingRecommendations({
        ph: parseFloat(ph),
        soilMoisture: parseFloat(soilMoisture),
        temperature: parseFloat(temperature),
        location: sensor.location
      });
      
      if (recommendedTrees.length === 0) {
        alert("No suitable tree species found in your dataset for these soil conditions.\n\nThe current sensor readings may be outside the optimal ranges for all available species.");
        setProcessingMLSensor(null);
        return;
      }
      
      // Calculate overall recommendation confidence
      const avgConfidence = recommendedTrees.reduce((sum, tree) => sum + tree.confidenceScore, 0) / recommendedTrees.length;
      
      // Create recommendation document in Firestore
      const recommendationData = {
        sensorData_id: sensor.id,
        inventory_id: sensor.location || `LOC_${sensor.id}`,
        reco_confidenceScore: (avgConfidence * 100).toFixed(1),
        reco_generatedDATE: serverTimestamp(),
        algorithm_version: 'v2.0_excel_dataset_57_species',
        source_sensor_data: {
          ph: parseFloat(ph),
          soilMoisture: parseFloat(soilMoisture),
          temperature: parseFloat(temperature),
          timestamp: sensor.timestamp,
          location: sensor.location,
          coordinates: sensor.coordinates
        },
        metadata: {
          total_species_analyzed: recommendedTrees.length,
          dataset_source: 'Tree_Seedling_Dataset.xlsx',
          processing_date: new Date().toISOString()
        }
      };
      
      // Save recommendation to Firestore
      const recommendationRef = await addDoc(collection(firestore, 'Recommendation'), recommendationData);
      console.log('Recommendation created with ID:', recommendationRef.id);
      
      // Save tree recommendations as subcollection with detailed data
      const treePromises = recommendedTrees.map((tree, index) => 
        addDoc(collection(firestore, 'Recommendation', recommendationRef.id, 'seedlings'), {
          // Basic seedling info
          seedling_commonName: tree.commonName,
          seedling_scientificName: tree.scientificName,
          seedling_preMoisture: tree.prefMoisture.toString(),
          seedling_prePH: tree.prefpH.toString(),
          seedling_preTemp: tree.prefTemp.toString(),
          seedling_isNative: tree.isNative.toString(),
          
          // ML confidence and compatibility scores
          confidence_score: tree.confidenceScore,
          ph_compatibility: tree.pHCompatibility,
          moisture_compatibility: tree.moistureCompatibility,
          temp_compatibility: tree.tempCompatibility,
          overall_score: tree.overallScore,
          
          // Dataset-specific data
          category: tree.category,
          success_rate: tree.successRate,
          adaptability_score: tree.adaptabilityScore,
          climate_suitability: tree.climateSuitability,
          soil_type: tree.soilType,
          
          // Optimal ranges for reference
          optimal_moisture_range: tree.moistureRange,
          optimal_ph_range: tree.pHRange,
          optimal_temp_range: tree.tempRange,
          
          // Ranking and metadata
          ranking: index + 1,
          created_at: serverTimestamp()
        })
      );
      
      await Promise.all(treePromises);
      console.log('All tree recommendations saved successfully');
      
      setProcessingMLSensor(null);
      
      // Create comprehensive success message
      const topTree = recommendedTrees[0];
      const successMessage = `ML Analysis Complete!

Dataset: 57 Philippine tree species analyzed
Top Recommendation: ${topTree.commonName}
Scientific Name: ${topTree.scientificName}
Confidence: ${(topTree.confidenceScore * 100).toFixed(1)}%
Success Rate: ${topTree.successRate}%
Category: ${topTree.category}
Climate: ${topTree.climateSuitability}

Generated ${recommendedTrees.length} recommendations with ${(avgConfidence * 100).toFixed(1)}% average confidence.

Click OK to view detailed recommendations!`;
      
      alert(successMessage);
      
      // Navigate to recommendations page
      navigate('/recommendations');
      
    } catch (error) {
      console.error('Error generating ML recommendations:', error);
      
      let errorMessage = 'Failed to generate recommendations. ';
      if (error.message.includes('dataset')) {
        errorMessage += 'Could not load the tree dataset. Please ensure Tree_Seedling_Dataset.xlsx is in the public/data folder.';
      } else if (error.message.includes('fetch')) {
        errorMessage += 'Could not access the dataset file. Please check the file path.';
      } else {
        errorMessage += 'Please try again or check the console for details.';
      }
      
      alert(errorMessage);
      setProcessingMLSensor(null);
    }
  };

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Format values for display
  const formatValue = (value, unit = '') => {
    if (value === "N/A" || value === null || value === undefined) {
      return "N/A";
    }
    return `${value}${unit}`;
  };

  // Get status color based on status name
  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'error';
      case 'under maintenance':
        return 'warning';
      default:
        return 'info';
    }
  };

  // Get status icon based on status name
  const getStatusIcon = (status) => {
    switch (status.toLowerCase()) {
      case 'active':
        return <CheckCircleIcon />;
      case 'inactive':
        return <WarningIcon />;
      case 'under maintenance':
        return <WarningIcon />;
      default:
        return <WarningIcon />;
    }
  };

  return (
    <Box sx={{ display: 'flex', bgcolor: '#f8fafc', minHeight: '100vh' }}>
      <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={user} onLogout={handleLogout} />
      <Navigation mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} isMobile={false} />

      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - ${drawerWidth}px)` } }}>
        <Toolbar />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" sx={{ color: '#2e7d32', fontWeight: 600, mb: 1 }}>
              Sensor Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {sensors.length} sensor{sensors.length !== 1 ? 's' : ''} found
            </Typography>
          </Box>
          <Button 
            variant="outlined" 
            onClick={handleRefresh} 
            disabled={isRefreshing || loading}
            sx={{ minWidth: 100 }}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Box>

        {(isRefreshing || loading) && <LinearProgress sx={{ mb: 2 }} />}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <Typography variant="body1" color="textSecondary">
              Loading sensors data...
            </Typography>
          </Box>
        ) : sensors.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <Typography variant="body1" color="textSecondary">
              No sensors found in the database.
            </Typography>
          </Box>
        ) : (
          <Paper sx={{ width: '100%', mb: 2, borderRadius: 2, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
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
                    <TableRow key={sensor.id} hover sx={{ '&:hover': { bgcolor: 'rgba(46, 125, 50, 0.04)' } }}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <SensorsIcon sx={{ mr: 1, color: 'primary.main', fontSize: 20 }} />
                          <Typography variant="body2" fontWeight="medium">{sensor.id}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 200 }} title={sensor.location}>
                          {sensor.location}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ 
                          color: sensor.ph !== "N/A" ? (sensor.ph >= 6.0 && sensor.ph <= 8.0 ? 'success.main' : 'warning.main') : 'text.secondary' 
                        }}>
                          {formatValue(sensor.ph)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ 
                          color: sensor.soilMoisture !== "N/A" ? (sensor.soilMoisture >= 30 ? 'success.main' : 'error.main') : 'text.secondary' 
                        }}>
                          {formatValue(sensor.soilMoisture, '%')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ 
                          color: sensor.temperature !== "N/A" ? (sensor.temperature >= 20 && sensor.temperature <= 35 ? 'success.main' : 'warning.main') : 'text.secondary' 
                        }}>
                          {formatValue(sensor.temperature, '°C')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {sensor.timestamp
                            ? new Date(sensor.timestamp).toLocaleString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : "N/A"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="outlined"
                          color={getStatusColor(sensor.status)}
                          startIcon={getStatusIcon(sensor.status)}
                          sx={{ minWidth: 120 }}
                          title={sensor.statusDescription}
                        >
                          {sensor.status}
                        </Button>
                      </TableCell>
                      <TableCell align="center">
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
      </Box>
    </Box>
  );
}

export default Sensors;