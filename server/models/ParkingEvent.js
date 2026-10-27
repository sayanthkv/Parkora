const mongoose = require('mongoose');

const parkingEventSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true,
    },
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParkingLocation',
      index: true,
    },
    eventType: {
      type: String,
      enum: ['QR_SCAN_VERIFIED', 'CHECK_IN', 'CHECK_OUT', 'PAYMENT_COLLECTED', 'OVERSTAY_FLAGGED'],
      required: true,
    },
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amountCollectedPaise: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ParkingEvent', parkingEventSchema);