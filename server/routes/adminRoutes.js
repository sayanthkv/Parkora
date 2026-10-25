const express = require('express');
const router = express.Router();
const { upload } = require('../config/cloudinary');
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

// Align field name with 'imageUrl' or 'image' based on your form payload
router.post('/locations', upload.single('imageUrl'), createLocation);
router.put('/locations/:id', upload.single('imageUrl'), updateLocation);
router.delete('/locations/:id', deleteLocation);

router.get('/bookings', getAllBookings);

// Staff management endpoints
router.post('/staff', createStaff);
router.get('/staff', getStaffMembers);
router.patch('/staff/:staffId/assign', assignStaffFacility);
router.patch('/staff/:staffId/deactivate', deactivateStaff);

module.exports = router;