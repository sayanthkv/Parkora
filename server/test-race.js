// test-race.js
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api'; // Check your server port

// 1. Enter valid customer credentials here
const CUSTOMER_CREDENTIALS = {
  email: 'sayanth@example.com', // Replace with a real customer email from your DB
  password: 'CustomerPass123!',      // Replace with that customer's password
};

// 2. Paste valid ObjectIDs from your MongoDB
const LOCATION_ID = '6adcd41a8707de763f6f060e';
const FLOOR_ID = '6adcd41a8707de763f6f0613';
const BAY_ID = '6adcd41a8707de763f6f0620';

async function testRaceCondition() {
  try {
    console.log('1. Logging in to obtain a fresh token...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, CUSTOMER_CREDENTIALS);
    const token = loginRes.data.token;
    console.log(' Token acquired successfully.\n');

    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const payload = {
      locationId: LOCATION_ID,
      floorId: FLOOR_ID,
      bayId: BAY_ID,
      vehicleRegNumber: 'KL 13 AS 9999',
      vehicleType: 'car',
      startTime: new Date(Date.now() + 3600000).toISOString(), // 1 hr from now
      endTime: new Date(Date.now() + 7200000).toISOString(),   // 2 hrs from now
    };

    console.log('--- FIRING SIMULTANEOUS BOOKING REQUESTS ---');
    const req1 = axios.post(`${BASE_URL}/bookings`, payload, { headers });
    const req2 = axios.post(`${BASE_URL}/bookings`, payload, { headers });

    const results = await Promise.allSettled([req1, req2]);

    results.forEach((res, index) => {
      if (res.status === 'fulfilled') {
        console.log(`Request ${index + 1}: SUCCESS (Status: ${res.value.status})`);
      } else {
        console.log(
          `Request ${index + 1}: REJECTED (Status: ${res.reason.response?.status} - ${res.reason.response?.data?.message})`
        );
      }
    });

    const successCount = results.filter((r) => r.status === 'fulfilled').length;

    if (successCount === 1) {
      console.log('\n PASSED: Concurrency handled properly. Only one booking succeeded.');
    } else if (successCount > 1) {
      console.log('\n FAILED: Race condition detected! Both requests created a booking for the same bay.');
    } else {
      console.log('\n⚠️ BOTH FAILED: Check your IDs or time parameters.');
    }
  } catch (err) {
    console.error('Execution Error:', err.response?.data || err.message);
  }
}

testRaceCondition();