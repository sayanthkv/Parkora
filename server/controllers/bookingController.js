const mongoose = require('mongoose');
const crypto = require('crypto');
const Booking = require('../models/Booking');
const ParkingLocation = require('../models/ParkingLocation');
const ParkingBay = require('../models/ParkingBay');

// @desc    Create a reservation with atomic bay locking & ACID Concurrency Lock
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

    // 1. Time & Date Boundary Validations
    if (isNaN(reqStart.getTime()) || isNaN(reqEnd.getTime())) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Invalid start or end time format.' });
    }

    // Disallow past reservation times (with a 60-second buffer for network latency)
    if (reqStart < new Date(Date.now() - 60000)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Reservation start time cannot be in the past.' });
    }

    if (reqStart >= reqEnd) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'End time must be after start time.' });
    }

    // 2. Validate Location
    const location = await ParkingLocation.findById(locationId).session(session);
    if (!location || location.isActive === false) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Parking facility is inactive or unavailable.' });
    }

    // 3. ATOMIC WRITE LOCK ON PARKING BAY
    // Updating __v on the bay document forces MongoDB to serialize concurrent transactions on this specific slot.
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

    // 4. Concurrency Check within Session for overlapping active intervals
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

    // 5. Pricing Formula: (Custom Bay Rate OR Location Hourly Rate) x Duration Hours
    const durationMs = reqEnd.getTime() - reqStart.getTime();
    const durationHours = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60)));
    const hourlyRate = bay.customHourlyRate ?? location.pricing?.hourlyRate ?? 30;
    const totalAmount = durationHours * hourlyRate;

    // 6. Security Identifiers & Tokens
    const bookingRef = `KSP-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const qrToken = crypto
      .createHash('sha256')
      .update(`${bookingRef}-${req.user.id}-${Date.now()}`)
      .digest('hex');

    // 7. Create booking document inside the transaction
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
            hourlyRate,
            baseFee: location.pricing?.baseRate || 0,
            durationHours,
            totalAmount,
          },
          paymentStatus: 'pay_at_facility',
          qrToken,
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
      data: populatedBooking,
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
      .populate('bay', 'bayNumber')
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