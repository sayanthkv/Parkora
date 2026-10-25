import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/axios';
import { MapPin, QrCode, AlertCircle, ShieldCheck } from 'lucide-react';

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMyBookings = async () => {
    try {
      const res = await API.get('/bookings/my');
      setBookings(res.data.data);
    } catch (err) {
      setError('Failed to fetch your booking history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyBookings();
  }, []);

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
          View digital QR passes and active booking records.
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-500 font-medium">Loading reservations...</div>
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
          {bookings.map((b) => (
            <div
              key={b._id}
              className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#0B3D2E] transition-all shadow-sm"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#0B3D2E]">{b.bookingRef}</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[#145C43] text-[10px] font-bold uppercase tracking-wider">
                    {b.status}
                  </span>
                </div>
                <h3 className="text-base font-heading font-bold text-slate-900">{b.location?.name}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-[#0B3D2E]" /> Bay: {b.bay?.bayNumber} — Reg: <span className="uppercase font-bold text-slate-900">{b.vehicle?.regNumber}</span>
                </p>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-5 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                <div className="text-left sm:text-right">
                  <span className="text-base font-heading font-extrabold text-[#0B3D2E] block">₹{b.pricingSnapshot?.totalAmount}</span>
                  <span className="text-[11px] text-slate-500 font-medium block">
                    {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} IST
                  </span>
                </div>

                <Link
                  to={`/ticket/${b.bookingRef}`}
                  className="px-4 py-2.5 bg-[#0B3D2E] hover:bg-[#145C43] text-white text-xs font-bold uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  <QrCode className="w-3.5 h-3.5 text-[#F2B705]" /> View Ticket
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Security Footer Note */}
      <div className="pt-4 flex items-center justify-center gap-1.5 text-xs text-slate-500 font-medium">
        <ShieldCheck className="w-4 h-4 text-[#0B3D2E]" />
        <span>Validated Digital QR Passes • Present to Gate Operator</span>
      </div>
    </div>
  );
}