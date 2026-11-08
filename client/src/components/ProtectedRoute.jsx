import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50 text-[#0B3D2E]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B3D2E]"></div>
      </div>
    );
  }

  // Not logged in -> send to login preserving intent
  if (!user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  const userRole = user.role || 'customer';

  // Strict role boundaries
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    // 1. Staff trying to access Admin or Customer routes
    if (userRole === 'staff') {
      return <Navigate to="/staff" replace />;
    }

    // 2. Customer trying to access Admin or Staff routes
    if (userRole === 'customer') {
      return <Navigate to="/locations" replace />;
    }

    // 3. Admin trying to access Customer or Staff operations
    if (userRole === 'admin') {
      return <Navigate to="/admin" replace />;
    }

    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;