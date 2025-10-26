const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testAPI() {
  try {
    console.log('🧪 Testing ReForest API Endpoints...\n');

    // 1. Health Check
    console.log('1. Testing Health Check...');
    try {
      const healthResponse = await axios.get(`${BASE_URL}/health`);
      console.log('✅ Health Check:', healthResponse.data.status);
      console.log('   Database:', healthResponse.data.database);
    } catch (error) {
      console.log('❌ Health Check failed - server might not be running');
      console.log('💡 Run: npm run dev');
      return;
    }

    // 2. Test Firebase Connection
    console.log('\n2. Testing Firebase Connection...');
    try {
      const firebaseTest = await axios.get(`${BASE_URL}/api/auth/test-firebase`);
      console.log('✅ Firebase Connection:', firebaseTest.data);
    } catch (error) {
      console.log('❌ Firebase connection failed');
      console.log('💡 Check serviceAccountKey.json and Firebase configuration');
    }

    // 3. User Registration (with unique email)
    console.log('\n3. Testing User Registration...');
    const uniqueEmail = `test${Date.now()}@example.com`;
    try {
      const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, {
        email: uniqueEmail,
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: 'stakeholder'
      });
      console.log('✅ Registration Successful:', registerResponse.data.message);
      console.log('   User ID:', registerResponse.data.user.uid);
    } catch (error) {
      console.log('❌ Registration failed:', error.response?.data?.error || error.message);
    }

    // 4. Get Users
    console.log('\n4. Testing Get Users...');
    try {
      const usersResponse = await axios.get(`${BASE_URL}/api/users`);
      console.log('✅ Users count:', usersResponse.data.length);
    } catch (error) {
      console.log('❌ Get Users failed:', error.response?.data?.error || error.message);
    }

    // 5. Get Locations
    console.log('\n5. Testing Get Locations...');
    try {
      const locationsResponse = await axios.get(`${BASE_URL}/api/locations`);
      console.log('✅ Locations count:', locationsResponse.data.length);
    } catch (error) {
      console.log('❌ Get Locations failed:', error.response?.data?.error || error.message);
    }

    // 6. Get Tree Seedlings
    console.log('\n6. Testing Get Tree Seedlings...');
    try {
      const seedlingsResponse = await axios.get(`${BASE_URL}/api/tree-seedlings`);
      console.log('✅ Tree Seedlings count:', seedlingsResponse.data.length);
    } catch (error) {
      console.log('❌ Get Tree Seedlings failed:', error.response?.data?.error || error.message);
    }

    console.log('\n🎉 API testing completed!');

  } catch (error) {
    console.error('❌ API Test Error:', error.message);
  }
}

testAPI();