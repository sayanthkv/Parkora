const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    bookingRef: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParkingLocation',
      required: true,
      index: true,
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
      index: true,
    },
    vehicle: {
      regNumber: {
        type: String,
        required: true,
        uppercase: true,
        trim: true,
      },
      vehicleType: {
        type: String,
        enum: ['car', 'bike', 'ev', 'heavy'],
        required: true,
      },
    },
    startTime: {
      type: Date,
      required: true,
      index: true,
    },
    endTime: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'active', 'completed', 'cancelled', 'no_show'],
      default: 'confirmed',
      index: true,
    },
    pricingSnapshot: {
      hourlyRatePaise: { type: Number, default: 0 },
      baseFeePaise: { type: Number, default: 0 },
      durationHours: { type: Number, default: 1 },
      totalAmountPaise: { type: Number, default: 0 },
      hourlyRate: { type: Number },
      totalAmount: { type: Number },
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refunded', 'pay_at_facility'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['pay_at_facility', 'razorpay'],
      default: 'pay_at_facility',
    },
    amountCollectedPaise: {
      type: Number,
      default: 0,
    },
    // Razorpay transaction identifiers
    razorpayOrderId: {
      type: String,
      default: null,
    },
    razorpayPaymentId: {
      type: String,
      default: null,
    },
    razorpaySignature: {
      type: String,
      default: null,
    },
    qrTokenHash: {
      type: String,
      required: true,
      select: false,
    },
    checkInTime: { type: Date, default: null },
    checkOutTime: { type: Date, default: null },
    checkedInBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    checkedOutBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isOverstay: { type: Boolean, default: false },
    cancelledAt: { type: Date, default: null },
    cancellationReason: { type: String, default: null },
  },
  { timestamps: true }
);

// Compound index for fast non-overlapping interval lookups
bookingSchema.index({ bay: 1, status: 1, startTime: 1, endTime: 1 });

module.exports = mongoose.model('Booking', bookingSchema);