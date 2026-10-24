const express = require('express');
const router = express.Router();
const {
  getAdminMetrics,
  createLocation,
  createStaff,
  getAllBookings,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('admin'));

router.get('/metrics', getAdminMetrics);
router.post('/locations', createLocation);
router.post('/staff', createStaff);
router.get('/bookings', getAllBookings);

module.exports = router;