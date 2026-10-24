const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();

// Allowed Origins Array
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.CLIENT_URL, // e.g. https://client-theta-puce-20.vercel.app
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow non-browser requests (Postman, curl, server-to-server)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
        return callback(null, true);
      } else {
        return callback(new Error('Not allowed by CORS policy'));
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