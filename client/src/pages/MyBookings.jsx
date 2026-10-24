import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/axios';
import { Ticket, Calendar, Clock, MapPin, QrCode, AlertCircle } from 'lucide-react';

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
    <div className="min-h-screen bg-[#F7F8F6] py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#202722]">My Parking Reservations</h1>
        <p className="text-xs text-gray-500 mt-0.5">View digital QR passes and booking records.</p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-gray-500">Loading reservations...</div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">{error}</div>
      ) : bookings.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-200 text-gray-500 text-xs">
          No parking reservations found.
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => (
            <div
              key={b._id}
              className="bg-white rounded-2xl border border-gray-200/80 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#176B4D] transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#202722]">{b.bookingRef}</span>
                  <span className="px-2 py-0.5 rounded bg-[#176B4D]/10 text-[#176B4D] text-[10px] font-bold uppercase">
                    {b.status}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-[#202722]">{b.location?.name}</h3>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> Bay: {b.bay?.bayNumber} — Reg: {b.vehicle?.regNumber}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-xs font-bold text-[#176B4D] block">₹{b.pricingSnapshot?.totalAmount}</span>
                  <span className="text-[10px] text-gray-400 block">
                    {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <Link
                  to={`/ticket/${b.bookingRef}`}
                  className="px-4 py-2 bg-[#176B4D] hover:bg-[#12533c] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5" /> View Ticket
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}