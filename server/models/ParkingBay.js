const mongoose = require('mongoose');

const parkingBaySchema = new mongoose.Schema(
  {
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParkingLocation',
      required: true,
    },
    floor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Floor',
      required: true,
    },
    bayNumber: {
      type: String,
      required: true, // e.g., "G-01", "L1-15"
      uppercase: true,
    },
    supportedVehicleType: {
      type: String,
      enum: ['car', 'bike', 'ev', 'heavy'],
      default: 'car',
    },
    isEVCharging: { type: Boolean, default: false },
    isAccessible: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['active', 'maintenance', 'disabled'],
      default: 'active',
    },
    isEnabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Compound unique index so bay numbers are unique per floor
parkingBaySchema.index({ floor: 1, bayNumber: 1 }, { unique: true });

module.exports = mongoose.model('ParkingBay', parkingBaySchema);