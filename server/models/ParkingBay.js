const mongoose = require('mongoose');

const parkingBaySchema = new mongoose.Schema(
  {
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParkingLocation',
      required: [true, 'Location reference is required'],
    },
    floor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Floor',
      required: [true, 'Floor reference is required'],
    },
    bayNumber: {
      type: String,
      required: [true, 'Bay slot code is required'], // e.g., "G-01", "L1-15"
      uppercase: true,
      trim: true,
    },
    supportedVehicleType: {
      type: String,
      enum: ['car', 'bike', 'ev', 'heavy'],
      default: 'car',
    },
    customHourlyRate: {
      type: Number,
      default: null, // If set, overrides location default hourly rate
    },
    isEVCharging: {
      type: Boolean,
      default: false,
    },
    isAccessible: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['active', 'maintenance', 'disabled'],
      default: 'active',
    },
    isEnabled: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Compound unique index to ensure bay numbers are unique per floor
parkingBaySchema.index({ floor: 1, bayNumber: 1 }, { unique: true });

module.exports = mongoose.model('ParkingBay', parkingBaySchema);