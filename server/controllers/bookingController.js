const mongoose = require('mongoose');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const Booking = require('../models/Booking');
const ParkingLocation = require('../models/ParkingLocation');
const ParkingBay = require('../models/ParkingBay');

// Safe fallback initialization to prevent build-time/boot crashes if env keys are pending
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder',
});

/**
 * Validates facility-specific operating windows.
 * Specifically enforces 05:00 to 22:00 IST for Payyambalam Beach.
 */
const validateOperatingHours = (location, startTime, endTime) => {
  const locName = (location.name || '').toLowerCase();
  const locSlug = (location.slug || '').toLowerCase();
  const isPayyambalam = locName.includes('payyambalam') || locSlug.includes('payyambalam');

  if (!isPayyambalam) return { valid: true };

  // Convert to Indian Standard Time (UTC + 5 hours 30 mins)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const startIST = new Date(startTime.getTime() + istOffset);
  const endIST = new Date(endTime.getTime() + istOffset);

  const startHour = startIST.getUTCHours() + startIST.getUTCMinutes() / 60;
  const endHour = endIST.getUTCHours() + endIST.getUTCMinutes() / 60;

  // Window: 05:00 (5.0) to 22:00 (22.0)
  if (startHour < 5 || startHour >= 22) {
    return {
      valid: false,
      message: 'Payyambalam Beach facility only accepts reservations starting between 05:00 and 22:00.',
    };
  }

  // Ensure reservation does not cross calendar days or extend past 22:00
  if (startIST.getUTCDate() !== endIST.getUTCDate() || endHour > 22) {
    return {
      valid: false,
      message: 'Payyambalam Beach parking closes at 22:00. Reservations cannot extend past 22:00.',
    };
  }

  return { valid: true };
};

