import { useState, useEffect } from 'react';
import API from '../api/axios';
import {
  ShieldCheck, MapPin, Users, Ticket, IndianRupee,
  PlusCircle, RefreshCw, AlertCircle, CheckCircle2, Search, Building
} from 'lucide-react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('metrics'); // 'metrics', 'locations', 'staff', 'bookings'

  // Data States
  const [metrics, setMetrics] = useState(null);
  const [locations, setLocations] = useState([]);
  const [bookings, setBookings] = useState([]);

  // Form States
  const [newLocation, setNewLocation] = useState({
    name: '',
    slug: '',
    street: '',
    area: '',
    hourlyRate: 30,
    baseRate: 20,
    lat: 11.8689,
    lng: 75.3725,
  });

  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    assignedFacility: '',
  });

  // Async States
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [bookingFilter, setBookingFilter] = useState('');

  // Fetch Dashboard Data
  const fetchAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [mRes, lRes, bRes] = await Promise.all([
        API.get('/admin/metrics'),
        API.get('/locations'),
        API.get('/admin/bookings'),
      ]);
      setMetrics(mRes.data.data);
      setLocations(lRes.data.data);
      setBookings(bRes.data.data);
      if (lRes.data.data.length > 0 && !newStaff.assignedFacility) {
        setNewStaff((prev) => ({ ...prev, assignedFacility: lRes.data.data[0]._id }));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch admin dashboard records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Handle Location Creation
  const handleCreateLocation = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const payload = {
        name: newLocation.name,
        slug: newLocation.slug || newLocation.name.toLowerCase().replace(/\s+/g, '-'),
        address: {
          street: newLocation.street,
          area: newLocation.area,
          city: 'Kannur',
          state: 'Kerala',
        },
        coordinates: { lat: Number(newLocation.lat), lng: Number(newLocation.lng) },
        pricing: { hourlyRate: Number(newLocation.hourlyRate), baseRate: Number(newLocation.baseRate) },
        supportedVehicleTypes: ['car', 'bike', 'ev'],
        amenities: ['CCTV', 'Security Guard', 'Covered Parking'],
      };

      await API.post('/admin/locations', payload);
      setMessage('New parking facility created successfully.');
      setNewLocation({ name: '', slug: '', street: '', area: '', hourlyRate: 30, baseRate: 20, lat: 11.8689, lng: 75.3725 });
      fetchAdminData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create facility.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Staff Account Creation
  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      await API.post('/admin/staff', newStaff);
      setMessage('Staff operator account created successfully.');
      setNewStaff({ name: '', email: '', password: '', phone: '', assignedFacility: locations[0]?._id || '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create staff account.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredBookings = bookings.filter(
    (b) =>
      b.bookingRef.toLowerCase().includes(bookingFilter.toLowerCase()) ||
      b.vehicle?.regNumber.toLowerCase().includes(bookingFilter.toLowerCase()) ||
      b.user?.name?.toLowerCase().includes(bookingFilter.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F7F4EE] text-[#14201B] pt-28 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 font-body">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-2xl border border-[#E3DED2] shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-[#0B3D2E] text-[#F2B705] px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" /> Admin Console
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-[#14201B] tracking-tight">Kannur System Control</h1>
          <p className="text-xs text-[#5C6B64] mt-1 font-medium">Configure locations, manage staff accounts, and monitor reservation metrics.</p>
        </div>

        <button
          onClick={fetchAdminData}
          className="inline-flex items-center gap-2 bg-[#F7F4EE] hover:bg-[#E3DED2]/60 text-[#14201B] px-4 py-2.5 rounded-xl border border-[#E3DED2] text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#0B3D2E] ${loading ? 'animate-spin' : ''}`} />
          Refresh Console
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E3DED2] gap-6 text-xs sm:text-sm font-bold uppercase tracking-wider">
        <button
          onClick={() => setActiveTab('metrics')}
          className={`pb-3 transition-colors cursor-pointer ${activeTab === 'metrics' ? 'border-b-2 border-[#0B3D2E] text-[#0B3D2E]' : 'text-[#5C6B64] hover:text-[#14201B]'}`}
        >
          System Overview
        </button>
        <button
          onClick={() => setActiveTab('locations')}
          className={`pb-3 transition-colors cursor-pointer ${activeTab === 'locations' ? 'border-b-2 border-[#0B3D2E] text-[#0B3D2E]' : 'text-[#5C6B64] hover:text-[#14201B]'}`}
        >
          Manage Facilities
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`pb-3 transition-colors cursor-pointer ${activeTab === 'staff' ? 'border-b-2 border-[#0B3D2E] text-[#0B3D2E]' : 'text-[#5C6B64] hover:text-[#14201B]'}`}
        >
          Staff Accounts
        </button>
        <button
          onClick={() => setActiveTab('bookings')}
          className={`pb-3 transition-colors cursor-pointer ${activeTab === 'bookings' ? 'border-b-2 border-[#0B3D2E] text-[#0B3D2E]' : 'text-[#5C6B64] hover:text-[#14201B]'}`}
        >
          Master Bookings
        </button>
      </div>

      {message && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {message}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          {error}
        </div>
      )}

      {/* TAB 1: Metrics Overview */}
      {activeTab === 'metrics' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-[#E3DED2] shadow-sm space-y-2">
            <span className="text-[#5C6B64] text-[10px] uppercase font-bold tracking-widest block">Configured Facilities</span>
            <span className="text-3xl font-heading font-extrabold text-[#14201B]">{metrics?.totalLocations ?? 0}</span>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-[#E3DED2] shadow-sm space-y-2">
            <span className="text-[#5C6B64] text-[10px] uppercase font-bold tracking-widest block">Total Parking Bays</span>
            <span className="text-3xl font-heading font-extrabold text-[#14201B]">{metrics?.totalBays ?? 0}</span>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-[#E3DED2] shadow-sm space-y-2">
            <span className="text-[#5C6B64] text-[10px] uppercase font-bold tracking-widest block">Active Parked Vehicles</span>
            <span className="text-3xl font-heading font-extrabold text-[#0B3D2E]">{metrics?.activeBookings ?? 0}</span>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-[#E3DED2] shadow-sm space-y-2">
            <span className="text-[#5C6B64] text-[10px] uppercase font-bold tracking-widest block">Total Facility Revenue</span>
            <span className="text-3xl font-heading font-extrabold text-[#0B3D2E]">₹{metrics?.totalRevenue ?? 0}</span>
          </div>
        </div>
      )}

      {/* TAB 2: Facility Management */}
      {activeTab === 'locations' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-2xl border border-[#E3DED2] shadow-sm space-y-4">
            <h2 className="text-base font-heading font-bold text-[#14201B]">Add New Facility</h2>
            <form onSubmit={handleCreateLocation} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold uppercase text-[#5C6B64] mb-1">Facility Name</label>
                <input
                  type="text"
                  placeholder="e.g. Kannur Fort Parking Lot"
                  value={newLocation.name}
                  onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                  className="w-full p-3 bg-[#F7F4EE] border border-[#E3DED2] rounded-xl text-sm font-semibold text-[#14201B] outline-none focus:border-[#0B3D2E]"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase text-[#5C6B64] mb-1">Street Address</label>
                  <input
                    type="text"
                    placeholder="Fort Road"
                    value={newLocation.street}
                    onChange={(e) => setNewLocation({ ...newLocation, street: e.target.value })}
                    className="w-full p-3 bg-[#F7F4EE] border border-[#E3DED2] rounded-xl text-sm font-semibold text-[#14201B] outline-none focus:border-[#0B3D2E]"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase text-[#5C6B64] mb-1">Area</label>
                  <input
                    type="text"
                    placeholder="Ayikkara"
                    value={newLocation.area}
                    onChange={(e) => setNewLocation({ ...newLocation, area: e.target.value })}
                    className="w-full p-3 bg-[#F7F4EE] border border-[#E3DED2] rounded-xl text-sm font-semibold text-[#14201B] outline-none focus:border-[#0B3D2E]"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase text-[#5C6B64] mb-1">Base Rate (₹)</label>
                  <input
                    type="number"
                    value={newLocation.baseRate}
                    onChange={(e) => setNewLocation({ ...newLocation, baseRate: e.target.value })}
                    className="w-full p-3 bg-[#F7F4EE] border border-[#E3DED2] rounded-xl text-sm font-semibold text-[#14201B] outline-none focus:border-[#0B3D2E]"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase text-[#5C6B64] mb-1">Hourly Rate (₹)</label>
                  <input
                    type="number"
                    value={newLocation.hourlyRate}
                    onChange={(e) => setNewLocation({ ...newLocation, hourlyRate: e.target.value })}
                    className="w-full p-3 bg-[#F7F4EE] border border-[#E3DED2] rounded-xl text-sm font-semibold text-[#14201B] outline-none focus:border-[#0B3D2E]"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-[#0B3D2E] hover:bg-[#145C43] text-white font-bold rounded-xl mt-2 cursor-pointer transition-all shadow-sm text-sm active:scale-95"
              >
                {submitting ? 'Saving Facility...' : 'Add Location'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-2xl border border-[#E3DED2] shadow-sm space-y-4">
            <h2 className="text-base font-heading font-bold text-[#14201B]">Active Kannur Facilities ({locations.length})</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {locations.map((loc) => (
                <div key={loc._id} className="p-4 bg-[#F7F4EE] rounded-xl border border-[#E3DED2] text-xs flex justify-between items-center">
                  <div>
                    <span className="font-heading font-bold text-sm text-[#14201B] block">{loc.name}</span>
                    <span className="text-[#5C6B64] font-medium">{loc.address.street}, {loc.address.area}</span>
                  </div>
                  <span className="font-bold text-[#0B3D2E] bg-white border border-[#E3DED2] px-3 py-1.5 rounded-lg shadow-sm">
                    ₹{loc.pricing.hourlyRate}/hr
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Staff Management */}
      {activeTab === 'staff' && (
        <div className="max-w-xl bg-white p-6 sm:p-8 rounded-2xl border border-[#E3DED2] shadow-sm space-y-4">
          <h2 className="text-base font-heading font-bold text-[#14201B]">Register Staff Operator</h2>
          <form onSubmit={handleCreateStaff} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold uppercase text-[#5C6B64] mb-1">Staff Member Name</label>
              <input
                type="text"
                placeholder="Full Name"
                value={newStaff.name}
                onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                className="w-full p-3 bg-[#F7F4EE] border border-[#E3DED2] rounded-xl text-sm font-semibold text-[#14201B] outline-none focus:border-[#0B3D2E]"
                required
              />
            </div>
            <div>
              <label className="block font-bold uppercase text-[#5C6B64] mb-1">Staff Email Address</label>
              <input
                type="email"
                placeholder="staff@parkora.in"
                value={newStaff.email}
                onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                className="w-full p-3 bg-[#F7F4EE] border border-[#E3DED2] rounded-xl text-sm font-semibold text-[#14201B] outline-none focus:border-[#0B3D2E]"
                required
              />
            </div>
            <div>
              <label className="block font-bold uppercase text-[#5C6B64] mb-1">Password</label>
              <input
                type="password"
                placeholder="Secure Password"
                value={newStaff.password}
                onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                className="w-full p-3 bg-[#F7F4EE] border border-[#E3DED2] rounded-xl text-sm font-semibold text-[#14201B] outline-none focus:border-[#0B3D2E]"
                required
              />
            </div>
            <div>
              <label className="block font-bold uppercase text-[#5C6B64] mb-1">Assigned Facility</label>
              <select
                value={newStaff.assignedFacility}
                onChange={(e) => setNewStaff({ ...newStaff, assignedFacility: e.target.value })}
                className="w-full p-3 bg-[#F7F4EE] border border-[#E3DED2] rounded-xl text-sm font-semibold text-[#14201B] outline-none focus:border-[#0B3D2E]"
              >
                {locations.map((loc) => (
                  <option key={loc._id} value={loc._id}>{loc.name}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-[#0B3D2E] hover:bg-[#145C43] text-white font-bold rounded-xl mt-2 cursor-pointer transition-all shadow-sm text-sm active:scale-95"
            >
              {submitting ? 'Creating Account...' : 'Create Staff Account'}
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: Master Bookings List */}
      {activeTab === 'bookings' && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E3DED2] shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-base font-heading font-bold text-[#14201B]">All System Reservations ({filteredBookings.length})</h2>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-[#5C6B64]" />
              <input
                type="text"
                placeholder="Filter by ref, vehicle, or user..."
                value={bookingFilter}
                onChange={(e) => setBookingFilter(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-[#F7F4EE] border border-[#E3DED2] rounded-xl text-xs font-semibold text-[#14201B] outline-none focus:border-[#0B3D2E]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#14201B]">
              <thead className="bg-[#F7F4EE] border-b border-[#E3DED2] uppercase text-[10px] font-bold text-[#5C6B64]">
                <tr>
                  <th className="p-3.5">Booking Ref</th>
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Facility</th>
                  <th className="p-3.5">Vehicle</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3DED2]">
                {filteredBookings.map((b) => (
                  <tr key={b._id} className="hover:bg-[#F7F4EE]/50 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-[#0B3D2E]">{b.bookingRef}</td>
                    <td className="p-3.5 font-semibold">{b.user?.name || 'Customer'}</td>
                    <td className="p-3.5 font-medium text-[#5C6B64]">{b.location?.name}</td>
                    <td className="p-3.5 font-mono uppercase font-bold">{b.vehicle?.regNumber}</td>
                    <td className="p-3.5 uppercase font-bold text-[#145C43]">{b.status}</td>
                    <td className="p-3.5 font-bold text-[#14201B]">₹{b.pricingSnapshot?.totalAmount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}