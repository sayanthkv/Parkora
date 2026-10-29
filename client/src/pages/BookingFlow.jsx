import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  MapPin, ArrowRight, ArrowLeft, Zap, Info,
  CheckCircle2, AlertCircle, ShieldCheck, Building, Calendar, CreditCard, Banknote, Clock
} from 'lucide-react';

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

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function BookingFlow() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Date boundaries: Today and strictly 2 days from today (48 hours window)
  const nowObj = new Date();
  const todayStr = nowObj.toISOString().split('T')[0];

  const maxAllowedDate = new Date(nowObj.getTime() + 2 * 24 * 60 * 60 * 1000);
  const maxDateStr = maxAllowedDate.toISOString().split('T')[0];

  const [step, setStep] = useState(1);
  const [location, setLocation] = useState(null);
  const [floors, setFloors] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [bays, setBays] = useState([]);

  const initialDate = searchParams.get('date');
  const validInitialDate = initialDate && initialDate >= todayStr && initialDate <= maxDateStr 
    ? initialDate 
    : todayStr;

  const [date, setDate] = useState(validInitialDate);
  const [startTime, setStartTime] = useState(searchParams.get('startTime') || getCurrentTimeString());
  const [durationHours, setDurationHours] = useState(searchParams.get('durationHours') || '2');
  const [vehicleType, setVehicleType] = useState(searchParams.get('vehicleType') || 'car');
  const [vehicleReg, setVehicleReg] = useState(user?.vehicles?.[0]?.regNumber || 'KL 13 AS 1234');
  const [selectedBay, setSelectedBay] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('razorpay');

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

  // Identify Payyambalam Beach facility
  const isPayyambalam = useMemo(() => {
    if (!location) return false;
    const name = (location.name || '').toLowerCase();
    const slugStr = (location.slug || slug || '').toLowerCase();
    return name.includes('payyambalam') || slugStr.includes('payyambalam');
  }, [location, slug]);

  const availableVehicleTypes = useMemo(() => {
    if (!location) return [];

    let types = location.supportedVehicleTypes || location.allowedVehicles || [];

    if (!types.length && floors.length) {
      const extracted = new Set();
      floors.forEach((fl) => {
        fl.bays?.forEach((b) => {
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

  useEffect(() => {
    if (availableVehicleTypes.length > 0 && !availableVehicleTypes.includes(vehicleType)) {
      setVehicleType(availableVehicleTypes[0]);
    }
  }, [availableVehicleTypes, vehicleType]);

  const getStartAndEndDates = () => {
    const start = new Date(`${date}T${startTime}`);
    const end = new Date(start.getTime() + parseInt(durationHours, 10) * 60 * 60 * 1000);
    return { start, end };
  };

  const isPastTime = useMemo(() => {
    if (!date || !startTime) return false;
    const selectedStart = new Date(`${date}T${startTime}`);
    return selectedStart < new Date();
  }, [date, startTime]);

  // Guard checking if selected date is beyond 2 days from today
  const isExceedingAdvanceLimit = useMemo(() => {
    if (!date) return false;
    return date > maxDateStr || date < todayStr;
  }, [date, maxDateStr, todayStr]);

  // Payyambalam Operating Hours Guard: 05:00 to 22:00
  const isOutsideOperatingHours = useMemo(() => {
    if (!isPayyambalam || !date || !startTime) return false;
    const { start, end } = getStartAndEndDates();
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;

    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;

    if (startHour < 5 || startHour >= 22) return true;
    if (end.getDate() !== start.getDate() || endHour > 22) return true;

    return false;
  }, [isPayyambalam, date, startTime, durationHours]);

  useEffect(() => {
    if (!location || !selectedFloor || isPastTime || isOutsideOperatingHours || isExceedingAdvanceLimit) return;

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
  }, [selectedFloor, date, startTime, durationHours, vehicleType, isPastTime, isOutsideOperatingHours, isExceedingAdvanceLimit]);

  const handleNextToStep2 = () => {
    if (isExceedingAdvanceLimit) {
      setError('Reservations can only be scheduled up to 2 days in advance.');
      return;
    }
    if (isPastTime) {
      setError('Selected arrival time has already passed. Please select a future date and time.');
      return;
    }
    if (isOutsideOperatingHours) {
      setError('Payyambalam Beach parking only operates between 05:00 AM and 10:00 PM (22:00). Please adjust your schedule.');
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleFacilityBooking = async () => {
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

      const bookingData = res.data.data;
      const rawPayload = bookingData.qrTicketPayload;

      if (rawPayload) {
        sessionStorage.setItem(`parkora_qr_${bookingData.bookingRef}`, rawPayload);
      }

      navigate(`/ticket/${bookingData.bookingRef}`, {
        state: { qrTicketPayload: rawPayload },
      });
    } catch (err) {
      handleApiError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRazorpayPayment = async () => {
    setSubmitting(true);
    setError(null);

    const isLoaded = await loadRazorpayScript();
    if (!isLoaded) {
      setError('Razorpay SDK failed to load. Please check your internet connection.');
      setSubmitting(false);
      return;
    }

    try {
      const { start, end } = getStartAndEndDates();

      const orderRes = await API.post('/bookings/order-razorpay', {
        locationId: location._id,
        bayId: selectedBay._id,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      });

      const { orderId, amount, currency, key } = orderRes.data.data;

      const options = {
        key: key || import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount,
        currency,
        name: 'Parkora Smart Parking',
        description: `Bay ${selectedBay.bayNumber} (${location.name})`,
        order_id: orderId,
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.phone || '9876543210',
        },
        theme: {
          color: '#0B3D2E',
        },
        handler: async function (response) {
          try {
            const verifyRes = await API.post('/bookings/verify-razorpay', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              locationId: location._id,
              floorId: selectedFloor._id,
              bayId: selectedBay._id,
              vehicleRegNumber: vehicleReg,
              vehicleType,
              startTime: start.toISOString(),
              endTime: end.toISOString(),
            });

            const bookingData = verifyRes.data.data;
            if (bookingData.qrTicketPayload) {
              sessionStorage.setItem(`parkora_qr_${bookingData.bookingRef}`, bookingData.qrTicketPayload);
            }

            navigate(`/ticket/${bookingData.bookingRef}`, {
              state: { qrTicketPayload: bookingData.qrTicketPayload },
            });
          } catch (verErr) {
            setError(verErr.response?.data?.message || 'Payment signature verification failed.');
            setSubmitting(false);
          }
        },
        modal: {
          ondismiss: function () {
            setSubmitting(false);
          },
        },
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.open();
    } catch (err) {
      handleApiError(err);
      setSubmitting(false);
    }
  };

  const handleApiError = (err) => {
    if (err.response?.status === 401 || err.response?.data?.message?.includes('token')) {
      setError('Your session has expired. Please log in again.');
      localStorage.removeItem('parkora_token');
      localStorage.removeItem('token');
      setTimeout(() => {
        navigate(`/login?redirect=${encodeURIComponent(`/book/${slug}`)}`);
      }, 1200);
    } else if (err.response?.status === 409) {
      setError('Bay conflict: This bay was reserved just now. Please pick another bay.');
      setStep(2);
    } else {
      setError(err.response?.data?.message || 'Failed to complete reservation.');
    }
  };

  const handleConfirmBooking = () => {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/book/${slug}`)}`);
      return;
    }

    if (!selectedBay) return;

    if (isExceedingAdvanceLimit) {
      setError('Reservations can only be scheduled up to 2 days in advance.');
      setStep(1);
      return;
    }

    if (isPastTime) {
      setError('Cannot reserve for a past time window.');
      setStep(1);
      return;
    }

    if (isOutsideOperatingHours) {
      setError('Payyambalam Beach bookings must be between 05:00 AM and 10:00 PM.');
      setStep(1);
      return;
    }

    if (paymentMethod === 'razorpay') {
      handleRazorpayPayment();
    } else {
      handleFacilityBooking();
    }
  };

  if (loading) return <div className="py-28 text-center text-slate-500 font-medium bg-white min-h-screen">Loading facility details...</div>;
  if (!location) return <div className="py-28 text-center text-red-600 font-medium bg-white min-h-screen">Location not found.</div>;

  const { start, end } = getStartAndEndDates();
  const hourlyRateRupees = selectedBay?.customHourlyRate ?? (location.pricing?.hourlyRate || location.price || 30);
  const calculatedTotalRupees = parseInt(durationHours, 10) * hourlyRateRupees;

  const formattedDate = start.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const vehicleLabels = {
    car: 'Car / SUV',
    bike: 'Two Wheeler',
    ev: 'EV Vehicle',
    heavy: 'Heavy Vehicle / Bus',
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

        {isPayyambalam && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
            <Clock className="w-3.5 h-3.5 text-amber-700" />
            Operating Window: 05:00 AM – 10:00 PM (22:00) strictly
          </div>
        )}
      </div>

      {/* Step Indicator */}
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
          3. Payment & Pass
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          {error}
        </div>
      )}

      {/* STEP 1 */}
      {step === 1 && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-lg font-heading font-bold text-slate-900">Step 1: Enter Schedule & Vehicle Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Arrival Date
                </label>
                <span className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                  Max 2 days in advance
                </span>
              </div>
              
              {/* Native Date Picker locked strictly between today and +2 days */}
              <input
                type="date"
                value={date}
                min={todayStr}
                max={maxDateStr}
                onChange={(e) => setDate(e.target.value)}
                className={`w-full p-3 bg-white border rounded-xl text-sm font-semibold outline-none transition-colors ${
                  isExceedingAdvanceLimit
                    ? 'border-red-500 text-red-600'
                    : 'border-slate-200 text-slate-900 focus:border-[#0B3D2E]'
                }`}
              />
              {isExceedingAdvanceLimit ? (
                <p className="text-[11px] text-red-600 font-semibold mt-1">
                  Reservations can only be made up to 2 days in advance ({maxDateStr}).
                </p>
              ) : (
                <p className="text-[11px] text-slate-400 font-medium mt-1">
                  Reservations open for: {new Date(todayStr).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} – {new Date(maxDateStr).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Arrival Time (24-Hour Format)
              </label>
              <input
                type="time"
                value={startTime}
                min={isPayyambalam ? '05:00' : (date === todayStr ? getCurrentTimeString() : undefined)}
                max={isPayyambalam ? '21:00' : undefined}
                onChange={(e) => setStartTime(e.target.value)}
                className={`w-full p-3 bg-white border rounded-xl text-sm font-semibold outline-none ${
                  isPastTime || isOutsideOperatingHours
                    ? 'border-red-500 text-red-600'
                    : 'border-slate-200 text-slate-900 focus:border-[#0B3D2E]'
                }`}
              />
              {isPastTime ? (
                <p className="text-[11px] text-red-600 font-semibold mt-1">
                  Selected time has already passed.
                </p>
              ) : isOutsideOperatingHours ? (
                <p className="text-[11px] text-red-600 font-semibold mt-1">
                  Payyambalam facility is only open between 05:00 and 22:00. End time cannot exceed 22:00.
                </p>
              ) : null}
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
                {!isPayyambalam && <option value="24">24 Hours (Max Limit)</option>}
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
            disabled={!vehicleReg.trim() || isPastTime || isOutsideOperatingHours || isExceedingAdvanceLimit}
            className="w-full py-3.5 bg-[#0B3D2E] hover:bg-[#145C43] text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm active:scale-95"
          >
            Select Floor & Bay
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-heading font-bold text-slate-900">Step 2: Choose Your Parking Bay</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {formattedDate} &bull; Window: {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} – {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} ({durationHours} hrs)
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
              Review & Select Payment
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-lg font-heading font-bold text-slate-900">Step 3: Review Reservation & Payment</h2>

          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3.5 text-xs">
            <div className="flex justify-between border-b border-slate-200 pb-2.5">
              <span className="text-slate-500 font-medium">Facility:</span>
              <span className="font-bold text-slate-900">{location.name}</span>
            </div>
            
            <div className="flex justify-between border-b border-slate-200 pb-2.5">
              <span className="text-slate-500 font-medium">Reservation Date:</span>
              <span className="font-bold text-slate-900">{formattedDate}</span>
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
              <span className="font-semibold text-slate-900">₹{hourlyRateRupees} x {durationHours} hrs</span>
            </div>
            <div className="flex justify-between pt-1 text-sm font-extrabold">
              <span className="text-slate-900">Total Payable:</span>
              <span className="text-[#0B3D2E] font-heading text-base">₹{calculatedTotalRupees}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Choose Payment Method
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('razorpay')}
                className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  paymentMethod === 'razorpay'
                    ? 'border-[#0B3D2E] bg-emerald-50/50 ring-2 ring-[#0B3D2E]'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <CreditCard className="w-5 h-5 text-[#0B3D2E] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-xs text-slate-900 block">Pay Online Now (Razorpay)</span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">Instant confirmation via UPI, Cards & NetBanking (Test Mode).</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('pay_at_facility')}
                className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  paymentMethod === 'pay_at_facility'
                    ? 'border-[#0B3D2E] bg-emerald-50/50 ring-2 ring-[#0B3D2E]'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Banknote className="w-5 h-5 text-[#0B3D2E] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-xs text-slate-900 block">Pay at Facility Gate</span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">Pay cash or UPI directly to the operator upon exit.</span>
                </div>
              </button>
            </div>
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
              {submitting
                ? 'Processing...'
                : paymentMethod === 'razorpay'
                ? `Pay ₹${calculatedTotalRupees} & Confirm Pass`
                : 'Confirm & Generate Ticket'}
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