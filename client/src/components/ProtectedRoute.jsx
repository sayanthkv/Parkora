import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute Wrapper
 * @param {Array<string>} allowedRoles - Array of allowed roles, e.g. ['admin', 'staff']
 */
const ProtectedRoute = ({ allowedRoles }) => {
  const { user, loading } = useAuth();

  // 1. Show a loading spinner while checking local storage / JWT validity
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-neutral-900 text-white">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  // 2. If user is not logged in, redirect to login page
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 3. If user role is not permitted, redirect to home page or unauthorized view
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // 4. Render children routes if authorized
  return <Outlet />;
};

export default ProtectedRoute;