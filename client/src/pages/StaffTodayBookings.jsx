import React, { useState, useEffect } from 'react';
import API from '../api/axios';
import { Calendar, Search, Car, Clock, ShieldCheck, RefreshCw, Banknote } from 'lucide-react';

export default function StaffTodayBookings() {
  const [bookings, setBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await API.get('/staff/today-bookings');
      setBookings(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const filtered = bookings.filter((b) =>
    b.bookingRef?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.vehicle?.regNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.user?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pt-28 pb-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto font-body space-y-6">
      
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-[#0B3D2E] text-[#F2B705] px-3.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-2">
            <Calendar className="w-3.5 h-3.5" /> Daily Audit
          </div>
          <h1 className="text-2xl font-heading font-extrabold text-slate-900">Today's Facility Reservations</h1>
          <p className="text-xs text-slate-500 mt-0.5">Real-time ledger of vehicles booked or arrived at this facility today.</p>
        </div>

        <button
          onClick={fetchBookings}
          className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-900 px-4 py-2 rounded-xl text-xs font-bold transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#0B3D2E] ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by ref, vehicle, or driver..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-[#0B3D2E]"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-900">
            <thead className="bg-slate-50 border-b border-slate-200 uppercase text-[10px] font-bold text-slate-400">
              <tr>
                <th className="p-4">Ref Code</th>
                <th className="p-4">Bay Slot</th>
                <th className="p-4">Vehicle</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Time Interval</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Fee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                    No reservations recorded for today.
                  </td>
                </tr>
              ) : (
                filtered.map((b) => (
                  <tr key={b._id} className="hover:bg-slate-50/70">
                    <td className="p-4 font-mono font-bold text-[#0B3D2E]">{b.bookingRef}</td>
                    <td className="p-4 font-bold">{b.floor?.name} &bull; Bay {b.bay?.bayNumber}</td>
                    <td className="p-4 font-mono uppercase font-bold">{b.vehicle?.regNumber}</td>
                    <td className="p-4 font-medium">{b.user?.name || 'Walk-In'}</td>
                    <td className="p-4 text-slate-600">
                      {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} – {new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} IST
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        b.status === 'active' ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="p-4 text-right font-extrabold text-[#0B3D2E]">
                      ₹{(b.pricingSnapshot?.totalAmountPaise ? b.pricingSnapshot.totalAmountPaise / 100 : b.pricingSnapshot?.totalAmount) || 0}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}