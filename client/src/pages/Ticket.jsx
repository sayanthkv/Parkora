import { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import API from '../api/axios';
import { 
  MapPin, Printer, ArrowLeft, ShieldCheck, Calendar, 
  Clock, AlertTriangle, Car, CreditCard
} from 'lucide-react';

export default function Ticket() {
  const { bookingRef } = useParams();
  const locationState = useLocation().state;

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [qrPayload, setQrPayload] = useState(
    locationState?.qrTicketPayload || sessionStorage.getItem(`parkora_qr_${bookingRef}`) || null
  );

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const res = await API.get('/bookings/my');
        const bookingsList = res.data.data?.bookings || res.data.data || res.data || [];
        const match = bookingsList.find((b) => b.bookingRef === bookingRef);
        if (match) {
          setBooking(match);
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
    return (
      <div className="py-32 text-center text-xs font-semibold text-slate-500 bg-slate-50 min-h-screen">
        Generating boarding pass ticket...
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="py-32 text-center text-xs font-semibold text-red-600 bg-slate-50 min-h-screen">
        {error || 'Ticket not found'}
      </div>
    );
  }

  const totalRupees = booking.pricingSnapshot?.totalAmountPaise
    ? booking.pricingSnapshot.totalAmountPaise / 100
    : booking.pricingSnapshot?.totalAmount || 0;

  const startDate = new Date(booking.startTime);
  const endDate = new Date(booking.endTime);

  const earlyEntryDate = new Date(startDate.getTime() - 5 * 60 * 1000);
  const autoCancelDate = new Date(startDate.getTime() + 15 * 60 * 1000);

  const formatISTTime = (dateObj) =>
    dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });

  const formattedBookingDate = startDate.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 pt-28 pb-16 px-4 sm:px-6 lg:px-8 font-body">
      
      {/* Top Action Bar (Hidden on Print) */}
      <div className="max-w-5xl mx-auto mb-6 flex items-center justify-between print:hidden">
        <Link 
          to="/my-bookings" 
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B3D2E] hover:text-[#145C43] transition-colors bg-white border border-slate-200 px-4 py-2 rounded-full shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to My Bookings
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#0B3D2E] text-white px-5 py-2 rounded-full hover:bg-[#145C43] shadow-sm cursor-pointer transition-all active:scale-95"
        >
          <Printer className="w-3.5 h-3.5 text-[#F2B705]" /> Print Pass
        </button>
      </div>

      {/* Horizontal Boarding Pass Ticket Rectangle */}
      <div className="max-w-5xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden relative flex flex-col md:flex-row">
        
        {/* LEFT SECTION (Main Boarding Pass Info) */}
        <div className="flex-1 flex flex-col justify-between">
          
          {/* Header Banner */}
          <div className="bg-[#0B3D2E] text-white p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-white/10 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/15 mb-2">
                <ShieldCheck className="w-3 h-3 text-[#F2B705]" /> Confirmed Parking Pass
              </div>
              <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-white tracking-tight">
                {booking.location?.name}
              </h1>
              <p className="text-xs text-emerald-100 flex items-center gap-1 mt-1 font-medium">
                <MapPin className="w-3.5 h-3.5 text-[#F2B705] shrink-0" />
                {booking.location?.address?.street}, {booking.location?.address?.area}
              </p>
            </div>

            {/* Bay Slot Hero Badge */}
            <div className="self-start sm:self-center">
              <span className="text-[10px] uppercase font-bold text-emerald-200 tracking-wider block sm:text-right mb-1">
                Reserved Space
              </span>
              <div className="bg-[#F2B705] text-[#0B3D2E] px-4 py-2 rounded-xl font-heading font-black text-sm tracking-wide shadow-sm whitespace-nowrap">
                {booking.floor?.name || 'Ground'} &bull; Bay {booking.bay?.bayNumber}
              </div>
            </div>
          </div>

          {/* Body Information */}
          <div className="p-6 sm:p-7 space-y-4">
            
            {/* Arrival Rules & Policy Notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-[11px] text-amber-950 font-medium space-y-0.5">
                <div className="font-bold text-xs text-amber-900">Gate Arrival & Auto-Cancellation Notice:</div>
                <div>
                  &bull; <strong>Earliest Entry:</strong> {formatISTTime(earlyEntryDate)} IST (Gate access opens 5 mins prior to start).
                </div>
                <div>
                  &bull; <strong>Auto-Cancellation:</strong> If unarrived by {formatISTTime(autoCancelDate)} IST (15 mins past start), the bay will be automatically released.
                </div>
              </div>
            </div>

            {/* Grid Details: Date, Vehicle, Times */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#0B3D2E]" /> Date
                </span>
                <span className="font-bold text-slate-900 text-xs block">
                  {formattedBookingDate}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                  <Car className="w-3 h-3 text-[#0B3D2E]" /> Vehicle
                </span>
                <span className="font-mono font-bold text-slate-900 text-xs uppercase block">
                  {booking.vehicle?.regNumber}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-600" /> Start (IST)
                </span>
                <span className="font-bold text-slate-900 text-xs block">
                  {formatISTTime(startDate)}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-600" /> Exit (IST)
                </span>
                <span className="font-bold text-slate-900 text-xs block">
                  {formatISTTime(endDate)}
                </span>
              </div>
            </div>

            {/* Tariff and Payment Details */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-slate-400" />
                <span className="text-slate-500 font-medium">Payment:</span>
                <span className={`font-extrabold uppercase text-[11px] ${
                  booking.paymentStatus === 'paid' ? 'text-emerald-700' : 'text-amber-700'
                }`}>
                  {booking.paymentStatus === 'paid' ? 'Paid Online (Razorpay)' : 'Pay on Exit at Facility'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 mr-2">Total Amount:</span>
                <span className="text-lg font-heading font-extrabold text-[#0B3D2E]">
                  ₹{totalRupees}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* PERFORATED DIVIDER (Vertical on Desktop, Horizontal on Mobile) */}
        <div className="relative flex md:flex-col items-center justify-center">
          {/* Top Notch on Desktop / Left Notch on Mobile */}
          <div className="w-6 h-6 bg-slate-100/70 rounded-full border border-slate-200 absolute -top-3 left-1/2 -translate-x-1/2 md:top-[-12px] md:left-1/2 md:-translate-x-1/2"></div>
          
          {/* Dashed Line */}
          <div className="w-full md:w-0 h-0 md:h-full border-t-2 md:border-t-0 md:border-r-2 border-dashed border-slate-300"></div>
          
          {/* Bottom Notch on Desktop / Right Notch on Mobile */}
          <div className="w-6 h-6 bg-slate-100/70 rounded-full border border-slate-200 absolute -bottom-3 left-1/2 -translate-x-1/2 md:bottom-[-12px] md:left-1/2 md:-translate-x-1/2"></div>
        </div>

        {/* RIGHT SECTION (QR Scanner Stub) */}
        <div className="w-full md:w-72 bg-slate-50/60 p-6 sm:p-7 flex flex-col items-center justify-center text-center">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 block">
            Digital Entry Token
          </span>

          {/* QR Code Container */}
          <div className="p-3 bg-white rounded-2xl border-2 border-slate-200 shadow-sm mb-3">
            <QRCodeSVG 
              value={qrPayload || booking.bookingRef} 
              size={150} 
              level="H" 
              fgColor="#0B3D2E" 
            />
          </div>

          <span className="font-mono text-sm font-extrabold text-[#0B3D2E] tracking-wider block">
            {booking.bookingRef}
          </span>
          <p className="text-[11px] text-slate-500 font-medium mt-1 leading-tight">
            Scan at entry & exit terminals
          </p>
        </div>

      </div>
    </div>
  );
}