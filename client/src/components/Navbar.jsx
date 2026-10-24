import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MapPin, Ticket, ShieldCheck, UserCheck, LogOut, Menu, X, Car } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 bg-[#F7F8F6]/90 backdrop-blur-md border-b border-gray-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo */}
          <Link to="/" className="flex items-center space-x-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-[#176B4D] flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
              <Car className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight text-[#202722]">Parkora</span>
              <span className="text-[10px] uppercase tracking-widest text-[#176B4D] font-semibold -mt-1">
                Kannur Smart
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/locations" className="text-sm font-medium text-gray-700 hover:text-[#176B4D] flex items-center gap-1.5 transition-colors">
              <MapPin className="w-4 h-4 text-gray-400" />
              Find Parking
            </Link>

            {user?.role === 'customer' && (
              <Link to="/my-bookings" className="text-sm font-medium text-gray-700 hover:text-[#176B4D] flex items-center gap-1.5 transition-colors">
                <Ticket className="w-4 h-4 text-gray-400" />
                My Bookings
              </Link>
            )}

            {user?.role === 'staff' && (
              <Link to="/staff" className="text-sm font-semibold text-[#176B4D] bg-[#176B4D]/10 px-3 py-1.5 rounded-md flex items-center gap-1.5">
                <UserCheck className="w-4 h-4" />
                Staff Portal
              </Link>
            )}

            {user?.role === 'admin' && (
              <Link to="/admin" className="text-sm font-semibold text-purple-700 bg-purple-100 px-3 py-1.5 rounded-md flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                Admin Console
              </Link>
            )}
          </nav>

          {/* User Auth Actions */}
          <div className="hidden md:flex items-center space-x-3">
            {user ? (
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-xs font-semibold text-[#202722]">{user.name}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">{user.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="text-sm font-medium text-gray-700 hover:text-[#176B4D] px-3 py-2 rounded-md transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-medium text-white bg-[#176B4D] hover:bg-[#12533c] px-4 py-2 rounded-md shadow-sm transition-all"
                >
                  Reserve Spot
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-gray-600 hover:text-black rounded-md focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 px-4 pt-3 pb-4 space-y-2">
          <Link
            to="/locations"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 rounded-md"
          >
            Find Parking
          </Link>

          {user?.role === 'customer' && (
            <Link
              to="/my-bookings"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 rounded-md"
            >
              My Bookings
            </Link>
          )}

          {user ? (
            <button
              onClick={() => {
                handleLogout();
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-base font-medium text-red-600 hover:bg-red-50 rounded-md"
            >
              Log Out ({user.name})
            </button>
          ) : (
            <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2 text-sm font-medium text-white bg-[#176B4D] rounded-md"
              >
                Create Account
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}