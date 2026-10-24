import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import express from 'express';
import dotenv from 'dotenv';
import dns from 'dns';

// Force DNS lookup for MongoDB Atlas
dns.setServers(['8.8.8.8', '8.8.4.4']);
dotenv.config();

const authRoutes = require('../routes/authRoutes');
const locationRoutes = require('../routes/locationRoutes');
const bookingRoutes = require('../routes/bookingRoutes');
const staffRoutes = require('../routes/staffRoutes');
const errorHandler = require('../middleware/errorHandler');

const User = require('../models/User');
const ParkingLocation = require('../models/ParkingLocation');
const Floor = require('../models/Floor');
const ParkingBay = require('../models/ParkingBay');
const Booking = require('../models/Booking');

// Initialize Test Express Application
const app = express();
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/staff', staffRoutes);
app.use(errorHandler);

describe('Parkora Backend API Test Suite', () => {
  let customerToken;
  let staffToken;
  let testLocation;
  let testFloor;
  let testBay;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    // Clean up test collections
    await User.deleteMany({ email: /test.*@parkora\.in/ });
    await Booking.deleteMany({});
    await ParkingLocation.deleteMany({ slug: 'test-facility' });
    await Floor.deleteMany({});
    await ParkingBay.deleteMany({});

    // Seed test facility, floor, and bay
    testLocation = await ParkingLocation.create({
      name: 'Test Facility',
      slug: 'test-facility',
      address: { street: 'Test St', area: 'Kannur', city: 'Kannur' },
      coordinates: { lat: 11.8, lng: 75.3 },
      pricing: { hourlyRate: 30, baseRate: 20 },
      supportedVehicleTypes: ['car', 'bike'],
    });

    testFloor = await Floor.create({
      location: testLocation._id,
      name: 'Ground Floor',
      level: 0,
    });

    testBay = await ParkingBay.create({
      location: testLocation._id,
      floor: testFloor._id,
      bayNumber: 'TEST-01',
      supportedVehicleType: 'car',
    });
  });

  afterAll(async () => {
    // Clean up created resources and disconnect DB
    await User.deleteMany({ email: /test.*@parkora\.in/ });
    await Booking.deleteMany({});
    await ParkingLocation.deleteMany({ slug: 'test-facility' });
    await Floor.deleteMany({});
    await ParkingBay.deleteMany({});
    await mongoose.connection.close();
  });

  // ----------------------------------------------------
  // 1. AUTHENTICATION & AUTHORIZATION TESTS
  // ----------------------------------------------------
  describe('Authentication & Registration', () => {
    it('should register a new customer account and return a valid JWT token', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test Customer',
          email: 'test.customer@parkora.in',
          password: 'TestPassword123!',
          phone: '+91 9999988888',
          vehicleRegNumber: 'KL 13 TEST 01',
          vehicleType: 'car',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();

      customerToken = res.body.token;
    });

    it('should reject unauthenticated access to protected booking routes', async () => {
      const res = await request(app).get('/api/bookings/my');
      expect(res.status).toBe(401);
    });
  });

  // ----------------------------------------------------
  // 2. CONCURRENCY & OVERLAP PREVENTION TESTS
  // ----------------------------------------------------
  describe('Booking Engine & Overlap Conflict Prevention', () => {
    const startTime = new Date(Date.now() + 3600 * 1000).toISOString(); // +1 hr from now
    const endTime = new Date(Date.now() + 3 * 3600 * 1000).toISOString(); // +3 hrs from now

    it('should successfully create an initial reservation', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          locationId: testLocation._id,
          floorId: testFloor._id,
          bayId: testBay._id,
          vehicleRegNumber: 'KL 13 TEST 01',
          vehicleType: 'car',
          startTime,
          endTime,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bookingRef).toBeDefined();
    });

    it('should reject an overlapping booking request for the same bay (Double-booking protection)', async () => {
      // Create an overlapping interval: +2 hrs to +4 hrs (overlaps with +1 hr to +3 hrs)
      const overlappingStart = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
      const overlappingEnd = new Date(Date.now() + 4 * 3600 * 1000).toISOString();

      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          locationId: testLocation._id,
          floorId: testFloor._id,
          bayId: testBay._id,
          vehicleRegNumber: 'KL 13 OVERLAP 02',
          vehicleType: 'car',
          startTime: overlappingStart,
          endTime: overlappingEnd,
        });

      expect(res.status).toBe(409); // 409 Conflict
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('reserved for the requested time range');
    });
  });
});