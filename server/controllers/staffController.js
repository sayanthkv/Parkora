const crypto = require('crypto');
const Booking = require('../models/Booking');
const ParkingEvent = require('../models/ParkingEvent');

// Helper to enforce staff facility scoping
const enforceFacilityScope = (user, bookingLocationId) => {
  if (user.role === 'admin') return true;
  if (!user.assignedFacility) return false;
  return user.assignedFacility.toString() === bookingLocationId.toString();
};

// @desc    Verify QR token payload or manual booking reference
// @route   POST /api/staff/verify
// @access  Private (Staff/Admin)
exports.verifyTicket = async (req, res) => {
  try {
    const { qrTicketPayload, bookingRef } = req.body;

    if (!qrTicketPayload && !bookingRef) {
      return res.status(400).json({
        success: false,
        message: 'Provide either a qrTicketPayload (scanned QR) or bookingRef to verify.',
      });
    }

    let targetRef = bookingRef ? bookingRef.toUpperCase().trim() : null;
    let rawToken = null;

    if (qrTicketPayload) {
      if (!qrTicketPayload.includes(':')) {
        return res.status(400).json({ success: false, isValid: false, message: 'Malformed QR pass format.' });
      }
      const parts = qrTicketPayload.split(':');
      targetRef = parts[0].toUpperCase().trim();
      rawToken = parts[1];
    }

    // Select +qrTokenHash to enable cryptographic comparison
    const booking = await Booking.findOne({ bookingRef: targetRef })
      .select('+qrTokenHash')
      .populate('location', 'name address')
      .populate('floor', 'name level')
      .populate('bay', 'bayNumber supportedVehicleType customHourlyRate')
      .populate('user', 'name email phone');

    if (!booking) {
      return res.status(404).json({
        success: false,
        isValid: false,
        message: 'Invalid ticket: Booking not found.',
      });
    }

    // Cryptographic validation if QR scan was provided (Flaw 1)
    if (rawToken) {
      const candidateHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const tokenBuffer = Buffer.from(booking.qrTokenHash, 'hex');
      const candidateBuffer = Buffer.from(candidateHash, 'hex');

      if (
        tokenBuffer.length !== candidateBuffer.length ||
        !crypto.timingSafeEqual(tokenBuffer, candidateBuffer)
      ) {
        return res.status(401).json({
          success: false,
          isValid: false,
          message: 'Counterfeit or tampered QR ticket detected.',
        });
      }
    }

    // Facility Scope Guard (Flaw 6)
    if (!enforceFacilityScope(req.user, booking.location._id)) {
      return res.status(403).json({
        success: false,
        isValid: false,
        message: 'Unauthorized: This ticket belongs to a different parking facility.',
      });
    }

    const now = new Date();
    let isValid = true;
    let message = 'Ticket is valid for check-in.';

    // Check-in Time Window (allow entry 15 mins before start time)
    const earlyCheckInWindow = new Date(booking.startTime.getTime() - 15 * 60 * 1000);

    if (booking.status === 'cancelled') {
      isValid = false;
      message = 'This booking was cancelled.';
    } else if (booking.status === 'no_show') {
      isValid = false;
      message = 'This booking was marked as a No-Show.';
    } else if (booking.status === 'completed') {
      isValid = false;
      message = 'This booking session has already been completed.';
    } else if (booking.status === 'active') {
      message = 'Vehicle is currently parked (Checked In). Ready for Check-Out.';
    } else if (now < earlyCheckInWindow) {
      isValid = false;
      message = `Too early: Check-in opens 15 minutes before start time (${booking.startTime.toLocaleTimeString()}).`;
    } else if (now > booking.endTime) {
      isValid = false;
      message = 'This booking interval has already expired.';
    }

    // Audit Event
    await ParkingEvent.create({
      booking: booking._id,
      location: booking.location._id,
      eventType: 'QR_SCAN_VERIFIED',
      staff: req.user.id,
      notes: `Verification performed via ${qrTicketPayload ? 'QR scan' : 'manual lookup'}. Status: ${booking.status}`,
    });

    // Remove qrTokenHash before sending response
    booking.qrTokenHash = undefined;

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

    // Enforce Facility Scoping
    if (!enforceFacilityScope(req.user, booking.location)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You cannot check in vehicles for another parking facility.',
      });
    }

    if (booking.status === 'active') {
      return res.status(400).json({ success: false, message: 'Vehicle is already checked in.' });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: `Cannot check in booking in '${booking.status}' status.`,
      });
    }

    const now = new Date();
    const earlyCheckInWindow = new Date(booking.startTime.getTime() - 15 * 60 * 1000);

    if (now < earlyCheckInWindow) {
      return res.status(400).json({
        success: false,
        message: 'Too early: Check-in opens 15 minutes before the scheduled start time.',
      });
    }

    if (now > booking.endTime) {
      return res.status(400).json({
        success: false,
        message: 'This booking duration has expired. Handle as walk-in.',
      });
    }

    booking.status = 'active';
    booking.checkInTime = now;
    booking.checkedInBy = req.user.id;
    await booking.save();

    await ParkingEvent.create({
      booking: booking._id,
      location: booking.location,
      eventType: 'CHECK_IN',
      staff: req.user.id,
      notes: `Vehicle ${booking.vehicle.regNumber} checked in.`,
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

// @desc    Process vehicle check-out & collect payment
// @route   POST /api/staff/check-out/:bookingId
// @access  Private (Staff/Admin)
exports.checkOut = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    // Enforce Facility Scoping
    if (!enforceFacilityScope(req.user, booking.location)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You cannot check out vehicles for another parking facility.',
      });
    }

    if (booking.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: `Cannot check out booking with status '${booking.status}'. Vehicle must be active.`,
      });
    }

    const now = new Date();
    booking.status = 'completed';
    booking.checkOutTime = now;
    booking.checkedOutBy = req.user.id;

    // Collect payment in paise (Flaw 5 & 9)
    booking.paymentStatus = 'paid';
    booking.amountCollectedPaise = booking.pricingSnapshot.totalAmountPaise;

    await booking.save();

    await ParkingEvent.create({
      booking: booking._id,
      location: booking.location,
      eventType: 'CHECK_OUT',
      staff: req.user.id,
      amountCollectedPaise: booking.amountCollectedPaise,
      notes: `Vehicle ${booking.vehicle.regNumber} checked out. Amount collected: ₹${booking.amountCollectedPaise / 100}`,
    });

    res.status(200).json({
      success: true,
      message: 'Check-out completed and payment collected successfully.',
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
    
    if (req.user.role === 'staff' && !facilityId) {
      return res.status(403).json({ success: false, message: 'No facility assigned to your staff account.' });
    }

    const filter = facilityId ? { location: facilityId } : {};

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const activeSessions = await Booking.find({
      ...filter,
      status: 'active',
    })
      .populate('bay', 'bayNumber supportedVehicleType')
      .populate('user', 'name phone');

    const todaysArrivals = await Booking.find({
      ...filter,
      startTime: { $gte: startOfDay, $lte: endOfDay },
    })
      .populate('bay', 'bayNumber supportedVehicleType')
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