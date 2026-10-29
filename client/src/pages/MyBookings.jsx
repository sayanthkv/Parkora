import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/axios';
import { MapPin, QrCode, AlertCircle, ShieldCheck, Calendar, Clock, CheckCircle2 } from 'lucide-react';

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMyBookings = async () => {
    try {
      const res = await API.get('/bookings/my');
      setBookings(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch your booking history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyBookings();
  }, []);

  const getDisplayAmount = (b) => {
    if (b.paymentStatus === 'paid' && typeof b.amountCollectedPaise === 'number' && b.amountCollectedPaise > 0) {
      return b.amountCollectedPaise / 100;
    }
    if (b.pricingSnapshot?.totalAmountPaise) {
      return b.pricingSnapshot.totalAmountPaise / 100;
    }
    return b.pricingSnapshot?.totalAmount || 0;
  };

  const formatBookingDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'active':
        return 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse';
      case 'completed':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'cancelled':
      case 'no_show':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 pt-28 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6 font-body">
      <div>
        <span className="text-xs font-bold uppercase tracking-widest text-[#0B3D2E] bg-slate-100 border border-slate-200 px-3.5 py-1.5 rounded-full inline-block mb-2">
          Customer Portal
        </span>
        <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
          My Parking Reservations
        </h1>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          View digital QR passes, reservation schedules, and payment receipts.
        </p>
      </div>

      {loading ? (
        // Instant Skeleton Pulse Loader: Eliminates blank loading text delay[cite: 9, 10]
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-slate-50 rounded-2xl border border-slate-200 p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-2.5 flex-1">
                <div className="flex gap-2">
                  <div className="h-4 w-28 bg-slate-200 rounded" />
                  <div className="h-4 w-16 bg-slate-200 rounded-full" />
                </div>
                <div className="h-5 w-48 bg-slate-200 rounded" />
                <div className="h-3 w-64 bg-slate-200 rounded" />
                <div className="flex gap-2 pt-1">
                  <div className="h-6 w-32 bg-slate-200 rounded-lg" />
                  <div className="h-6 w-40 bg-slate-200 rounded-lg" />
                </div>
              </div>
              <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0">
                <div className="space-y-1">
                  <div className="h-5 w-16 bg-slate-200 rounded" />
                  <div className="h-3 w-20 bg-slate-200 rounded" />
                </div>
                <div className="h-9 w-28 bg-slate-200 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          {error}
        </div>
      ) : bookings.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs font-medium space-y-3">
          <p>No parking reservations found.</p>
          <Link
            to="/locations"
            className="inline-block bg-[#0B3D2E] hover:bg-[#145C43] text-white font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-sm"
          >
            Find & Reserve a Bay
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => {
            const amountRupees = getDisplayAmount(b);
            const isPaid = b.paymentStatus === 'paid';
            const startDate = new Date(b.startTime);
            const endDate = new Date(b.endTime);

            return (
              <div
                key={b._id}
                className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 hover:border-[#0B3D2E] transition-all shadow-sm"
              >
                {/* Left Section: Identifiers & Details */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#0B3D2E]">{b.bookingRef}</span>
                    
                    <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(b.status)}`}>
                      {b.status}
                    </span>

                    {isPaid ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100/70 border border-emerald-300 text-emerald-800 text-[10px] font-bold tracking-wider uppercase">
                        <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Paid
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-semibold">
                        Pay at Facility
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-heading font-bold text-slate-900">{b.location?.name}</h3>
                  
                  <p className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-[#0B3D2E] shrink-0" />
                    <span>Floor: <strong>{b.floor?.name || 'Standard'}</strong></span>
                    <span className="text-slate-300">&bull;</span>
                    <span>Bay: <strong className="text-slate-900">{b.bay?.bayNumber}</strong></span>
                    <span className="text-slate-300">&bull;</span>
                    <span>Reg: <strong className="uppercase text-slate-900 font-mono">{b.vehicle?.regNumber}</strong></span>
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-600 font-medium">
                    <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-slate-700 font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-[#0B3D2E]" />
                      {formatBookingDate(b.startTime)}
                    </span>
                    <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-slate-700">
                      <Clock className="w-3.5 h-3.5 text-[#0B3D2E]" />
                      {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} – {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} IST
                    </span>
                  </div>
                </div>

                {/* Right Section: Price & Action */}
                <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-slate-200">
                  <div className="text-left md:text-right">
                    <span className="text-lg font-heading font-extrabold text-[#0B3D2E] block leading-tight">
                      ₹{amountRupees}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium block">
                      {isPaid ? 'Amount Collected' : 'Payable on Exit'}
                    </span>
                  </div>

                  <Link
                    to={`/ticket/${b.bookingRef}`}
                    className="px-4 py-2.5 bg-[#0B3D2E] hover:bg-[#145C43] text-white text-xs font-bold uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 whitespace-nowrap"
                  >
                    <QrCode className="w-3.5 h-3.5 text-[#F2B705]" /> View Pass
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="pt-4 flex items-center justify-center gap-1.5 text-xs text-slate-500 font-medium">
        <ShieldCheck className="w-4 h-4 text-[#0B3D2E]" />
        <span>Validated Digital QR Passes • Present to Gate Operator</span>
      </div>
    </div>
  );
}