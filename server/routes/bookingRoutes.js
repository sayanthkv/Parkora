const express = require('express');
const router = express.Router();
const {
  createBooking,
  createRazorpayOrder,
  verifyAndCreateBooking,
  getMyBookings,
  cancelBooking,
} = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.post('/', authorize('customer', 'admin', 'staff'), createBooking);
router.post('/order-razorpay', authorize('customer', 'admin', 'staff'), createRazorpayOrder);
router.post('/verify-razorpay', authorize('customer', 'admin', 'staff'), verifyAndCreateBooking);

// Fixed: Added 'staff' role so logged-in staff accounts can fetch their booking history
router.get('/my', authorize('customer', 'admin', 'staff'), getMyBookings);
router.patch('/:id/cancel', authorize('customer', 'admin', 'staff'), cancelBooking);

module.exports = router;