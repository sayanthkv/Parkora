const User = require('../models/User');
const ParkingLocation = require('../models/ParkingLocation');
const Floor = require('../models/Floor');
const ParkingBay = require('../models/ParkingBay');
const Booking = require('../models/Booking');
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

// @desc    Create a new parking facility (Handles Multer Cloudinary Upload)
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

// @desc    Delete a parking facility (Cascades floor and bay removal)
// @route   DELETE /api/admin/locations/:id
// @access  Private (Admin)
exports.deleteLocation = async (req, res) => {
  try {
    const location = await ParkingLocation.findByIdAndDelete(req.params.id);

    if (!location) {
      return res.status(404).json({ success: false, message: 'Parking facility not found.' });
    }

    // Cascade deletion of attached floors and bays
    await ParkingBay.deleteMany({ location: req.params.id });
    await Floor.deleteMany({ location: req.params.id });

    // Unassign staff attached to this facility
    await User.updateMany(
      { assignedFacility: req.params.id },
      { $unset: { assignedFacility: '' } }
    );

    res.status(200).json({ success: true, message: 'Parking facility deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- FLOOR & BAY CONTROLLERS ---

// @desc    Get floors and bays for a facility
// @route   GET /api/admin/locations/:locationId/structure
// @access  Private (Admin)
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

// @desc    Create a new Floor for a Facility
// @route   POST /api/admin/locations/:locationId/floors
// @access  Private (Admin)
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

// @desc    Update a Floor
// @route   PUT /api/admin/floors/:floorId
// @access  Private (Admin)
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

// @desc    Delete a Floor and its associated Bays
// @route   DELETE /api/admin/floors/:floorId
// @access  Private (Admin)
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

// @desc    Create a new Bay inside a Floor
// @route   POST /api/admin/locations/:locationId/floors/:floorId/bays
// @access  Private (Admin)
exports.createBay = async (req, res) => {
  try {
    const { locationId, floorId } = req.params;
    const { bayNumber, supportedVehicleType, isEVCharging, isAccessible, status } = req.body;

    const bay = await ParkingBay.create({
      location: locationId,
      floor: floorId,
      bayNumber,
      supportedVehicleType: supportedVehicleType || 'car',
      isEVCharging: Boolean(isEVCharging),
      isAccessible: Boolean(isAccessible),
      status: status || 'active',
    });

    res.status(201).json({ success: true, data: bay });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update an individual Bay
// @route   PUT /api/admin/bays/:bayId
// @access  Private (Admin)
exports.updateBay = async (req, res) => {
  try {
    const { bayId } = req.params;
    const bay = await ParkingBay.findByIdAndUpdate(bayId, req.body, { new: true, runValidators: true });
    
    if (!bay) {
      return res.status(404).json({ success: false, message: 'Bay slot not found.' });
    }
    
    res.status(200).json({ success: true, data: bay });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a Bay
// @route   DELETE /api/admin/bays/:bayId
// @access  Private (Admin)
exports.deleteBay = async (req, res) => {
  try {
    const { bayId } = req.params;
    await ParkingBay.findByIdAndDelete(bayId);
    res.status(200).json({ success: true, message: 'Bay deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- STAFF & BOOKINGS CONTROLLERS ---

// @desc    Create a new staff account
// @route   POST /api/admin/staff
// @access  Private (Admin)
exports.createStaff = async (req, res) => {
  try {
    const { name, email, password, phone, assignedFacility } = req.body;

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
      assignedFacility,
    });

    res.status(201).json({
      success: true,
      data: {
        id: staff._id,
        name: staff.name,
        email: staff.email,
        assignedFacility: staff.assignedFacility,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all staff members
// @route   GET /api/admin/staff
// @access  Private (Admin)
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

// @desc    Assign or Reassign facility to a staff operator
// @route   PATCH /api/admin/staff/:staffId/assign
// @access  Private (Admin)
exports.assignStaffFacility = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { facilityId } = req.body;

    if (facilityId) {
      await User.updateMany(
        { assignedFacility: facilityId, role: 'staff' },
        { $unset: { assignedFacility: '' } }
      );
    }

    const staff = await User.findByIdAndUpdate(
      staffId,
      { assignedFacility: facilityId },
      { new: true }
    )
      .select('-passwordHash')
      .populate('assignedFacility', 'name address');

    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    res.status(200).json({
      success: true,
      message: 'Staff facility reassigned successfully.',
      data: staff,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Deactivate a staff account
// @route   PATCH /api/admin/staff/:staffId/deactivate
// @access  Private (Admin)
exports.deactivateStaff = async (req, res) => {
  try {
    const { staffId } = req.params;

    const staff = await User.findByIdAndUpdate(
      staffId,
      { isActive: false, $unset: { assignedFacility: '' } },
      { new: true }
    ).select('-passwordHash');

    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    res.status(200).json({
      success: true,
      message: 'Staff operator deactivated successfully.',
      data: staff,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all system bookings (Admin view)
// @route   GET /api/admin/bookings
// @access  Private (Admin)
exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('location', 'name')
      .populate('user', 'name email phone')
      .populate('bay', 'bayNumber')
      .sort('-createdAt');

    res.status(200).json({ success: true, count: bookings.length, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};