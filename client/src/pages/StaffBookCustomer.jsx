import React, { useState, useEffect } from 'react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { 
  Building, Car, Clock, ShieldCheck, CheckCircle2, 
  AlertCircle, ArrowRight, ArrowLeft, RefreshCw, Lock,
  Banknote, QrCode, Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

export default function StaffBookCustomer() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [facility, setFacility] = useState(null);
  const [floors, setFloors] = useState([]);
  const [bays, setBays] = useState([]);
  const [activeBookings, setActiveBookings] = useState([]);
  const [selectedFloorId, setSelectedFloorId] = useState('');
  const [selectedBayId, setSelectedBayId] = useState('');

  // Flow Step: 'form' -> 'payment' -> 'success'
  const [step, setStep] = useState('form');
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' or 'upi_qr'
  const [simulatingUpi, setSimulatingUpi] = useState(false);

  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    vehicleRegNumber: '',
    vehicleType: 'car',
    durationHours: 2,
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [createdBooking, setCreatedBooking] = useState(null);

  // Live real-time clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchFacilityStructure = async () => {
    setLoading(true);
    setError(null);
    try {
      const shiftRes = await API.get('/staff/shift-context');
      const fac = shiftRes.data.data.facility;
      setFacility(fac);

      const structRes = await API.get('/staff/facility-structure');
      const fls = structRes.data.data.floors || [];
      const bys = structRes.data.data.bays || [];
      const acts = structRes.data.data.activeBookings || [];

      setFloors(fls);
      setBays(bys);
      setActiveBookings(acts);
      if (fls.length > 0 && !selectedFloorId) {
        setSelectedFloorId(fls[0]._id);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load assigned facility layout.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacilityStructure();
  }, []);

  const reqStart = currentTime;
  const durationNumber = Number(formData.durationHours) || 1;
  const reqEnd = new Date(reqStart.getTime() + durationNumber * 60 * 60 * 1000);

  // Check bay occupancy conflict
  const getBayConflict = (bayId) => {
    return activeBookings.find((b) => {
      const bayRefId = b.bay?._id ? String(b.bay._id) : String(b.bay);
      if (bayRefId !== String(bayId)) return false;

      const bookingStart = new Date(b.startTime);
      const bookingEnd = new Date(b.endTime);

      return reqStart < bookingEnd && reqEnd > bookingStart;
    });
  };

  const selectedBay = bays.find((b) => String(b._id) === String(selectedBayId));
  const hourlyRateRupees = selectedBay?.customHourlyRate ?? facility?.pricing?.hourlyRate ?? 20;
  const totalAmountRupees = durationNumber * hourlyRateRupees;

  // Step 1: Validate Form and move to Payment
  const handleProceedToPayment = (e) => {
    e.preventDefault();
    if (!formData.vehicleRegNumber.trim()) {
      setError('Please provide a vehicle registration number.');
      return;
    }
    if (!selectedBayId || !selectedFloorId) {
      setError('Please select an available parking bay slot.');
      return;
    }
    setError(null);
    setStep('payment');
  };

  // Step 2: Finalize Booking with Selected Payment Method
  const handleFinalizeBooking = async (method = paymentMethod) => {
    setSubmitting(true);
    setError(null);

    try {
      const res = await API.post('/staff/book-customer', {
        ...formData,
        floorId: selectedFloorId,
        bayId: selectedBayId,
        paymentMethod: method,
      });

      setCreatedBooking(res.data.data);
      setStep('success');
      fetchFacilityStructure();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete transaction.');
    } finally {
      setSubmitting(false);
      setSimulatingUpi(false);
    }
  };

  // Mock UPI trigger
  const handleSimulateUpiPayment = () => {
    setSimulatingUpi(true);
    setTimeout(() => {
      handleFinalizeBooking('upi_qr');
    }, 1200);
  };

  const availableBays = bays.filter(
    (b) => String(b.floor) === String(selectedFloorId) && b.status !== 'maintenance' && b.isEnabled !== false
  );

  const formattedDate = currentTime.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const formattedTime = currentTime.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  // Test UPI QR String (Standard NPCI Format)
  const testUpiPayload = `upi://pay?pa=parkora.test@upi&pn=Parkora%20Smart%20Parking&am=${totalAmountRupees}&cu=INR&tn=Bay-${selectedBay?.bayNumber || 'Spot'}`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pt-28 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto font-body space-y-6">
      
      {/* Top Banner with Station Info & Clock */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-[#0B3D2E] text-[#F2B705] px-3.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-2">
            <Building className="w-3.5 h-3.5" /> Walk-In Reservation Desk
          </div>
          <h1 className="text-2xl font-heading font-extrabold text-slate-900">
            Book for Customer
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Stationed Lot: <strong>{facility?.name || 'Assigned Facility'}</strong> (Tariff: ₹{facility?.pricing?.hourlyRate || 20}/hr)
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 sm:px-5 flex items-center gap-3.5 self-start md:self-auto shadow-sm">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping shrink-0" />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#0B3D2E]" /> Live System Clock
            </div>
            <div className="font-heading font-extrabold text-sm text-slate-900 mt-0.5">
              {formattedTime} <span className="text-[11px] font-semibold text-slate-500">IST</span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              {formattedDate}
            </div>
          </div>
        </div>
      </div>

      {/* ================= STEP 1: FORM & BAY SELECTION ================= */}
      {step === 'form' && (
        <form onSubmit={handleProceedToPayment} className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Left Column: Vehicle & Particulars */}
          <div className="md:col-span-6 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-4 text-xs">
            <h2 className="font-heading font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
              Vehicle & Driver Particulars
            </h2>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" /> {error}
              </div>
            )}

            <div>
              <label className="block font-bold uppercase text-slate-500 mb-1">Vehicle Registration Number *</label>
              <input
                type="text"
                placeholder="KL 13 AS 1234"
                value={formData.vehicleRegNumber}
                onChange={(e) => setFormData({ ...formData, vehicleRegNumber: e.target.value.toUpperCase() })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase font-bold text-sm text-slate-900 outline-none focus:border-[#0B3D2E]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold uppercase text-slate-500 mb-1">Vehicle Type</label>
                <select
                  value={formData.vehicleType}
                  onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none focus:border-[#0B3D2E]"
                >
                  <option value="car">Car / SUV</option>
                  <option value="bike">Two-Wheeler</option>
                  <option value="ev">EV Vehicle</option>
                  <option value="heavy">Heavy Vehicle</option>
                </select>
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-500 mb-1">Duration (Hours)</label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={formData.durationHours}
                  onChange={(e) => setFormData({ ...formData, durationHours: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none focus:border-[#0B3D2E]"
                  required
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Customer Information (Optional)
              </span>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Customer Name"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none focus:border-[#0B3D2E]"
                />
                <input
                  type="tel"
                  placeholder="Phone Number (+91)"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none focus:border-[#0B3D2E]"
                />
              </div>
            </div>

            <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl text-[11px] text-emerald-900 font-medium">
              Entry Time: <strong>Now ({formattedTime})</strong> &bull; Exit Time: <strong>{reqEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</strong>
            </div>
          </div>

          {/* Right Column: Live Bay Selector */}
          <div className="md:col-span-6 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-4 text-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h2 className="font-heading font-bold text-sm text-slate-900">
                  Select Parking Bay
                </h2>
                <button
                  type="button"
                  onClick={fetchFacilityStructure}
                  className="text-[11px] text-[#0B3D2E] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh Bays
                </button>
              </div>

              {/* Floor Switcher */}
              <div className="flex gap-2 my-3 overflow-x-auto pb-1">
                {floors.map((fl) => (
                  <button
                    key={fl._id}
                    type="button"
                    onClick={() => { setSelectedFloorId(fl._id); setSelectedBayId(''); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      String(selectedFloorId) === String(fl._id)
                        ? 'bg-[#0B3D2E] text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {fl.name}
                  </button>
                ))}
              </div>

              {/* Bay Grid */}
              <div className="grid grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {availableBays.length === 0 ? (
                  <div className="col-span-3 text-center text-slate-400 py-8 font-medium">
                    No bays configured on this floor level.
                  </div>
                ) : (
                  availableBays.map((bay) => {
                    const conflict = getBayConflict(bay._id);
                    const isOccupied = Boolean(conflict);
                    const isSelected = selectedBayId === bay._id;

                    const freeUntilStr = conflict?.endTime
                      ? new Date(conflict.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
                      : '';

                    return (
                      <button
                        key={bay._id}
                        type="button"
                        disabled={isOccupied}
                        onClick={() => !isOccupied && setSelectedBayId(bay._id)}
                        className={`p-3 rounded-2xl border text-center transition-all flex flex-col justify-between relative cursor-pointer ${
                          isOccupied
                            ? 'bg-red-50/70 border-red-200 text-red-900 opacity-75 cursor-not-allowed'
                            : isSelected
                            ? 'bg-[#0B3D2E] text-[#F2B705] border-[#0B3D2E] shadow-sm font-black'
                            : 'bg-emerald-50/40 hover:bg-emerald-100/60 text-slate-800 border-emerald-200/80'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-heading font-extrabold text-sm tracking-tight">{bay.bayNumber}</span>
                          {isOccupied ? (
                            <Lock className="w-3 h-3 text-red-600 shrink-0" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          )}
                        </div>

                        <div className="mt-1">
                          <span className={`text-[9px] font-bold uppercase tracking-wider block px-1 py-0.2 rounded ${
                            isOccupied
                              ? 'bg-red-200/80 text-red-900 font-extrabold'
                              : isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-emerald-100 text-emerald-900'
                          }`}>
                            {isOccupied ? 'Occupied' : 'Available'}
                          </span>

                          <span className="text-[8.5px] uppercase opacity-75 block mt-0.5 font-medium truncate">
                            {isOccupied ? `Until ${freeUntilStr}` : bay.supportedVehicleType}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={!selectedBayId}
                className="w-full py-3.5 bg-[#0B3D2E] hover:bg-[#145C43] text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Continue to Payment & Verification
                <ArrowRight className="w-4 h-4 text-[#F2B705]" />
              </button>
            </div>
          </div>

        </form>
      )}

      {/* ================= STEP 2: PAYMENT & APPROVAL SCREEN ================= */}
      {step === 'payment' && (
        <div className="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <button
              type="button"
              onClick={() => setStep('form')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Particulars
            </button>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Payment Verification
            </span>
          </div>

          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" /> {error}
            </div>
          )}

          {/* Booking Summary Box */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px] block">Vehicle</span>
              <span className="font-mono font-bold text-slate-900 uppercase">{formData.vehicleRegNumber}</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px] block">Allocated Bay</span>
              <span className="font-bold text-[#0B3D2E]">Bay {selectedBay?.bayNumber}</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px] block">Duration</span>
              <span className="font-semibold text-slate-800">{formData.durationHours} Hour(s)</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px] block">Total Tariff</span>
              <span className="font-heading font-extrabold text-slate-900 text-sm">₹{totalAmountRupees}</span>
            </div>
          </div>

          {/* Payment Method Switcher */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Select Settlement Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`p-4 rounded-2xl border flex items-center justify-center gap-2.5 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                  paymentMethod === 'cash'
                    ? 'bg-[#0B3D2E] text-white border-[#0B3D2E] shadow-sm'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                }`}
              >
                <Banknote className="w-4 h-4" /> Cash at Gate
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('upi_qr')}
                className={`p-4 rounded-2xl border flex items-center justify-center gap-2.5 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                  paymentMethod === 'upi_qr'
                    ? 'bg-[#0B3D2E] text-white border-[#0B3D2E] shadow-sm'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                }`}
              >
                <QrCode className="w-4 h-4" /> Online UPI QR (Test)
              </button>
            </div>
          </div>

          {/* CASH MODE VIEW */}
          {paymentMethod === 'cash' && (
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-4">
              <div className="inline-flex p-3 bg-white rounded-full border border-slate-200 shadow-sm text-emerald-700">
                <Banknote className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-500 font-medium block">Exact Cash to Collect:</span>
                <span className="text-3xl font-heading font-extrabold text-[#0B3D2E]">₹{totalAmountRupees}</span>
              </div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Collect physical cash from the driver at the counter before approving check-in.
              </p>

              <button
                type="button"
                disabled={submitting}
                onClick={() => handleFinalizeBooking('cash')}
                className="w-full py-4 bg-[#0B3D2E] hover:bg-[#145C43] text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
              >
                <Check className="w-4 h-4 text-[#F2B705]" />
                {submitting ? 'Verifying & Issuing...' : 'Cash Collected & Approve Pass'}
              </button>
            </div>
          )}

          {/* ONLINE TEST UPI QR MODE VIEW */}
          {paymentMethod === 'upi_qr' && (
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-4">
              <div className="inline-block p-3.5 bg-white rounded-2xl border-2 border-slate-200 shadow-sm">
                <QRCodeSVG value={testUpiPayload} size={160} level="H" fgColor="#0B3D2E" />
              </div>

              <div>
                <span className="text-xs text-slate-500 font-medium block">Ask driver to scan QR to pay:</span>
                <span className="text-2xl font-heading font-extrabold text-[#0B3D2E]">₹{totalAmountRupees}</span>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full inline-block mt-1">
                  Simulated Gateway Mode (Test)
                </span>
              </div>

              <button
                type="button"
                disabled={submitting || simulatingUpi}
                onClick={handleSimulateUpiPayment}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
              >
                {simulatingUpi ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    Awaiting Bank Confirmation...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-[#F2B705]" />
                    Simulate Payment Received & Issue Pass
                  </>
                )}
              </button>
            </div>
          )}

        </div>
      )}

      {/* ================= STEP 3: SUCCESS & TICKET SUMMARY ================= */}
      {step === 'success' && createdBooking && (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full inline-block mb-2">
              Payment Settled & Vehicle Admitted
            </span>
            <h2 className="text-2xl font-heading font-extrabold text-slate-900">
              Walk-In Bay Pass Issued
            </h2>
            <p className="font-mono text-sm font-bold text-[#0B3D2E] mt-1">
              Ref: {createdBooking.bookingRef}
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-left grid grid-cols-2 gap-3 max-w-md mx-auto">
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px] block">Vehicle</span>
              <span className="font-mono font-bold text-slate-900 uppercase">{createdBooking.vehicle?.regNumber}</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px] block">Space</span>
              <span className="font-bold text-[#0B3D2E]">{createdBooking.floor?.name} &bull; Bay {createdBooking.bay?.bayNumber}</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px] block">Status</span>
              <span className="font-extrabold text-emerald-700 uppercase">Active (Checked In)</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px] block">Paid Via</span>
              <span className="font-bold text-slate-800 uppercase">{createdBooking.paymentMethod}</span>
            </div>
          </div>

          <div className="pt-3 flex justify-center gap-3 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setCreatedBooking(null);
                setSelectedBayId('');
                setStep('form');
                setFormData({ customerName: '', customerPhone: '', customerEmail: '', vehicleRegNumber: '', vehicleType: 'car', durationHours: 2 });
              }}
              className="px-6 py-3 bg-[#0B3D2E] hover:bg-[#145C43] text-white rounded-xl cursor-pointer shadow-sm active:scale-95 transition-all"
            >
              Book Another Vehicle
            </button>
            <button
              type="button"
              onClick={() => navigate('/staff/terminal')}
              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl cursor-pointer shadow-sm active:scale-95 transition-all"
            >
              Go to Gate Terminal
            </button>
          </div>
        </div>
      )}

    </div>
  );
}