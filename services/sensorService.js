// services/sensorService.js
import { firestore, rtdb } from '../config/firebase.js';
import { collection, doc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';

export class SensorService {
  
  /**
   * Get all sensors with their latest readings
   */
  static async getAllSensors() {
    try {
      const sensorsSnapshot = await getDocs(collection(firestore, 'sensors'));
      const sensors = [];
      
      for (const sensorDoc of sensorsSnapshot.docs) {
        const sensorData = sensorDoc.data();
        
        // Get latest readings
        const readingsQuery = query(
          collection(firestore, `sensors/${sensorDoc.id}/readings`),
          orderBy('timestamp', 'desc'),
          limit(1)
        );
        
        const readingsSnapshot = await getDocs(readingsQuery);
        let latestReading = null;
        
        if (!readingsSnapshot.empty) {
          latestReading = readingsSnapshot.docs[0].data();
        }
        
        sensors.push({
          id: sensorDoc.id,
          ...sensorData,
          latestReading,
          lastUpdated: latestReading?.timestamp || sensorData.createdAt
        });
      }
      
      return sensors;
    } catch (error) {
      console.error('Error fetching sensors:', error);
      throw error;
    }
  }
  
  /**
   * Get sensor by ID with historical data
   */
  static async getSensorById(sensorId, limitReadings = 50) {
    try {
      const sensorDoc = await getDocs(doc(firestore, 'sensors', sensorId));
      
      if (!sensorDoc.exists()) {
        throw new Error(`Sensor ${sensorId} not found`);
      }
      
      const sensorData = sensorDoc.data();
      
      // Get historical readings
      const readingsQuery = query(
        collection(firestore, `sensors/${sensorId}/readings`),
        orderBy('timestamp', 'desc'),
        limit(limitReadings)
      );
      
      const readingsSnapshot = await getDocs(readingsQuery);
      const readings = readingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return {
        id: sensorDoc.id,
        ...sensorData,
        readings,
        latestReading: readings[0] || null
      };
    } catch (error) {
      console.error(`Error fetching sensor ${sensorId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get real-time sensor data from RTDB
   */
  static async getRealtimeSensorData(sensorId) {
    try {
      // Implementation for real-time database access
      // This would depend on your RTDB structure
      return null; // Implement based on your RTDB structure
    } catch (error) {
      console.error(`Error fetching real-time data for ${sensorId}:`, error);
      throw error;
    }
  }
}