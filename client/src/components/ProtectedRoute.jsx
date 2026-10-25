import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // 1. Show loading spinner while AuthContext checks JWT token
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-[#F7F4EE] text-[#0B3D2E]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B3D2E]"></div>
      </div>
    );
  }

  // 2. If user is not logged in, redirect to login page preserving destination URL
  if (!user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  // 3. Fallback role check (defaults to 'customer' if role field is unassigned)
  const userRole = user.role || 'customer';

  // 4. If user role is not allowed, redirect to home
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/" replace />;
  }

  // 5. Render protected child component
  return <Outlet />;
};

export default ProtectedRoute;