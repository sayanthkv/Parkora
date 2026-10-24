const mongoose = require('mongoose');

const floorSchema = new mongoose.Schema(
  {
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParkingLocation',
      required: true,
    },
    name: {
      type: String,
      required: true, // e.g., "Ground Floor", "Level 1"
    },
    level: {
      type: Number,
      required: true, // 0 for Ground, 1 for L1, etc.
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