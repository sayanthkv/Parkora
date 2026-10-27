const mongoose = require('mongoose');

const parkingLocationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Facility name is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    address: {
      street: String,
      area: String,
      city: { type: String, default: 'Kannur' },
      state: { type: String, default: 'Kerala' },
      pincode: String,
    },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    description: { type: String, default: '' },
    amenities: [{ type: String }], // Points like '24/7 Access', 'CCTV', 'Covered Parking'
    imageUrl: String,
    operatingHours: {
      is24x7: { type: Boolean, default: true },
      openTime: { type: String, default: '00:00' },
      closeTime: { type: String, default: '23:59' },
    },
    supportedVehicleTypes: [{
      type: String,
      enum: ['car', 'bike', 'ev', 'heavy'],
    }],
    pricing: {
      hourlyRate: { type: Number, required: true },
      baseRate: { type: Number, default: 0 },
      baseHours: { type: Number, default: 1 },
      gracePeriodMinutes: { type: Number, default: 15 },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ParkingLocation', parkingLocationSchema);