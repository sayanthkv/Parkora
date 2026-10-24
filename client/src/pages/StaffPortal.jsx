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
    <div className="min-h-screen bg-[#F7F8F6] py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-[#176B4D]/10 text-[#176B4D] px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" /> Staff Terminal Portal
          </div>
          <h1 className="text-2xl font-bold text-[#202722]">Facility Verification & Access Gate</h1>
          <p className="text-xs text-gray-500 mt-1">Scan tickets or enter booking references to process arrival check-ins and departure exits.</p>
        </div>

        <button
          onClick={fetchTodayOverview}
          className="inline-flex items-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-700 px-4 py-2 rounded-lg border border-gray-200 text-xs font-semibold transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingOverview ? 'animate-spin' : ''}`} />
          Refresh Stats
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Verification Column */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm space-y-6">
            <h2 className="text-base font-bold text-[#202722]">Verify Ticket or QR Token</h2>

            {/* Manual Lookup Form */}
            <form onSubmit={handleVerify} className="space-y-3">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Booking Reference or QR Token
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="e.g. KSP-123456-789 or QR Payload Token..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm uppercase font-mono tracking-wider text-[#202722] outline-none focus:ring-2 focus:ring-[#176B4D]"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loadingVerify}
                  className="px-5 py-2.5 bg-[#176B4D] hover:bg-[#12533c] text-white font-semibold text-sm rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {loadingVerify ? 'Verifying...' : 'Verify'}
                </button>
              </div>
            </form>

            {/* Action Banners */}
            {actionSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                {actionSuccess}
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                {error}
              </div>
            )}

            {/* Verification Result Card */}
            {verificationResult && verificationResult.data && (
              <div className={`p-6 rounded-2xl border ${verificationResult.isValid ? 'bg-emerald-50/40 border-emerald-200' : 'bg-red-50/40 border-red-200'} space-y-4`}>
                
                <div className="flex items-center justify-between pb-3 border-b border-gray-200/60">
                  <div className="flex items-center gap-2">
                    {verificationResult.isValid ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className={`text-sm font-bold ${verificationResult.isValid ? 'text-emerald-900' : 'text-red-900'}`}>
                      {verificationResult.message}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-extrabold uppercase px-2.5 py-1 rounded bg-white border border-gray-200">
                    {verificationResult.data.bookingRef}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase font-bold">Facility Location</span>
                    <span className="font-semibold text-[#202722]">{verificationResult.data.location?.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase font-bold">Floor & Bay Slot</span>
                    <span className="font-bold text-[#176B4D]">{verificationResult.data.floor?.name} — {verificationResult.data.bay?.bayNumber}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase font-bold">Vehicle Reg</span>
                    <span className="font-mono font-bold text-gray-900">{verificationResult.data.vehicle?.regNumber}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase font-bold">Current Status</span>
                    <span className="uppercase font-bold text-[#176B4D]">{verificationResult.data.status}</span>
                  </div>
                </div>

                {/* Gate Action Controls */}
                <div className="pt-3 border-t border-gray-200/60 flex gap-3">
                  {verificationResult.data.status === 'confirmed' && (
                    <button
                      onClick={() => handleCheckIn(verificationResult.data._id)}
                      disabled={loadingAction}
                      className="w-full py-3 bg-[#176B4D] hover:bg-[#12533c] text-white font-semibold rounded-lg text-sm flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                    >
                      {loadingAction ? 'Processing...' : 'Approve & Record Check-In'}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}

                  {verificationResult.data.status === 'active' && (
                    <button
                      onClick={() => handleCheckOut(verificationResult.data._id)}
                      disabled={loadingAction}
                      className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white font-semibold rounded-lg text-sm flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                    >
                      {loadingAction ? 'Finalizing Exit...' : 'Complete Checkout & Payment'}
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

              </div>
            )}

          </div>
        </div>

        {/* Real-time Session Overview Column */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm space-y-6">
            <h2 className="text-base font-bold text-[#202722]">Today's Facility Activity</h2>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[#F7F8F6] rounded-xl border border-gray-200">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Currently Parked</span>
                <span className="text-2xl font-extrabold text-[#176B4D]">{todayOverview?.activeCount ?? 0}</span>
              </div>
              <div className="p-4 bg-[#F7F8F6] rounded-xl border border-gray-200">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Today's Arrivals</span>
                <span className="text-2xl font-extrabold text-[#202722]">{todayOverview?.todaysArrivalsCount ?? 0}</span>
              </div>
            </div>

            {/* Active Sessions List */}
            <div>
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Active Parking Sessions</h3>
              
              {loadingOverview ? (
                <div className="text-xs text-gray-400 py-4 text-center">Loading live sessions...</div>
              ) : todayOverview?.activeSessions?.length === 0 ? (
                <div className="text-xs text-gray-400 py-6 text-center bg-gray-50 rounded-lg">No vehicles currently parked.</div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {todayOverview?.activeSessions?.map((session) => (
                    <div
                      key={session._id}
                      onClick={() => {
                        setSearchQuery(session.bookingRef);
                        handleVerify();
                      }}
                      className="p-3 bg-gray-50 hover:bg-emerald-50/50 border border-gray-200 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div>
                        <span className="font-mono font-bold text-[#202722]">{session.vehicle?.regNumber}</span>
                        <span className="text-gray-500 block text-[11px]">Bay: {session.bay?.bayNumber}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
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