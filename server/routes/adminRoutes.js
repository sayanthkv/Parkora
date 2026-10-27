const express = require('express');
const router = express.Router();
const { upload } = require('../config/cloudinary');
const {
  getAdminMetrics,
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
  assignStaffFacility,
  deactivateStaff,
  getAllBookings,
} = require('../controllers/adminController');

// System Metrics
router.get('/metrics', getAdminMetrics);

// Location / Facility endpoints
router.post('/locations', upload.single('imageUrl'), createLocation);
router.put('/locations/:id', upload.single('imageUrl'), updateLocation);
router.delete('/locations/:id', deleteLocation);

// Floor & Bay Structure endpoints
router.get('/locations/:locationId/structure', getLocationStructure);
router.post('/locations/:locationId/floors', createFloor);
router.put('/floors/:floorId', updateFloor);
router.delete('/floors/:floorId', deleteFloor);

router.post('/locations/:locationId/floors/:floorId/bays', createBay);
router.put('/bays/:bayId', updateBay);
router.delete('/bays/:bayId', deleteBay);

// Bookings endpoint
router.get('/bookings', getAllBookings);

// Staff Management endpoints
router.post('/staff', createStaff);
router.get('/staff', getStaffMembers);
router.patch('/staff/:staffId/assign', assignStaffFacility);
router.patch('/staff/:staffId/deactivate', deactivateStaff);

module.exports = router;