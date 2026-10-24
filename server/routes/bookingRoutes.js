const express = require('express');
const router = express.Router();
const {
  createBooking,
  getMyBookings,
  cancelBooking,
} = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.post('/', authorize('customer', 'admin'), createBooking);
router.get('/my', authorize('customer', 'admin'), getMyBookings);
router.patch('/:id/cancel', authorize('customer', 'admin'), cancelBooking);

module.exports = router;