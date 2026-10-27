const mongoose = require('mongoose');

const floorSchema = new mongoose.Schema(
  {
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParkingLocation',
      required: [true, 'Location reference is required'],
    },
    name: {
      type: String,
      required: [true, 'Floor name is required'], // e.g., "Ground Floor", "Level 1"
      trim: true,
    },
    level: {
      type: Number,
      required: [true, 'Floor level number is required'], // 0 for Ground, 1 for L1, etc.
      default: 0,
    },
    layoutConfig: {
      totalRows: { type: Number, default: 4 },
      baysPerRow: { type: Number, default: 10 },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Floor', floorSchema);