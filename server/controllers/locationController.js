const ParkingLocation = require('../models/ParkingLocation');
const Floor = require('../models/Floor');
const ParkingBay = require('../models/ParkingBay');
const Booking = require('../models/Booking');

// @desc    Get all active parking facilities in Kannur
// @route   GET /api/locations
// @access  Public
exports.getLocations = async (req, res) => {
  try {
    const locations = await ParkingLocation.find({ isActive: true }).sort('name');
    res.status(200).json({ success: true, count: locations.length, data: locations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single location by ID or slug
// @route   GET /api/locations/:id
// @access  Public
exports.getLocationById = async (req, res) => {
  try {
    const { id } = req.params;
    const isObjectId = id.match(/^[0-9a-fA-F]{24}$/);
    const query = isObjectId ? { _id: id } : { slug: id };

    const location = await ParkingLocation.findOne(query);
    if (!location) {
      return res.status(404).json({ success: false, message: 'Location not found' });
    }

    const floors = await Floor.find({ location: location._id, isActive: true }).sort('level');
    res.status(200).json({ success: true, data: { location, floors } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get floor bays with interval availability
// @route   GET /api/locations/:locationId/floors/:floorId/bays
// @access  Public
exports.getFloorBaysWithAvailability = async (req, res) => {
  try {
    const { floorId } = req.params;
    const { startTime, endTime, vehicleType } = req.query;

    if (!startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both startTime and endTime query parameters',
      });
    }

    const reqStart = new Date(startTime);
    const reqEnd = new Date(endTime);

    // Query active bays for floor
    const bayFilter = { floor: floorId, isEnabled: true, status: 'active' };
    if (vehicleType && vehicleType !== 'all') {
      bayFilter.supportedVehicleType = vehicleType;
    }

    const bays = await ParkingBay.find(bayFilter).sort('bayNumber');
    const bayIds = bays.map((b) => b._id);

    // Check interval overlap: A_start < B_end AND B_start < A_end
    const overlappingBookings = await Booking.find({
      bay: { $in: bayIds },
      status: { $in: ['confirmed', 'active', 'pending'] },
      $and: [
        { startTime: { $lt: reqEnd } },
        { endTime: { $gt: reqStart } },
      ],
    }).select('bay');

    const reservedBaySet = new Set(overlappingBookings.map((b) => b.bay.toString()));

    const mappedBays = bays.map((bay) => ({
      _id: bay._id,
      bayNumber: bay.bayNumber,
      supportedVehicleType: bay.supportedVehicleType,
      isEVCharging: bay.isEVCharging,
      isAccessible: bay.isAccessible,
      status: bay.status,
      isAvailable: !reservedBaySet.has(bay._id.toString()),
    }));

    res.status(200).json({
      success: true,
      count: mappedBays.length,
      data: mappedBays,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};