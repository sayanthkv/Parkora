// const mongoose = require('mongoose');
// const dotenv = require('dotenv');
// const dns = require('dns');

// dns.setServers(['8.8.8.8', '8.8.4.4']);
// dotenv.config({ path: __dirname + '/../.env' });

// const User = require('../models/User');
// const ParkingLocation = require('../models/ParkingLocation');
// const Floor = require('../models/Floor');
// const ParkingBay = require('../models/ParkingBay');
// const Booking = require('../models/Booking');
// const ParkingEvent = require('../models/ParkingEvent');

// const seedDatabase = async () => {
//   try {
//     console.log('[Seed]: Connecting to MongoDB...');
//     await mongoose.connect(process.env.MONGO_URI);
//     console.log('[Seed]: Database connected successfully.');

//     console.log('[Seed]: Clearing existing collections...');
//     await User.deleteMany({});
//     await ParkingLocation.deleteMany({});
//     await Floor.deleteMany({});
//     await ParkingBay.deleteMany({});
//     await Booking.deleteMany({});
//     await ParkingEvent.deleteMany({});

//     console.log('[Seed]: Creating admin, staff, and customer accounts...');
//     await User.create({
//       name: 'Kannur Admin',
//       email: 'admin@parkora.in',
//       passwordHash: 'AdminPass123!',
//       phone: '+91 9876543210',
//       role: 'admin',
//     });

//     await User.create({
//       name: 'Sayanth KV',
//       email: 'sayanth@example.com',
//       passwordHash: 'CustomerPass123!',
//       phone: '+91 9876500000',
//       role: 'customer',
//       vehicles: [
//         { regNumber: 'KL 13 AS 1234', vehicleType: 'car', isDefault: true },
//         { regNumber: 'KL 13 BT 5678', vehicleType: 'bike', isDefault: false },
//       ],
//     });

//     console.log('[Seed]: Creating Kannur parking locations...');
//     const locationsData = [
//       {
//         name: 'Kannur Railway Station Parking Complex',
//         slug: 'kannur-railway-station',
//         address: { street: 'Station Road', area: 'Thavakkara', city: 'Kannur', state: 'Kerala', pincode: '670001' },
//         coordinates: { lat: 11.8689, lng: 75.3725 },
//         description: 'Multi-level dedicated station parking complex with CCTV surveillance and fast EV charging hubs.',
//         operatingHours: { is24x7: true },
//         amenities: ['CCTV', 'EV Charging', 'Covered Parking', 'Security Guard', '24/7 Access'],
//         supportedVehicleTypes: ['car', 'bike', 'ev'],
//         pricing: { hourlyRate: 25, baseRate: 0, baseHours: 1, gracePeriodMinutes: 15 },
//         isActive: true,
//       },
//       {
//         name: 'Kannur Central Bus Terminal',
//         slug: 'kannur-central-bus-terminal',
//         address: { street: 'Thavakkara Road', area: 'Thavakkara', city: 'Kannur', state: 'Kerala', pincode: '670002' },
//         coordinates: { lat: 11.8722, lng: 75.3751 },
//         description: 'Convenient transit parking facility located directly adjacent to Thavakkara Bus Stand.',
//         operatingHours: { is24x7: true },
//         amenities: ['CCTV', 'Security Guard', 'Covered Parking'],
//         supportedVehicleTypes: ['car', 'bike'],
//         pricing: { hourlyRate: 20, baseRate: 0, baseHours: 1, gracePeriodMinutes: 10 },
//         isActive: true,
//       },
//       {
//         name: 'Payyambalam Beach Visitor Parking',
//         slug: 'payyambalam-beach-parking',
//         address: { street: 'Beach Road', area: 'Payyambalam', city: 'Kannur', state: 'Kerala', pincode: '670001' },
//         coordinates: { lat: 11.8681, lng: 75.3534 },
//         description: 'Open-air coastal tourist facility ideal for beach visitors and weekend sunset parking.',
//         operatingHours: { is24x7: false, openTime: '05:00', closeTime: '22:00' },
//         amenities: ['CCTV', 'Lighting', 'Accessible Bay'],
//         supportedVehicleTypes: ['car', 'bike'],
//         pricing: { hourlyRate: 15, baseRate: 0, baseHours: 1, gracePeriodMinutes: 15 },
//         isActive: true,
//       },
//       {
//         name: 'Kannur District Hospital Parking Area',
//         slug: 'kannur-district-hospital',
//         address: { street: 'Hospital Road', area: 'Akkara', city: 'Kannur', state: 'Kerala', pincode: '670012' },
//         coordinates: { lat: 11.8745, lng: 75.3688 },
//         description: 'Dedicated patient and emergency visitor parking with fast-track medical access slots.',
//         operatingHours: { is24x7: true },
//         amenities: ['CCTV', 'Accessible Bay', 'Wheelchair Access'],
//         supportedVehicleTypes: ['car', 'bike', 'ev'],
//         pricing: { hourlyRate: 10, baseRate: 0, baseHours: 1, gracePeriodMinutes: 20 },
//         isActive: true,
//       },
//     ];

