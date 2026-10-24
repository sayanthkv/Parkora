const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    bookingRef: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
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
    bay: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParkingBay',
      required: true,
    },
    vehicle: {
      regNumber: { type: String, required: true, uppercase: true },
      vehicleType: { type: String, required: true },
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'active', 'completed', 'cancelled', 'expired'],
      default: 'confirmed',
    },
    pricingSnapshot: {
      hourlyRate: Number,
      baseFee: Number,
      durationHours: Number,
      totalAmount: { type: Number, required: true },
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'pay_at_facility'],
      default: 'pay_at_facility',
    },
    qrToken: {
      type: String,
      required: true,
    },
    checkInTime: { type: Date, default: null },
    checkOutTime: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancellationReason: { type: String, default: '' },
  },
  { timestamps: true }
);

// Compound Index to drastically speed up interval overlap lookups
bookingSchema.index({ bay: 1, status: 1, startTime: 1, endTime: 1 });

module.exports = mongoose.model('Booking', bookingSchema);