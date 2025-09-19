
// seedData.js - Node.js script to seed Firestore using Firebase v9 SDK
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getDatabase, ref, set } from 'firebase/database';
const firebaseConfig = {
  apiKey: "AIzaSyDXkFx3Zk8FyJrYSiNvEaA7kEpjKqWsZng",
  authDomain: "reforestadmin.firebaseapp.com",
  projectId: "reforestadmin",
  storageBucket: "reforestadmin.firebasestorage.app",
  messagingSenderId: "871660781866",
  appId: "1:871660781866:web:d5cf19b1ad0dd7e355de53",
  };
// Initialize Firebase

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const rtdb = getDatabase(app);

async function seedTestData() {
  try {
    console.log('🌱 Starting data seeding...');

    // 1. Create Users
    const users = [
      {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        role: 'user',
        createdAt: serverTimestamp()
      },
      {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        role: 'user',
        createdAt: serverTimestamp()
      },
      {
        firstName: 'Mike',
        lastName: 'Johnson',
        email: 'mike.johnson@example.com',
        role: 'user',
        createdAt: serverTimestamp()
      },
      {
        firstName: 'Sarah',
        lastName: 'Wilson',
        email: 'sarah.wilson@example.com',
        role: 'user',
        createdAt: serverTimestamp()
      },
      {
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@reforest.com',
        role: 'admin',
        createdAt: serverTimestamp()
      }
    ];

    const userIds = [];
    for (let i = 0; i < users.length; i++) {
      const userId = `user_${String(i + 1).padStart(3, '0')}`;
      await setDoc(doc(db, 'users', userId), users[i]);
      userIds.push(userId);
      console.log(`✅ User added: ${users[i].email}`);
    }

    // 2. Create Locations
    const locations = [
      {
        location_name: 'Central Park Forest Reserve',
        location_address: '123 Central Park Ave, Green City, GC 12345',
        location_coordinates: { lat: 14.5995, lng: 120.9842 },
        location_description: 'Dense forest area perfect for native tree planting',
        createdAt: serverTimestamp()
      },
      {
        location_name: 'Riverside Mangrove Sanctuary',
        location_address: '456 River Road, Eco Town, ET 67890',
        location_coordinates: { lat: 14.6349, lng: 121.0290 },
        location_description: 'Coastal area ideal for mangrove restoration',
        createdAt: serverTimestamp()
      },
      {
        location_name: 'Mountain Ridge Conservation Area',
        location_address: '789 Mountain View Dr, Highland, HL 11111',
        location_coordinates: { lat: 14.5701, lng: 121.0589 },
        location_description: 'High altitude preservation zone for endemic species',
        createdAt: serverTimestamp()
      },
      {
        location_name: 'Coastal Wetlands Preserve',
        location_address: '321 Beach Access Rd, Coastville, CV 22222',
        location_coordinates: { lat: 14.6037, lng: 120.9618 },
        location_description: 'Protected wetland area for coastal restoration',
        createdAt: serverTimestamp()
      },
      {
        location_name: 'Urban Green Space Initiative',
        location_address: '555 City Center Blvd, Metro City, MC 33333',
        location_coordinates: { lat: 14.5886, lng: 121.0148 },
        location_description: 'Urban reforestation project in the city center',
        createdAt: serverTimestamp()
      }
    ];

    const locationIds = [];
    for (let i = 0; i < locations.length; i++) {
      const locationId = `loc_${String(i + 1).padStart(3, '0')}`;
      await setDoc(doc(db, 'Location', locationId), locations[i]);
      locationIds.push(locationId);
      console.log(`✅ Location added: ${locations[i].location_name}`);
    }

    // 3. Create Planting Requests
    const requests = [
      {
        user_id: userIds[0],
        location_id: locationIds[0],
        preferred_date: '2024-12-25',
        request_status: 'pending',
        request_remarks: 'Looking forward to planting during the holidays. Would prefer morning schedule.',
        userEmail: users[0].email,
        location_name: locations[0].location_name,
        created_at: serverTimestamp()
      },
      {
        user_id: userIds[1],
        location_id: locationIds[1],
        preferred_date: '2024-12-30',
        request_status: 'pending',
        request_remarks: 'Interested in mangrove restoration. Can bring 5 volunteers.',
        userEmail: users[1].email,
        location_name: locations[1].location_name,
        created_at: serverTimestamp()
      },
      {
        user_id: userIds[2],
        location_id: locationIds[2],
        preferred_date: '2025-01-15',
        request_status: 'pending',
        request_remarks: 'Passionate about mountain conservation. Have experience with endemic species.',
        userEmail: users[2].email,
        location_name: locations[2].location_name,
        created_at: serverTimestamp()
      },
      {
        user_id: userIds[3],
        location_id: locationIds[3],
        preferred_date: '2025-01-10',
        request_status: 'pending',
        request_remarks: 'Part of university environmental club. Can coordinate with 20 students.',
        userEmail: users[3].email,
        location_name: locations[3].location_name,
        created_at: serverTimestamp()
      },
      {
        user_id: userIds[0],
        location_id: locationIds[4],
        preferred_date: '2024-12-20',
        request_status: 'approved',
        request_remarks: 'Urban reforestation is crucial for air quality.',
        userEmail: users[0].email,
        location_name: locations[4].location_name,
        approved_at: serverTimestamp(),
        created_at: serverTimestamp()
      },
      {
        user_id: userIds[1],
        location_id: locationIds[0],
        preferred_date: '2024-12-18',
        request_status: 'rejected',
        request_remarks: 'Unfortunately cannot make it due to weather concerns.',
        userEmail: users[1].email,
        location_name: locations[0].location_name,
        rejected_at: serverTimestamp(),
        created_at: serverTimestamp()
      }
    ];

    const requestIds = [];
    for (const request of requests) {
      const docRef = await addDoc(collection(db, 'PlantingRequest'), request);
      requestIds.push(docRef.id);
      console.log(`✅ Request added: ${request.userEmail} at ${request.location_name}`);
    }

    // 4. Create Admin Notifications
    const notifications = [
      {
        type: 'plant_request',
        title: 'New Planting Request',
        message: 'New planting request from john.doe@example.com at Central Park Forest Reserve',
        data: {
          plantRequestId: requestIds[0],
          userId: userIds[0],
          locationId: locationIds[0],
          preferredDate: '2024-12-25'
        },
        targetRole: 'admin',
        read: false,
        resolved: false,
        priority: 'medium',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        type: 'plant_request',
        title: 'New Planting Request',
        message: 'New planting request from jane.smith@example.com at Riverside Mangrove Sanctuary',
        data: {
          plantRequestId: requestIds[1],
          userId: userIds[1],
          locationId: locationIds[1],
          preferredDate: '2024-12-30'
        },
        targetRole: 'admin',
        read: false,
        resolved: false,
        priority: 'medium',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        type: 'plant_request',
        title: 'New Planting Request',
        message: 'New planting request from mike.johnson@example.com at Mountain Ridge Conservation Area',
        data: {
          plantRequestId: requestIds[2],
          userId: userIds[2],
          locationId: locationIds[2],
          preferredDate: '2025-01-15'
        },
        targetRole: 'admin',
        read: false,
        resolved: false,
        priority: 'medium',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        type: 'sensor_alert',
        title: 'Sensor Alert - HIGH',
        message: 'Abnormal pH level (9.2) detected at sensor SENSOR001 in Central Park',
        data: {
          sensorId: 'SENSOR001',
          parameter: 'pH',
          value: 9.2,
          severity: 'high',
          alertType: 'reading'
        },
        targetRole: 'admin',
        read: false,
        resolved: false,
        priority: 'high',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        type: 'sensor_alert',
        title: 'Sensor Alert - HIGH',
        message: 'Low soil moisture (15%) detected at sensor SENSOR002 in Riverside area',
        data: {
          sensorId: 'SENSOR002',
          parameter: 'moisture',
          value: 15,
          severity: 'high',
          alertType: 'reading'
        },
        targetRole: 'admin',
        read: true,
        resolved: false,
        priority: 'high',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        type: 'sensor_alert',
        title: 'Sensor Alert - MEDIUM',
        message: 'High temperature (38°C) detected at sensor SENSOR003 in Mountain area',
        data: {
          sensorId: 'SENSOR003',
          parameter: 'temperature',
          value: 38,
          severity: 'medium',
          alertType: 'reading'
        },
        targetRole: 'admin',
        read: false,
        resolved: false,
        priority: 'medium',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        type: 'sensor_alert',
        title: 'Sensor Alert - HIGH',
        message: 'Sensor SENSOR004 has been offline for more than 24 hours',
        data: {
          sensorId: 'SENSOR004',
          severity: 'high',
          alertType: 'offline'
        },
        targetRole: 'admin',
        read: false,
        resolved: false,
        priority: 'high',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        type: 'request_approved',
        title: 'Planting Request Approved',
        message: 'Your planting request for Urban Green Space has been approved!',
        data: {
          plantRequestId: requestIds[4],
          approvalNotes: 'Excellent initiative for urban air quality improvement'
        },
        targetUserId: userIds[0],
        read: false,
        resolved: false,
        priority: 'medium',
        createdAt: serverTimestamp()
      }
    ];

    for (const notification of notifications) {
      await addDoc(collection(db, 'Notifications'), notification);
      console.log(`✅ Notification added: ${notification.title}`);
    }

    // 5. Create Planting Records
    const records = [
      {
        record_id: 'REC-' + Date.now() + '-001',
        user_id: userIds[0],
        location_id: locationIds[4],
        seedling_id: null,
        record_datePlanted: new Date('2024-12-20'),
        created_at: serverTimestamp(),
        status: 'planted',
        request_id: requestIds[4]
      },
      {
        record_id: 'REC-' + Date.now() + '-002',
        user_id: userIds[1],
        location_id: locationIds[1],
        seedling_id: null,
        record_datePlanted: new Date('2024-12-15'),
        created_at: serverTimestamp(),
        status: 'planted',
        request_id: 'historical_req_001'
      }
    ];

    for (const record of records) {
      await addDoc(collection(db, 'PlantingRecord'), record);
      console.log(`✅ Record added: ${record.record_id}`);
    }

    // 6. Create Sensor Data in Realtime Database
    const sensorData = {
      sensors: {
        SENSOR001: {
          location: "Central Park Forest Reserve",
          sensorData: {
            "2024-12-19-14-00": {
              timestamp: "2024-12-19T14:00:00Z",
              pH: 9.2,
              soilMoisture: 45,
              temperature: 28,
              humidity: 65
            },
            "2024-12-19-14-15": {
              timestamp: "2024-12-19T14:15:00Z",
              pH: 9.1,
              soilMoisture: 44,
              temperature: 29,
              humidity: 66
            }
          }
        },
        SENSOR002: {
          location: "Riverside Mangrove Sanctuary",
          sensorData: {
            "2024-12-19-14-00": {
              timestamp: "2024-12-19T14:00:00Z",
              pH: 7.2,
              soilMoisture: 15,
              temperature: 32,
              humidity: 75
            },
            "2024-12-19-14-15": {
              timestamp: "2024-12-19T14:15:00Z",
              pH: 7.1,
              soilMoisture: 14,
              temperature: 33,
              humidity: 74
            }
          }
        },
        SENSOR003: {
          location: "Mountain Ridge Conservation Area",
          sensorData: {
            "2024-12-19-14-00": {
              timestamp: "2024-12-19T14:00:00Z",
              pH: 6.8,
              soilMoisture: 35,
              temperature: 38,
              humidity: 55
            }
          }
        }
      }
    };

    await set(ref(rtdb, 'sensors'), sensorData);
    console.log('✅ Sensor data added to Realtime Database');

    console.log('🎉 Data seeding completed successfully!');
    console.log('📊 Summary:');
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Locations: ${locations.length}`);
    console.log(`   - Requests: ${requests.length}`);
    console.log(`   - Notifications: ${notifications.length}`);
    console.log(`   - Records: ${records.length}`);
    console.log(`   - Sensors: 3`);

    process.exit(0);

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

// Run the seeder
seedTestData();