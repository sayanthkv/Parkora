import React, { useState, useEffect } from 'react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { 
  Building, Car, Clock, ShieldCheck, CheckCircle2, 
  AlertCircle, ArrowRight, Calendar, Lock, RefreshCw 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

  // Live real-time clock (updates every second)
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

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBayId || !selectedFloorId) {
      setError('Please select an available parking bay slot.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await API.post('/staff/book-customer', {
        ...formData,
        floorId: selectedFloorId,
        bayId: selectedBayId,
      });

      setCreatedBooking(res.data.data);
      fetchFacilityStructure(); // Refresh slot availability
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create booking for customer.');
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate intended booking time window
  const reqStart = currentTime;
  const durationNumber = Number(formData.durationHours) || 1;
  const reqEnd = new Date(reqStart.getTime() + durationNumber * 60 * 60 * 1000);

  // Check if a bay is occupied during this time window
  const getBayConflict = (bayId) => {
    return activeBookings.find((b) => {
      const bayRefId = b.bay?._id ? String(b.bay._id) : String(b.bay);
      if (bayRefId !== String(bayId)) return false;

      const bookingStart = new Date(b.startTime);
      const bookingEnd = new Date(b.endTime);

      // Overlap formula: StartA < EndB && EndA > StartB
      return reqStart < bookingEnd && reqEnd > bookingStart;
    });
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pt-28 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto font-body space-y-6">
      
      {/* Top Banner with Station Info & Live Clock */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-[#0B3D2E] text-[#F2B705] px-3.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-2">
            <Building className="w-3.5 h-3.5" /> Walk-In Reservation Desk
          </div>
          <h1 className="text-2xl font-heading font-extrabold text-slate-900">
            Book for Customer
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Stationed Lot: <strong>{facility?.name || 'Assigned Facility'}</strong> (Tariff: ₹{facility?.pricing?.hourlyRate}/hr)
          </p>
        </div>

        {/* Live Readable Clock Widget */}
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

      {createdBooking ? (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
          <h2 className="text-xl font-heading font-extrabold text-slate-900">Walk-In Booking Confirmed!</h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            Vehicle <strong>{createdBooking.vehicle?.regNumber}</strong> allocated to <strong>Bay {createdBooking.bay?.bayNumber}</strong> on {createdBooking.floor?.name} and marked as Active.
          </p>
          <div className="pt-4 flex justify-center gap-3">
            <button
              onClick={() => {
                setCreatedBooking(null);
                setSelectedBayId('');
                setFormData({ customerName: '', customerPhone: '', customerEmail: '', vehicleRegNumber: '', vehicleType: 'car', durationHours: 2 });
              }}
              className="px-6 py-2.5 bg-[#0B3D2E] text-white rounded-xl text-xs font-bold hover:bg-[#145C43] cursor-pointer"
            >
              Book Another Vehicle
            </button>
            <button
              onClick={() => navigate('/staff/terminal')}
              className="px-6 py-2.5 bg-slate-100 text-slate-800 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer"
            >
              Go to Gate Terminal
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleBookingSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Left Column: Vehicle & Duration */}
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

          {/* Right Column: Live Bay Selector with Real-time Occupancy Indicators */}
          <div className="md:col-span-6 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-4 text-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h2 className="font-heading font-bold text-sm text-slate-900">
                  Select Parking Bay
                </h2>
                <button
                  type="button"
                  onClick={fetchFacilityStructure}
                  className="text-[11px] text-[#0B3D2E] hover:underline flex items-center gap-1 font-semibold"
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

              {/* Bay Grid with Occupancy States */}
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
                        className={`p-3 rounded-2xl border text-center transition-all flex flex-col justify-between relative ${
                          isOccupied
                            ? 'bg-red-50/70 border-red-200 text-red-900 opacity-75 cursor-not-allowed'
                            : isSelected
                            ? 'bg-[#0B3D2E] text-[#F2B705] border-[#0B3D2E] shadow-sm font-black'
                            : 'bg-emerald-50/40 hover:bg-emerald-100/60 text-slate-800 border-emerald-200/80 cursor-pointer'
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

            {/* Submission Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting || !selectedBayId}
                className="w-full py-3.5 bg-[#0B3D2E] hover:bg-[#145C43] text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {submitting ? 'Confirming...' : 'Approve & Issue Bay Pass'}
                <ArrowRight className="w-4 h-4 text-[#F2B705]" />
              </button>
            </div>
          </div>

        </form>
      )}

    </div>
  );
}