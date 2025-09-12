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

// Sample data for planting requests
const generatePlantingRequests = async () => {
  const requests = [
    {
      request_id: "REQ001",
      user_id: "user_12345",
      location_id: "LOC_NorthForest",
      preferred_date: "2023-10-15",
      request_status: "pending",
      request_remarks: "Looking to plant native oak trees in the northern section. Soil testing completed last month.",
      request_date: Timestamp.fromDate(new Date(2023, 8, 10)) // Sept 10, 2023
    },
    {
      request_id: "REQ002",
      user_id: "user_23456",
      location_id: "LOC_SouthMeadow",
      preferred_date: "2023-10-20",
      request_status: "pending",
      request_remarks: "Requesting permission to plant pine seedlings in the south meadow area. Preparing for winter season.",
      request_date: Timestamp.fromDate(new Date(2023, 8, 12)) // Sept 12, 2023
    },
    {
      request_id: "REQ003",
      user_id: "user_34567",
      location_id: "LOC_EastHills",
      preferred_date: "2023-10-25",
      request_status: "pending",
      request_remarks: "Planning to plant maple trees on the eastern hills. This area was affected by last year's storm.",
      request_date: Timestamp.fromDate(new Date(2023, 8, 15)) // Sept 15, 2023
    },
    {
      request_id: "REQ004",
      user_id: "user_45678",
      location_id: "LOC_WestValley",
      preferred_date: "2023-11-05",
      request_status: "pending",
      request_remarks: "Proposing to plant mixed species in the west valley to improve biodiversity.",
      request_date: Timestamp.fromDate(new Date(2023, 8, 18)) // Sept 18, 2023
    },
    {
      request_id: "REQ005",
      user_id: "user_56789",
      location_id: "LOC_CentralPark",
      preferred_date: "2023-11-10",
      request_status: "pending",
      request_remarks: "Community initiative to plant flowering trees in the central park area.",
      request_date: Timestamp.fromDate(new Date(2023, 8, 20)) // Sept 20, 2023
    },
    {
      request_id: "REQ006",
      user_id: "user_67890",
      location_id: "LOC_Riverbank",
      preferred_date: "2023-11-15",
      request_status: "approved",
      request_remarks: "Willow tree planting along the riverbank to prevent erosion. Approved by environmental committee.",
      request_date: Timestamp.fromDate(new Date(2023, 8, 5)) // Sept 5, 2023
    },
    {
      request_id: "REQ007",
      user_id: "user_78901",
      location_id: "LOC_MountainSlope",
      preferred_date: "2023-11-20",
      request_status: "rejected",
      request_remarks: "Proposed planting on unstable mountain slope. Requires further geological assessment.",
      request_date: Timestamp.fromDate(new Date(2023, 8, 8)) // Sept 8, 2023
    },
    {
      request_id: "REQ008",
      user_id: "user_89012",
      location_id: "LOC_LakeView",
      preferred_date: "2023-10-30",
      request_status: "pending",
      request_remarks: "Planting ornamental trees around the lake viewing area for beautification project.",
      request_date: Timestamp.fromDate(new Date(2023, 8, 22)) // Sept 22, 2023
    },
    {
      request_id: "REQ009",
      user_id: "user_90123",
      location_id: "LOC_OldGrowth",
      preferred_date: "2023-11-25",
      request_status: "pending",
      request_remarks: "Replanting in the old growth forest area that was selectively logged last year.",
      request_date: Timestamp.fromDate(new Date(2023, 8, 25)) // Sept 25, 2023
    },
    {
      request_id: "REQ010",
      user_id: "user_01234",
      location_id: "LOC_Wetlands",
      preferred_date: "2023-12-01",
      request_status: "pending",
      request_remarks: "Planting water-tolerant species in the wetlands restoration zone.",
      request_date: Timestamp.fromDate(new Date(2023, 8, 28)) // Sept 28, 2023
    }
  ];

  try {
    for (const request of requests) {
      const docRef = await addDoc(collection(db, 'PlantingRequest'), request);
      console.log('Document written with ID: ', docRef.id);
    }
    console.log('All planting requests added successfully!');
  } catch (error) {
    console.error('Error adding documents: ', error);
  }
};

// Execute the function
generatePlantingRequests();