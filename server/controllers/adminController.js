const User = require('../models/User');
const ParkingLocation = require('../models/ParkingLocation');
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

    // Revenue sum from completed bookings
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

    // If Cloudinary file was uploaded via Multer, capture URL
    if (req.file) {
      locationData.imageUrl = req.file.path;
    }

    const location = await ParkingLocation.create(locationData);
    res.status(201).json({ success: true, data: location });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a parking facility (Handles Multer Cloudinary Upload)
// @route   PUT /api/admin/locations/:id
// @access  Private (Admin)
exports.updateLocation = async (req, res) => {
  try {
    const updateData = { ...req.body };

    // If a new Cloudinary image file was uploaded via Multer
    if (req.file) {
      updateData.imageUrl = req.file.path;
    }

    const location = await ParkingLocation.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!location) {
      return res.status(404).json({ success: false, message: 'Parking facility not found.' });
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

    // Unassign staff members attached to this facility
    await User.updateMany(
      { assignedFacility: req.params.id },
      { $unset: { assignedFacility: "" } }
    );

    res.status(200).json({ success: true, message: 'Parking facility deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a new staff account (Hashes Password via bcrypt)
// @route   POST /api/admin/staff
// @access  Private (Admin)
exports.createStaff = async (req, res) => {
  try {
    const { name, email, password, phone, assignedFacility } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already exists.' });
    }

    // Hash the password securely with 10 salt rounds
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
        { $unset: { assignedFacility: "" } }
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
      { isActive: false, $unset: { assignedFacility: "" } },
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
// @desc    Create a new parking facility
exports.createLocation = async (req, res) => {
  try {
    const locationData = { ...req.body };

    // Process amenities array if sent as comma-separated string or array
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
exports.updateLocation = async (req, res) => {
  try {
    const updateData = { ...req.body };

    // Process amenities array if sent as comma-separated string or array
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