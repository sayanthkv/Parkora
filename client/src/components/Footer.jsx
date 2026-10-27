import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Mail, Phone, ArrowUpRight } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="w-full bg-slate-900 text-white pt-16 pb-12 border-t border-slate-800">
      {/* 100% Full-Width Container with Generous Side Padding */}
      <div className="w-full px-6 sm:px-12 lg:px-16">
        
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-slate-800">
          
          {/* Brand Column */}
          <div className="md:col-span-5 space-y-4">
            <Link to="/" className="inline-block group">
              <span className="font-heading font-extrabold text-2xl text-white tracking-tight group-hover:text-emerald-400 transition-colors duration-200">
                Parkora
              </span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm font-normal">
              Kannur’s smart city transport parking initiative. Pre-book guaranteed parking bays across major transit hubs, stations, and beach complexes.
            </p>
            <div className="flex items-center gap-2 pt-1 text-xs text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold tracking-wide uppercase">Operational • Kannur District</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-slate-300">
              Navigation
            </h4>
            <ul className="space-y-2.5 text-xs font-medium text-slate-400">
              <li>
                <Link to="/" className="hover:text-emerald-400 transition-colors duration-200 flex items-center gap-1 group">
                  Home Overview <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link to="/locations" className="hover:text-emerald-400 transition-colors duration-200 flex items-center gap-1 group">
                  Find Parking Locations <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-emerald-400 transition-colors duration-200">
                  How It Works
                </a>
              </li>
              <li>
                <Link to="/staff" className="hover:text-emerald-400 transition-colors duration-200">
                  Staff Operator Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Major Hubs */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-slate-300">
              Major Hubs
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>Railway Station</span>
              </li>
              <li className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>KSRTC Bus Stand</span>
              </li>
              <li className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>Payyambalam Beach</span>
              </li>
            </ul>
          </div>

          {/* Direct Support */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-slate-300">
              Support
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>support@parkora.in</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>+91 497 270 0000</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Minimal Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} Parkora Smart Transport System. All rights reserved.</p>
          <div className="flex space-x-6 text-xs">
            <a href="#privacy" className="hover:text-slate-300 transition-colors">
              Privacy Policy
            </a>
            <a href="#terms" className="hover:text-slate-300 transition-colors">
              Terms of Service
            </a>
            <a href="#help" className="hover:text-slate-300 transition-colors">
              Help Center
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;