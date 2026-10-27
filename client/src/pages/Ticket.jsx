import { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import API from '../api/axios';
import { MapPin, Printer, ArrowLeft, ShieldCheck } from 'lucide-react';

export default function Ticket() {
  const { bookingRef } = useParams();
  const locationState = useLocation().state;

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Retrieve raw ticket secret string from route state or cached session storage
  const [qrPayload, setQrPayload] = useState(
    locationState?.qrTicketPayload || sessionStorage.getItem(`parkora_qr_${bookingRef}`) || null
  );

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const res = await API.get('/bookings/my');
        const match = res.data.data.find((b) => b.bookingRef === bookingRef);
        if (match) {
          setBooking(match);
          // If we don't have the unhashed composite QR payload, fall back to the bookingRef
          if (!qrPayload) {
            setQrPayload(match.bookingRef);
          }
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
  }, [bookingRef, qrPayload]);

  if (loading) {
    return <div className="py-28 text-center text-xs font-medium text-slate-500 bg-white min-h-screen">Generating digital pass...</div>;
  }

  if (error || !booking) {
    return <div className="py-28 text-center text-xs font-semibold text-red-600 bg-white min-h-screen">{error || 'Ticket not found'}</div>;
  }

  // Integer paise to Rupee conversion
  const totalRupees = booking.pricingSnapshot?.totalAmountPaise
    ? booking.pricingSnapshot.totalAmountPaise / 100
    : booking.pricingSnapshot?.totalAmount || 0;

  return (
    <div className="min-h-screen bg-white text-slate-900 pt-28 pb-16 px-4 sm:px-6 lg:px-8 max-w-xl mx-auto font-body">
      
      {/* Top Bar Controls */}
      <div className="mb-6 flex items-center justify-between">
        <Link 
          to="/my-bookings" 
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B3D2E] hover:text-[#145C43] transition-colors bg-white border border-slate-200 px-3.5 py-1.5 rounded-full shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to My Bookings
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 text-xs font-bold bg-white border border-slate-200 px-3.5 py-1.5 rounded-full text-slate-900 hover:bg-slate-50 shadow-sm cursor-pointer transition-all active:scale-95"
        >
          <Printer className="w-3.5 h-3.5 text-[#0B3D2E]" /> Print Pass
        </button>
      </div>

      {/* Ticket Pass Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Pass Header */}
        <div className="bg-[#0B3D2E] text-white p-6 sm:p-8 text-center">
          <div className="inline-flex items-center gap-1.5 bg-white/10 px-3.5 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-[#F2B705]" /> Confirmed Reservation
          </div>
          <h1 className="text-xl sm:text-2xl font-heading font-extrabold tracking-tight">{booking.location?.name}</h1>
          <p className="text-xs text-slate-200 mt-1 flex items-center justify-center gap-1 font-medium">
            <MapPin className="w-3.5 h-3.5 text-[#F2B705]" /> {booking.location?.address?.street}, {booking.location?.address?.area}
          </p>
        </div>

        {/* QR Scanner Payload */}
        <div className="p-6 sm:p-8 text-center border-b border-dashed border-slate-200 bg-slate-50/50">
          <div className="inline-block p-4 bg-white rounded-2xl border border-slate-200 shadow-sm mb-3">
            <QRCodeSVG value={qrPayload || booking.bookingRef} size={180} level="H" fgColor="#0B3D2E" />
          </div>
          <p className="font-mono text-sm font-extrabold text-[#0B3D2E] tracking-wider uppercase">{booking.bookingRef}</p>
          <p className="text-[11px] text-slate-500 font-medium mt-1">Show this QR code to the staff operator at entry gate.</p>
        </div>

        {/* Booking Particulars */}
        <div className="p-6 sm:p-8 space-y-4 text-xs font-medium">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold block mb-1">Floor & Bay Slot</span>
              <span className="font-bold text-sm text-[#0B3D2E]">{booking.floor?.name} — Bay {booking.bay?.bayNumber}</span>
            </div>
            <div>
              <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold block mb-1">Vehicle Reg</span>
              <span className="font-mono font-bold text-sm uppercase text-slate-900">{booking.vehicle?.regNumber}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200">
            <div>
              <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold block mb-1">Arrival Window (24-Hr)</span>
              <span className="font-semibold text-slate-900">
                {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} IST
              </span>
            </div>
            <div>
              <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold block mb-1">Expected Exit (24-Hr)</span>
              <span className="font-semibold text-slate-900">
                {new Date(booking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} IST
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <span className="text-slate-500 font-bold uppercase tracking-wider text-[11px]">Total Payable at Facility:</span>
            <span className="text-lg font-heading font-extrabold text-[#0B3D2E]">₹{totalRupees}</span>
          </div>
        </div>

      </div>
    </div>
  );
}