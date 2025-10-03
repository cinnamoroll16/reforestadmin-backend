// src/pages/SensorDataDashboard.jsx
import React from 'react';
import SensorMap from '../components/SensorMap';

const SensorDataDashboard = () => {
  return (
    <div className="dashboard">
      <h1>Sensor Locations</h1>
      
      {/* Display all sensors */}
      <SensorMap />
      
      {/* Or display specific sensor */}
      {/* <SensorMap sensorId="sensor123" /> */}
    </div>
  );
};

export default SensorDataDashboard; 