const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();

// Clean trailing slashes from environment variable and allowed origins
const cleanOrigin = (url) => url ? url.replace(/\/+$/, '') : '';

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  cleanOrigin(process.env.CLIENT_URL),
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (Postman, mobile apps)
      if (!origin) return callback(null, true);

      const normalizedOrigin = cleanOrigin(origin);

      if (allowedOrigins.includes(normalizedOrigin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      } else {
        return callback(new Error(`CORS blocked for origin: ${origin}`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/locations', require('./routes/locationRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/staff', require('./routes/staffRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Parkora Backend API Operational' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[Parkora Server running on port ${PORT}]`);
});