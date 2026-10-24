const Booking = require('../models/Booking');
const ParkingEvent = require('../models/ParkingEvent');

// @desc    Verify QR token or manual booking reference
// @route   POST /api/staff/verify
// @access  Private (Staff/Admin)
exports.verifyTicket = async (req, res) => {
  try {
    const { qrToken, bookingRef } = req.body;

    if (!qrToken && !bookingRef) {
      return res.status(400).json({
        success: false,
        message: 'Provide either a qrToken or bookingRef to verify.',
      });
    }

    const query = qrToken ? { qrToken } : { bookingRef: bookingRef.toUpperCase().trim() };

    const booking = await Booking.findOne(query)
      .populate('location', 'name address')
      .populate('floor', 'name level')
      .populate('bay', 'bayNumber supportedVehicleType')
      .populate('user', 'name email phone');

    if (!booking) {
      return res.status(404).json({
        success: false,
        isValid: false,
        message: 'Invalid ticket: Booking not found.',
      });
    }

    // Ensure staff belongs to the facility
    if (
      req.user.role === 'staff' &&
      req.user.assignedFacility &&
      booking.location._id.toString() !== req.user.assignedFacility.toString()
    ) {
      return res.status(430).json({
        success: false,
        isValid: false,
        message: 'Ticket belongs to a different parking facility.',
      });
    }

    // Determine status status validity
    let isValid = true;
    let message = 'Ticket is valid for check-in.';

    if (booking.status === 'cancelled') {
      isValid = false;
      message = 'This booking was cancelled.';
    } else if (booking.status === 'completed') {
      isValid = false;
      message = 'This booking session has already been completed.';
    } else if (booking.status === 'active') {
      message = 'Vehicle currently parked (Checked In). Ready for Check-Out.';
    } else if (booking.status === 'expired') {
      isValid = false;
      message = 'This booking has expired.';
    }

    // Log QR scan audit event
    await ParkingEvent.create({
      booking: booking._id,
      eventType: 'QR_SCAN_VERIFIED',
      staff: req.user.id,
      notes: `Verification performed via ${qrToken ? 'QR scan' : 'manual lookup'}. Status: ${booking.status}`,
    });

    res.status(200).json({
      success: true,
      isValid,
      message,
      data: booking,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Process vehicle check-in
// @route   POST /api/staff/check-in/:bookingId
// @access  Private (Staff/Admin)
exports.checkIn = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (booking.status === 'active') {
      return res.status(400).json({ success: false, message: 'Vehicle is already checked in.' });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: `Cannot check in booking with status '${booking.status}'.`,
      });
    }

    booking.status = 'active';
    booking.checkInTime = new Date();
    await booking.save();

    await ParkingEvent.create({
      booking: booking._id,
      eventType: 'CHECK_IN',
      staff: req.user.id,
      notes: `Vehicle ${booking.vehicle.regNumber} checked in at ${booking.checkInTime.toISOString()}`,
    });

    res.status(200).json({
      success: true,
      message: 'Check-in recorded successfully.',
      data: booking,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Process vehicle check-out
// @route   POST /api/staff/check-out/:bookingId
// @access  Private (Staff/Admin)
exports.checkOut = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (booking.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: `Cannot check out booking with status '${booking.status}'. Vehicle must be checked in first.`,
      });
    }

    booking.status = 'completed';
    booking.checkOutTime = new Date();
    booking.paymentStatus = 'paid';
    await booking.save();

    await ParkingEvent.create({
      booking: booking._id,
      eventType: 'CHECK_OUT',
      staff: req.user.id,
      notes: `Vehicle ${booking.vehicle.regNumber} checked out at ${booking.checkOutTime.toISOString()}`,
    });

    res.status(200).json({
      success: true,
      message: 'Check-out completed and payment finalized.',
      data: booking,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get current facility's active sessions & today's arrivals
// @route   GET /api/staff/today
// @access  Private (Staff/Admin)
exports.getTodayOverview = async (req, res) => {
  try {
    const facilityId = req.user.assignedFacility;
    const filter = facilityId ? { location: facilityId } : {};

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const activeSessions = await Booking.find({
      ...filter,
      status: 'active',
    })
      .populate('bay', 'bayNumber')
      .populate('user', 'name phone');

    const todaysArrivals = await Booking.find({
      ...filter,
      startTime: { $gte: startOfDay, $lte: endOfDay },
    })
      .populate('bay', 'bayNumber')
      .populate('user', 'name phone')
      .sort('startTime');

    res.status(200).json({
      success: true,
      data: {
        activeCount: activeSessions.length,
        todaysArrivalsCount: todaysArrivals.length,
        activeSessions,
        todaysArrivals,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};