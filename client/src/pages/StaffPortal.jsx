import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import {
  QrCode, Search, CheckCircle2, XCircle, Clock,
  Car, User, ShieldCheck, ArrowRight, AlertTriangle, RefreshCw, Activity, ArrowLeftRight, Building, Check, ToggleLeft, ToggleRight, Lock, Camera, X, Usb, Monitor
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

export default function StaffPortal() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [todayOverview, setTodayOverview] = useState(null);
  const [shiftContext, setShiftContext] = useState(null);
  const [autoCompleteEnabled, setAutoCompleteEnabled] = useState(false);

  const [loadingVerify, setLoadingVerify] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [togglingAuto, setTogglingAuto] = useState(false);
  const [switchingDuty, setSwitchingDuty] = useState(false);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Optical Scanner States
  const [scannerOpen, setScannerOpen] = useState(false);
  const [selectedDeviceName, setSelectedDeviceName] = useState('Default Sensor');
  const [externalNotFound, setExternalNotFound] = useState(false);
  const [availableCameras, setAvailableCameras] = useState([]);
  const scannerRef = useRef(null);

  useEffect(() => {
    if (user && user.role === 'admin') {
      navigate('/admin', { replace: true });
    }
  }, [user, navigate]);

  const fetchStaffData = async () => {
    setLoadingOverview(true);
    try {
      const [overviewRes, shiftRes, autoRes] = await Promise.all([
        API.get('/staff/today'),
        API.get('/staff/shift-context'),
        API.get('/staff/auto-complete-status').catch(() => ({ data: { enabled: false } })),
      ]);
      setTodayOverview(overviewRes.data.data);
      setShiftContext(shiftRes.data.data);
      setAutoCompleteEnabled(autoRes.data.enabled);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load staff gate context.');
    } finally {
      setLoadingOverview(false);
    }
  };

  useEffect(() => {
    fetchStaffData();
  }, []);

  const handleToggleAutoComplete = async () => {
    setTogglingAuto(true);
    try {
      const res = await API.post('/staff/toggle-auto-complete');
      setAutoCompleteEnabled(res.data.enabled);
      setActionSuccess(res.data.message);
      fetchStaffData();
    } catch (err) {
      setError('Could not update auto-complete setting.');
    } finally {
      setTogglingAuto(false);
    }
  };

  const handleAutoSwitchDuty = async () => {
    setSwitchingDuty(true);
    setError(null);
    try {
      const res = await API.post('/staff/auto-switch-duty');
      if (res.data.token) {
        localStorage.setItem('parkora_token', res.data.token);
        localStorage.setItem('token', res.data.token);
      }
      setActionSuccess(res.data.message);
      fetchStaffData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to switch to on-duty staff.');
    } finally {
      setSwitchingDuty(false);
    }
  };

  const executeVerify = async (queryValue) => {
    const query = (queryValue || searchQuery).trim();
    if (!isOnDuty) {
      setError('Verification Locked: You cannot verify or scan tickets while off duty.');
      return;
    }
    if (!query) return;

    setLoadingVerify(true);
    setError(null);
    setActionSuccess(null);
    setVerificationResult(null);

    try {
      const payload = { bookingRef: query };
      const res = await API.post('/staff/verify', payload);
      setVerificationResult(res.data);
    } catch (err) {
      const errData = err.response?.data;
      const errorMsg = errData?.message || 'Verification lookup failed.';
      setError(errorMsg);
      if (errData?.data) {
        setVerificationResult({
          isValid: false,
          message: errorMsg,
          data: errData.data,
        });
      }
    } finally {
      setLoadingVerify(false);
    }
  };

  const handleVerify = (e) => {
    if (e) e.preventDefault();
    executeVerify(searchQuery);
  };

  // Dedicated / External Hardware Scanner Invocation
  const startScanner = async () => {
    if (!isOnDuty) {
      setError('Scanner Locked: You must be on duty to scan gate passes.');
      return;
    }
    setScannerOpen(true);
    setExternalNotFound(false);
    setError(null);

    setTimeout(async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        setAvailableCameras(devices || []);

        // Detect external USB / optical device vs integrated webcam
        const externalDevice = devices?.find((d) => {
          const name = d.label.toLowerCase();
          return name.includes('scanner') || name.includes('external') || name.includes('usb') || name.includes('back');
        });

        const targetDeviceId = externalDevice?.id || devices?.[0]?.id;
        setSelectedDeviceName(externalDevice?.label || devices?.[0]?.label || 'Standard Camera Sensor');

        if (!targetDeviceId) {
          setExternalNotFound(true);
          return;
        }

        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          targetDeviceId,
          {
            fps: 15,
            qrbox: { width: 260, height: 260 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            stopScanner();
            setSearchQuery(decodedText);
            executeVerify(decodedText);
          },
          () => {}
        );
      } catch (err) {
        setExternalNotFound(true);
      }
    }, 200);
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {}
      scannerRef.current = null;
    }
    setScannerOpen(false);
    setExternalNotFound(false);
  };

  const handleCheckIn = async (bookingId) => {
    if (!isOnDuty) {
      setError('Off-Duty Guard: Only on-duty staff can record vehicle arrivals.');
      return;
    }
    setLoadingAction(true);
    setError(null);
    try {
      const res = await API.post(`/staff/check-in/${bookingId}`);
      setActionSuccess(res.data.message);

      setVerificationResult((prev) => ({
        ...prev,
        isValid: true,
        message: 'Vehicle checked in successfully.',
        data: {
          ...prev?.data,
          ...res.data.data,
          location: res.data.data?.location?.name ? res.data.data.location : prev?.data?.location,
          floor: res.data.data?.floor?.name ? res.data.data.floor : prev?.data?.floor,
          bay: res.data.data?.bay?.bayNumber ? res.data.data.bay : prev?.data?.bay,
        },
      }));

      fetchStaffData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to check in vehicle.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCheckOut = async (bookingId) => {
    if (!isOnDuty) {
      setError('Off-Duty Guard: Only on-duty staff can finalize vehicle checkouts.');
      return;
    }
    setLoadingAction(true);
    setError(null);
    try {
      const res = await API.post(`/staff/check-out/${bookingId}`);
      setActionSuccess(res.data.message);

      setVerificationResult((prev) => ({
        ...prev,
        isValid: true,
        message: res.data.message,
        data: {
          ...prev?.data,
          ...res.data.data,
          location: res.data.data?.location?.name ? res.data.data.location : prev?.data?.location,
          floor: res.data.data?.floor?.name ? res.data.data.floor : prev?.data?.floor,
          bay: res.data.data?.bay?.bayNumber ? res.data.data.bay : prev?.data?.bay,
        },
      }));

      fetchStaffData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to check out vehicle.');
    } finally {
      setLoadingAction(false);
    }
  };

  const isOnDuty = Boolean(shiftContext?.isOnDuty);
  const personalSchedule = shiftContext?.personalShiftLabel || 'Shift 1: 06:00 – 18:00 IST';
  const activeShiftLabel = shiftContext?.shiftInfo?.label || 'Shift 1: 06:00 – 18:00 IST';

  const bookingData = verificationResult?.data;
  const facilityName =
    bookingData?.location?.name ||
    shiftContext?.facility?.name ||
    'Kannur Parking Complex';

  const floorName =
    bookingData?.floor?.name ||
    (bookingData?.floor?.level !== undefined ? `Level ${bookingData.floor.level}` : 'Ground Lot');

  const bayNumber =
    bookingData?.bay?.bayNumber ||
    (typeof bookingData?.bay === 'string' ? bookingData.bay : 'Assigned Bay');

  const formattedStartTime = bookingData?.startTime
    ? new Date(bookingData.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    : '--:--';

  const formattedEndTime = bookingData?.endTime
    ? new Date(bookingData.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    : '--:--';

  const now = new Date();
  const endTime = bookingData?.endTime ? new Date(bookingData.endTime) : null;
  const overstayMinutes = (bookingData?.status === 'active' && endTime)
    ? Math.floor((now.getTime() - endTime.getTime()) / (60 * 1000))
    : 0;

  const isOverstay = overstayMinutes > 7;
  const extraHours = isOverstay ? Math.ceil(overstayMinutes / 60) : 0;
  const hourlyRate = bookingData?.bay?.customHourlyRate ?? bookingData?.location?.pricing?.hourlyRate ?? 20;
  const penaltyRupees = isOverstay ? extraHours * hourlyRate : 0;

  return (
    <div className="min-h-screen bg-white text-slate-900 pt-28 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 font-body">
      
      {/* Shift Banner & Handover Control */}
      <div className={`p-4 sm:p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm ${
        isOnDuty ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-amber-50 border-amber-300 text-amber-950'
      }`}>
        <div className="flex items-start sm:items-center gap-3.5">
          <div className={`p-2.5 rounded-xl text-white font-bold shrink-0 ${isOnDuty ? 'bg-[#0B3D2E]' : 'bg-amber-600'}`}>
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-heading font-extrabold text-sm sm:text-base">
                Your Time Schedule: <span className="underline decoration-2">{personalSchedule}</span>
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                isOnDuty ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
              }`}>
                {isOnDuty ? 'YOU ARE CURRENTLY ON DUTY' : 'DIFFERENT SHIFT ACTIVE'}
              </span>
            </div>
            
            <p className="text-xs opacity-90 mt-1">
              Stationed Facility: <strong>{shiftContext?.facility?.name || 'Assigned Facility'}</strong> 
              {!isOnDuty && (
                <span> &bull; Currently Active on Site: <strong>{activeShiftLabel}</strong> (Assigned Operator: <strong>{shiftContext?.onDutyStaff?.name || 'Designated Colleague'}</strong>)</span>
              )}
            </p>
          </div>
        </div>

        {!isOnDuty && (
          <button
            onClick={handleAutoSwitchDuty}
            disabled={switchingDuty}
            className="px-4 py-2.5 bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 whitespace-nowrap self-start md:self-auto"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-white" />
            {switchingDuty ? 'Switching Duty...' : 'Auto-Switch to On-Duty Staff'}
          </button>
        )}
      </div>

      {/* Main Terminal Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-[#0B3D2E] text-[#F2B705] px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" /> Gate Operations Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight">Access Gate & Verification Terminal</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Verification Protocol: Type <strong>Booking Ref</strong>, <strong>Customer Phone (+91)</strong>, or trigger <strong>Optical Scanner</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleToggleAutoComplete}
            disabled={togglingAuto}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-sm active:scale-95 ${
              autoCompleteEnabled
                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
            title="Auto-completes parking session when scheduled duration expires"
          >
            {autoCompleteEnabled ? <ToggleRight className="w-4 h-4 text-emerald-700" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
            Auto-Discharge on Expiry: {autoCompleteEnabled ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={fetchStaffData}
            className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-900 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#0B3D2E] ${loadingOverview ? 'animate-spin' : ''}`} />
            Refresh Status
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Verification Column */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-heading font-bold text-slate-900">Verify Pass by Ref, Phone or Optical Scanner</h2>
              {!isOnDuty && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-lg">
                  <Lock className="w-3.5 h-3.5" /> Verification Disabled (Off Duty)
                </span>
              )}
            </div>

            <form onSubmit={handleVerify} className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Booking Reference, QR Token, or Customer Phone Number (+91)
              </label>
              <div className="flex flex-wrap sm:flex-nowrap gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    disabled={!isOnDuty}
                    placeholder={isOnDuty ? "e.g. KSP-123456-789 or 9876543210..." : "Terminal locked: only on-duty operators can verify"}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold tracking-wider text-slate-900 outline-none focus:border-[#0B3D2E] disabled:bg-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
                    required
                  />
                </div>

                {/* Optical Scanner / Camera Trigger (Visible on Laptop and Mobile) */}
                <button
                  type="button"
                  disabled={!isOnDuty}
                  onClick={startScanner}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50 whitespace-nowrap"
                  title="Scan with Connected Device or Camera"
                >
                  <Camera className="w-4 h-4 text-[#0B3D2E]" />
                  <span className="text-xs font-bold">Scan QR</span>
                </button>

                <button
                  type="submit"
                  disabled={loadingVerify || !isOnDuty}
                  className="px-6 py-2.5 bg-[#0B3D2E] hover:bg-[#145C43] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 whitespace-nowrap"
                >
                  {loadingVerify ? 'Verifying...' : 'Verify'}
                </button>
              </div>
            </form>

            {actionSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                {actionSuccess}
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                {error}
              </div>
            )}

            {bookingData && (
              <div className={`p-6 rounded-2xl border ${verificationResult?.isValid ? 'bg-slate-50 border-slate-200' : 'bg-red-50 border-red-200'} space-y-4 shadow-sm`}>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    {verificationResult?.isValid ? (
                      <CheckCircle2 className="w-5 h-5 text-[#145C43]" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className={`text-sm font-bold ${verificationResult?.isValid ? 'text-[#0B3D2E]' : 'text-red-900'}`}>
                      {verificationResult?.message}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-extrabold uppercase px-3 py-1 rounded-lg bg-white border border-slate-200 text-[#0B3D2E]">
                    {bookingData.bookingRef}
                  </span>
                </div>

                {/* Overstay Warning Banner */}
                {bookingData.status === 'active' && (
                  <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
                    isOverstay
                      ? 'bg-red-50 border-red-300 text-red-900'
                      : overstayMinutes > 0
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 shrink-0" />
                      <span>
                        {isOverstay
                          ? `Overstayed by ${overstayMinutes} mins (${extraHours}h billable at ₹${hourlyRate}/h)`
                          : overstayMinutes > 0
                          ? `Within 7-min grace window (${overstayMinutes} mins past slot). No penalty.`
                          : 'Vehicle is within scheduled parking window.'}
                      </span>
                    </div>
                    {isOverstay && (
                      <span className="font-bold text-sm bg-red-200 text-red-950 px-2.5 py-0.5 rounded-lg">
                        +₹{penaltyRupees} Due
                      </span>
                    )}
                  </div>
                )}

                {/* Customer Particulars Row */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-[#0B3D2E]" />
                    <span className="font-bold text-slate-900">{bookingData.user?.name || 'Customer'}</span>
                    <span className="text-slate-400 font-medium">({bookingData.user?.phone || 'No phone attached'})</span>
                  </div>
                  <span className="text-[11px] text-slate-500">{bookingData.user?.email}</span>
                </div>

                {/* Data Grid */}
                <div className="grid grid-cols-2 gap-4 text-xs font-medium">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Facility Location</span>
                    <span className="font-bold text-slate-900 flex items-center gap-1 mt-0.5">
                      <Building className="w-3.5 h-3.5 text-[#0B3D2E]" /> {facilityName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Floor & Bay Slot</span>
                    <span className="font-bold text-[#0B3D2E] block mt-0.5">
                      {floorName} — Bay {bayNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Vehicle Reg & Type</span>
                    <span className="font-mono font-bold uppercase text-slate-900 flex items-center gap-1.5 mt-0.5">
                      <Car className="w-3.5 h-3.5 text-slate-500" />
                      {bookingData.vehicle?.regNumber || 'N/A'}
                      <span className="text-[9px] uppercase px-1.5 py-0.2 bg-slate-200 rounded text-slate-700">
                        {bookingData.vehicle?.vehicleType || 'Car'}
                      </span>
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Current Status</span>
                    <span className={`inline-block mt-0.5 uppercase font-extrabold px-2 py-0.5 rounded text-[10px] ${
                      bookingData.status === 'confirmed'
                        ? 'bg-amber-100 text-amber-900'
                        : bookingData.status === 'active'
                        ? 'bg-emerald-100 text-emerald-900 animate-pulse'
                        : bookingData.status === 'completed'
                        ? 'bg-slate-200 text-slate-800'
                        : 'bg-red-100 text-red-900'
                    }`}>
                      {bookingData.status}
                    </span>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#0B3D2E]" /> Scheduled Slot: {formattedStartTime} – {formattedEndTime} IST
                    </span>
                    <span className="font-bold text-slate-900">
                      Amount Paid: ₹{(bookingData.pricingSnapshot?.totalAmountPaise ? bookingData.pricingSnapshot.totalAmountPaise / 100 : bookingData.pricingSnapshot?.totalAmount) || 0}
                    </span>
                  </div>
                </div>

                {/* Gate Action Buttons */}
                <div className="pt-3 border-t border-slate-200">
                  {bookingData.status === 'confirmed' && (
                    <button
                      onClick={() => handleCheckIn(bookingData._id)}
                      disabled={loadingAction || !verificationResult?.isValid || !isOnDuty}
                      className="w-full py-3.5 bg-[#0B3D2E] hover:bg-[#145C43] text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                    >
                      {loadingAction ? 'Processing...' : isOnDuty ? 'Approve & Record Check-In' : 'Action Locked (Off Duty)'}
                      <ArrowRight className="w-4 h-4 text-[#F2B705]" />
                    </button>
                  )}

                  {bookingData.status === 'active' && (
                    <button
                      onClick={() => handleCheckOut(bookingData._id)}
                      disabled={loadingAction || !isOnDuty}
                      className={`w-full py-3.5 font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95 text-white ${
                        !isOnDuty 
                          ? 'bg-slate-400 cursor-not-allowed opacity-60' 
                          : isOverstay 
                          ? 'bg-amber-700 hover:bg-amber-800' 
                          : 'bg-[#0B3D2E] hover:bg-[#145C43]'
                      }`}
                    >
                      {loadingAction ? 'Finalizing Exit...' : !isOnDuty ? 'Checkout Locked (Off Duty)' : isOverstay ? `Collect ₹${penaltyRupees} Overstay & Exit` : 'Complete Checkout (No Extra Fee)'}
                      <Check className="w-4 h-4 text-[#F2B705]" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Facility Telemetry Column */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-base font-heading font-bold text-slate-900">Today's Facility Telemetry</h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Currently Parked</span>
                <span className="text-2xl font-heading font-extrabold text-[#0B3D2E]">{todayOverview?.activeCount ?? 0}</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Today's Arrivals</span>
                <span className="text-2xl font-heading font-extrabold text-slate-900">{todayOverview?.todaysArrivalsCount ?? 0}</span>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Live Active Bays</h3>
              {loadingOverview ? (
                <div className="text-xs font-medium text-slate-500 py-4 text-center">Loading live sessions...</div>
              ) : todayOverview?.activeSessions?.length === 0 ? (
                <div className="text-xs text-slate-500 font-medium py-6 text-center bg-slate-50 rounded-xl border border-slate-200">No vehicles currently parked.</div>
              ) : (
                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {todayOverview?.activeSessions?.map((session) => (
                    <div
                      key={session._id}
                      onClick={() => {
                        if (isOnDuty) {
                          setSearchQuery(session.bookingRef);
                          executeVerify(session.bookingRef);
                        }
                      }}
                      className={`p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between transition-colors ${
                        isOnDuty ? 'hover:bg-slate-100 cursor-pointer' : 'cursor-default opacity-80'
                      }`}
                    >
                      <div>
                        <span className="font-mono font-bold uppercase text-slate-900">{session.vehicle?.regNumber}</span>
                        <span className="text-slate-500 block text-[11px] font-medium mt-0.5">
                          {session.floor?.name || 'Floor'} &bull; Bay {session.bay?.bayNumber}
                        </span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[#145C43] text-[10px] font-bold uppercase tracking-wider">
                        Active
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* OPTICAL SCANNER MODAL (SUPPORTS USB SCANNER & WEBCAM) */}
      {scannerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 text-center relative shadow-2xl">
            <button
              onClick={stopScanner}
              className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="inline-flex items-center gap-1.5 bg-[#0B3D2E] text-[#F2B705] px-3.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2">
                <Usb className="w-3.5 h-3.5" /> Optical Gate Scanner
              </div>
              <h3 className="font-heading font-extrabold text-base text-slate-900">
                Connected Device Scanner
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Target Sensor: <strong className="text-slate-800">{selectedDeviceName}</strong>
              </p>
            </div>

            {externalNotFound ? (
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-3">
                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                  <Monitor className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-900">No External Optical Scanner Detected</h4>
                <p className="text-slate-500 leading-relaxed text-[11px]">
                  No dedicated USB barcode or plug-and-play optical reader was detected on this workstation.
                </p>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-left text-[11px]">
                  <strong>Hardware Tip:</strong> Standard handheld USB QR scanners function as keyboard emulators (wedge mode). Pointing the scanner at the ticket will automatically enter the code into the verification input.
                </div>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border-2 border-[#0B3D2E] bg-slate-950 aspect-square flex items-center justify-center relative">
                <div id="reader" className="w-full h-full"></div>
              </div>
            )}

            <button
              type="button"
              onClick={stopScanner}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer"
            >
              Close Scanner
            </button>
          </div>
        </div>
      )}

    </div>
  );
}