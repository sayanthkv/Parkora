const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Floor = require('../models/Floor');
const ParkingBay = require('../models/ParkingBay');
const Booking = require('../models/Booking');
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
const { protect, authorize } = require('../middleware/auth');

// Global memory toggle for test simulation
global.autoCompleteOverstays = global.autoCompleteOverstays || false;

router.use(protect);
router.use(authorize('staff', 'admin'));

// Testing mode: toggle and inspect auto-discharge status
router.get('/auto-complete-status', (req, res) => {
  res.status(200).json({ success: true, enabled: Boolean(global.autoCompleteOverstays) });
});

router.post('/toggle-auto-complete', (req, res) => {
  global.autoCompleteOverstays = !global.autoCompleteOverstays;
  res.status(200).json({
    success: true,
    enabled: global.autoCompleteOverstays,
    message: global.autoCompleteOverstays
      ? 'Auto-discharge enabled: cars will be auto-completed when reserved time ends.'
      : 'Auto-discharge disabled: manual staff verification required at exit.',
  });
});

// Facility layout and live active bay reservations
router.get('/facility-structure', async (req, res, next) => {
  try {
    const staff = await User.findById(req.user.id);
    if (!staff || !staff.assignedFacility) {
      return res.status(400).json({ success: false, message: 'No facility assigned to staff.' });
    }

    const locationId = staff.assignedFacility;
    const floors = await Floor.find({ location: locationId }).sort({ level: 1 }).lean();
    const bays = await ParkingBay.find({ location: locationId }).sort({ bayNumber: 1 }).lean();

    const now = new Date();
    const activeBookings = await Booking.find({
      location: locationId,
      status: { $in: ['active', 'confirmed'] },
      endTime: { $gt: now },
    })
      .select('bay status startTime endTime vehicle')
      .lean();

    res.status(200).json({
      success: true,
      data: {
        floors,
        bays,
        activeBookings,
      },
    });
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