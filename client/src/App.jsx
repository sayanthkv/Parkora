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
import StaffPortal from './pages/StaffPortal';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <Router>
      {/* 
        Using bg-slate-50 (or bg-neutral-100) on the top wrapper spans 100% width 
        and matches the light content background, removing side black bars.
      */}
      <div className="flex flex-col min-h-screen bg-slate-50 text-neutral-900 w-full">
        <Navbar />
        
        {/* Main Content Area */}
        <main className="flex-grow w-full">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/locations" element={<Locations />} />

            {/* Authenticated Customer Routes */}
            <Route element={<ProtectedRoute allowedRoles={['customer', 'staff', 'admin']} />}>
              <Route path="/book/:locationId" element={<BookingFlow />} />
              <Route path="/ticket/:bookingRef" element={<Ticket />} />
            </Route>

            {/* Staff Only Routes */}
            <Route element={<ProtectedRoute allowedRoles={['staff', 'admin']} />}>
              <Route path="/staff" element={<StaffPortal />} />
            </Route>

            {/* Admin Only Routes */}
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