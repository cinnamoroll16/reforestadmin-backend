// src/components/SensorDashboard.js
import React, { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database"; 
import { rtdb } from "../firebase";  

const SensorDashboard = () => {
  const [sensors, setSensors] = useState({});

  useEffect(() => {
    // connect to Firebase root
    const sensorRef = ref(rtdb, "/");

    // listen to changes
    const unsubscribe = onValue(sensorRef, (snapshot) => {
      if (snapshot.exists()) {
        setSensors(snapshot.val());
      } else {
        setSensors({});
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div>
      <h2>🌱 Sensor Dashboard</h2>
      <pre>{JSON.stringify(sensors, null, 2)}</pre>
    </div>
  );
};

export default SensorDashboard;
