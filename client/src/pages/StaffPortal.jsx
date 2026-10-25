import { useState, useEffect } from 'react';
import API from '../api/axios';
import {
  QrCode, Search, CheckCircle2, XCircle, Clock,
  Car, User, ShieldCheck, ArrowRight, AlertTriangle, RefreshCw
} from 'lucide-react';

export default function StaffPortal() {
  const [searchQuery, setSearchQuery] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [todayOverview, setTodayOverview] = useState(null);

  const [loadingVerify, setLoadingVerify] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Fetch Today's Facility Overview
  const fetchTodayOverview = async () => {
    setLoadingOverview(true);
    try {
      const res = await API.get('/staff/today');
      setTodayOverview(res.data.data);
    } catch (err) {
      console.error('Failed to load facility overview:', err);
    } finally {
      setLoadingOverview(false);
    }
  };

  useEffect(() => {
    fetchTodayOverview();
  }, []);

  // Verify Booking by Reference or QR Token
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

  // Process Check-In
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
      fetchTodayOverview();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to check in vehicle.');
    } finally {
      setLoadingAction(false);
    }
  };

  // Process Check-Out
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
      fetchTodayOverview();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to check out vehicle.');
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F4EE] text-[#14201B] pt-28 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 font-body">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-2xl border border-[#E3DED2] shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-[#0B3D2E] text-[#F2B705] px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" /> Staff Terminal Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-[#14201B] tracking-tight">Facility Verification & Access Gate</h1>
          <p className="text-xs text-[#5C6B64] mt-1 font-medium">Scan tickets or enter booking references to process arrival check-ins and departure exits.</p>
        </div>

        <button
          onClick={fetchTodayOverview}
          className="inline-flex items-center gap-2 bg-[#F7F4EE] hover:bg-[#E3DED2]/60 text-[#14201B] px-4 py-2.5 rounded-xl border border-[#E3DED2] text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#0B3D2E] ${loadingOverview ? 'animate-spin' : ''}`} />
          Refresh Stats
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Verification Column */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E3DED2] shadow-sm space-y-6">
            <h2 className="text-base font-heading font-bold text-[#14201B]">Verify Ticket or QR Token</h2>

            {/* Manual Lookup Form */}
            <form onSubmit={handleVerify} className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#5C6B64]">
                Booking Reference or QR Token
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-[#5C6B64]" />
                  <input
                    type="text"
                    placeholder="e.g. KSP-123456-789 or QR Payload Token..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F7F4EE] border border-[#E3DED2] rounded-xl text-sm uppercase font-mono font-bold tracking-wider text-[#14201B] outline-none focus:border-[#0B3D2E]"
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

            {/* Action Banners */}
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

            {/* Verification Result Card */}
            {verificationResult && verificationResult.data && (
              <div className={`p-6 rounded-2xl border ${verificationResult.isValid ? 'bg-[#F7F4EE] border-[#E3DED2]' : 'bg-red-50/40 border-red-200'} space-y-4 shadow-sm`}>
                
                <div className="flex items-center justify-between pb-3 border-b border-[#E3DED2]">
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
                  <span className="font-mono text-xs font-extrabold uppercase px-3 py-1 rounded-lg bg-white border border-[#E3DED2] text-[#0B3D2E]">
                    {verificationResult.data.bookingRef}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs font-medium">
                  <div>
                    <span className="text-[#5C6B64] block text-[10px] uppercase font-bold tracking-wider">Facility Location</span>
                    <span className="font-bold text-[#14201B]">{verificationResult.data.location?.name}</span>
                  </div>
                  <div>
                    <span className="text-[#5C6B64] block text-[10px] uppercase font-bold tracking-wider">Floor & Bay Slot</span>
                    <span className="font-bold text-[#0B3D2E]">{verificationResult.data.floor?.name} — {verificationResult.data.bay?.bayNumber}</span>
                  </div>
                  <div>
                    <span className="text-[#5C6B64] block text-[10px] uppercase font-bold tracking-wider">Vehicle Reg</span>
                    <span className="font-mono font-bold uppercase text-[#14201B]">{verificationResult.data.vehicle?.regNumber}</span>
                  </div>
                  <div>
                    <span className="text-[#5C6B64] block text-[10px] uppercase font-bold tracking-wider">Current Status</span>
                    <span className="uppercase font-extrabold text-[#145C43]">{verificationResult.data.status}</span>
                  </div>
                </div>

                {/* Gate Action Controls */}
                <div className="pt-3 border-t border-[#E3DED2] flex gap-3">
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

        {/* Real-time Session Overview Column */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E3DED2] shadow-sm space-y-6">
            <h2 className="text-base font-heading font-bold text-[#14201B]">Today's Facility Activity</h2>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[#F7F4EE] rounded-2xl border border-[#E3DED2]">
                <span className="text-[10px] font-bold text-[#5C6B64] uppercase tracking-widest block">Currently Parked</span>
                <span className="text-2xl font-heading font-extrabold text-[#0B3D2E]">{todayOverview?.activeCount ?? 0}</span>
              </div>
              <div className="p-4 bg-[#F7F4EE] rounded-2xl border border-[#E3DED2]">
                <span className="text-[10px] font-bold text-[#5C6B64] uppercase tracking-widest block">Today's Arrivals</span>
                <span className="text-2xl font-heading font-extrabold text-[#14201B]">{todayOverview?.todaysArrivalsCount ?? 0}</span>
              </div>
            </div>

            {/* Active Sessions List */}
            <div>
              <h3 className="text-xs font-bold text-[#5C6B64] uppercase tracking-wider mb-3">Active Parking Sessions</h3>
              
              {loadingOverview ? (
                <div className="text-xs font-medium text-[#5C6B64] py-4 text-center">Loading live sessions...</div>
              ) : todayOverview?.activeSessions?.length === 0 ? (
                <div className="text-xs text-[#5C6B64] font-medium py-6 text-center bg-[#F7F4EE] rounded-xl border border-[#E3DED2]">No vehicles currently parked.</div>
              ) : (
                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {todayOverview?.activeSessions?.map((session) => (
                    <div
                      key={session._id}
                      onClick={() => {
                        setSearchQuery(session.bookingRef);
                        handleVerify();
                      }}
                      className="p-3.5 bg-[#F7F4EE] hover:bg-[#E3DED2]/60 border border-[#E3DED2] rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div>
                        <span className="font-mono font-bold uppercase text-[#14201B]">{session.vehicle?.regNumber}</span>
                        <span className="text-[#5C6B64] block text-[11px] font-medium mt-0.5">Bay: {session.bay?.bayNumber}</span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-white border border-[#E3DED2] text-[#145C43] text-[10px] font-bold uppercase tracking-wider">
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