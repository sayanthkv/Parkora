const Booking = require('../models/Booking');
const ParkingLocation = require('../models/ParkingLocation');
const User = require('../models/User');
const StaffActivityLog = require('../models/StaffActivityLog');
const { getActiveShiftDetails } = require('../utils/shiftHelper');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// @desc    Get on-duty staff information for the facility & auto-log attendance
// @route   GET /api/staff/shift-context
// @access  Private (Staff)
exports.getStaffShiftContext = async (req, res) => {
  try {
    const currentStaff = await User.findById(req.user.id).populate('assignedFacility');
    if (!currentStaff || !currentStaff.assignedFacility) {
      return res.status(400).json({ success: false, message: 'Staff account has no assigned facility.' });
    }

    const facility = currentStaff.assignedFacility;
    const shiftInfo = getActiveShiftDetails(facility.name);

    // Find the staff designated for this facility's current active shift
    const onDutyStaff = await User.findOne({
      assignedFacility: facility._id,
      shiftSlot: shiftInfo.activeSlot,
      isActive: true,
    }).select('-passwordHash');

    // Auto-record login activity if current logged-in user matches active slot
    if (currentStaff.shiftSlot === shiftInfo.activeSlot) {
      const recentLog = await StaffActivityLog.findOne({
        staff: currentStaff._id,
        facility: facility._id,
        actionType: 'shift_start_login',
        timestamp: { $gte: new Date(Date.now() - 30 * 60 * 1000) }, // logged within last 30m
      });

      if (!recentLog) {
        await StaffActivityLog.create({
          staff: currentStaff._id,
          facility: facility._id,
          actionType: 'shift_start_login',
          shiftSlot: shiftInfo.activeSlot,
          details: `Automatic session initialization for ${shiftInfo.label}`,
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        facility,
        shiftInfo,
        currentStaff,
        onDutyStaff,
        isOnDuty: currentStaff.shiftSlot === shiftInfo.activeSlot,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Switch to the on-duty staff member automatically (project presentation helper)
// @route   POST /api/staff/auto-switch-duty
// @access  Private (Staff, Admin)
exports.autoSwitchToDutyStaff = async (req, res) => {
  try {
    const currentStaff = await User.findById(req.user.id);
    if (!currentStaff || !currentStaff.assignedFacility) {
      return res.status(400).json({ success: false, message: 'No facility assigned.' });
    }

    const facility = await ParkingLocation.findById(currentStaff.assignedFacility);
    const shiftInfo = getActiveShiftDetails(facility.name);

    if (!shiftInfo.activeSlot) {
      return res.status(400).json({ success: false, message: 'Facility is currently outside operating hours.' });
    }

    const activeStaff = await User.findOne({
      assignedFacility: facility._id,
      shiftSlot: shiftInfo.activeSlot,
      isActive: true,
    });

    if (!activeStaff) {
      return res.status(404).json({
        success: false,
        message: `No active staff member assigned to ${shiftInfo.activeSlot.toUpperCase()} for this facility.`,
      });
    }

    // Generate fresh JWT token for on-duty staff
    const token = jwt.sign(
      { id: activeStaff._id, role: activeStaff.role },
      process.env.JWT_SECRET || 'secret_jwt_key',
      { expiresIn: '12h' }
    );

    // Record automatic transition log
    await StaffActivityLog.create({
      staff: activeStaff._id,
      facility: facility._id,
      actionType: 'shift_start_login',
      shiftSlot: shiftInfo.activeSlot,
      details: `Shift auto-rotation handover to ${activeStaff.name}`,
    });

    res.status(200).json({
      success: true,
      message: `Shift handover successful. Switched to ${activeStaff.name}.`,
      token,
      data: {
        _id: activeStaff._id,
        name: activeStaff.name,
        email: activeStaff.email,
        role: activeStaff.role,
        shiftSlot: activeStaff.shiftSlot,
        assignedFacility: facility,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Today's facility stats
// @route   GET /api/staff/today
// @access  Private (Staff)
exports.getTodayOverview = async (req, res) => {
  try {
    const staff = await User.findById(req.user.id);
    if (!staff.assignedFacility) {
      return res.status(400).json({ success: false, message: 'Staff has no assigned facility.' });
    }

    const activeCount = await Booking.countDocuments({
      location: staff.assignedFacility,
      status: 'active',
    });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todaysArrivalsCount = await Booking.countDocuments({
      location: staff.assignedFacility,
      startTime: { $gte: startOfToday },
    });

    const activeSessions = await Booking.find({
      location: staff.assignedFacility,
      status: 'active',
    })
      .populate('bay', 'bayNumber')
      .populate('floor', 'name')
      .lean();

    res.status(200).json({
      success: true,
      data: {
        activeCount,
        todaysArrivalsCount,
        activeSessions,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify QR token or Booking Reference
// @route   POST /api/staff/verify
// @access  Private (Staff)
exports.verifyTicket = async (req, res) => {
  try {
    const { bookingRef, qrToken } = req.body;
    let booking = null;

    if (bookingRef) {
      booking = await Booking.findOne({ bookingRef })
        .populate('location', 'name')
        .populate('floor', 'name')
        .populate('bay', 'bayNumber');
    } else if (qrToken && qrToken.includes(':')) {
      const [tokenRef, rawSecret] = qrToken.split(':');
      const expectedHash = crypto.createHash('sha256').update(rawSecret).digest('hex');

      booking = await Booking.findOne({ bookingRef: tokenRef })
        .populate('location', 'name')
        .populate('floor', 'name')
        .populate('bay', 'bayNumber');

      if (booking) {
        const storedHashBuf = Buffer.from(booking.qrTokenHash || '', 'utf8');
        const calcHashBuf = Buffer.from(expectedHash, 'utf8');

        if (
          storedHashBuf.length !== calcHashBuf.length ||
          !crypto.timingSafeEqual(storedHashBuf, calcHashBuf)
        ) {
          return res.status(400).json({ success: false, isValid: false, message: 'Cryptographic QR token mismatch.' });
        }
      }
    }

    if (!booking) {
      return res.status(404).json({ success: false, isValid: false, message: 'Reservation not found.' });
    }

    res.status(200).json({
      success: true,
      isValid: true,
      message: 'Ticket successfully verified.',
      data: booking,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Check-In vehicle
// @route   POST /api/staff/check-in/:bookingId
// @access  Private (Staff)
exports.checkIn = async (req, res) => {
  try {
    const staff = await User.findById(req.user.id);
    const booking = await Booking.findById(req.params.bookingId);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({ success: false, message: `Cannot check in a booking with status '${booking.status}'.` });
    }

    booking.status = 'active';
    booking.actualCheckInTime = new Date();
    await booking.save();

    // Log check-in action
    await StaffActivityLog.create({
      staff: staff._id,
      facility: booking.location,
      actionType: 'qr_check_in',
      shiftSlot: staff.shiftSlot || 'shift_1',
      details: `Vehicle ${booking.vehicle?.regNumber} checked into Bay ${booking.bay}`,
    });

    res.status(200).json({ success: true, message: 'Vehicle checked in successfully.', data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Check-Out vehicle
// @route   POST /api/staff/check-out/:bookingId
// @access  Private (Staff)
exports.checkOut = async (req, res) => {
  try {
    const staff = await User.findById(req.user.id);
    const booking = await Booking.findById(req.params.bookingId);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (booking.status !== 'active') {
      return res.status(400).json({ success: false, message: `Cannot check out booking with status '${booking.status}'.` });
    }

    booking.status = 'completed';
    booking.actualCheckOutTime = new Date();
    booking.paymentStatus = 'paid';
    booking.amountCollectedPaise = booking.pricingSnapshot?.totalAmountPaise || 4000;
    await booking.save();

    // Log check-out action
    await StaffActivityLog.create({
      staff: staff._id,
      facility: booking.location,
      actionType: 'vehicle_checkout',
      shiftSlot: staff.shiftSlot || 'shift_1',
      details: `Vehicle ${booking.vehicle?.regNumber} checked out. Fee finalized.`,
    });

    res.status(200).json({ success: true, message: 'Vehicle checked out and payment recorded.', data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};