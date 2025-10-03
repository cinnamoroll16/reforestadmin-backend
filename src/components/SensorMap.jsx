// src/components/SensorMap.jsx
import React, { useState, useEffect } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import axios from 'axios';

const mapContainerStyle = {
  width: '100%',
  height: '500px'
};

const defaultCenter = {
  lat: 10.3157,  // Cebu City default
  lng: 123.8854
};

const SensorMap = ({ sensorId }) => {
  const [sensors, setSensors] = useState([]);
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [center, setCenter] = useState(defaultCenter);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSensorLocations();
  }, [sensorId]);

  const fetchSensorLocations = async () => {
    try {
      const endpoint = sensorId 
        ? `/api/sensors/${sensorId}/location`
        : '/api/sensors/locations/all';
      
      const response = await axios.get(endpoint);
      
      if (sensorId) {
        // Single sensor
        setSensors([response.data]);
        setCenter({
          lat: response.data.latitude,
          lng: response.data.longitude
        });
      } else {
        // Multiple sensors
        setSensors(response.data);
        if (response.data.length > 0) {
          setCenter({
            lat: response.data[0].latitude,
            lng: response.data[0].longitude
          });
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching sensor locations:', error);
      setLoading(false);
    }
  };

  const openInGoogleMaps = (lat, lng) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    window.open(url, '_blank');
  };

  const openInWaze = (lat, lng) => {
    const url = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
    window.open(url, '_blank');
  };

  if (loading) {
    return <div>Loading map...</div>;
  }

  return (
    <LoadScript googleMapsApiKey="AIzaSyAe2WXLg7ITw3A__xGzQv8TTNAiVPXhbsU">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={14}
      >
        {sensors.map((sensor) => (
          <Marker
            key={sensor.sensorId}
            position={{
              lat: sensor.latitude,
              lng: sensor.longitude
            }}
            onClick={() => setSelectedSensor(sensor)}
          />
        ))}

        {selectedSensor && (
          <InfoWindow
            position={{
              lat: selectedSensor.latitude,
              lng: selectedSensor.longitude
            }}
            onCloseClick={() => setSelectedSensor(null)}
          >
            <div style={{ padding: '10px' }}>
              <h3>{selectedSensor.locationName}</h3>
              <p><strong>Sensor ID:</strong> {selectedSensor.sensorId}</p>
              <p><strong>Type:</strong> {selectedSensor.sensorType}</p>
              <p><strong>Coordinates:</strong><br/>
                {selectedSensor.latitude}, {selectedSensor.longitude}
              </p>
              
              <div style={{ marginTop: '10px' }}>
                <button 
                  onClick={() => openInGoogleMaps(
                    selectedSensor.latitude, 
                    selectedSensor.longitude
                  )}
                  style={{
                    marginRight: '10px',
                    padding: '8px 16px',
                    backgroundColor: '#4285F4',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Open in Google Maps
                </button>
                
                <button 
                  onClick={() => openInWaze(
                    selectedSensor.latitude, 
                    selectedSensor.longitude
                  )}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#33CCFF',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Open in Waze
                </button>
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </LoadScript>
  );
};

export default SensorMap;