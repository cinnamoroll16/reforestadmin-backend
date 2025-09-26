import { initializeApp } from "firebase/app";
import { 
  getFirestore, doc, setDoc, collection 
} from "firebase/firestore";

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

// Your JSON seed data
const seedData = {
  users: {
    u12345: {
      user_lastname: "Dano",
      user_firstname: "Mary Jessa",
      user_email: "maryjessadano16@gmail.com",
      roleRef: "/roles/volunteer",
      user_password: "hashed_password"
    },
    u12346: {
      user_lastname: "Corbita",
      user_firstname: "Sandarra",
      user_email: "sandarra@example.com",
      roleRef: "/roles/admin",
      user_password: "hashed_password"
    }
  },

  roles: {
    volunteer: { role_name: "Volunteer" },
    admin: { role_name: "Administrator" },
    denr: { role_name: "DENR Officer" }
  },

  locations: {
    locA: {
      location_name: "Barangay Apas",
      location_longitude: "123.4567",
      location_latitude: "10.3210"
    }
  },

  sensors: {
    s101: {
      sensor_location: "/locations/locA",
      sensor_status: "active",
      sensor_lastCalibrationDate: "2025-09-01",
      sensordata: {
        data_001: {
          soilMoisture: 25.5,
          temperature: 29.3,
          pH: 6.7,
          timestamp: "2025-09-24T12:35:31Z"
        },
        data_002: {
          soilMoisture: 26.1,
          temperature: 28.9,
          pH: 6.6,
          timestamp: "2025-09-24T13:05:10Z"
        }
      }
    }
  },

  treeseedlings: {
    ts001: {
      seedling_scientificName: "Acacia mangium",
      seedling_commonName: "Mangium",
      seedling_prefMoisture: 24.0,
      seedling_prefTemp: 28.0,
      seedling_prefpH: 6.5,
      seedling_isNative: false
    },
    ts002: {
      seedling_scientificName: "Dipterocarpus grandiflorus",
      seedling_commonName: "Apitong",
      seedling_prefMoisture: 27.0,
      seedling_prefTemp: 29.0,
      seedling_prefpH: 6.0,
      seedling_isNative: true
    }
  },

  recommendations: {
    reco001: {
      sensorDataRef: "/sensors/s101/sensordata/data_001",
      locationRef: "/locations/locA",
      seedlingOptions: ["/treeseedlings/ts001", "/treeseedlings/ts002"],
      reco_confidenceScore: 0.92,
      reco_generatedAt: "2025-09-24T12:40:00Z"
    }
  },

  plantingtasks: {
    task001: {
      reqRef: "/plantingrequests/P0e9z8HVuPcA067emaYx",
      recoRef: "/recommendations/reco001",
      locationRef: "/locations/locA",
      task_status: "assigned",
      task_date: "2025-09-25",
      taskapprovedby: "/users/u12345"
    }
  },

  plantingrecords: {
    record001: {
      userRef: "/users/u12345",
      locationRef: "/locations/locA",
      seedlingRef: "/treeseedlings/ts002",
      record_date: "2025-09-25"
    }
  },

  plantingrequests: {
    req001: {
      userRef: "/users/u12345",
      locationRef: "/locations/locA",
      preferred_date: "2025-09-30",
      request_status: "pending",
      request_notes: "Requesting Apitong seedlings for Apas site.",
      request_date: "2025-09-24"
    }
  },

  notifications: {
    notif001: {
      userRef: "/users/u12345",
      taskRef: "/plantingtasks/0C95Ioeti2gPvqBVIcBZ",
      notif_message: "Your planting task has been assigned.",
      notif_timestamp: "2025-09-24T12:45:00Z",
      notification_type: "assigned"
    },
    notif002: {
      userRef: "/users/u12345",
      reqRef: "/plantingrequests/P0e9z8HVuPcA067emaYx",
      notif_message: "Your planting task has been assigned.",
      notif_timestamp: "2025-09-24T12:45:00Z",
      notification_type: "request"
    }
  }
};

async function generateSampleData() {
  try {
    // Loop over collections
    for (const [collectionName, docs] of Object.entries(seedData)) {
      for (const [docId, docData] of Object.entries(docs)) {
        const { sensordata, ...mainData } = docData;
        const docRef = doc(db, collectionName, docId);

        // Save main doc
        await setDoc(docRef, mainData);

        // If sensor has nested sensordata, save it as a subcollection
        if (sensordata) {
          for (const [subId, subData] of Object.entries(sensordata)) {
            const subRef = doc(collection(docRef, "sensordata"), subId);
            await setDoc(subRef, subData);
          }
        }
      }
    }
    console.log("✅ All seed data uploaded with correct collection names!");
  } catch (error) {
    console.error("❌ Error uploading seed data:", error);
  }
}

generateSampleData();