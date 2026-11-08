import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Locations from './pages/Locations';
import BookingFlow from './pages/BookingFlow';
import Ticket from './pages/Ticket';
import AdminDashboard from './pages/AdminDashboard';
import MyBookings from './pages/MyBookings';
import Profile from './pages/Profile';

// Dedicated Staff Pages
import StaffHome from './pages/StaffHome';
import StaffBookCustomer from './pages/StaffBookCustomer';
import StaffPortal from './pages/StaffPortal';
import StaffTodayBookings from './pages/StaffTodayBookings';

import ScrollToTop from './components/ScrollToTop';

function App() {
  return (
    <Router>
      <ScrollToTop />
      <div className="flex flex-col min-h-screen bg-white text-[#14201B] w-full font-body">
        <Navbar />
        
        <main className="flex-grow w-full bg-white">
          <Routes>
            {/* Public Access */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Customer Only / Authenticated User Routes */}
            <Route element={<ProtectedRoute allowedRoles={['customer', 'admin']} />}>
              <Route path="/locations" element={<Locations />} />
              <Route path="/book/:slug" element={<BookingFlow />} />
              <Route path="/ticket/:bookingRef" element={<Ticket />} />
              <Route path="/my-bookings" element={<MyBookings />} />
            </Route>

            {/* Common Profile Page */}
            <Route element={<ProtectedRoute allowedRoles={['customer', 'staff', 'admin']} />}>
              <Route path="/profile" element={<Profile />} />
            </Route>

            {/* Staff Isolated Operations Portal */}
            <Route element={<ProtectedRoute allowedRoles={['staff', 'admin']} />}>
              <Route path="/staff" element={<StaffHome />} />
              <Route path="/staff/book" element={<StaffBookCustomer />} />
              <Route path="/staff/terminal" element={<StaffPortal />} />
              <Route path="/staff/today-bookings" element={<StaffTodayBookings />} />
            </Route>

            {/* Admin Console Route */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>

            {/* Fallback Redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </Router>
  );
}

export default App;