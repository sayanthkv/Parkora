import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { 
  Building, ShieldCheck, Clock, PlusCircle, LayoutGrid, 
  Calendar, CheckCircle2, ArrowRight, Activity, Car, RefreshCw 
} from 'lucide-react';

export default function StaffHome() {
  const { user } = useAuth();
  const [shiftContext, setShiftContext] = useState(null);
  const [todayStats, setTodayStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStaffData = async () => {
    setLoading(true);
    try {
      const [shiftRes, statsRes] = await Promise.all([
        API.get('/staff/shift-context'),
        API.get('/staff/today'),
      ]);
      setShiftContext(shiftRes.data.data);
      setTodayStats(statsRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffData();
  }, []);

  const facility = shiftContext?.facility || user?.assignedFacility;
  const isOnDuty = shiftContext?.isOnDuty ?? true;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pt-28 pb-16 font-body">
      
      {/* Hero Welcome Header */}
      <div className="bg-[#0B3D2E] text-white py-12 px-4 sm:px-6 lg:px-8 border-b border-[#145C43]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-white/10 text-[#F2B705] px-3.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-3">
              <ShieldCheck className="w-3.5 h-3.5" /> Staff Duty Station
            </div>
            <h1 className="text-3xl sm:text-4xl font-heading font-extrabold text-white tracking-tight">
              Welcome, {user?.name || 'Operator'}
            </h1>
            <p className="text-xs text-emerald-100 mt-1 max-w-xl">
              Assigned Facility: <strong className="text-white">{facility?.name || 'Kannur Central Node'}</strong> &bull; {facility?.address?.street}, {facility?.address?.area}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className={`px-3 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 ${
              isOnDuty ? 'bg-emerald-500 text-slate-950' : 'bg-amber-400 text-slate-950'
            }`}>
              <Clock className="w-4 h-4" />
              {isOnDuty ? 'You Are On Duty' : 'Off Current Duty Window'}
            </span>
            <button
              onClick={fetchStaffData}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all cursor-pointer"
              title="Refresh Stats"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 space-y-8">
        
        {/* Quick Stats Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Currently Parked</span>
              <span className="text-2xl font-heading font-black text-[#0B3D2E]">{todayStats?.activeCount ?? 0}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <Car className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Today's Total Arrivals</span>
              <span className="text-2xl font-heading font-black text-slate-900">{todayStats?.todaysArrivalsCount ?? 0}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Shift Schedule</span>
              <span className="text-sm font-extrabold text-slate-800 block mt-1">
                {shiftContext?.shiftInfo?.label || '06:00 – 18:00 IST'}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <Activity className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* 3 Core Action Cards (Staff Primary Hub) */}
        <div>
          <h2 className="text-base font-heading font-bold text-slate-900 mb-4">Operations Console</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Card 1: Book for Customer */}
            <Link
              to="/staff/book"
              className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm hover:border-[#0B3D2E] hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 group-hover:bg-[#0B3D2E] text-[#0B3D2E] group-hover:text-[#F2B705] flex items-center justify-center transition-colors mb-4">
                  <PlusCircle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-heading font-extrabold text-slate-900 group-hover:text-[#0B3D2E] transition-colors">
                  Book For Customer
                </h3>
                <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed">
                  Reserve and check in on-the-spot walk-in vehicles directly into open bays at {facility?.name || 'your lot'}.
                </p>
              </div>
              <div className="pt-6 flex items-center text-xs font-bold text-[#0B3D2E] gap-1 group-hover:translate-x-1 transition-transform">
                <span>Open Walk-In Terminal</span> <ArrowRight className="w-4 h-4" />
              </div>
            </Link>

            {/* Card 2: View Status & Gate Terminal */}
            <Link
              to="/staff/terminal"
              className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm hover:border-[#0B3D2E] hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 group-hover:bg-[#0B3D2E] text-[#0B3D2E] group-hover:text-[#F2B705] flex items-center justify-center transition-colors mb-4">
                  <LayoutGrid className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-heading font-extrabold text-slate-900 group-hover:text-[#0B3D2E] transition-colors">
                  Facility Status & Gate
                </h3>
                <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed">
                  Scan arrival QR passes, verify booking reference codes, view occupied slots, and process departure checkouts.
                </p>
              </div>
              <div className="pt-6 flex items-center text-xs font-bold text-[#0B3D2E] gap-1 group-hover:translate-x-1 transition-transform">
                <span>Open Gate Terminal</span> <ArrowRight className="w-4 h-4" />
              </div>
            </Link>

            {/* Card 3: Today's Bookings */}
            <Link
              to="/staff/today-bookings"
              className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm hover:border-[#0B3D2E] hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 group-hover:bg-[#0B3D2E] text-[#0B3D2E] group-hover:text-[#F2B705] flex items-center justify-center transition-colors mb-4">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-heading font-extrabold text-slate-900 group-hover:text-[#0B3D2E] transition-colors">
                  Today's Bookings
                </h3>
                <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed">
                  Inspect the live ledger of all arrivals, active sessions, completed stays, and payments processed today.
                </p>
              </div>
              <div className="pt-6 flex items-center text-xs font-bold text-[#0B3D2E] gap-1 group-hover:translate-x-1 transition-transform">
                <span>View Daily Ledger</span> <ArrowRight className="w-4 h-4" />
              </div>
            </Link>

          </div>
        </div>

      </div>
    </div>
  );
}