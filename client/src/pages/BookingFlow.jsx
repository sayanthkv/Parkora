import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  MapPin, ArrowRight, ArrowLeft, Zap, Info,
  CheckCircle2, AlertCircle, ShieldCheck, Building
} from 'lucide-react';

// Helper to get current time string (HH:mm) rounded to the next 15-minute interval
const getCurrentTimeString = () => {
  const now = new Date();
  const minutes = now.getMinutes();
  const roundedMinutes = Math.ceil(minutes / 15) * 15;
  if (roundedMinutes === 60) {
    now.setHours(now.getHours() + 1);
    now.setMinutes(0);
  } else {
    now.setMinutes(roundedMinutes);
  }
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${mins}`;
};

export default function BookingFlow() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const todayStr = new Date().toISOString().split('T')[0];

  const [step, setStep] = useState(1);
  const [location, setLocation] = useState(null);
  const [floors, setFloors] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [bays, setBays] = useState([]);

  const [date, setDate] = useState(searchParams.get('date') || todayStr);
  const [startTime, setStartTime] = useState(searchParams.get('startTime') || getCurrentTimeString());
  const [durationHours, setDurationHours] = useState(searchParams.get('durationHours') || '2');
  const [vehicleType, setVehicleType] = useState(searchParams.get('vehicleType') || 'car');
  const [vehicleReg, setVehicleReg] = useState(user?.vehicles?.[0]?.regNumber || 'KL 13 AS 1234');
  const [selectedBay, setSelectedBay] = useState(null);

  const [loading, setLoading] = useState(true);
  const [loadingBays, setLoadingBays] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLocationData = async () => {
      try {
        const res = await API.get(`/locations/${slug}`);
        const locData = res.data.data.location;
        const floorData = res.data.data.floors || [];
        
        setLocation(locData);
        setFloors(floorData);
        if (floorData.length > 0) {
          setSelectedFloor(floorData[0]);
        }
      } catch (err) {
        setError('Failed to load facility floor details.');
      } finally {
        setLoading(false);
      }
    };
    fetchLocationData();
  }, [slug]);

  // Extract supported vehicle types dynamically from location or its floor bays
  const availableVehicleTypes = useMemo(() => {
    if (!location) return [];

    let types = location.supportedVehicleTypes || location.allowedVehicles || [];
    
    if (!types.length && floors.length) {
      const extracted = new Set();
      floors.forEach(fl => {
        fl.bays?.forEach(b => {
          if (b.supportedVehicleType) extracted.add(b.supportedVehicleType);
          if (b.isEVCharging) extracted.add('ev');
        });
      });
      types = Array.from(extracted);
    }

    if (!types.length) {
      types = ['car', 'bike', 'ev'];
    }

    return types;
  }, [location, floors]);

  // Ensure selected vehicleType is valid for the location
  useEffect(() => {
    if (availableVehicleTypes.length > 0 && !availableVehicleTypes.includes(vehicleType)) {
      setVehicleType(availableVehicleTypes[0]);
    }
  }, [availableVehicleTypes, vehicleType]);

  const getStartAndEndDates = () => {
    const start = new Date(`${date}T${startTime}`);
    const end = new Date(start.getTime() + parseInt(durationHours) * 60 * 60 * 1000);
    return { start, end };
  };

  // Validate if selected start time is in the past
  const isPastTime = useMemo(() => {
    if (!date || !startTime) return false;
    const selectedStart = new Date(`${date}T${startTime}`);
    const now = new Date();
    return selectedStart < now;
  }, [date, startTime]);

  useEffect(() => {
    if (!location || !selectedFloor || isPastTime) return;

    const fetchBayAvailability = async () => {
      setLoadingBays(true);
      setError(null);
      try {
        const { start, end } = getStartAndEndDates();
        const res = await API.get(
          `/locations/${location._id}/floors/${selectedFloor._id}/bays`,
          {
            params: {
              startTime: start.toISOString(),
              endTime: end.toISOString(),
              vehicleType,
            },
          }
        );
        setBays(res.data.data || []);
      } catch (err) {
        setError('Error checking real-time bay availability.');
      } finally {
        setLoadingBays(false);
      }
    };

    fetchBayAvailability();
  }, [selectedFloor, date, startTime, durationHours, vehicleType, isPastTime]);

  const handleNextToStep2 = () => {
    if (isPastTime) {
      setError('Selected arrival time has already passed. Please select a future date and time.');
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleConfirmBooking = async () => {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/book/${slug}`)}`);
      return;
    }

    if (!selectedBay) return;

    if (isPastTime) {
      setError('Cannot reserve for a past time window.');
      setStep(1);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { start, end } = getStartAndEndDates();
      const res = await API.post('/bookings', {
        locationId: location._id,
        floorId: selectedFloor._id,
        bayId: selectedBay._id,
        vehicleRegNumber: vehicleReg,
        vehicleType,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      });

      navigate(`/ticket/${res.data.data.bookingRef}`);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.data?.message?.includes('token')) {
        setError('Your session has expired. Please log in again to complete your reservation.');
        localStorage.removeItem('parkora_token');
        localStorage.removeItem('token');
        setTimeout(() => {
          navigate(`/login?redirect=${encodeURIComponent(`/book/${slug}`)}`);
        }, 1200);
      } else if (err.response?.status === 409) {
        setError('Bay conflict: This bay was reserved just now. Please pick another bay.');
        setStep(2);
      } else {
        setError(err.response?.data?.message || 'Failed to confirm reservation.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="py-28 text-center text-slate-500 font-medium bg-white min-h-screen">Loading facility details...</div>;
  if (!location) return <div className="py-28 text-center text-red-600 font-medium bg-white min-h-screen">Location not found.</div>;

  const { start, end } = getStartAndEndDates();
  const calculatedTotal = parseInt(durationHours) * (location.pricing?.hourlyRate || location.price || 30);

  const vehicleLabels = {
    car: 'Car / SUV',
    bike: 'Two Wheeler',
    ev: 'EV Vehicle',
    truck: 'Heavy Vehicle / Bus'
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 pt-28 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto font-body">
      
      {/* Navigation & Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/locations')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B3D2E] hover:text-[#145C43] mb-3 transition-colors bg-white border border-slate-200 px-3.5 py-1.5 rounded-full shadow-sm cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Facilities
        </button>
        <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight">{location.name}</h1>
        <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 font-medium">
          <MapPin className="w-3.5 h-3.5 text-[#0B3D2E]" /> {location.address?.street}, {location.address?.area}
        </p>
      </div>

      {/* Step Indicator Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 flex items-center justify-between shadow-sm">
        <div className={`flex items-center gap-2 text-xs font-bold ${step >= 1 ? 'text-[#0B3D2E]' : 'text-slate-400'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center font-heading text-xs transition-colors ${step >= 1 ? 'bg-[#0B3D2E] text-white' : 'bg-slate-100 text-slate-500'}`}>1</span>
          1. Time & Vehicle
        </div>
        <div className={`h-0.5 flex-1 mx-3 ${step >= 2 ? 'bg-[#0B3D2E]' : 'bg-slate-200'}`} />
        <div className={`flex items-center gap-2 text-xs font-bold ${step >= 2 ? 'text-[#0B3D2E]' : 'text-slate-400'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center font-heading text-xs transition-colors ${step >= 2 ? 'bg-[#0B3D2E] text-white' : 'bg-slate-100 text-slate-500'}`}>2</span>
          2. Floor & Bay Grid
        </div>
        <div className={`h-0.5 flex-1 mx-3 ${step >= 3 ? 'bg-[#0B3D2E]' : 'bg-slate-200'}`} />
        <div className={`flex items-center gap-2 text-xs font-bold ${step >= 3 ? 'text-[#0B3D2E]' : 'text-slate-400'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center font-heading text-xs transition-colors ${step >= 3 ? 'bg-[#0B3D2E] text-white' : 'bg-slate-100 text-slate-500'}`}>3</span>
          3. Review & QR Ticket
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          {error}
        </div>
      )}

      {/* STEP 1: Form Details */}
      {step === 1 && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-lg font-heading font-bold text-slate-900">Step 1: Enter Schedule & Vehicle Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Arrival Date</label>
              <input
                type="date"
                value={date}
                min={todayStr}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:border-[#0B3D2E]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Arrival Time (24-Hour Format)
              </label>
              <input
                type="time"
                value={startTime}
                min={date === todayStr ? getCurrentTimeString() : undefined}
                onChange={(e) => setStartTime(e.target.value)}
                className={`w-full p-3 bg-white border rounded-xl text-sm font-semibold outline-none ${
                  isPastTime ? 'border-red-500 text-red-600' : 'border-slate-200 text-slate-900 focus:border-[#0B3D2E]'
                }`}
              />
              {isPastTime && (
                <p className="text-[11px] text-red-600 font-semibold mt-1">
                  Selected time has already passed.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Duration</label>
              <select
                value={durationHours}
                onChange={(e) => setDurationHours(e.target.value)}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:border-[#0B3D2E]"
              >
                <option value="1">1 Hour</option>
                <option value="2">2 Hours</option>
                <option value="4">4 Hours</option>
                <option value="8">8 Hours</option>
                <option value="12">12 Hours</option>
                <option value="24">24 Hours (Full Day)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Available Vehicle Types
              </label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:border-[#0B3D2E]"
              >
                {availableVehicleTypes.map((type) => (
                  <option key={type} value={type}>
                    {vehicleLabels[type] || type.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Vehicle Registration Number</label>
              <input
                type="text"
                placeholder="e.g. KL 13 AS 1234"
                value={vehicleReg}
                onChange={(e) => setVehicleReg(e.target.value.toUpperCase())}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold uppercase tracking-wider text-slate-900 outline-none focus:border-[#0B3D2E]"
                required
              />
            </div>
          </div>

          <button
            onClick={handleNextToStep2}
            disabled={!vehicleReg.trim() || isPastTime}
            className="w-full py-3.5 bg-[#0B3D2E] hover:bg-[#145C43] text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm active:scale-95"
          >
            Select Floor & Bay
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STEP 2: Bay Grid */}
      {step === 2 && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-heading font-bold text-slate-900">Step 2: Choose Your Parking Bay</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Window: {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} – {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} ({durationHours} hrs)
              </p>
            </div>

            {floors.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                {floors.map((fl) => (
                  <button
                    key={fl._id}
                    onClick={() => {
                      setSelectedFloor(fl);
                      setSelectedBay(null);
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${selectedFloor?._id === fl._id ? 'bg-[#0B3D2E] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    {fl.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-6 text-xs font-semibold text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-[#145C43]" /> Available
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-[#F2B705] ring-2 ring-[#0B3D2E]" /> Selected
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-slate-200 opacity-80" /> Reserved / Occupied
            </div>
          </div>

          {loadingBays ? (
            <div className="py-12 text-center text-xs font-medium text-slate-500">Checking bay availability...</div>
          ) : bays.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {bays.map((b) => {
                const isSelected = selectedBay?._id === b._id;
                const isAvailable = b.isAvailable;

                return (
                  <button
                    key={b._id}
                    disabled={!isAvailable}
                    onClick={() => setSelectedBay(b)}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between h-20 relative cursor-pointer ${
                      isSelected
                        ? 'bg-[#F2B705] text-slate-900 border-[#0B3D2E] ring-2 ring-[#0B3D2E] shadow-sm scale-105 font-bold'
                        : isAvailable
                        ? 'bg-[#145C43] hover:bg-[#0B3D2E] border-transparent text-white'
                        : 'bg-slate-100 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-heading text-xs font-bold">{b.bayNumber}</span>
                      {b.isEVCharging && <Zap className={`w-3.5 h-3.5 ${isSelected ? 'text-[#0B3D2E]' : 'text-[#F2B705]'}`} />}
                    </div>

                    <span className="text-[10px] uppercase tracking-wider font-semibold opacity-90">
                      {isSelected ? 'SELECTED' : isAvailable ? b.supportedVehicleType : 'RESERVED'}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <Building className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-700">No bays available for this selection.</p>
              <p className="text-xs text-slate-500">
                {floors.length === 0 
                  ? "No floors/bays are configured for this facility yet in the database." 
                  : "Try selecting another floor or changing the vehicle type."}
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <button
              onClick={() => setStep(1)}
              className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl border border-slate-200 text-sm cursor-pointer transition-colors"
            >
              Back
            </button>
            <button
              disabled={!selectedBay}
              onClick={() => setStep(3)}
              className="flex-1 py-3 bg-[#0B3D2E] hover:bg-[#145C43] text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-sm active:scale-95"
            >
              Review Reservation
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Summary */}
      {step === 3 && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-lg font-heading font-bold text-slate-900">Step 3: Review Reservation Summary</h2>

          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3.5 text-xs">
            <div className="flex justify-between border-b border-slate-200 pb-2.5">
              <span className="text-slate-500 font-medium">Facility:</span>
              <span className="font-bold text-slate-900">{location.name}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2.5">
              <span className="text-slate-500 font-medium">Floor & Bay Slot:</span>
              <span className="font-bold text-[#0B3D2E]">{selectedFloor?.name} — Bay {selectedBay?.bayNumber}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2.5">
              <span className="text-slate-500 font-medium">Vehicle Registration:</span>
              <span className="font-bold uppercase tracking-wider text-slate-900">{vehicleReg}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2.5">
              <span className="text-slate-500 font-medium">Interval Window (24-Hr):</span>
              <span className="font-semibold text-slate-900">
                {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} – {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2.5">
              <span className="text-slate-500 font-medium">Hourly Rate x Duration:</span>
              <span className="font-semibold text-slate-900">₹{location.pricing?.hourlyRate || location.price || 30} x {durationHours} hrs</span>
            </div>
            <div className="flex justify-between pt-1 text-sm font-extrabold">
              <span className="text-slate-900">Total Payable at Facility:</span>
              <span className="text-[#0B3D2E] font-heading text-base">₹{calculatedTotal}</span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-xs flex items-center gap-2 font-medium">
            <Info className="w-4 h-4 shrink-0 text-[#0B3D2E]" />
            Pay-at-Facility Mode: Payment is collected upon vehicle exit by facility staff.
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="py-3.5 px-6 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl border border-slate-200 text-sm cursor-pointer transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleConfirmBooking}
              disabled={submitting}
              className="flex-1 py-3.5 bg-[#0B3D2E] hover:bg-[#145C43] text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
            >
              {submitting ? 'Creating Ticket...' : 'Confirm & Generate QR Ticket'}
              <CheckCircle2 className="w-4 h-4 text-[#F2B705]" />
            </button>
          </div>
        </div>
      )}

      {/* Security Footer Note */}
      <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-500 font-medium">
        <ShieldCheck className="w-4 h-4 text-[#0B3D2E]" />
        <span>Non-overlapping atomic reservation engine • Verified for Kannur Smart City</span>
      </div>

    </div>
  );
}