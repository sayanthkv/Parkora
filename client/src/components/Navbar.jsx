import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronDown, User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="fixed top-5 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      <nav className="bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-sm rounded-full px-7 py-3 flex items-center justify-between transition-all duration-300">
        
        {/* Minimal Text Brand */}
        <Link to="/" className="group focus:outline-none">
          <span className="font-heading font-extrabold text-2xl text-slate-900 tracking-tight group-hover:text-emerald-600 transition-colors">
            Parkora
          </span>
        </Link>

        {/* Center Links */}
        <div className="hidden md:flex items-center space-x-9 text-sm font-medium text-slate-700">
          <Link to="/" className="hover:text-slate-900 transition-colors duration-200">
            Home
          </Link>
          <Link to="/locations" className="hover:text-slate-900 transition-colors duration-200 flex items-center gap-1">
            Locations <ChevronDown className="h-3.5 w-3.5 opacity-50" />
          </Link>
          <a href="#how-it-works" className="hover:text-slate-900 transition-colors duration-200">
            How It Works
          </a>
          <a href="#coverage" className="hover:text-slate-900 transition-colors duration-200">
            Kannur Hubs
          </a>
        </div>

        {/* Right Actions */}
        <div className="hidden md:flex items-center space-x-3">
          {user ? (
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-800 bg-slate-100 px-3.5 py-2 rounded-full border border-slate-200 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-emerald-600" /> {user.name || user.email}
              </span>
              <button
                onClick={() => { logout(); navigate('/'); }}
                className="p-2 text-slate-500 hover:text-slate-900 transition-colors rounded-full border border-slate-200 hover:bg-slate-100"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-4 py-2 rounded-full transition-colors"
              >
                Sign In
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

        {/* Mobile Hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden p-2 text-slate-900 border border-slate-200 rounded-full bg-white"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile Menu Drawer */}
      {menuOpen && (
        <div className="md:hidden mt-3 bg-white/95 backdrop-blur-lg border border-slate-200 rounded-2xl p-6 shadow-xl space-y-3">
          <Link to="/" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-slate-800 py-1.5">
            Home
          </Link>
          <Link to="/locations" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-slate-800 py-1.5">
            Locations
          </Link>
          <a href="#how-it-works" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-slate-800 py-1.5">
            How It Works
          </a>
          <div className="pt-3 border-t border-slate-100 flex flex-col space-y-2">
            {!user ? (
              <>
                <Link to="/login" onClick={() => setMenuOpen(false)} className="w-full text-center text-xs font-semibold text-slate-800 border border-slate-200 py-2.5 rounded-full">
                  Sign In
                </Link>
                <Link to="/locations" onClick={() => setMenuOpen(false)} className="w-full text-center text-xs font-semibold text-white bg-slate-900 py-2.5 rounded-full">
                  Book Slot
                </Link>
              </>
            ) : (
              <button onClick={() => { logout(); setMenuOpen(false); }} className="w-full text-center text-xs font-semibold text-white bg-slate-900 py-2.5 rounded-full">
                Sign Out
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Navbar;