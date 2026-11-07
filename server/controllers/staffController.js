const Booking = require('../models/Booking');
const ParkingLocation = require('../models/ParkingLocation');
const ParkingBay = require('../models/ParkingBay');
const User = require('../models/User');
const StaffActivityLog = require('../models/StaffActivityLog');
const { getActiveShiftDetails } = require('../utils/shiftHelper');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const populateBookingRecord = (query) => {
  return query
    .populate('location', 'name address pricing')
    .populate('floor', 'name level')
    .populate('bay', 'bayNumber supportedVehicleType customHourlyRate')
    .populate('user', 'name email phone');
};

// @desc    Get on-duty staff information for facility & auto-log attendance
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

    const onDutyStaff = await User.findOne({
      assignedFacility: facility._id,
      shiftSlot: shiftInfo.activeSlot,
      isActive: true,
    }).select('-passwordHash');

    if (currentStaff.shiftSlot === shiftInfo.activeSlot) {
      const recentLog = await StaffActivityLog.findOne({
        staff: currentStaff._id,
        facility: facility._id,
        actionType: 'shift_start_login',
        timestamp: { $gte: new Date(Date.now() - 30 * 60 * 1000) },
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

// @desc    Switch to the on-duty staff member automatically
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

    const token = jwt.sign(
      { id: activeStaff._id, role: activeStaff.role },
      process.env.JWT_SECRET || 'secret_jwt_key',
      { expiresIn: '12h' }
    );

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

// @desc    Verify QR token or Booking Reference (Enforces 5-min early & 15-min auto-cancel)
// @route   POST /api/staff/verify
// @access  Private (Staff)
exports.verifyTicket = async (req, res) => {
  try {
    const { bookingRef, qrToken } = req.body;
    let booking = null;

    if (bookingRef) {
      booking = await populateBookingRecord(Booking.findOne({ bookingRef: bookingRef.trim().toUpperCase() }));
    } else if (qrToken && qrToken.includes(':')) {
      const [tokenRef, rawSecret] = qrToken.split(':');
      const expectedHash = crypto.createHash('sha256').update(rawSecret).digest('hex');

      booking = await populateBookingRecord(Booking.findOne({ bookingRef: tokenRef.trim().toUpperCase() }));

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

    const staff = await User.findById(req.user.id);
    if (
      staff &&
      staff.assignedFacility &&
      String(booking.location?._id || booking.location) !== String(staff.assignedFacility)
    ) {
      return res.status(403).json({
        success: false,
        isValid: false,
        message: `Facility Mismatch: This pass belongs to ${booking.location?.name || 'another facility'}.`,
        data: booking,
      });
    }

    const now = new Date();
    const startTime = new Date(booking.startTime);
    const diffMinutes = (now.getTime() - startTime.getTime()) / (60 * 1000);

    if (booking.status === 'active' || booking.status === 'completed') {
      return res.status(200).json({
        success: true,
        isValid: true,
        message: booking.status === 'active' ? 'Vehicle is currently parked on-site.' : 'Reservation already completed.',
        data: booking,
      });
    }

    if (booking.status === 'cancelled' || booking.status === 'no_show') {
      return res.status(400).json({
        success: false,
        isValid: false,
        message: `Reservation is CANCELLED (${booking.cancellationReason || 'Slot expired'}).`,
        data: booking,
      });
    }

    // Rule 1: No entry earlier than 5 minutes before scheduled start time
    if (diffMinutes < -5) {
      const allowedTimeStr = new Date(startTime.getTime() - 5 * 60 * 1000).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      return res.status(400).json({
        success: false,
        isValid: false,
        message: `Early Arrival: Verification opens strictly 5 minutes before start (from ${allowedTimeStr} IST).`,
        data: booking,
      });
    }

    // Rule 2: Unclaimed after 15 minutes -> Auto-cancel
    if (diffMinutes > 15) {
      booking.status = 'cancelled';
      booking.cancelledAt = now;
      booking.cancellationReason = 'Auto-cancelled: Customer failed to arrive within the 15-minute grace window.';
      await booking.save();

      return res.status(400).json({
        success: false,
        isValid: false,
        message: 'Reservation Expired: 15 minutes past start time. Slot has been cancelled and returned to the pool.',
        data: booking,
      });
    }

    res.status(200).json({
      success: true,
      isValid: true,
      message: 'Ticket verified successfully. Ready for Check-In.',
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

    const now = new Date();
    const startTime = new Date(booking.startTime);
    const diffMinutes = (now.getTime() - startTime.getTime()) / (60 * 1000);

    if (diffMinutes < -5) {
      return res.status(400).json({
        success: false,
        message: 'Check-in blocked: Verification only allowed from 5 minutes before start time.',
      });
    }

    if (diffMinutes > 15) {
      booking.status = 'cancelled';
      booking.cancelledAt = now;
      booking.cancellationReason = 'Auto-cancelled: Arrival exceeded 15-minute grace window.';
      await booking.save();

      return res.status(400).json({
        success: false,
        message: 'Check-in expired: Over 15 minutes past start time. Reservation cancelled automatically.',
      });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({ success: false, message: `Cannot check in a booking with status '${booking.status}'.` });
    }

    booking.status = 'active';
    booking.actualCheckInTime = now;
    await booking.save();

    await StaffActivityLog.create({
      staff: staff._id,
      facility: booking.location,
      actionType: 'qr_check_in',
      shiftSlot: staff.shiftSlot || 'shift_1',
      details: `Vehicle ${booking.vehicle?.regNumber} checked in.`,
    });

    const populated = await populateBookingRecord(Booking.findById(booking._id));

    res.status(200).json({
      success: true,
      message: 'Vehicle checked in successfully.',
      data: populated,
    });
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
    booking.amountCollectedPaise =
      booking.pricingSnapshot?.totalAmountPaise ||
      (booking.pricingSnapshot?.totalAmount ? booking.pricingSnapshot.totalAmount * 100 : 4000);
    await booking.save();

    await StaffActivityLog.create({
      staff: staff._id,
      facility: booking.location,
      actionType: 'vehicle_checkout',
      shiftSlot: staff.shiftSlot || 'shift_1',
      details: `Vehicle ${booking.vehicle?.regNumber} checked out. Fee finalized.`,
    });

    const populated = await populateBookingRecord(Booking.findById(booking._id));

    res.status(200).json({
      success: true,
      message: 'Vehicle checked out & departure finalized.',
      data: populated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Staff creates an on-spot bay booking for a walk-in customer (locked to staff's facility)
// @route   POST /api/staff/book-customer
// @access  Private (Staff)
exports.createWalkInBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const staff = await User.findById(req.user.id).session(session);
    if (!staff || !staff.assignedFacility) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Staff operator has no assigned facility.' });
    }

    const {
      bayId,
      floorId,
      customerEmail,
      vehicleRegNumber,
      vehicleType,
      durationHours,
    } = req.body;

    const facility = await ParkingLocation.findById(staff.assignedFacility).session(session);
    if (!facility) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Assigned facility not found.' });
    }

    const reqStart = new Date();
    const parsedDuration = Math.max(1, Number(durationHours) || 1);
    const reqEnd = new Date(reqStart.getTime() + parsedDuration * 60 * 60 * 1000);

    const bay = await ParkingBay.findOneAndUpdate(
      {
        _id: bayId,
        location: facility._id,
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
      return res.status(404).json({ success: false, message: 'Selected parking bay is unavailable or under maintenance.' });
    }

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
        message: 'Bay conflict: This bay was just occupied. Please select another slot.',
      });
    }

    const hourlyRateRupees = bay.customHourlyRate ?? facility.pricing?.hourlyRate ?? 30;
    const baseFeeRupees = facility.pricing?.baseRate || 0;
    const hourlyRatePaise = Math.round(hourlyRateRupees * 100);
    const baseFeePaise = Math.round(baseFeeRupees * 100);
    const totalAmountPaise = (parsedDuration * hourlyRatePaise) + baseFeePaise;

    const bookingRef = `KSP-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const rawToken = crypto.randomBytes(32).toString('hex');
    const qrTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    let targetUserId = req.user.id;
    if (customerEmail) {
      const existingCust = await User.findOne({ email: customerEmail.toLowerCase().trim() }).session(session);
      if (existingCust) targetUserId = existingCust._id;
    }

    const [booking] = await Booking.create(
      [
        {
          bookingRef,
          user: targetUserId,
          location: facility._id,
          floor: floorId,
          bay: bayId,
          vehicle: {
            regNumber: vehicleRegNumber.toUpperCase().trim(),
            vehicleType: vehicleType || 'car',
          },
          startTime: reqStart,
          endTime: reqEnd,
          actualCheckInTime: reqStart,
          status: 'active',
          pricingSnapshot: {
            hourlyRatePaise,
            baseFeePaise,
            durationHours: parsedDuration,
            totalAmountPaise,
          },
          paymentStatus: 'pending',
          paymentMethod: 'pay_at_facility',
          amountCollectedPaise: 0,
          qrTokenHash,
          bookedByStaff: staff._id,
        },
      ],
      { session }
    );

    await StaffActivityLog.create(
      [
        {
          staff: staff._id,
          facility: facility._id,
          actionType: 'qr_check_in',
          shiftSlot: staff.shiftSlot || 'shift_1',
          details: `Walk-in registration: Booked Bay ${bay.bayNumber} for ${vehicleRegNumber}`,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    const populated = await Booking.findById(booking._id)
      .populate('location', 'name address pricing')
      .populate('floor', 'name level')
      .populate('bay', 'bayNumber supportedVehicleType')
      .lean();

    res.status(201).json({
      success: true,
      message: 'Walk-in booking created and vehicle checked in.',
      data: {
        ...populated,
        qrTicketPayload: `${bookingRef}:${rawToken}`,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all reservations made today for this staff member's facility
// @route   GET /api/staff/today-bookings
// @access  Private (Staff)
exports.getStaffTodayBookings = async (req, res) => {
  try {
    const staff = await User.findById(req.user.id);
    if (!staff.assignedFacility) {
      return res.status(400).json({ success: false, message: 'No facility assigned.' });
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await Booking.find({
      location: staff.assignedFacility,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    })
      .populate('user', 'name email phone')
      .populate('floor', 'name')
      .populate('bay', 'bayNumber supportedVehicleType')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, count: bookings.length, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};