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
    description: String,
    imageUrl: String,
    operatingHours: {
      is24x7: { type: Boolean, default: true },
      openTime: { type: String, default: '00:00' }, // HH:mm format
      closeTime: { type: String, default: '23:59' },
    },
    amenities: [{ type: String }], // e.g., ['CCTV', 'EV Charging', 'Covered Parking', 'Valet']
    supportedVehicleTypes: [{
      type: String,
      enum: ['car', 'bike', 'ev', 'heavy'],
    }],
    pricing: {
      hourlyRate: { type: Number, required: true }, // Rates in INR (₹)
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