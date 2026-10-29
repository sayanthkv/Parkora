import { useState, useEffect } from 'react';
import API from '../api/axios';
import {
  QrCode, Search, CheckCircle2, XCircle, Clock,
  Car, User, ShieldCheck, ArrowRight, AlertTriangle, RefreshCw, Activity, ArrowLeftRight
} from 'lucide-react';

export default function StaffPortal() {
  const [searchQuery, setSearchQuery] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [todayOverview, setTodayOverview] = useState(null);
  const [shiftContext, setShiftContext] = useState(null);

  const [loadingVerify, setLoadingVerify] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [switchingDuty, setSwitchingDuty] = useState(false);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  const fetchStaffData = async () => {
    setLoadingOverview(true);
    try {
      const [overviewRes, shiftRes] = await Promise.all([
        API.get('/staff/today'),
        API.get('/staff/shift-context'),
      ]);
      setTodayOverview(overviewRes.data.data);
      setShiftContext(shiftRes.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load staff gate context.');
    } finally {
      setLoadingOverview(false);
    }
  };

  useEffect(() => {
    fetchStaffData();
  }, []);

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

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoadingVerify(true);
    setError(null);
    setActionSuccess(null);
    setVerificationResult(null);

    try {
      const isRef = searchQuery.toUpperCase().startsWith('KSP-');
      const payload = isRef ? { bookingRef: searchQuery } : { qrToken: searchQuery };

      const res = await API.post('/staff/verify', payload);
      setVerificationResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Verification lookup failed.');
    } finally {
      setLoadingVerify(false);
    }
  };

  const handleCheckIn = async (bookingId) => {
    setLoadingAction(true);
    setError(null);
    try {
      const res = await API.post(`/staff/check-in/${bookingId}`);
      setActionSuccess(res.data.message);
      setVerificationResult((prev) => ({
        ...prev,
        data: res.data.data,
        message: 'Vehicle checked in successfully.',
      }));
      fetchStaffData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to check in vehicle.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCheckOut = async (bookingId) => {
    setLoadingAction(true);
    setError(null);
    try {
      const res = await API.post(`/staff/check-out/${bookingId}`);
      setActionSuccess(res.data.message);
      setVerificationResult((prev) => ({
        ...prev,
        data: res.data.data,
        message: 'Vehicle checked out & payment finalized.',
      }));
      fetchStaffData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to check out vehicle.');
    } finally {
      setLoadingAction(false);
    }
  };

  const isOnDuty = shiftContext?.isOnDuty ?? true;
  const currentShiftLabel = shiftContext?.shiftInfo?.label || 'Active Shift';

  return (
    <div className="min-h-screen bg-white text-slate-900 pt-28 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 font-body">
      
      {/* Shift Banner & Handover Control */}
      <div className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm ${
        isOnDuty ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-300 text-amber-900'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl text-white font-bold ${isOnDuty ? 'bg-[#0B3D2E]' : 'bg-amber-600'}`}>
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-extrabold text-sm">{currentShiftLabel}</span>
              <span className={`px-2 py-0.2 rounded text-[10px] font-bold uppercase ${
                isOnDuty ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
              }`}>
                {isOnDuty ? 'YOU ARE CURRENTLY ON DUTY' : 'DIFFERENT SHIFT ACTIVE'}
              </span>
            </div>
            <p className="text-xs opacity-80 mt-0.5">
              Facility: <strong>{shiftContext?.facility?.name || 'Assigned Facility'}</strong> &bull; Scheduled Operator: <strong>{shiftContext?.onDutyStaff?.name || 'Designated Staff'}</strong>
            </p>
          </div>
        </div>

        {/* 1-Click Presentation Handover Trigger */}
        {!isOnDuty && (
          <button
            onClick={handleAutoSwitchDuty}
            disabled={switchingDuty}
            className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 whitespace-nowrap"
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
          <p className="text-xs text-slate-500 mt-1 font-medium">Verify cryptographically signed QR passes and process real-time vehicle arrivals.</p>
        </div>

        <button
          onClick={fetchStaffData}
          className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-900 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#0B3D2E] ${loadingOverview ? 'animate-spin' : ''}`} />
          Refresh Status
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Verification Form Column */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-base font-heading font-bold text-slate-900">Verify Ticket or QR Token</h2>

            <form onSubmit={handleVerify} className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Booking Reference or Scanned QR String
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g. KSP-123456-789 or QR Payload..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm uppercase font-mono font-bold tracking-wider text-slate-900 outline-none focus:border-[#0B3D2E]"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loadingVerify}
                  className="px-6 py-2.5 bg-[#0B3D2E] hover:bg-[#145C43] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50 active:scale-95"
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

            {verificationResult && verificationResult.data && (
              <div className={`p-6 rounded-2xl border ${verificationResult.isValid ? 'bg-slate-50 border-slate-200' : 'bg-red-50/40 border-red-200'} space-y-4 shadow-sm`}>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    {verificationResult.isValid ? (
                      <CheckCircle2 className="w-5 h-5 text-[#145C43]" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className={`text-sm font-bold ${verificationResult.isValid ? 'text-[#0B3D2E]' : 'text-red-900'}`}>
                      {verificationResult.message}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-extrabold uppercase px-3 py-1 rounded-lg bg-white border border-slate-200 text-[#0B3D2E]">
                    {verificationResult.data.bookingRef}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs font-medium">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Facility Location</span>
                    <span className="font-bold text-slate-900">{verificationResult.data.location?.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Floor & Bay Slot</span>
                    <span className="font-bold text-[#0B3D2E]">{verificationResult.data.floor?.name} — {verificationResult.data.bay?.bayNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Vehicle Reg</span>
                    <span className="font-mono font-bold uppercase text-slate-900">{verificationResult.data.vehicle?.regNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Current Status</span>
                    <span className="uppercase font-extrabold text-[#145C43]">{verificationResult.data.status}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 flex gap-3">
                  {verificationResult.data.status === 'confirmed' && (
                    <button
                      onClick={() => handleCheckIn(verificationResult.data._id)}
                      disabled={loadingAction}
                      className="w-full py-3.5 bg-[#0B3D2E] hover:bg-[#145C43] text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
                    >
                      {loadingAction ? 'Processing...' : 'Approve & Record Check-In'}
                      <ArrowRight className="w-4 h-4 text-[#F2B705]" />
                    </button>
                  )}

                  {verificationResult.data.status === 'active' && (
                    <button
                      onClick={() => handleCheckOut(verificationResult.data._id)}
                      disabled={loadingAction}
                      className="w-full py-3.5 bg-[#0B3D2E] hover:bg-[#145C43] text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
                    >
                      {loadingAction ? 'Finalizing Exit...' : 'Complete Checkout & Payment'}
                      <CheckCircle2 className="w-4 h-4 text-[#F2B705]" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Today's Overview Column */}
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
                        setSearchQuery(session.bookingRef);
                        handleVerify();
                      }}
                      className="p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div>
                        <span className="font-mono font-bold uppercase text-slate-900">{session.vehicle?.regNumber}</span>
                        <span className="text-slate-500 block text-[11px] font-medium mt-0.5">Bay: {session.bay?.bayNumber}</span>
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
    </div>
  );
}

