import React, { useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { 
  Menu, X, User, LogOut, PlusCircle, LayoutGrid, Calendar, 
  BarChart3, Building2, Users, Activity, FileSpreadsheet 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const currentLocation = useLocation();
  const [searchParams] = useSearchParams();

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/login');
  };

  const isStaff = user?.role === 'staff';
  const isAdmin = user?.role === 'admin';

  // Read active admin tab from query param or default to 'overview'
  const currentAdminTab = searchParams.get('tab') || 'overview';

  const handleNavHome = () => {
    setMenuOpen(false);
    if (isAdmin) {
      navigate('/admin');
      return;
    }
    if (isStaff) {
      navigate('/staff');
      return;
    }
    if (currentLocation.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate('/');
    }
  };

  const handleNavSection = (sectionId) => {
    setMenuOpen(false);
    if (isStaff || isAdmin) return;

    const scrollFn = () => {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    };

    if (currentLocation.pathname === '/') {
      scrollFn();
    } else {
      navigate('/');
      setTimeout(scrollFn, 150);
    }
  };

  return (
    <>
      <div className="fixed top-5 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto font-body">
        <nav className="bg-white/95 backdrop-blur-md border border-slate-200 shadow-sm rounded-full px-6 py-2.5 flex items-center justify-between transition-all duration-300">
          
          {/* Brand Logo Button */}
          <button 
            type="button" 
            onClick={handleNavHome} 
            className="group focus:outline-none text-left cursor-pointer flex items-center gap-1.5 shrink-0 mr-4"
          >
            <div>
              <span className="font-heading font-extrabold text-2xl text-slate-900 tracking-tight group-hover:text-emerald-600 transition-colors block leading-none">
                Parkora
              </span>
              {isAdmin ? (
                <span className="text-[10px] font-semibold text-emerald-700 block mt-0.5">
                  Admin Core
                </span>
              ) : isStaff ? (
                <span className="text-[10px] font-semibold text-amber-700 block mt-0.5">
                  Staff Station
                </span>
              ) : null}
            </div>
          </button>

          {/* Center Navigation Links (Desktop) */}
          <div className="hidden lg:flex items-center space-x-6 text-sm font-medium text-slate-700">
            
            {/* 1. Admin Navigation */}
            {isAdmin && (
              <>
                <Link
                  to="/admin?tab=overview"
                  className={`flex items-center gap-1.5 transition-colors ${
                    currentLocation.pathname === '/admin' && currentAdminTab === 'overview'
                      ? 'text-[#0B3D2E] font-bold border-b-2 border-[#0B3D2E] pb-0.5'
                      : 'hover:text-slate-900'
                  }`}
                >
                  <BarChart3 className="w-4 h-4 text-[#0B3D2E]" /> System Overview
                </Link>

                <Link
                  to="/admin?tab=facilities"
                  className={`flex items-center gap-1.5 transition-colors ${
                    currentLocation.pathname === '/admin' && currentAdminTab === 'facilities'
                      ? 'text-[#0B3D2E] font-bold border-b-2 border-[#0B3D2E] pb-0.5'
                      : 'hover:text-slate-900'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-[#0B3D2E]" /> Facilities & Shifts
                </Link>

                <Link
                  to="/admin?tab=staff"
                  className={`flex items-center gap-1.5 transition-colors ${
                    currentLocation.pathname === '/admin' && currentAdminTab === 'staff'
                      ? 'text-[#0B3D2E] font-bold border-b-2 border-[#0B3D2E] pb-0.5'
                      : 'hover:text-slate-900'
                  }`}
                >
                  <Users className="w-4 h-4 text-[#0B3D2E]" /> Staff Directory
                </Link>

                <Link
                  to="/admin?tab=audit"
                  className={`flex items-center gap-1.5 transition-colors ${
                    currentLocation.pathname === '/admin' && currentAdminTab === 'audit'
                      ? 'text-[#0B3D2E] font-bold border-b-2 border-[#0B3D2E] pb-0.5'
                      : 'hover:text-slate-900'
                  }`}
                >
                  <Activity className="w-4 h-4 text-emerald-600" /> Shift Handover & Audit
                </Link>

                <Link
                  to="/admin?tab=bookings"
                  className={`flex items-center gap-1.5 transition-colors ${
                    currentLocation.pathname === '/admin' && currentAdminTab === 'bookings'
                      ? 'text-[#0B3D2E] font-bold border-b-2 border-[#0B3D2E] pb-0.5'
                      : 'hover:text-slate-900'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4 text-[#0B3D2E]" /> Master Bookings
                </Link>
              </>
            )}

            {/* 2. Staff Navigation */}
            {isStaff && (
              <>
                <Link 
                  to="/staff" 
                  className={`transition-colors ${currentLocation.pathname === '/staff' ? 'text-[#0B3D2E] font-bold' : 'hover:text-slate-900'}`}
                >
                  Home
                </Link>

                <Link 
                  to="/staff/book" 
                  className={`flex items-center gap-1.5 transition-colors ${currentLocation.pathname === '/staff/book' ? 'text-[#0B3D2E] font-bold' : 'hover:text-slate-900'}`}
                >
                  <PlusCircle className="w-4 h-4 text-[#0B3D2E]" /> Book for Customer
                </Link>

                <Link 
                  to="/staff/terminal" 
                  className={`flex items-center gap-1.5 transition-colors ${currentLocation.pathname === '/staff/terminal' ? 'text-[#0B3D2E] font-bold' : 'hover:text-slate-900'}`}
                >
                  <LayoutGrid className="w-4 h-4 text-[#0B3D2E]" /> Facility Status & Gate
                </Link>

                <Link 
                  to="/staff/today-bookings" 
                  className={`flex items-center gap-1.5 transition-colors ${currentLocation.pathname === '/staff/today-bookings' ? 'text-[#0B3D2E] font-bold' : 'hover:text-slate-900'}`}
                >
                  <Calendar className="w-4 h-4 text-[#0B3D2E]" /> Today's Bookings
                </Link>
              </>
            )}

            {/* 3. Customer Navigation */}
            {!isStaff && !isAdmin && (
              <>
                <button
                  type="button"
                  onClick={handleNavHome}
                  className="hover:text-slate-900 transition-colors cursor-pointer"
                >
                  Home
                </button>

                <Link to="/locations" className="hover:text-slate-900 transition-colors">
                  Locations
                </Link>

                <button
                  type="button"
                  onClick={() => handleNavSection('how-it-works')}
                  className="hover:text-slate-900 transition-colors cursor-pointer"
                >
                  How It Works
                </button>

                <button
                  type="button"
                  onClick={() => handleNavSection('coverage')}
                  className="hover:text-slate-900 transition-colors cursor-pointer"
                >
                  Kannur Hubs
                </button>

                {user && (
                  <Link to="/my-bookings" className="hover:text-slate-900 transition-colors">
                    My Bookings
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Right Action Buttons */}
          <div className="hidden lg:flex items-center space-x-3 shrink-0">
            {user ? (
              <div className="flex items-center space-x-2">
                <Link
                  to="/profile"
                  className="text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-full border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="View Profile"
                >
                  <User className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{user.name?.split(' ')[0] || user.email}</span>
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-2 text-slate-500 hover:text-red-600 transition-colors rounded-full border border-slate-200 hover:bg-red-50 cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-xs font-medium text-slate-700 hover:text-slate-900 px-4 py-2 rounded-full transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  to="/locations"
                  className="text-xs font-semibold text-white bg-slate-900 hover:bg-emerald-600 px-5 py-2.5 rounded-full transition-all duration-200 shadow-sm active:scale-95"
                >
                  Book Slot
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden p-2 text-slate-900 border border-slate-200 rounded-full bg-white cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>

        {/* Mobile Dropdown Menu */}
        {menuOpen && (
          <div className="lg:hidden mt-3 bg-white/95 backdrop-blur-lg border border-slate-200 rounded-2xl p-6 shadow-xl space-y-3 text-sm font-medium">
            {isAdmin ? (
              <>
                <Link to="/admin?tab=overview" onClick={() => setMenuOpen(false)} className="block py-2 text-slate-800">System Overview</Link>
                <Link to="/admin?tab=facilities" onClick={() => setMenuOpen(false)} className="block py-2 text-slate-800">Facilities & Shifts</Link>
                <Link to="/admin?tab=staff" onClick={() => setMenuOpen(false)} className="block py-2 text-slate-800">Staff Directory</Link>
                <Link to="/admin?tab=audit" onClick={() => setMenuOpen(false)} className="block py-2 text-slate-800">Shift Handover & Audit</Link>
                <Link to="/admin?tab=bookings" onClick={() => setMenuOpen(false)} className="block py-2 text-slate-800">Master Bookings</Link>
                <Link to="/profile" onClick={() => setMenuOpen(false)} className="block py-2 text-emerald-600">Admin Profile</Link>
              </>
            ) : isStaff ? (
              <>
                <Link to="/staff" onClick={() => setMenuOpen(false)} className="block py-2 text-slate-800">Home</Link>
                <Link to="/staff/book" onClick={() => setMenuOpen(false)} className="block py-2 text-slate-800">Book for Customer</Link>
                <Link to="/staff/terminal" onClick={() => setMenuOpen(false)} className="block py-2 text-slate-800">Facility Status & Gate</Link>
                <Link to="/staff/today-bookings" onClick={() => setMenuOpen(false)} className="block py-2 text-slate-800">Today's Bookings</Link>
                <Link to="/profile" onClick={() => setMenuOpen(false)} className="block py-2 text-emerald-600">My Profile</Link>
              </>
            ) : (
              <>
                <button type="button" onClick={handleNavHome} className="block w-full text-left py-2 text-slate-800">Home</button>
                <Link to="/locations" onClick={() => setMenuOpen(false)} className="block py-2 text-slate-800">Locations</Link>
                <button type="button" onClick={() => handleNavSection('how-it-works')} className="block w-full text-left py-2 text-slate-800">How It Works</button>
                <button type="button" onClick={() => handleNavSection('coverage')} className="block w-full text-left py-2 text-slate-800">Kannur Hubs</button>
                {user && <Link to="/my-bookings" onClick={() => setMenuOpen(false)} className="block py-2 text-slate-800">My Bookings</Link>}
                {user && <Link to="/profile" onClick={() => setMenuOpen(false)} className="block py-2 text-emerald-600">Profile</Link>}
              </>
            )}

            <div className="pt-3 border-t border-slate-100 flex flex-col space-y-2">
              {!user ? (
                <>
                  <Link to="/login" onClick={() => setMenuOpen(false)} className="w-full text-center text-xs font-semibold text-slate-800 border border-slate-200 py-2.5 rounded-full">
                    Sign in
                  </Link>
                  <Link to="/locations" onClick={() => setMenuOpen(false)} className="w-full text-center text-xs font-semibold text-white bg-slate-900 py-2.5 rounded-full">
                    Book Slot
                  </Link>
                </>
              ) : (
                <button 
                  type="button" 
                  onClick={handleLogout} 
                  className="w-full text-center text-xs font-semibold text-white bg-slate-900 py-2.5 rounded-full cursor-pointer"
                >
                  Sign Out
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {menuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/10 lg:hidden" 
          onClick={() => setMenuOpen(false)}
        />
      )}
    </>
  );
};

export default Navbar;