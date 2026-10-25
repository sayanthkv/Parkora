import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Car, Menu, X, User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/');
  };

  return (
    <header className="fixed top-4 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <nav className="bg-white/95 backdrop-blur-md border border-neutral-200 shadow-md rounded-full px-6 py-3 flex items-center justify-between transition-all">
        
        {/* Brand Logo */}
        <Link to="/" onClick={() => setMenuOpen(false)} className="flex items-center space-x-2.5">
          <div className="bg-[#0B3D2E] text-[#F2B705] p-2 rounded-full">
            <Car className="h-5 w-5" />
          </div>
          <span className="font-heading font-extrabold text-xl text-[#14201B] tracking-tight">
            Parkora
          </span>
        </Link>

        {/* Center Links */}
        <div className="hidden md:flex items-center space-x-8 text-sm font-semibold text-[#14201B]/80">
          <Link to="/" className="hover:text-[#0B3D2E] transition-colors">
            Home
          </Link>
          <Link to="/locations" className="hover:text-[#0B3D2E] transition-colors">
            Locations
          </Link>
          {user && (
            <Link to="/my-bookings" className="hover:text-[#0B3D2E] transition-colors">
              My Bookings
            </Link>
          )}
          {user?.role === 'staff' && (
            <Link to="/staff" className="hover:text-[#0B3D2E] transition-colors">
              Staff Portal
            </Link>
          )}
          {user?.role === 'admin' && (
            <Link to="/admin" className="hover:text-[#0B3D2E] transition-colors">
              Admin Console
            </Link>
          )}
        </div>

        {/* Right Action Buttons */}
        <div className="hidden md:flex items-center space-x-3">
          {user ? (
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-[#0B3D2E] bg-neutral-100 border border-neutral-200 px-3 py-2 rounded-full flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> {user.name || user.email}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="p-2 text-[#5C6B64] hover:text-red-600 transition-colors rounded-full border border-neutral-200 bg-white shadow-sm cursor-pointer"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="text-xs font-bold text-[#14201B] hover:text-[#0B3D2E] px-4 py-2.5 rounded-full border border-neutral-300 hover:bg-neutral-50 transition-all"
              >
                Sign In
              </Link>
              <Link
                to="/locations"
                className="text-xs font-bold text-white bg-[#0B3D2E] hover:bg-[#145C43] px-5 py-2.5 rounded-full transition-all shadow-md active:scale-95"
              >
                Book Slot
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden p-2 text-[#14201B] border border-neutral-200 rounded-full bg-white shadow-sm cursor-pointer"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile Menu Drawer */}
      {menuOpen && (
        <div className="md:hidden mt-3 bg-white border border-neutral-200 rounded-2xl p-5 shadow-xl space-y-3">
          <Link to="/" onClick={() => setMenuOpen(false)} className="block text-sm font-semibold text-[#14201B] py-1.5 border-b border-neutral-100">
            Home
          </Link>
          <Link to="/locations" onClick={() => setMenuOpen(false)} className="block text-sm font-semibold text-[#14201B] py-1.5 border-b border-neutral-100">
            Locations
          </Link>
          {user && (
            <Link to="/my-bookings" onClick={() => setMenuOpen(false)} className="block text-sm font-semibold text-[#14201B] py-1.5 border-b border-neutral-100">
              My Bookings
            </Link>
          )}
          {user?.role === 'staff' && (
            <Link to="/staff" onClick={() => setMenuOpen(false)} className="block text-sm font-semibold text-[#14201B] py-1.5 border-b border-neutral-100">
              Staff Portal
            </Link>
          )}
          {user?.role === 'admin' && (
            <Link to="/admin" onClick={() => setMenuOpen(false)} className="block text-sm font-semibold text-[#14201B] py-1.5 border-b border-neutral-100">
              Admin Console
            </Link>
          )}

          <div className="pt-2 flex flex-col space-y-2">
            {!user ? (
              <>
                <Link to="/login" onClick={() => setMenuOpen(false)} className="w-full text-center text-xs font-bold text-[#14201B] border border-neutral-300 py-2.5 rounded-full">
                  Sign In
                </Link>
                <Link to="/locations" onClick={() => setMenuOpen(false)} className="w-full text-center text-xs font-bold text-white bg-[#0B3D2E] py-2.5 rounded-full">
                  Book Slot
                </Link>
              </>
            ) : (
              <button onClick={handleLogout} className="w-full text-center text-xs font-bold text-white bg-[#0B3D2E] py-2.5 rounded-full cursor-pointer">
                Sign Out
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;