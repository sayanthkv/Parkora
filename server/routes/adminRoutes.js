const express = require('express');
const router = express.Router();
const {
  getAdminMetrics,
  getLocationsWithShifts,
  assignStaffShift,
  getStaffActivityLogs,
  createLocation,
  updateLocation,
  deleteLocation,
  getLocationStructure,
  createFloor,
  updateFloor,
  deleteFloor,
  createBay,
  updateBay,
  deleteBay,
  createStaff,
  getStaffMembers,
  updateStaff,
  assignStaffFacility,
  deactivateStaff,
  getAllBookings,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('admin'));

// Shift & Telemetry Extensions
router.get('/metrics', getAdminMetrics);
router.get('/locations-shifts', getLocationsWithShifts);
router.patch('/staff/:staffId/assign-shift', assignStaffShift);
router.get('/staff-activity', getStaffActivityLogs);

// Standard Admin Endpoints
router.post('/locations', createLocation);
router.put('/locations/:id', updateLocation);
router.delete('/locations/:id', deleteLocation);

router.get('/locations/:locationId/structure', getLocationStructure);
router.post('/locations/:locationId/floors', createFloor);
router.put('/floors/:floorId', updateFloor);
router.delete('/floors/:floorId', deleteFloor);

router.post('/locations/:locationId/floors/:floorId/bays', createBay);
router.put('/bays/:bayId', updateBay);
router.delete('/bays/:bayId', deleteBay);

router.post('/staff', createStaff);
router.get('/staff', getStaffMembers);
router.put('/staff/:staffId', updateStaff);
router.patch('/staff/:staffId/assign', assignStaffFacility);
router.patch('/staff/:staffId/deactivate', deactivateStaff);

router.get('/bookings', getAllBookings);

module.exports = router;