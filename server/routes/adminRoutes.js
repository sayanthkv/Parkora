const express = require('express');
const router = express.Router();
const {
  getAdminMetrics,
  createLocation,
  updateLocation,
  deleteLocation,
  createStaff,
  getStaffMembers,
  assignStaffFacility,
  deactivateStaff,
  getAllBookings,
} = require('../controllers/adminController');

router.get('/metrics', getAdminMetrics);
router.post('/locations', createLocation);
router.put('/locations/:id', updateLocation);
router.delete('/locations/:id', deleteLocation);
router.get('/bookings', getAllBookings);

// Staff management endpoints
router.post('/staff', createStaff);
router.get('/staff', getStaffMembers);
router.patch('/staff/:staffId/assign', assignStaffFacility);
router.patch('/staff/:staffId/deactivate', deactivateStaff);

module.exports = router;