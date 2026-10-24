import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import API from '../api/axios';
import { MapPin, Calendar, Clock, Car, CheckCircle2, Printer, ArrowLeft, ShieldCheck } from 'lucide-react';

export default function Ticket() {
  const { bookingRef } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const res = await API.get('/bookings/my');
        const match = res.data.data.find((b) => b.bookingRef === bookingRef);
        if (match) {
          setBooking(match);
        } else {
          setError('Ticket not found.');
        }
      } catch (err) {
        setError('Failed to fetch ticket information.');
      } finally {
        setLoading(false);
      }
    };
    fetchTicket();
  }, [bookingRef]);

  if (loading) return <div className="py-20 text-center text-gray-500">Generating digital pass...</div>;
  if (error || !booking) return <div className="py-20 text-center text-red-600">{error || 'Ticket not found'}</div>;

  return (
    <div className="min-h-screen bg-[#F7F8F6] py-10 px-4 sm:px-6 lg:px-8 max-w-xl mx-auto">
      
      <div className="mb-6 flex items-center justify-between">
        <Link to="/my-bookings" className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-[#176B4D]">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to My Bookings
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-gray-700 hover:bg-gray-50 shadow-sm cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5" /> Print Pass
        </button>
      </div>

      {/* Ticket Pass Card */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        
        {/* Pass Header */}
        <div className="bg-[#176B4D] text-white p-6 text-center">
          <div className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full text-[11px] font-medium tracking-wider uppercase mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" /> Confirmed Reservation
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">{booking.location.name}</h1>
          <p className="text-xs text-emerald-100 mt-1 flex items-center justify-center gap-1">
            <MapPin className="w-3 h-3" /> {booking.location.address?.street}, {booking.location.address?.area}
          </p>
        </div>

        {/* QR Scanner Payload */}
        <div className="p-6 text-center border-b border-dashed border-gray-200 bg-gray-50/50">
          <div className="inline-block p-4 bg-white rounded-2xl border border-gray-200 shadow-sm mb-3">
            <QRCodeSVG value={booking.qrToken} size={180} level="H" />
          </div>
          <p className="font-mono text-sm font-bold text-[#202722] tracking-wider">{booking.bookingRef}</p>
          <p className="text-[11px] text-gray-500 mt-1">Show this QR code to the staff operator at entry.</p>
        </div>

        {/* Booking Particulars */}
        <div className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-gray-400 uppercase tracking-wider text-[10px] font-bold block mb-0.5">Floor & Bay</span>
              <span className="font-bold text-sm text-[#176B4D]">{booking.floor?.name} — {booking.bay?.bayNumber}</span>
            </div>
            <div>
              <span className="text-gray-400 uppercase tracking-wider text-[10px] font-bold block mb-0.5">Vehicle Reg</span>
              <span className="font-mono font-bold text-sm text-[#202722]">{booking.vehicle.regNumber}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
            <div>
              <span className="text-gray-400 uppercase tracking-wider text-[10px] font-bold block mb-0.5">Arrival Window</span>
              <span className="font-semibold text-gray-800">{new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div>
              <span className="text-gray-400 uppercase tracking-wider text-[10px] font-bold block mb-0.5">Expected Exit</span>
              <span className="font-semibold text-gray-800">{new Date(booking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-gray-500">Total Amount:</span>
            <span className="text-base font-bold text-[#176B4D]">₹{booking.pricingSnapshot.totalAmount}</span>
          </div>
        </div>

      </div>
    </div>
  );
}