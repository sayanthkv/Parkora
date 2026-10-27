const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const initBookingLifecycleJob = require('./jobs/bookingLifecycleJob');

dotenv.config();
connectDB();

const app = express();

// Trust reverse proxy (Essential on Render, Heroku, or behind Cloudflare/AWS ALB)
app.set('trust proxy', 1);

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

// 2. CORS Middleware (with credentials enabled for httpOnly cookies)
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);

      const normalizedOrigin = cleanOrigin(origin);

      if (
        allowedOrigins.includes(normalizedOrigin) ||
        process.env.NODE_ENV !== 'production'
      ) {
        return callback(null, true);
      } else {
        return callback(new Error(`CORS blocked for origin: ${origin}`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true, // Allow httpOnly session cookies across origins
  })
);

// 3. Parsers & Data Sanitization
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

// Defend against NoSQL query selector injection ($gt, $ne, etc.)
// New
app.use((req, res, next) => {
  if (req.body) mongoSanitize.sanitize(req.body);
  if (req.params) mongoSanitize.sanitize(req.params);
  next();
});

// 4. Rate Limiting Middleware
const isDev = process.env.NODE_ENV !== 'production';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  skip: () => isDev,
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
  skip: () => isDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
});

// 5. Health Check & Keep-Alive Endpoint (Flaw 10)
app.get('/api/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;

  res.status(isDbConnected ? 200 : 503).json({
    status: isDbConnected ? 'OK' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    database: isDbConnected ? 'Connected' : 'Disconnected',
    uptimeSeconds: Math.floor(process.uptime()),
    memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
  });
});

// 6. Mount Routers
app.use('/api/auth', authLimiter, require('./routes/authRoutes'));
app.use('/api/locations', apiLimiter, require('./routes/locationRoutes'));
app.use('/api/bookings', apiLimiter, require('./routes/bookingRoutes'));
app.use('/api/staff', apiLimiter, require('./routes/staffRoutes'));
app.use('/api/admin', apiLimiter, require('./routes/adminRoutes'));

// Centralized Error Handler
app.use(require('./middleware/errorHandler'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[Parkora Server running on port ${PORT}]`);

  // Boot automated lifecycle background worker (Flaw 4)
  initBookingLifecycleJob();
});