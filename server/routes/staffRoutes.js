const express = require('express');
const router = express.Router();
const {
  getStaffShiftContext,
  autoSwitchToDutyStaff,
  getTodayOverview,
  verifyTicket,
  checkIn,
  checkOut,
  createWalkInBooking,
  getStaffTodayBookings,
} = require('../controllers/staffController');
const { getLocationStructure } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('staff', 'admin'));

// Structure endpoint for staff's assigned facility
router.get('/facility-structure', async (req, res, next) => {
  try {
    const User = require('../models/User');
    const staff = await User.findById(req.user.id);
    if (!staff || !staff.assignedFacility) {
      return res.status(400).json({ success: false, message: 'No facility assigned to staff.' });
    }
    req.params.locationId = staff.assignedFacility.toString();
    return getLocationStructure(req, res);
  } catch (err) {
    next(err);
  }
});

router.get('/shift-context', getStaffShiftContext);
router.post('/auto-switch-duty', autoSwitchToDutyStaff);
router.get('/today', getTodayOverview);
router.post('/verify', verifyTicket);
router.post('/check-in/:bookingId', checkIn);
router.post('/check-out/:bookingId', checkOut);
router.post('/book-customer', createWalkInBooking);
router.get('/today-bookings', getStaffTodayBookings);

module.exports = router;