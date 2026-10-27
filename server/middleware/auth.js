const jwt = require('jsonwebtoken');
const User = require('../models/User');

// @desc    Protect routes - Verify JWT token from Header or httpOnly Cookie
exports.protect = async (req, res, next) => {
  let token;

  // 1. Extract from "Authorization: Bearer <token>" header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  // 2. Fall back to secure httpOnly cookie (Flaw 8 protection against XSS)
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // Ensure token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route. Token missing.',
    });
  }

  try {
    // Verify token payload
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');

    // Retrieve user and populate assigned facility for staff scoping checks
    req.user = await User.findById(decoded.id).populate('assignedFacility', 'name address');

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.',
      });
    }

    // Immediate deactivation check: Invalidate active tokens if deactivated by admin
    if (req.user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated by an administrator. Access denied.',
      });
    }

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized. Invalid or expired token.',
    });
  }
};

// @desc    Grant access to specific roles (e.g., authorize('admin', 'staff'))
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user?.role}' is not authorized to perform this action.`,
      });
    }
    next();
  };
};