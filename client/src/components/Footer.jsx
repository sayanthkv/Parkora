import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, ShieldCheck, Car, ExternalLink } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-neutral-900 border-t border-neutral-800 text-neutral-400 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-neutral-800">
          
          {/* Column 1: Brand & Overview */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="bg-emerald-500 p-2 rounded-lg text-neutral-950">
                <Car className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold text-white tracking-wide">
                Parkora
              </span>
            </div>
            <p className="text-sm leading-relaxed text-neutral-400">
              Kannur’s official smart parking management system. Real-time slot reservation, transparent hourly pricing, and instant QR pass check-ins.
            </p>
            <div className="flex items-center space-x-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-3 py-1.5 rounded-full w-fit">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>System Operational • Kannur Network</span>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Navigation
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/" className="hover:text-emerald-400 transition-colors">
                  Home Overview
                </Link>
              </li>
              <li>
                <Link to="/locations" className="hover:text-emerald-400 transition-colors">
                  Find Parking Locations
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-emerald-400 transition-colors">
                  Customer Account
                </Link>
              </li>
              <li>
                <Link to="/staff" className="hover:text-emerald-400 transition-colors">
                  Staff Verification Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Top Facilities */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Kannur Stations
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span>Railway Station Complex</span>
              </li>
              <li className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span>Town Bus Stand Hub</span>
              </li>
              <li className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span>Caltex Junction Plaza</span>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact & Help */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Support & Contact
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>support@parkora.in</span>
              </li>
              <li className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>+91 497 270 0000</span>
              </li>
              <li className="flex items-center space-x-2 pt-1">
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="text-xs text-neutral-400">Encrypted JWT Authentication</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col md:flex-row items-center justify-between text-xs text-neutral-400 gap-4">
          <p>© {new Date().getFullYear()} Parkora Smart Parking System. All rights reserved.</p>
          <div className="flex space-x-6">
            <a href="#privacy" className="hover:text-neutral-300 transition-colors">
              Privacy Policy
            </a>
            <a href="#terms" className="hover:text-neutral-300 transition-colors">
              Terms of Service
            </a>
            <a href="#help" className="hover:text-neutral-300 transition-colors">
              Help Center
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;