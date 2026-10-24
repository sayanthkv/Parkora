const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();

// 1. Helmet Security Headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Clean trailing slashes from allowed origins
const cleanOrigin = (url) => (url ? url.replace(/\/+$/, '') : '');

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  cleanOrigin(process.env.CLIENT_URL),
].filter(Boolean);

// 2. CORS Middleware
app.use(
  cors({
    origin: function (origin, callback) {
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

// 3. Rate Limiting Middleware
// General API Rate Limiter (100 requests per 15 minutes per IP)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});

// Strict Rate Limiter for Authentication Routes (10 attempts per 15 minutes per IP)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login or registration attempts. Please try again after 15 minutes.',
  },
});

app.use(express.json({ limit: '10kb' })); // Restrict request payload size

// 4. Mount Routers with Rate Limiters
app.use('/api/auth', authLimiter, require('./routes/authRoutes'));
app.use('/api/locations', apiLimiter, require('./routes/locationRoutes'));
app.use('/api/bookings', apiLimiter, require('./routes/bookingRoutes'));
app.use('/api/staff', apiLimiter, require('./routes/staffRoutes'));
app.use('/api/admin', apiLimiter, require('./routes/adminRoutes'));

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Parkora Backend API Operational' });
});

// Centralized Error Handler
app.use(require('./middleware/errorHandler'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[Parkora Server running on port ${PORT}]`);
});