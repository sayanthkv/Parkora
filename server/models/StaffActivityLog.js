const mongoose = require('mongoose');

const staffActivityLogSchema = new mongoose.Schema(
  {
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    facility: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParkingLocation',
      required: true,
    },
    actionType: {
      type: String,
      enum: ['shift_start_login', 'qr_check_in', 'vehicle_checkout', 'manual_verify'],
      required: true,
    },
    shiftSlot: {
      type: String,
      enum: ['shift_1', 'shift_2'],
      required: true,
    },
    details: {
      type: String,
      default: '',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StaffActivityLog', staffActivityLogSchema);