import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, Timestamp 
} from 'firebase/firestore';

import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
const firebaseConfig = {
  apiKey: "AIzaSyDXkFx3Zk8FyJrYSiNvEaA7kEpjKqWsZng",
  authDomain: "reforestadmin.firebaseapp.com",
  projectId: "reforestadmin",
  storageBucket: "reforestadmin.firebasestorage.app",
  messagingSenderId: "871660781866",
  appId: "1:871660781866:web:d5cf19b1ad0dd7e355de53",
  };
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
async function generateSampleData() {
  try {
    // 1. Create sample location
    const locationRef = doc(collection(db, "Location"));
    await setDoc(locationRef, {
      location_name: "Barangay Apas Site A",
      location_longitude: 123.894,
      location_latitude: 10.332,
    });

    // 2. Create sample user (planter)
    const userRef = doc(collection(db, "User"));
    await setDoc(userRef, {
      role_id: "planter", // or role doc ref if you store it that way
      user_LastName: "Dela Cruz",
      user_FirstName: "Juan",
      user_email: "juan.delacruz@example.com",
      user_password: "hashed_password_here",
    });

    // 3. Create sample planting request (accepted)
    const requestRef = doc(collection(db, "PlantingRequest"));
    await setDoc(requestRef, {
      user_id: userRef.id,
      location_id: locationRef.id,
      preferred_date: "2025-09-15",
      request_status: "Accepted",
      request_remarks: "Excited to help!",
    });

    console.log("✅ Sample data generated successfully!");
    console.log("User ID:", userRef.id);
    console.log("Location ID:", locationRef.id);
    console.log("Request ID:", requestRef.id);

  } catch (error) {
    console.error("❌ Error generating sample data:", error);
  }
}

generateSampleData();