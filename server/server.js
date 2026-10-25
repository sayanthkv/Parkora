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
  'http://127.0.0.1:5173',
  cleanOrigin(process.env.CLIENT_URL),
].filter(Boolean);

// 2. CORS Middleware
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, or Postman)
      if (!origin) return callback(null, true);

      const normalizedOrigin = cleanOrigin(origin);

      if (
        allowedOrigins.includes(normalizedOrigin) ||
        allowedOrigins.includes('*') ||
        process.env.NODE_ENV !== 'production' // Always allow any localhost in development mode
      ) {
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

// 3. Payload Size Limit (Increased to allow base64 image uploads)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 4. Rate Limiting Middleware (Skipped automatically during local testing)
const isDev = process.env.NODE_ENV !== 'production';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: () => isDev, // Don't rate limit while testing locally
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skip: () => isDev, // Don't block repetitive auth tests locally
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login or registration attempts. Please try again after 15 minutes.',
  },
});

// 5. Mount Routers
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