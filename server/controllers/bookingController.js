const crypto = require('crypto');
const Booking = require('../models/Booking');
const ParkingLocation = require('../models/ParkingLocation');

// @desc    Create a new parking reservation (atomic concurrency safe)
// @route   POST /api/bookings
// @access  Private (Customer / Admin)
exports.createBooking = async (req, res) => {
  try {
    const { locationId, floorId, bayId, vehicleRegNumber, vehicleType, startTime, endTime } = req.body;

    const reqStart = new Date(startTime);
    const reqEnd = new Date(endTime);

    if (!locationId || !floorId || !bayId || !vehicleRegNumber) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    if (reqStart >= reqEnd) {
      return res.status(400).json({ success: false, message: 'End time must be after start time' });
    }

    if (reqStart < new Date(Date.now() - 5 * 60 * 1000)) {
      return res.status(400).json({ success: false, message: 'Start time cannot be in the past' });
    }

    // 1. Calculate price on the server (never trust client amount)
    const location = await ParkingLocation.findById(locationId);
    if (!location || !location.isActive) {
      return res.status(404).json({ success: false, message: 'Parking facility is inactive or unavailable' });
    }

    const durationMs = reqEnd.getTime() - reqStart.getTime();
    const durationHours = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60)));
    const totalAmount = location.pricing.baseRate + durationHours * location.pricing.hourlyRate;

    // 2. Atomic interval overlap validation
    // Overlap formula: A_start < B_end AND B_start < A_end
    const existingConflict = await Booking.findOne({
      bay: bayId,
      status: { $in: ['confirmed', 'active', 'pending'] },
      $and: [
        { startTime: { $lt: reqEnd } },
        { endTime: { $gt: reqStart } },
      ],
    });

    if (existingConflict) {
      return res.status(409).json({
        success: false,
        message: 'This parking bay has just been reserved for the requested time range. Please choose another bay.',
      });
    }

    // 3. Generate reference & QR payload
    const bookingRef = `KSP-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const qrToken = crypto
      .createHash('sha256')
      .update(`${bookingRef}-${req.user.id}-${Date.now()}`)
      .digest('hex');

    const booking = await Booking.create({
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
        hourlyRate: location.pricing.hourlyRate,
        baseFee: location.pricing.baseRate,
        durationHours,
        totalAmount,
      },
      paymentStatus: 'pay_at_facility',
      qrToken,
    });

    const populatedBooking = await Booking.findById(booking._id)
      .populate('location', 'name address coordinates')
      .populate('floor', 'name level')
      .populate('bay', 'bayNumber supportedVehicleType');

    res.status(201).json({
      success: true,
      message: 'Reservation created successfully',
      data: populatedBooking,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get logged in user's bookings
// @route   GET /api/bookings/my
// @access  Private (Customer / Admin)
exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id })
      .populate('location', 'name address imageUrl')
      .populate('floor', 'name level')
      .populate('bay', 'bayNumber')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: bookings.length, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Cancel an upcoming booking
// @route   PATCH /api/bookings/:id/cancel
// @access  Private (Customer / Admin)
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