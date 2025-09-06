// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";
const firebaseConfig = {
  apiKey: "AIzaSyDXkFx3Zk8FyJrYSiNvEaA7kEpjKqWsZng",
  authDomain: "reforestadmin.firebaseapp.com",
  databaseURL: "https://reforestadmin-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "reforestadmin",
  storageBucket: "reforestadmin.firebasestorage.app",
  messagingSenderId: "871660781866",
  appId: "1:871660781866:web:d5cf19b1ad0dd7e355de53",
  measurementId: "G-HRTGNJHLF1"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const firestore = getFirestore(app);   // ✅ Firestore
export const rtdb = getDatabase(app);         // ✅ Realtime Database

export default app;