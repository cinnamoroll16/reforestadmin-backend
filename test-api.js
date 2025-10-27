// test-api.js
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Configure axios to handle errors better
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  validateStatus: () => true // Don't throw on any status code
});

async function testAPI() {
  console.log('🧪 Testing ReForest API Endpoints...\n');
  console.log(`📡 Base URL: ${BASE_URL}\n`);

  let testsPassed = 0;
  let testsFailed = 0;

  // 1. Health Check
  console.log('1️⃣  Testing Health Check...');
  try {
    const response = await api.get('/health');
    if (response.status === 200) {
      console.log('✅ Health Check: PASSED');
      console.log(`   Status: ${response.data.status}`);
      console.log(`   Database: ${response.data.database}`);
      testsPassed++;
    } else {
      console.log('❌ Health Check: FAILED');
      console.log(`   Status Code: ${response.status}`);
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ Health Check: FAILED');
    console.log(`   Error: ${error.message}`);
    console.log('💡 Make sure the server is running: npm run dev');
    testsFailed++;
    return; // Exit if can't connect to server
  }

  // 2. Root Endpoint
  console.log('\n2️⃣  Testing Root Endpoint...');
  try {
    const response = await api.get('/');
    if (response.status === 200) {
      console.log('✅ Root Endpoint: PASSED');
      console.log(`   Message: ${response.data.message}`);
      console.log(`   Version: ${response.data.version}`);
      testsPassed++;
    } else {
      console.log('❌ Root Endpoint: FAILED');
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ Root Endpoint: FAILED');
    console.log(`   Error: ${error.message}`);
    testsFailed++;
  }

  // 3. Firebase Connection Test
  console.log('\n3️⃣  Testing Firebase Connection...');
  try {
    const response = await api.get('/api/auth/test-firebase');
    if (response.status === 200) {
      console.log('✅ Firebase Connection: PASSED');
      console.log(`   Firestore: ${response.data.firestore}`);
      console.log(`   Auth: ${response.data.auth}`);
      testsPassed++;
    } else {
      console.log('❌ Firebase Connection: FAILED');
      console.log(`   Status: ${response.status}`);
      console.log('💡 Check your serviceAccountKey.json file');
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ Firebase Connection: FAILED');
    console.log(`   Error: ${error.message}`);
    testsFailed++;
  }

  // 4. User Registration
  console.log('\n4️⃣  Testing User Registration...');
  const uniqueEmail = `test${Date.now()}@example.com`;
  let registeredUid = null;
  try {
    const response = await api.post('/api/auth/register', {
      email: uniqueEmail,
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      role: 'stakeholder'
    });
    
    if (response.status === 201) {
      console.log('✅ User Registration: PASSED');
      console.log(`   Email: ${uniqueEmail}`);
      console.log(`   User ID: ${response.data.user.uid}`);
      registeredUid = response.data.user.uid;
      testsPassed++;
    } else {
      console.log('❌ User Registration: FAILED');
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${response.data.error}`);
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ User Registration: FAILED');
    console.log(`   Error: ${error.message}`);
    testsFailed++;
  }

  // 5. User Login
  console.log('\n5️⃣  Testing User Login...');
  let authToken = null;
  try {
    const response = await api.post('/api/auth/login', {
      email: uniqueEmail,
      password: 'password123'
    });
    
    if (response.status === 200) {
      console.log('✅ User Login: PASSED');
      console.log(`   User: ${response.data.user.firstName} ${response.data.user.lastName}`);
      console.log(`   Role: ${response.data.user.role}`);
      authToken = response.data.customToken;
      testsPassed++;
    } else {
      console.log('❌ User Login: FAILED');
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${response.data.error}`);
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ User Login: FAILED');
    console.log(`   Error: ${error.message}`);
    testsFailed++;
  }

  // 6. Get All Users
  console.log('\n6️⃣  Testing Get Users...');
  try {
    const response = await api.get('/api/users');
    if (response.status === 200) {
      console.log('✅ Get Users: PASSED');
      console.log(`   Total Users: ${response.data.length}`);
      testsPassed++;
    } else {
      console.log('❌ Get Users: FAILED');
      console.log(`   Status: ${response.status}`);
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ Get Users: FAILED');
    console.log(`   Error: ${error.message}`);
    testsFailed++;
  }

  // 7. Get Specific User
  if (registeredUid) {
    console.log('\n7️⃣  Testing Get User by ID...');
    try {
      const response = await api.get(`/api/users/${registeredUid}`);
      if (response.status === 200) {
        console.log('✅ Get User by ID: PASSED');
        console.log(`   Name: ${response.data.user_firstname} ${response.data.user_lastname}`);
        testsPassed++;
      } else {
        console.log('❌ Get User by ID: FAILED');
        testsFailed++;
      }
    } catch (error) {
      console.log('❌ Get User by ID: FAILED');
      console.log(`   Error: ${error.message}`);
      testsFailed++;
    }
  }

  // 8. Get Locations
  console.log('\n8️⃣  Testing Get Locations...');
  try {
    const response = await api.get('/api/locations');
    if (response.status === 200) {
      console.log('✅ Get Locations: PASSED');
      console.log(`   Total Locations: ${response.data.length}`);
      if (response.data.length > 0) {
        console.log(`   Sample: ${response.data[0].location_name || 'N/A'}`);
      }
      testsPassed++;
    } else {
      console.log('❌ Get Locations: FAILED');
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ Get Locations: FAILED');
    console.log(`   Error: ${error.message}`);
    testsFailed++;
  }

  // 9. Get Sensors
  console.log('\n9️⃣  Testing Get Sensors...');
  try {
    const response = await api.get('/api/sensors');
    if (response.status === 200) {
      console.log('✅ Get Sensors: PASSED');
      console.log(`   Total Sensors: ${response.data.length}`);
      if (response.data.length > 0) {
        console.log(`   Sample: ${response.data[0].sensor_location || 'N/A'}`);
      }
      testsPassed++;
    } else {
      console.log('❌ Get Sensors: FAILED');
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ Get Sensors: FAILED');
    console.log(`   Error: ${error.message}`);
    testsFailed++;
  }

  // 10. Get Tree Seedlings
  console.log('\n🔟 Testing Get Tree Seedlings...');
  try {
    const response = await api.get('/api/tree-seedlings');
    if (response.status === 200) {
      console.log('✅ Get Tree Seedlings: PASSED');
      console.log(`   Total Seedlings: ${response.data.length}`);
      if (response.data.length > 0) {
        console.log(`   Sample: ${response.data[0].seedling_name || 'N/A'}`);
      }
      testsPassed++;
    } else {
      console.log('❌ Get Tree Seedlings: FAILED');
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ Get Tree Seedlings: FAILED');
    console.log(`   Error: ${error.message}`);
    testsFailed++;
  }

  // 11. Get Notifications
  console.log('\n1️⃣1️⃣  Testing Get Notifications...');
  try {
    const response = await api.get('/api/notifications');
    if (response.status === 200) {
      console.log('✅ Get Notifications: PASSED');
      console.log(`   Total Notifications: ${response.data.length}`);
      testsPassed++;
    } else {
      console.log('❌ Get Notifications: FAILED');
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ Get Notifications: FAILED');
    console.log(`   Error: ${error.message}`);
    testsFailed++;
  }

  // 12. Get Planting Requests
  console.log('\n1️⃣2️⃣  Testing Get Planting Requests...');
  try {
    const response = await api.get('/api/planting-requests');
    if (response.status === 200) {
      console.log('✅ Get Planting Requests: PASSED');
      console.log(`   Total Requests: ${response.data.length}`);
      testsPassed++;
    } else {
      console.log('❌ Get Planting Requests: FAILED');
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ Get Planting Requests: FAILED');
    console.log(`   Error: ${error.message}`);
    testsFailed++;
  }

  // 13. Get Recommendations
  console.log('\n1️⃣3️⃣  Testing Get Recommendations...');
  try {
    const response = await api.get('/api/recommendations');
    if (response.status === 200) {
      console.log('✅ Get Recommendations: PASSED');
      console.log(`   Total Recommendations: ${response.data.length}`);
      testsPassed++;
    } else {
      console.log('❌ Get Recommendations: FAILED');
      testsFailed++;
    }
  } catch (error) {
    console.log('❌ Get Recommendations: FAILED');
    console.log(`   Error: ${error.message}`);
    testsFailed++;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`📈 Success Rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`);
  console.log('='.repeat(50));

  if (testsFailed === 0) {
    console.log('\n🎉 All tests passed! Your backend is working perfectly!');
  } else if (testsPassed > testsFailed) {
    console.log('\n⚠️  Some tests failed, but most are working.');
    console.log('💡 Check the errors above for details.');
  } else {
    console.log('\n❌ Multiple tests failed. Check your configuration.');
    console.log('💡 Verify Firebase setup and environment variables.');
  }
}

// Run tests with error handling
testAPI().catch(error => {
  console.error('\n💥 Fatal Error:', error.message);
  console.log('💡 Make sure:');
  console.log('   1. Server is running (npm run dev)');
  console.log('   2. serviceAccountKey.json exists');
  console.log('   3. .env file is configured');
  console.log('   4. Firebase services are enabled');
  process.exit(1);
});