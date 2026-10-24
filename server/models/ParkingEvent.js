const mongoose = require('mongoose');

const parkingEventSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    eventType: {
      type: String,
      enum: ['CHECK_IN', 'CHECK_OUT', 'QR_SCAN_VERIFIED', 'MANUAL_OVERRIDE'],
      required: true,
    },
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ParkingEvent', parkingEventSchema);