const express = require('express');
const router = express.Router();
const {
  verifyTicket,
  checkIn,
  checkOut,
  getTodayOverview,
} = require('../controllers/staffController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('staff', 'admin'));

router.post('/verify', verifyTicket);
router.post('/check-in/:bookingId', checkIn);
router.post('/check-out/:bookingId', checkOut);
router.get('/today', getTodayOverview);

module.exports = router;