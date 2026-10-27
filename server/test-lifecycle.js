// test-lifecycle.js
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// Replace with existing IDs from your database
const LOCATION_ID = 'PASTE_ACTUAL_LOCATION_ID';
const FLOOR_ID = 'PASTE_ACTUAL_FLOOR_ID';
const BAY_ID = 'PASTE_ACTUAL_BAY_ID';

// Staff credentials belonging to the location above
const STAFF_CREDENTIALS = {
  email: 'staff.station@parkora.in',
  password: 'Password@123',
};

async function testLifecycleAndCheckIn() {
  try {
    console.log('=== TEST: CHECK-IN TIME WINDOW & LIFECYCLE GUARDS ===\n');

    // 1. Authenticate as Staff
    console.log('1. Logging in as Staff...');
    const staffLogin = await axios.post(`${BASE_URL}/auth/login`, STAFF_CREDENTIALS);
    const staffToken = staffLogin.data.token;
    const staffHeaders = {
      Authorization: `Bearer ${staffToken}`,
      'Content-Type': 'application/json',
    };
    console.log(' Staff token acquired.\n');

    // 2. Create a Customer and book a future slot (e.g., 2 hours from now)
    const testEmail = `early_${Date.now()}@parkora.in`;
    const regRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Window Tester',
      email: testEmail,
      password: 'Password@123',
      phone: '9876543210',
      vehicleRegNumber: 'KL 13 WIN 01',
      vehicleType: 'car',
    });
    const customerToken = regRes.data.token;

    // Booking starts 2 hours in the future
    const futureStart = new Date(Date.now() + 2 * 3600000);
    const futureEnd = new Date(Date.now() + 4 * 3600000);

    console.log('2. Creating reservation starting 2 hours in the future...');
    const bookRes = await axios.post(
      `${BASE_URL}/bookings`,
      {
        locationId: LOCATION_ID,
        floorId: FLOOR_ID,
        bayId: BAY_ID,
        vehicleRegNumber: 'KL 13 WIN 01',
        vehicleType: 'car',
        startTime: futureStart.toISOString(),
        endTime: futureEnd.toISOString(),
      },
      { headers: { Authorization: `Bearer ${customerToken}` } }
    );

    const bookingId = bookRes.data.data._id;
    const bookingRef = bookRes.data.data.bookingRef;
    const qrTicketPayload = bookRes.data.data.qrTicketPayload;
    console.log(` Booking created: ${bookingRef} (ID: ${bookingId})\n`);

    // 3. Attempt early check-in via staff verification endpoint
    console.log('3. Attempting to verify/check-in early (more than 15 minutes before start)...');
    const verifyRes = await axios.post(
      `${BASE_URL}/staff/verify`,
      { qrTicketPayload },
      { headers: staffHeaders }
    );

    if (verifyRes.data.isValid === false && verifyRes.data.message?.includes('Too early')) {
      console.log(` PASSED: Verification rejected early arrival: "${verifyRes.data.message}"\n`);
    } else {
      console.log(`⚠️ UNEXPECTED RESPONSE: isValid=${verifyRes.data.isValid}, message="${verifyRes.data.message}"\n`);
    }

    // 4. Test actual check-in endpoint early rejection
    console.log('4. Attempting to force check-in early via POST /api/staff/check-in/:bookingId...');
    try {
      await axios.post(
        `${BASE_URL}/staff/check-in/${bookingId}`,
        {},
        { headers: staffHeaders }
      );
      console.log('❌ FAILED: Early check-in was permitted!\n');
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.message?.includes('Too early')) {
        console.log(` PASSED: Check-in blocked with status 400: "${err.response.data.message}"\n`);
      } else {
        console.log(`⚠️ Status: ${err.response?.status} - ${err.response?.data?.message}\n`);
      }
    }

    console.log('=== TEST COMPLETED ===');
  } catch (error) {
    console.error('Execution Error:', error.response?.data || error.message);
  }
}

testLifecycleAndCheckIn();