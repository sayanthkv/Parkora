const User = require('../models/User');
const ParkingLocation = require('../models/ParkingLocation');
const ParkingBay = require('../models/ParkingBay');
const Booking = require('../models/Booking');

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

// @desc    Create a new parking facility
// @route   POST /api/admin/locations
// @access  Private (Admin)
exports.createLocation = async (req, res) => {
  try {
    const location = await ParkingLocation.create(req.body);
    res.status(201).json({ success: true, data: location });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

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

    const staff = await User.create({
      name,
      email,
      passwordHash: password,
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