//     const createdLocations = await ParkingLocation.create(locationsData);
//     const stationLoc = createdLocations[0];

//     await User.create({
//       name: 'KSR Officer Shaji',
//       email: 'staff.station@parkora.in',
//       passwordHash: 'StaffPass123!',
//       phone: '+91 9876511111',
//       role: 'staff',
//       assignedFacility: stationLoc._id,
//     });

//     console.log('[Seed]: Generating expanded floor layouts (20-30 slots per floor)...');

//     for (const loc of createdLocations) {
//       if (loc.slug === 'kannur-railway-station') {
//         const groundFloor = await Floor.create({
//           location: loc._id,
//           name: 'Ground Floor (G)',
//           level: 0,
//           layoutConfig: { totalRows: 4, baysPerRow: 5 },
//         });

//         const levelOne = await Floor.create({
//           location: loc._id,
//           name: 'Level 1 (L1)',
//           level: 1,
//           layoutConfig: { totalRows: 4, baysPerRow: 5 },
//         });

//         // 20 Bays for Ground Floor
//         const groundBays = [];
//         for (let i = 1; i <= 20; i++) {
//           const numStr = i < 10 ? `0${i}` : `${i}`;
//           groundBays.push({
//             location: loc._id,
//             floor: groundFloor._id,
//             bayNumber: `G-${numStr}`,
//             supportedVehicleType: i <= 4 ? 'ev' : i <= 14 ? 'car' : 'bike',
//             isEVCharging: i <= 4,
//             isAccessible: i === 5,
//             status: 'active',
//             isEnabled: true,
//           });
//         }
//         await ParkingBay.create(groundBays);

//         // 20 Bays for Level 1
//         const l1Bays = [];
//         for (let i = 1; i <= 20; i++) {
//           const numStr = i < 10 ? `0${i}` : `${i}`;
//           l1Bays.push({
//             location: loc._id,
//             floor: levelOne._id,
//             bayNumber: `L1-${numStr}`,
//             supportedVehicleType: i <= 14 ? 'car' : 'bike',
//             isEVCharging: false,
//             isAccessible: false,
//             status: 'active',
//             isEnabled: true,
//           });
//         }
//         await ParkingBay.create(l1Bays);
//       } else {
//         const groundFloor = await Floor.create({
//           location: loc._id,
//           name: 'Ground Lot',
//           level: 0,
//           layoutConfig: { totalRows: 4, baysPerRow: 5 },
//         });

//         const bays = [];
//         for (let i = 1; i <= 20; i++) {
//           const numStr = i < 10 ? `0${i}` : `${i}`;
//           bays.push({
//             location: loc._id,
//             floor: groundFloor._id,
//             bayNumber: `P-${numStr}`,
//             supportedVehicleType: i <= 2 && loc.supportedVehicleTypes.includes('ev') ? 'ev' : i <= 15 ? 'car' : 'bike',
//             isEVCharging: i <= 2 && loc.supportedVehicleTypes.includes('ev'),
//             isAccessible: i === 3,
//             status: 'active',
//             isEnabled: true,
//           });
//         }
//         await ParkingBay.create(bays);
//       }
//     }

//     console.log('\n======================================================');
//     console.log(' [Seed]: Parkora Database Seeded Successfully!');
//     console.log('======================================================\n');

//     process.exit(0);
//   } catch (error) {
//     console.error(`[Seed Error]: ${error.message}`);
//     process.exit(1);
//   }
// };

// seedDatabase();