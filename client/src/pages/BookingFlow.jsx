import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  MapPin, Clock, ArrowRight, ArrowLeft, Zap, Info,
  CheckCircle2, AlertCircle
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
  const [startTime, setStartTime] = useState(searchParams.get('startTime') || '14:00'); // 24-hr default
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
      navigate(`/login?redirect=/book/${slug}`);
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
      if (err.response?.status === 409) {
        setError('Bay conflict: This bay was reserved just now. Please pick another bay.');
        setStep(2);
      } else {
        setError(err.response?.data?.message || 'Failed to confirm reservation.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="py-20 text-center text-gray-500">Loading facility details...</div>;
  if (!location) return <div className="py-20 text-center text-red-600">Location not found.</div>;

  const { start, end } = getStartAndEndDates();
  const calculatedTotal = parseInt(durationHours) * location.pricing.hourlyRate; // Exact rate

  return (
    <div className="min-h-screen bg-[#F7F8F6] py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      
      <div className="mb-6">
        <button
          onClick={() => navigate('/locations')}
          className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-[#176B4D] mb-2 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Locations
        </button>
        <h1 className="text-2xl font-bold text-[#202722]">{location.name}</h1>
        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
          <MapPin className="w-3.5 h-3.5" /> {location.address.street}, {location.address.area}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200/80 p-4 mb-6 flex items-center justify-between">
        <div className={`flex items-center gap-2 text-xs font-bold ${step >= 1 ? 'text-[#176B4D]' : 'text-gray-400'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center border text-xs ${step >= 1 ? 'bg-[#176B4D] text-white border-[#176B4D]' : 'border-gray-300'}`}>1</span>
          1. Time & Vehicle
        </div>
        <div className="h-0.5 flex-1 mx-4 bg-gray-200" />
        <div className={`flex items-center gap-2 text-xs font-bold ${step >= 2 ? 'text-[#176B4D]' : 'text-gray-400'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center border text-xs ${step >= 2 ? 'bg-[#176B4D] text-white border-[#176B4D]' : 'border-gray-300'}`}>2</span>
          2. Floor & Bay Grid
        </div>
        <div className="h-0.5 flex-1 mx-4 bg-gray-200" />
        <div className={`flex items-center gap-2 text-xs font-bold ${step >= 3 ? 'text-[#176B4D]' : 'text-gray-400'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center border text-xs ${step >= 3 ? 'bg-[#176B4D] text-white border-[#176B4D]' : 'border-gray-300'}`}>3</span>
          3. Review & QR Ticket
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* STEP 1: Time Window in 24-Hour Format */}
      {step === 1 && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 space-y-6">
          <h2 className="text-base font-bold text-[#202722]">Step 1: Enter Schedule & Vehicle Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Arrival Date</label>
              <input
                type="date"
                value={date}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-[#202722] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Arrival Time (24-Hour Format)
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-[#202722] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Duration</label>
              <select
                value={durationHours}
                onChange={(e) => setDurationHours(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-[#202722] outline-none"
              >
                <option value="1">1 Hour</option>
                <option value="2">2 Hours</option>
                <option value="4">4 Hours</option>
                <option value="8">8 Hours</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Vehicle Type</label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-[#202722] outline-none"
              >
                <option value="car">Car / SUV</option>
                <option value="bike">Two Wheeler</option>
                <option value="ev">EV Vehicle</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Vehicle Registration Number</label>
              <input
                type="text"
                placeholder="e.g. KL 13 AS 1234"
                value={vehicleReg}
                onChange={(e) => setVehicleReg(e.target.value.toUpperCase())}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm uppercase text-[#202722] font-mono tracking-wider outline-none"
                required
              />
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={!vehicleReg.trim()}
            className="w-full py-3 bg-[#176B4D] hover:bg-[#12533c] text-white font-semibold rounded-lg text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Select Floor & Bay
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STEP 2: Expanded Bay Grid (20-30 Slots) */}
      {step === 2 && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-base font-bold text-[#202722]">Step 2: Choose Your Parking Bay</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                24-Hr Window: {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} ({durationHours} hrs)
              </p>
            </div>

            <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-lg">
              {floors.map((fl) => (
                <button
                  key={fl._id}
                  onClick={() => {
                    setSelectedFloor(fl);
                    setSelectedBay(null);
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${selectedFloor?._id === fl._id ? 'bg-[#176B4D] text-white shadow-sm' : 'text-gray-600 hover:text-black'}`}
                >
                  {fl.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-gray-600 bg-[#F7F8F6] p-3 rounded-lg border border-gray-200/60">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-emerald-500 border border-emerald-600" /> Available
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-[#176B4D] ring-2 ring-[#176B4D]" /> Selected
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-red-400 opacity-60" /> Reserved / Occupied
            </div>
          </div>

          {loadingBays ? (
            <div className="py-12 text-center text-xs text-gray-500">Checking bay availability...</div>
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
                        ? 'bg-[#176B4D] text-white border-[#176B4D] ring-2 ring-[#176B4D]/30 shadow-md scale-105'
                        : isAvailable
                        ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-900'
                        : 'bg-red-50/60 border-red-200 text-red-400 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-mono text-xs font-bold">{b.bayNumber}</span>
                      {b.isEVCharging && <Zap className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-300' : 'text-amber-500'}`} />}
                    </div>

                    <span className="text-[10px] uppercase tracking-wider font-semibold opacity-80">
                      {isSelected ? 'SELECTED' : isAvailable ? b.supportedVehicleType : 'RESERVED'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={() => setStep(1)}
              className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-sm cursor-pointer"
            >
              Back
            </button>
            <button
              disabled={!selectedBay}
              onClick={() => setStep(3)}
              className="flex-1 py-2.5 bg-[#176B4D] hover:bg-[#12533c] text-white font-semibold rounded-lg text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Review Reservation
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Exact Pricing Summary */}
      {step === 3 && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 space-y-6">
          <h2 className="text-base font-bold text-[#202722]">Step 3: Review Reservation Summary</h2>

          <div className="bg-[#F7F8F6] rounded-xl p-5 border border-gray-200 space-y-3 text-xs">
            <div className="flex justify-between border-b border-gray-200/60 pb-2">
              <span className="text-gray-500">Facility:</span>
              <span className="font-bold text-[#202722]">{location.name}</span>
            </div>
            <div className="flex justify-between border-b border-gray-200/60 pb-2">
              <span className="text-gray-500">Floor & Bay Slot:</span>
              <span className="font-bold text-[#176B4D]">{selectedFloor?.name} — Bay {selectedBay?.bayNumber}</span>
            </div>
            <div className="flex justify-between border-b border-gray-200/60 pb-2">
              <span className="text-gray-500">Vehicle Registration:</span>
              <span className="font-mono font-bold text-[#202722]">{vehicleReg}</span>
            </div>
            <div className="flex justify-between border-b border-gray-200/60 pb-2">
              <span className="text-gray-500">Interval Window (24-Hr):</span>
              <span className="font-semibold text-[#202722]">
                {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
              </span>
            </div>
            <div className="flex justify-between border-b border-gray-200/60 pb-2">
              <span className="text-gray-500">Hourly Rate x Hours:</span>
              <span className="font-semibold text-[#202722]">₹{location.pricing.hourlyRate} x {durationHours} hrs</span>
            </div>
            <div className="flex justify-between pt-1 text-sm font-bold">
              <span className="text-[#202722]">Total Payable at Facility:</span>
              <span className="text-[#176B4D]">₹{calculatedTotal}</span>
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0" />
            Pay-at-Facility Mode: Payment is collected upon vehicle exit by facility staff.
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="py-3 px-5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-sm cursor-pointer"
            >
              Back
            </button>
            <button
              onClick={handleConfirmBooking}
              disabled={submitting}
              className="flex-1 py-3 bg-[#176B4D] hover:bg-[#12533c] text-white font-semibold rounded-lg text-sm flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              {submitting ? 'Creating Ticket...' : 'Confirm & Generate QR Ticket'}
              <CheckCircle2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}