const Booking = require('../models/Booking');
const ParkingLocation = require('../models/ParkingLocation');
const ParkingBay = require('../models/ParkingBay');
const User = require('../models/User');
const StaffActivityLog = require('../models/StaffActivityLog');
const { getActiveShiftDetails, getFacilityShiftRoster } = require('../utils/shiftHelper');
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
    const roster = getFacilityShiftRoster(facility.name);

    // Normalize user's assigned slot (e.g. 'shift_1' or 'shift_2')
    const userSlot = (currentStaff.shiftSlot || 'shift_1').toLowerCase();
    const personalShiftLabel = roster[userSlot] || roster.shift_1;

    // Strict boolean verification: Staff is on duty IF AND ONLY IF their personal slot matches the facility's active slot
    const isOnDuty = Boolean(shiftInfo.activeSlot && userSlot === shiftInfo.activeSlot);

    // Find whichever staff member is officially rostered for the facility's currently active shift
    const onDutyStaff = await User.findOne({
      assignedFacility: facility._id,
      shiftSlot: shiftInfo.activeSlot,
      isActive: true,
    }).select('-passwordHash');

    // Auto-record session initialization only when this staff member is legitimately on duty
    if (isOnDuty) {
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
        personalShiftLabel, // Personal schedule (e.g. "Shift 1: 06:00 – 18:00 IST")
        currentStaff,
        onDutyStaff,
        isOnDuty, // Strict Boolean check (never undefined or ambiguous)
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Switch to the on-duty staff member automatically (presentation helper)
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

// @desc    Verify QR token, Booking Reference, or Customer Phone Number
// @route   POST /api/staff/verify
// @access  Private (Staff)
exports.verifyTicket = async (req, res) => {
  try {
    const staff = await User.findById(req.user.id).populate('assignedFacility');
    if (!staff || !staff.assignedFacility) {
      return res.status(400).json({ success: false, isValid: false, message: 'Staff account has no assigned facility.' });
    }

    const facility = staff.assignedFacility;
    const shiftInfo = getActiveShiftDetails(facility.name);
    const userSlot = (staff.shiftSlot || 'shift_1').toLowerCase();

    // Strict duty guard
    const isOnDuty = Boolean(shiftInfo.activeSlot && userSlot === shiftInfo.activeSlot);
    if (!isOnDuty) {
      return res.status(403).json({
        success: false,
        isValid: false,
        message: `Duty Window Locked: You are currently off duty. Only on-duty personnel rostered for ${shiftInfo.label || 'Active Shift'} can scan and verify gate passes.`,
      });
    }

    const { bookingRef, qrToken } = req.body;
    const queryInput = (bookingRef || qrToken || '').trim();

    if (!queryInput) {
      return res.status(400).json({ success: false, isValid: false, message: 'Please provide a QR token, booking reference, or phone number.' });
    }

    let booking = null;
    const cleanDigits = queryInput.replace(/\D/g, '');

    // 1. PHONE NUMBER LOOKUP (10-digit mobile number)
    if (cleanDigits.length >= 10 && !queryInput.toUpperCase().startsWith('KSP-') && !queryInput.includes(':')) {
      const targetUser = await User.findOne({
        phone: { $regex: cleanDigits.slice(-10) + '$' }
      });

      if (!targetUser) {
        return res.status(404).json({ success: false, isValid: false, message: `No registered customer found for phone ending in ${cleanDigits.slice(-10)}.` });
      }

      // Fetch only upcoming or currently active passes for this user at this facility
      const now = new Date();
      const upcomingBookings = await populateBookingRecord(
        Booking.find({
          user: targetUser._id,
          location: facility._id,
          status: { $in: ['confirmed', 'active'] },
          endTime: { $gte: now },
        }).sort({ startTime: 1 })
      );

      if (!upcomingBookings || upcomingBookings.length === 0) {
        return res.status(404).json({
          success: false,
          isValid: false,
          message: `No active or upcoming reservations found for ${targetUser.name || 'this customer'} at this facility today.`
        });
      }

      // If multiple upcoming bookings exist, return the earliest upcoming one
      booking = upcomingBookings[0];
    } 
    // 2. CRYPTOGRAPHIC QR TOKEN LOOKUP (Format: Ref:RawSecret)
    else if (queryInput.includes(':')) {
      const [tokenRef, rawSecret] = queryInput.split(':');
      const expectedHash = crypto.createHash('sha256').update(rawSecret).digest('hex');

      booking = await populateBookingRecord(Booking.findOne({ bookingRef: tokenRef.trim().toUpperCase() }));

      if (booking) {
        const storedHashBuf = Buffer.from(booking.qrTokenHash || '', 'utf8');
        const calcHashBuf = Buffer.from(expectedHash, 'utf8');

        if (
          storedHashBuf.length !== calcHashBuf.length ||
          !crypto.timingSafeEqual(storedHashBuf, calcHashBuf)
        ) {
          return res.status(400).json({ success: false, isValid: false, message: 'Cryptographic QR token mismatch or invalid ticket signature.' });
        }
      }
    } 
    // 3. DIRECT ALPHANUMERIC REFERENCE LOOKUP (e.g. KSP-123456-789)
    else {
      booking = await populateBookingRecord(Booking.findOne({ bookingRef: queryInput.toUpperCase() }));
    }

    if (!booking) {
      return res.status(404).json({ success: false, isValid: false, message: 'Reservation pass not found.' });
    }

    // Facility Scoping Guard
    if (String(booking.location?._id || booking.location) !== String(facility._id)) {
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

    // Rule 1: No verification earlier than 5 minutes before scheduled start time
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

// @desc    Check-In vehicle (Guards shift duty & timing window)
// @route   POST /api/staff/check-in/:bookingId
// @access  Private (Staff)
exports.checkIn = async (req, res) => {
  try {
    const staff = await User.findById(req.user.id).populate('assignedFacility');
    if (!staff || !staff.assignedFacility) {
      return res.status(400).json({ success: false, message: 'Staff has no assigned facility.' });
    }

    const shiftInfo = getActiveShiftDetails(staff.assignedFacility.name);
    const userSlot = (staff.shiftSlot || 'shift_1').toLowerCase();
    const isOnDuty = Boolean(shiftInfo.activeSlot && userSlot === shiftInfo.activeSlot);

    if (!isOnDuty) {
      return res.status(403).json({
        success: false,
        message: 'Action Blocked: You are off duty. Only the on-duty staff operator can check in arriving vehicles.',
      });
    }

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

// @desc    Check-Out vehicle with 7-minute grace period & overtime fee calculation
// @route   POST /api/staff/check-out/:bookingId
// @access  Private (Staff)
exports.checkOut = async (req, res) => {
  try {
    const staff = await User.findById(req.user.id).populate('assignedFacility');
    if (!staff || !staff.assignedFacility) {
      return res.status(400).json({ success: false, message: 'Staff has no assigned facility.' });
    }

    const shiftInfo = getActiveShiftDetails(staff.assignedFacility.name);
    const userSlot = (staff.shiftSlot || 'shift_1').toLowerCase();
    const isOnDuty = Boolean(shiftInfo.activeSlot && userSlot === shiftInfo.activeSlot);

    if (!isOnDuty) {
      return res.status(403).json({
        success: false,
        message: 'Action Blocked: You are off duty. Only the on-duty staff operator can finalize vehicle checkout.',
      });
    }

    const booking = await populateBookingRecord(Booking.findById(req.params.bookingId));
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (booking.status !== 'active') {
      return res.status(400).json({ success: false, message: `Cannot check out booking with status '${booking.status}'.` });
    }

    const now = new Date();
    const endTime = new Date(booking.endTime);
    const overstayMinutes = Math.floor((now.getTime() - endTime.getTime()) / (60 * 1000));

    let overstayFeeRupees = 0;
    let extraHoursBilled = 0;

    // 7-minute grace period threshold
    if (overstayMinutes > 7) {
      extraHoursBilled = Math.ceil(overstayMinutes / 60);
      const hourlyRate = booking.bay?.customHourlyRate ?? booking.location?.pricing?.hourlyRate ?? 20;
      overstayFeeRupees = extraHoursBilled * hourlyRate;
    }

    const overstayFeePaise = Math.round(overstayFeeRupees * 100);
    const totalCollectedPaise = (booking.amountCollectedPaise || 0) + overstayFeePaise;

    booking.status = 'completed';
    booking.actualCheckOutTime = now;
    booking.amountCollectedPaise = totalCollectedPaise;
    if (overstayFeeRupees > 0) {
      booking.isOverstay = true;
      booking.overstayDetails = {
        minutes: overstayMinutes,
        extraHours: extraHoursBilled,
        feePaise: overstayFeePaise,
      };
    }
    await booking.save();

    await StaffActivityLog.create({
      staff: staff._id,
      facility: booking.location._id,
      actionType: 'vehicle_checkout',
      shiftSlot: staff.shiftSlot || 'shift_1',
      details: `Vehicle ${booking.vehicle?.regNumber} checked out. Overstay: ${overstayMinutes > 7 ? `${overstayMinutes}m (+₹${overstayFeeRupees})` : 'Within 7m grace'}.`,
    });

    res.status(200).json({
      success: true,
      message: overstayFeeRupees > 0 
        ? `Departure finalized. ₹${overstayFeeRupees} overstay fee collected (${overstayMinutes} mins past slot).`
        : 'Departure finalized within allowable grace period. No extra fee.',
      data: booking,
      overstay: {
        minutes: overstayMinutes,
        graceAllowed: overstayMinutes <= 7,
        feeRupees: overstayFeeRupees,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createWalkInBooking = async (req, res) => {
  try {
    const staff = await User.findById(req.user.id).populate('assignedFacility');
    if (!staff || !staff.assignedFacility) {
      return res.status(400).json({ success: false, message: 'Staff operator has no assigned facility.' });
    }

    const facility = staff.assignedFacility;
    const shiftInfo = getActiveShiftDetails(facility.name);
    const userSlot = (staff.shiftSlot || 'shift_1').toLowerCase();

    // STRICT DUTY CHECK: Block booking if outside operator's shift window
    const isOnDuty = Boolean(shiftInfo.activeSlot && userSlot === shiftInfo.activeSlot);

    if (!isOnDuty) {
      return res.status(403).json({
        success: false,
        message: `Duty Window Locked: You are currently off duty. Reservations can only be issued by the rostered staff member during their active shift window (${shiftInfo.label || 'Active Shift'}).`,
      });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const {
        bayId,
        floorId,
        customerName,
        customerPhone,
        customerEmail,
        vehicleRegNumber,
        vehicleType,
        durationHours,
        paymentMethod = 'cash',
      } = req.body;

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

      const allowedPaymentEnums = Booking.schema.path('paymentMethod')?.enumValues || ['pay_at_facility', 'razorpay'];
      let safePaymentMethod = 'pay_at_facility';

      if (allowedPaymentEnums.includes(paymentMethod)) {
        safePaymentMethod = paymentMethod;
      } else if (allowedPaymentEnums.includes('pay_at_facility')) {
        safePaymentMethod = 'pay_at_facility';
      } else {
        safePaymentMethod = allowedPaymentEnums[0];
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
            paymentStatus: 'paid',
            paymentMethod: safePaymentMethod,
            amountCollectedPaise: totalAmountPaise,
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
            details: `Walk-in pass issued (${paymentMethod.toUpperCase()}): Bay ${bay.bayNumber} for ${vehicleRegNumber} (Fee: ₹${totalAmountPaise / 100})`,
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
          paymentMethod: paymentMethod,
          qrTicketPayload: `${bookingRef}:${rawToken}`,
        },
      });
    } catch (innerError) {
      await session.abortTransaction();
      session.endSession();
      throw innerError;
    }
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
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