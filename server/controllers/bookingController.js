const mongoose = require('mongoose');
const crypto = require('crypto');
const Booking = require('../models/Booking');
const ParkingLocation = require('../models/ParkingLocation');
const ParkingBay = require('../models/ParkingBay');

// @desc    Create a reservation with quota checks, compatibility validation, atomic bay locking & paise pricing
// @route   POST /api/bookings
// @access  Private (Customer)
exports.createBooking = async (req, res) => {
  // Start MongoDB Session for Transaction Isolation
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

    // ---------------------------------------------------------
    // 1. Time, Date & Abuse Boundary Validations (Flaw 3)
    // ---------------------------------------------------------
    if (isNaN(reqStart.getTime()) || isNaN(reqEnd.getTime())) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Invalid start or end time format.' });
    }

    // Disallow past reservation times (with a 60-second buffer for network latency)
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

    // Limit 1: Max advance booking window (e.g., maximum 48 hours in advance)
    const MAX_ADVANCE_MS = 48 * 60 * 60 * 1000;
    if (reqStart.getTime() - now.getTime() > MAX_ADVANCE_MS) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Advance booking limit: Reservations can only be scheduled up to 48 hours in advance.',
      });
    }

    // Limit 2: Maximum duration cap per booking (e.g., maximum 24 hours)
    const MAX_DURATION_MS = 24 * 60 * 60 * 1000;
    const durationMs = reqEnd.getTime() - reqStart.getTime();
    if (durationMs > MAX_DURATION_MS) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Duration limit exceeded: Maximum allowable duration per single reservation is 24 hours.',
      });
    }

    // Limit 3: Per-user active booking quota to prevent hoarding
    const activeUserBookingsCount = await Booking.countDocuments({
      user: req.user.id,
      status: { $in: ['confirmed', 'active', 'pending'] },
    }).session(session);

    if (activeUserBookingsCount >= 2) {
      await session.abortTransaction();
      session.endSession();
      return res.status(429).json({
        success: false,
        message: 'Active quota exceeded: You can only hold up to 2 active or upcoming reservations concurrently.',
      });
    }

    // ---------------------------------------------------------
    // 2. Validate Location
    // ---------------------------------------------------------
    const location = await ParkingLocation.findById(locationId).session(session);
    if (!location || location.isActive === false) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Parking facility is inactive or unavailable.' });
    }

    // ---------------------------------------------------------
    // 3. Atomic Write Lock on Parking Bay
    // ---------------------------------------------------------
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
        message: 'Selected parking bay is unavailable, disabled, or under maintenance.',
      });
    }

    // ---------------------------------------------------------
    // 4. Server-Side Vehicle Compatibility Enforcement (Flaw 7)
    // ---------------------------------------------------------
    const targetVehicleType = vehicleType || 'car';
    if (bay.supportedVehicleType && bay.supportedVehicleType !== targetVehicleType) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `Vehicle mismatch: Bay ${bay.bayNumber} is designated strictly for '${bay.supportedVehicleType}', but requested for '${targetVehicleType}'.`,
      });
    }

    // ---------------------------------------------------------
    // 5. Concurrency Check within Session for Overlapping Intervals
    // ---------------------------------------------------------
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

    // ---------------------------------------------------------
    // 6. Currency Handling in Integer Paise (Flaw 9)
    // ---------------------------------------------------------
    const durationHours = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60)));
    const hourlyRateRupees = bay.customHourlyRate ?? location.pricing?.hourlyRate ?? 30;
    const baseFeeRupees = location.pricing?.baseRate || 0;

    const hourlyRatePaise = Math.round(hourlyRateRupees * 100);
    const baseFeePaise = Math.round(baseFeeRupees * 100);
    const totalAmountPaise = (durationHours * hourlyRatePaise) + baseFeePaise;

    // ---------------------------------------------------------
    // 7. Cryptographically Secure QR Token Generation (Flaw 1)
    // ---------------------------------------------------------
    const bookingRef = `KSP-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const rawToken = crypto.randomBytes(32).toString('hex');
    const qrTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // ---------------------------------------------------------
    // 8. Create Booking Document inside Transaction
    // ---------------------------------------------------------
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
          amountCollectedPaise: 0,
          qrTokenHash,
        },
      ],
      { session }
    );

    // Commit Transaction safely
    await session.commitTransaction();
    session.endSession();

    // Populate relations after successful transaction commit
    const populatedBooking = await Booking.findById(booking._id)
      .populate('location', 'name address coordinates')
      .populate('floor', 'name level')
      .populate('bay', 'bayNumber supportedVehicleType customHourlyRate');

    return res.status(201).json({
      success: true,
      message: 'Reservation created successfully',
      data: {
        ...populatedBooking.toObject(),
        // Client uses this composite string to render the physical QR pass
        qrTicketPayload: `${bookingRef}:${rawToken}`,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    // Catch concurrent write conflicts thrown by MongoDB transaction isolation
    if (
      (error.hasErrorLabel && error.hasErrorLabel('TransientTransactionError')) ||
      error.code === 112 ||
      error.message?.includes('WriteConflict')
    ) {
      return res.status(409).json({
        success: false,
        message: 'Bay conflict: This bay was reserved just now. Please pick another bay.',
      });
    }

    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get user's booking history with Server-Side Pagination
// @route   GET /api/bookings/my
// @access  Private (Customer)
exports.getMyBookings = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const totalBookings = await Booking.countDocuments({ user: req.user.id });

    const bookings = await Booking.find({ user: req.user.id })
      .populate('location', 'name address imageUrl')
      .populate('floor', 'name level')
      .populate('bay', 'bayNumber supportedVehicleType')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

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
// @access  Private (Customer)
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