// @desc    Create Pay-At-Facility Booking
// @route   POST /api/bookings
// @access  Private (Customer, Staff, Admin)
exports.createBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      locationId,
      floorId,
      bayId,
      vehicleRegNumber,
      vehicleType,
      startTime,
      endTime,
    } = req.body;

    const reqStart = new Date(startTime);
    const reqEnd = new Date(endTime);
    const now = new Date();

    if (isNaN(reqStart.getTime()) || isNaN(reqEnd.getTime())) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Invalid start or end time format.' });
    }

    if (reqStart < new Date(now.getTime() - 60000)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Reservation start time cannot be in the past.' });
    }

    if (reqStart >= reqEnd) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'End time must be after start time.' });
    }

    const MAX_ADVANCE_MS = 48 * 60 * 60 * 1000;
    if (reqStart.getTime() - now.getTime() > MAX_ADVANCE_MS) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Advance booking limit: Reservations can only be scheduled up to 48 hours in advance.',
      });
    }

    const MAX_DURATION_MS = 24 * 60 * 60 * 1000;
    const durationMs = reqEnd.getTime() - reqStart.getTime();
    if (durationMs > MAX_DURATION_MS) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Duration limit exceeded: Maximum allowable duration is 24 hours.',
      });
    }

    const activeUserBookingsCount = await Booking.countDocuments({
      user: req.user.id,
      status: { $in: ['confirmed', 'active', 'pending'] },
    }).session(session);

    if (activeUserBookingsCount >= 2) {
      await session.abortTransaction();
      session.endSession();
      return res.status(429).json({
        success: false,
        message: 'Active quota exceeded: You can only hold up to 2 active reservations concurrently.',
      });
    }

    const location = await ParkingLocation.findById(locationId).session(session);
    if (!location || location.isActive === false) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Parking facility is inactive or unavailable.' });
    }

    // Payyambalam Beach Operating Hours Check
    const hoursCheck = validateOperatingHours(location, reqStart, reqEnd);
    if (!hoursCheck.valid) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: hoursCheck.message });
    }

    // Pessimistic Bay Write-Lock (Flaw 10)[cite: 2]
    const bay = await ParkingBay.findOneAndUpdate(
      {
        _id: bayId,
        location: locationId,
        floor: floorId,
        status: { $ne: 'maintenance' },
        isEnabled: { $ne: false },
      },
      { $inc: { __v: 1 } },
      { session, new: true }
    );

    if (!bay) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Selected parking bay is unavailable or under maintenance.',
      });
    }

    const targetVehicleType = vehicleType || 'car';
    if (bay.supportedVehicleType && bay.supportedVehicleType !== targetVehicleType) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `Vehicle mismatch: Bay is designated for '${bay.supportedVehicleType}', but requested for '${targetVehicleType}'.`,
      });
    }

    // Interval Overlap Check[cite: 2, 6]
    const existingConflict = await Booking.findOne({
      bay: bayId,
      status: { $in: ['confirmed', 'active', 'pending'] },
      $and: [
        { startTime: { $lt: reqEnd } },
        { endTime: { $gt: reqStart } },
      ],
    }).session(session);

    if (existingConflict) {
      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({
        success: false,
        message: 'Bay conflict: This bay was reserved just now. Please pick another bay.',
      });
    }

    const durationHours = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60)));
    const hourlyRateRupees = bay.customHourlyRate ?? location.pricing?.hourlyRate ?? 30;
    const baseFeeRupees = location.pricing?.baseRate || 0;

    const hourlyRatePaise = Math.round(hourlyRateRupees * 100);
    const baseFeePaise = Math.round(baseFeeRupees * 100);
    const totalAmountPaise = (durationHours * hourlyRatePaise) + baseFeePaise;

    const bookingRef = `KSP-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const rawToken = crypto.randomBytes(32).toString('hex');
    const qrTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const [booking] = await Booking.create(
      [
        {
          bookingRef,
          user: req.user.id,
          location: locationId,
          floor: floorId,
          bay: bayId,
          vehicle: {
            regNumber: vehicleRegNumber.toUpperCase().trim(),
            vehicleType: targetVehicleType,
          },
          startTime: reqStart,
          endTime: reqEnd,
          status: 'confirmed',
          pricingSnapshot: {
            hourlyRatePaise,
            baseFeePaise,
            durationHours,
            totalAmountPaise,
          },
          paymentStatus: 'pending',
          paymentMethod: 'pay_at_facility',
          amountCollectedPaise: 0,
          qrTokenHash,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    const populatedBooking = await Booking.findById(booking._id)
      .populate('location', 'name address coordinates')
      .populate('floor', 'name level')
      .populate('bay', 'bayNumber supportedVehicleType customHourlyRate')
      .lean();

    return res.status(201).json({
      success: true,
      message: 'Reservation created successfully',
      data: {
        ...populatedBooking,
        qrTicketPayload: `${bookingRef}:${rawToken}`,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Step 1: Create Razorpay Test Order
// @route   POST /api/bookings/order-razorpay
// @access  Private (Customer, Staff, Admin)
exports.createRazorpayOrder = async (req, res) => {
  try {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'Razorpay API credentials are not configured on the server environment.',
      });
    }

    const { locationId, bayId, startTime, endTime } = req.body;

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end || start < new Date(Date.now() - 60000)) {
      return res.status(400).json({ success: false, message: 'Invalid start or end time.' });
    }

    const bay = await ParkingBay.findById(bayId);
    const location = await ParkingLocation.findById(locationId);

    if (!bay || !location) {
      return res.status(404).json({ success: false, message: 'Location or Bay not found.' });
    }

    // Payyambalam Beach Operating Hours Check
    const hoursCheck = validateOperatingHours(location, start, end);
    if (!hoursCheck.valid) {
      return res.status(400).json({ success: false, message: hoursCheck.message });
    }

    const durationMs = end.getTime() - start.getTime();
    const durationHours = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60)));
    const hourlyRateRupees = bay.customHourlyRate ?? location.pricing?.hourlyRate ?? 30;
    const baseFeeRupees = location.pricing?.baseRate || 0;

    const hourlyRatePaise = Math.round(hourlyRateRupees * 100);
    const baseFeePaise = Math.round(baseFeeRupees * 100);
    const totalAmountPaise = (durationHours * hourlyRatePaise) + baseFeePaise;

    const receipt = `rcpt_${Date.now().toString().slice(-8)}`;

    const order = await razorpay.orders.create({
      amount: totalAmountPaise, // in integer paise
      currency: 'INR',
      receipt,
    });

    res.status(200).json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Step 2: Verify Razorpay Signature & Commit Booking Atomically
// @route   POST /api/bookings/verify-razorpay
// @access  Private (Customer, Staff, Admin)
exports.verifyAndCreateBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      locationId,
      floorId,
      bayId,
      vehicleRegNumber,
      vehicleType,
      startTime,
      endTime,
    } = req.body;

    // 1. Verify Cryptographic Signature
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(body)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const candidateBuffer = Buffer.from(razorpay_signature || '', 'utf8');

    if (
      expectedBuffer.length !== candidateBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, candidateBuffer)
    ) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Invalid payment signature. Verification failed.' });
    }

    const reqStart = new Date(startTime);
    const reqEnd = new Date(endTime);

    // 2. Validate Operating Hours
    const location = await ParkingLocation.findById(locationId).session(session);
    if (!location || location.isActive === false) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Parking facility is inactive or unavailable.' });
    }

    const hoursCheck = validateOperatingHours(location, reqStart, reqEnd);
    if (!hoursCheck.valid) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: hoursCheck.message });
    }

    // 3. Lock the Bay Document[cite: 2]
    const bay = await ParkingBay.findOneAndUpdate(
      {
        _id: bayId,
        location: locationId,
        floor: floorId,
        status: { $ne: 'maintenance' },
        isEnabled: { $ne: false },
      },
      { $inc: { __v: 1 } },
      { session, new: true }
    );

    if (!bay) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Selected bay is unavailable.' });
    }

    // 4. Interval Overlap Check[cite: 2, 6]
    const existingConflict = await Booking.findOne({
      bay: bayId,
      status: { $in: ['confirmed', 'active', 'pending'] },
      $and: [
        { startTime: { $lt: reqEnd } },
        { endTime: { $gt: reqStart } },
      ],
    }).session(session);

    if (existingConflict) {
      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({
        success: false,
        message: 'Bay conflict: Slot was reserved just now. Your payment will be refunded.',
      });
    }

    const durationMs = reqEnd.getTime() - reqStart.getTime();
    const durationHours = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60)));
    const hourlyRateRupees = bay.customHourlyRate ?? location.pricing?.hourlyRate ?? 30;
    const baseFeeRupees = location.pricing?.baseRate || 0;

    const hourlyRatePaise = Math.round(hourlyRateRupees * 100);
    const baseFeePaise = Math.round(baseFeeRupees * 100);
    const totalAmountPaise = (durationHours * hourlyRatePaise) + baseFeePaise;

    const bookingRef = `KSP-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const rawToken = crypto.randomBytes(32).toString('hex');
    const qrTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const [booking] = await Booking.create(
      [
        {
          bookingRef,
          user: req.user.id,
          location: locationId,
          floor: floorId,
          bay: bayId,
          vehicle: {
            regNumber: vehicleRegNumber.toUpperCase().trim(),
            vehicleType: vehicleType || 'car',
          },
          startTime: reqStart,
          endTime: reqEnd,
          status: 'confirmed',
          pricingSnapshot: {
            hourlyRatePaise,
            baseFeePaise,
            durationHours,
            totalAmountPaise,
          },
          paymentStatus: 'paid',
          paymentMethod: 'razorpay',
          amountCollectedPaise: totalAmountPaise,
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          qrTokenHash,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    const populatedBooking = await Booking.findById(booking._id)
      .populate('location', 'name address coordinates')
      .populate('floor', 'name level')
      .populate('bay', 'bayNumber supportedVehicleType customHourlyRate')
      .lean();

    return res.status(201).json({
      success: true,
      message: 'Payment verified and booking confirmed',
      data: {
        ...populatedBooking,
        qrTicketPayload: `${bookingRef}:${rawToken}`,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get user's booking history
// @route   GET /api/bookings/my
// @access  Private (Customer, Staff, Admin)
exports.getMyBookings = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 15;
    const skip = (page - 1) * limit;

    const totalBookings = await Booking.countDocuments({ user: req.user.id });

    // Speed optimization: .lean() for faster execution and lighter payload
    const bookings = await Booking.find({ user: req.user.id })
      .populate('location', 'name address imageUrl')
      .populate('floor', 'name level')
      .populate('bay', 'bayNumber supportedVehicleType')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      count: bookings.length,
      pagination: {
        total: totalBookings,
        page,
        limit,
        pages: Math.ceil(totalBookings / limit),
      },
      data: bookings,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Cancel an upcoming booking
// @route   PATCH /api/bookings/:id/cancel
// @access  Private (Customer, Staff, Admin)
exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user.id });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: `Booking cannot be cancelled because it is in '${booking.status}' status`,
      });
    }

    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    booking.cancellationReason = req.body.reason || 'Cancelled by customer';
    await booking.save();

    res.status(200).json({ success: true, message: 'Booking cancelled successfully', data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};