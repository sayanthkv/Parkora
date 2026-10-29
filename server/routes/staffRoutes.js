const express = require('express');
const router = express.Router();
const {
  getStaffShiftContext,
  autoSwitchToDutyStaff,
  getTodayOverview,
  verifyTicket,
  checkIn,
  checkOut,
} = require('../controllers/staffController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('staff', 'admin'));

router.get('/shift-context', getStaffShiftContext);
router.post('/auto-switch-duty', autoSwitchToDutyStaff);
router.get('/today', getTodayOverview);
router.post('/verify', verifyTicket);
router.post('/check-in/:bookingId', checkIn);
router.post('/check-out/:bookingId', checkOut);

module.exports = router;