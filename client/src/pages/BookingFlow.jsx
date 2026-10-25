import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  MapPin, ArrowRight, ArrowLeft, Zap, Info,
  CheckCircle2, AlertCircle, ShieldCheck
} from 'lucide-react';

export default function BookingFlow() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState(1);

  const [location, setLocation] = useState(null);
  const [floors, setFloors] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [bays, setBays] = useState([]);

  const [date, setDate] = useState(searchParams.get('date') || new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState(searchParams.get('startTime') || '14:00');
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
        setLocation(res.data.data.location);
        setFloors(res.data.data.floors);
        if (res.data.data.floors.length > 0) {
          setSelectedFloor(res.data.data.floors[0]);
        }
      } catch (err) {
        setError('Failed to load facility floor details.');
      } finally {
        setLoading(false);
      }
    };
    fetchLocationData();
  }, [slug]);

  const getStartAndEndDates = () => {
    const start = new Date(`${date}T${startTime}`);
    const end = new Date(start.getTime() + parseInt(durationHours) * 60 * 60 * 1000);
    return { start, end };
  };

  useEffect(() => {
    if (!location || !selectedFloor) return;

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
        setBays(res.data.data);
      } catch (err) {
        setError('Error checking real-time bay availability.');
      } finally {
        setLoadingBays(false);
      }
    };

    fetchBayAvailability();
  }, [selectedFloor, date, startTime, durationHours, vehicleType]);

  const handleConfirmBooking = async () => {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/book/${slug}`)}`);
      return;
    }

    if (!selectedBay) return;

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
  const calculatedTotal = parseInt(durationHours) * location.pricing.hourlyRate;

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
          <MapPin className="w-3.5 h-3.5 text-[#0B3D2E]" /> {location.address.street}, {location.address.area}
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
                min={new Date().toISOString().split('T')[0]}
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
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:border-[#0B3D2E]"
              />
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
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Vehicle Type</label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:border-[#0B3D2E]"
              >
                <option value="car">Car / SUV</option>
                <option value="bike">Two Wheeler</option>
                <option value="ev">EV Vehicle</option>
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
            onClick={() => setStep(2)}
            disabled={!vehicleReg.trim()}
            className="w-full py-3.5 bg-[#0B3D2E] hover:bg-[#145C43] text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-sm active:scale-95"
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
                24-Hr Window: {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} – {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} ({durationHours} hrs)
              </p>
            </div>

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
          ) : (
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
              <span className="font-semibold text-slate-900">₹{location.pricing.hourlyRate} x {durationHours} hrs</span>
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