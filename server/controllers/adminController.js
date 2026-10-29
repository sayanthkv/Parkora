const User = require('../models/User');
const ParkingLocation = require('../models/ParkingLocation');
const Floor = require('../models/Floor');
const ParkingBay = require('../models/ParkingBay');
const Booking = require('../models/Booking');
const StaffActivityLog = require('../models/StaffActivityLog');
const { getActiveShiftDetails } = require('../utils/shiftHelper');
const bcrypt = require('bcryptjs');

// @desc    Get system-wide overview metrics
// @route   GET /api/admin/metrics
// @access  Private (Admin)
exports.getAdminMetrics = async (req, res) => {
  try {
    const totalLocations = await ParkingLocation.countDocuments();
    const totalBays = await ParkingBay.countDocuments();
    const totalBookings = await Booking.countDocuments();
    const activeBookings = await Booking.countDocuments({ status: 'active' });

    const revenueData = await Booking.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$pricingSnapshot.totalAmount' } } },
    ]);

    const totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;

    res.status(200).json({
      success: true,
      data: {
        totalLocations,
        totalBays,
        totalBookings,
        activeBookings,
        totalRevenue,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all locations with dual-shift operator metadata
// @route   GET /api/admin/locations-shifts
// @access  Private (Admin)
exports.getLocationsWithShifts = async (req, res) => {
  try {
    const locations = await ParkingLocation.find().lean();
    const staffMembers = await User.find({ role: 'staff', isActive: true }).lean();

    const enrichedLocations = locations.map((loc) => {
      const shiftInfo = getActiveShiftDetails(loc.name);

      const shift1Staff = staffMembers.find(
        (s) => String(s.assignedFacility) === String(loc._id) && s.shiftSlot === 'shift_1'
      ) || null;

      const shift2Staff = staffMembers.find(
        (s) => String(s.assignedFacility) === String(loc._id) && s.shiftSlot === 'shift_2'
      ) || null;

      let currentOnDuty = null;
      if (shiftInfo.activeSlot === 'shift_1') currentOnDuty = shift1Staff;
      if (shiftInfo.activeSlot === 'shift_2') currentOnDuty = shift2Staff;

      return {
        ...loc,
        shiftInfo,
        shift1Staff,
        shift2Staff,
        currentOnDuty,
      };
    });

    res.status(200).json({ success: true, data: enrichedLocations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Assign or Reassign staff to a specific shift slot at a facility
// @route   PATCH /api/admin/staff/:staffId/assign-shift
// @access  Private (Admin)
exports.assignStaffShift = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { facilityId, shiftSlot } = req.body; // shiftSlot: 'shift_1' | 'shift_2' | null

    const targetStaff = await User.findById(staffId);
    if (!targetStaff) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    if (targetStaff.isActive === false) {
      return res.status(400).json({ success: false, message: 'Cannot assign a deactivated staff operator.' });
    }

    // If assigning to a facility shift, ensure no other active staff holds that same slot
    if (facilityId && shiftSlot) {
      await User.updateMany(
        {
          _id: { $ne: staffId },
          assignedFacility: facilityId,
          shiftSlot,
          role: 'staff',
        },
        { $set: { assignedFacility: null, shiftSlot: null } }
      );
    }

    targetStaff.assignedFacility = facilityId || null;
    targetStaff.shiftSlot = facilityId ? shiftSlot || 'shift_1' : null;
    await targetStaff.save();

    const updatedStaff = await User.findById(staffId)
      .select('-passwordHash')
      .populate('assignedFacility', 'name address');

    res.status(200).json({
      success: true,
      message: 'Staff shift assigned successfully.',
      data: updatedStaff,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get full staff activity log (Audit Trail)
// @route   GET /api/admin/staff-activity
// @access  Private (Admin)
exports.getStaffActivityLogs = async (req, res) => {
  try {
    const logs = await StaffActivityLog.find()
      .populate('staff', 'name email phone shiftSlot')
      .populate('facility', 'name address')
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();

    res.status(200).json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a new parking facility
// @route   POST /api/admin/locations
// @access  Private (Admin)
exports.createLocation = async (req, res) => {
  try {
    const locationData = { ...req.body };

    if (typeof locationData.amenities === 'string') {
      locationData.amenities = locationData.amenities
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }

    if (req.file) {
      locationData.imageUrl = req.file.path;
    }

    const location = await ParkingLocation.create(locationData);
    res.status(201).json({ success: true, data: location });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a parking facility
// @route   PUT /api/admin/locations/:id
// @access  Private (Admin)
exports.updateLocation = async (req, res) => {
  try {
    const updateData = { ...req.body };

    if (typeof updateData.amenities === 'string') {
      updateData.amenities = updateData.amenities
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }

    if (req.file) {
      updateData.imageUrl = req.file.path;
    }

    const location = await ParkingLocation.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!location) {
      return res.status(404).json({ success: false, message: 'Facility not found.' });
    }

    res.status(200).json({ success: true, data: location });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a parking facility
// @route   DELETE /api/admin/locations/:id
// @access  Private (Admin)
exports.deleteLocation = async (req, res) => {
  try {
    const location = await ParkingLocation.findByIdAndDelete(req.params.id);

    if (!location) {
      return res.status(404).json({ success: false, message: 'Parking facility not found.' });
    }

    await ParkingBay.deleteMany({ location: req.params.id });
    await Floor.deleteMany({ location: req.params.id });

    await User.updateMany(
      { assignedFacility: req.params.id },
      { $unset: { assignedFacility: '', shiftSlot: '' } }
    );

    res.status(200).json({ success: true, message: 'Parking facility deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- FLOOR & BAY CONTROLLERS ---

exports.getLocationStructure = async (req, res) => {
  try {
    const { locationId } = req.params;
    const floors = await Floor.find({ location: locationId }).sort({ level: 1 });
    const bays = await ParkingBay.find({ location: locationId });

    res.status(200).json({
      success: true,
      data: { floors, bays },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createFloor = async (req, res) => {
  try {
    const { locationId } = req.params;
    const { name, level, layoutConfig } = req.body;

    const floor = await Floor.create({
      location: locationId,
      name,
      level: Number(level) || 0,
      layoutConfig: layoutConfig || { totalRows: 4, baysPerRow: 10 },
    });

    res.status(201).json({ success: true, data: floor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateFloor = async (req, res) => {
  try {
    const { floorId } = req.params;
    const floor = await Floor.findByIdAndUpdate(floorId, req.body, { new: true });
    
    if (!floor) {
      return res.status(404).json({ success: false, message: 'Floor not found.' });
    }
    
    res.status(200).json({ success: true, data: floor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteFloor = async (req, res) => {
  try {
    const { floorId } = req.params;
    await ParkingBay.deleteMany({ floor: floorId });
    await Floor.findByIdAndDelete(floorId);
    res.status(200).json({ success: true, message: 'Floor and associated bays removed.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createBay = async (req, res) => {
  try {
    const { locationId, floorId } = req.params;
    const { bayNumber, supportedVehicleType, customHourlyRate, isEVCharging, isAccessible, status, isMaintenance } = req.body;

    const bay = await ParkingBay.create({
      location: locationId,
      floor: floorId,
      bayNumber,
      supportedVehicleType: supportedVehicleType || 'car',
      customHourlyRate: customHourlyRate ? Number(customHourlyRate) : null,
      isEVCharging: Boolean(isEVCharging),
      isAccessible: Boolean(isAccessible),
      status: isMaintenance ? 'maintenance' : status || 'active',
    });

    res.status(201).json({ success: true, data: bay });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateBay = async (req, res) => {
  try {
    const { bayId } = req.params;
    const updateData = { ...req.body };

    if (updateData.isMaintenance !== undefined) {
      updateData.status = updateData.isMaintenance ? 'maintenance' : 'active';
    }

    const bay = await ParkingBay.findByIdAndUpdate(bayId, updateData, { new: true, runValidators: true });
    
    if (!bay) {
      return res.status(404).json({ success: false, message: 'Bay slot not found.' });
    }
    
    res.status(200).json({ success: true, data: bay });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteBay = async (req, res) => {
  try {
    const { bayId } = req.params;
    await ParkingBay.findByIdAndDelete(bayId);
    res.status(200).json({ success: true, message: 'Bay deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- STAFF CONTROLLERS ---

exports.createStaff = async (req, res) => {
  try {
    const { name, email, password, phone, assignedFacility, shiftSlot } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const staff = await User.create({
      name,
      email,
      passwordHash: hashedPassword,
      phone,
      role: 'staff',
      isActive: true,
      assignedFacility: assignedFacility || undefined,
      shiftSlot: assignedFacility ? shiftSlot || 'shift_1' : null,
    });

    res.status(201).json({
      success: true,
      data: {
        id: staff._id,
        name: staff.name,
        email: staff.email,
        assignedFacility: staff.assignedFacility,
        shiftSlot: staff.shiftSlot,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStaffMembers = async (req, res) => {
  try {
    const staff = await User.find({ role: 'staff' })
      .select('-passwordHash')
      .populate('assignedFacility', 'name address');

    res.status(200).json({
      success: true,
      count: staff.length,
      data: staff,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateStaff = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { name, email, phone, password } = req.body;

    const staffUser = await User.findById(staffId);
    if (!staffUser) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    if (email && email !== staffUser.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Email address already in use.' });
      }
      staffUser.email = email;
    }

    if (name) staffUser.name = name;
    if (phone !== undefined) staffUser.phone = phone;

    if (password && password.trim().length > 0) {
      const salt = await bcrypt.genSalt(10);
      staffUser.passwordHash = await bcrypt.hash(password, salt);
    }

    await staffUser.save();

    const updatedStaff = await User.findById(staffId)
      .select('-passwordHash')
      .populate('assignedFacility', 'name address');

    res.status(200).json({
      success: true,
      message: 'Staff account updated successfully.',
      data: updatedStaff,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.assignStaffFacility = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { facilityId, shiftSlot } = req.body;

    const targetStaff = await User.findById(staffId);
    if (!targetStaff) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    if (targetStaff.isActive === false) {
      return res.status(400).json({ success: false, message: 'Cannot assign a facility to a deactivated staff member.' });
    }

    targetStaff.assignedFacility = facilityId || null;
    targetStaff.shiftSlot = facilityId ? shiftSlot || 'shift_1' : null;
    await targetStaff.save();

    const staff = await User.findById(staffId)
      .select('-passwordHash')
      .populate('assignedFacility', 'name address');

    res.status(200).json({
      success: true,
      message: 'Staff facility and shift slot assigned successfully.',
      data: staff,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deactivateStaff = async (req, res) => {
  try {
    const { staffId } = req.params;

    const staffUser = await User.findById(staffId);
    if (!staffUser) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    const nextActiveState = staffUser.isActive === false;
    let updatePayload = { isActive: nextActiveState };

    if (!nextActiveState) {
      updatePayload.$unset = { assignedFacility: '', shiftSlot: '' };
    }

    const staff = await User.findByIdAndUpdate(
      staffId,
      updatePayload,
      { new: true }
    )
      .select('-passwordHash')
      .populate('assignedFacility', 'name address');

    res.status(200).json({
      success: true,
      message: `Staff operator ${nextActiveState ? 'activated' : 'deactivated'} successfully.`,
      data: staff,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('location', 'name')
      .populate('user', 'name email phone')
      .populate('bay', 'bayNumber')
      .populate('floor', 'name level')
      .sort('-createdAt')
      .lean();

    res.status(200).json({ success: true, count: bookings.length, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a staff account permanently
// @route   DELETE /api/admin/staff/:staffId
// @access  Private (Admin)
exports.deleteStaff = async (req, res) => {
  try {
    const { staffId } = req.params;

    const staffUser = await User.findById(staffId);
    if (!staffUser) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    if (staffUser.role !== 'staff') {
      return res.status(400).json({ success: false, message: 'Only staff accounts can be deleted here.' });
    }

    await User.findByIdAndDelete(staffId);

    res.status(200).json({
      success: true,
      message: `Staff account for ${staffUser.name} deleted successfully.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};