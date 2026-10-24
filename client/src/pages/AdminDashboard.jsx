import { useState, useEffect } from 'react';
import API from '../api/axios';
import {
  ShieldCheck, MapPin, Users, Ticket, IndianRupee,
  PlusCircle, RefreshCw, AlertCircle, CheckCircle2, Search
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
    <div className="min-h-screen bg-[#F7F8F6] py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" /> Admin Console
          </div>
          <h1 className="text-2xl font-bold text-[#202722]">Kannur System Control</h1>
          <p className="text-xs text-gray-500 mt-1">Configure locations, manage staff accounts, and monitor reservation metrics.</p>
        </div>

        <button
          onClick={fetchAdminData}
          className="inline-flex items-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-700 px-4 py-2 rounded-lg border border-gray-200 text-xs font-semibold transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Console
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('metrics')}
          className={`pb-3 transition-colors cursor-pointer ${activeTab === 'metrics' ? 'border-b-2 border-[#176B4D] text-[#176B4D]' : 'text-gray-500 hover:text-black'}`}
        >
          System Overview
        </button>
        <button
          onClick={() => setActiveTab('locations')}
          className={`pb-3 transition-colors cursor-pointer ${activeTab === 'locations' ? 'border-b-2 border-[#176B4D] text-[#176B4D]' : 'text-gray-500 hover:text-black'}`}
        >
          Manage Facilities
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`pb-3 transition-colors cursor-pointer ${activeTab === 'staff' ? 'border-b-2 border-[#176B4D] text-[#176B4D]' : 'text-gray-500 hover:text-black'}`}
        >
          Staff Accounts
        </button>
        <button
          onClick={() => setActiveTab('bookings')}
          className={`pb-3 transition-colors cursor-pointer ${activeTab === 'bookings' ? 'border-b-2 border-[#176B4D] text-[#176B4D]' : 'text-gray-500 hover:text-black'}`}
        >
          Master Bookings
        </button>
      </div>

      {message && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {message}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          {error}
        </div>
      )}

      {/* TAB 1: Metrics Overview */}
      {activeTab === 'metrics' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-1">
            <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider block">Configured Facilities</span>
            <span className="text-3xl font-extrabold text-[#202722]">{metrics?.totalLocations ?? 0}</span>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-1">
            <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider block">Total Parking Bays</span>
            <span className="text-3xl font-extrabold text-[#202722]">{metrics?.totalBays ?? 0}</span>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-1">
            <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider block">Active Parked Vehicles</span>
            <span className="text-3xl font-extrabold text-[#176B4D]">{metrics?.activeBookings ?? 0}</span>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-1">
            <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider block">Total Facility Revenue</span>
            <span className="text-3xl font-extrabold text-[#176B4D]">₹{metrics?.totalRevenue ?? 0}</span>
          </div>
        </div>
      )}

      {/* TAB 2: Facility Management */}
      {activeTab === 'locations' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-[#202722]">Add New Facility</h2>
            <form onSubmit={handleCreateLocation} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Facility Name</label>
                <input
                  type="text"
                  placeholder="e.g. Kannur Fort Parking Lot"
                  value={newLocation.name}
                  onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Street Address</label>
                  <input
                    type="text"
                    placeholder="Fort Road"
                    value={newLocation.street}
                    onChange={(e) => setNewLocation({ ...newLocation, street: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Area</label>
                  <input
                    type="text"
                    placeholder="Ayikkara"
                    value={newLocation.area}
                    onChange={(e) => setNewLocation({ ...newLocation, area: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Base Rate (₹)</label>
                  <input
                    type="number"
                    value={newLocation.baseRate}
                    onChange={(e) => setNewLocation({ ...newLocation, baseRate: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Hourly Rate (₹)</label>
                  <input
                    type="number"
                    value={newLocation.hourlyRate}
                    onChange={(e) => setNewLocation({ ...newLocation, hourlyRate: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-[#176B4D] hover:bg-[#12533c] text-white font-semibold rounded-lg mt-2 cursor-pointer transition-colors"
              >
                {submitting ? 'Saving...' : 'Add Location'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-[#202722]">Active Kannur Facilities ({locations.length})</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {locations.map((loc) => (
                <div key={loc._id} className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs flex justify-between items-center">
                  <div>
                    <span className="font-bold text-sm text-[#202722] block">{loc.name}</span>
                    <span className="text-gray-500">{loc.address.street}, {loc.address.area}</span>
                  </div>
                  <span className="font-bold text-[#176B4D] bg-[#176B4D]/10 px-3 py-1 rounded-lg">
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
        <div className="max-w-xl bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-[#202722]">Register Staff Operator</h2>
          <form onSubmit={handleCreateStaff} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold mb-1">Staff Member Name</label>
              <input
                type="text"
                placeholder="Full Name"
                value={newStaff.name}
                onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none"
                required
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Staff Email Address</label>
              <input
                type="email"
                placeholder="staff@parkora.in"
                value={newStaff.email}
                onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none"
                required
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Password</label>
              <input
                type="password"
                placeholder="Secure Password"
                value={newStaff.password}
                onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none"
                required
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Assigned Facility</label>
              <select
                value={newStaff.assignedFacility}
                onChange={(e) => setNewStaff({ ...newStaff, assignedFacility: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none"
              >
                {locations.map((loc) => (
                  <option key={loc._id} value={loc._id}>{loc.name}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-semibold rounded-lg mt-2 cursor-pointer transition-colors"
            >
              {submitting ? 'Creating...' : 'Create Staff Account'}
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: Master Bookings List */}
      {activeTab === 'bookings' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-base font-bold text-[#202722]">All System Reservations ({filteredBookings.length})</h2>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Filter by ref, vehicle, or user..."
                value={bookingFilter}
                onChange={(e) => setBookingFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50 border-b border-gray-200 uppercase text-[10px] font-bold text-gray-500">
                <tr>
                  <th className="p-3">Booking Ref</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Facility</th>
                  <th className="p-3">Vehicle</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBookings.map((b) => (
                  <tr key={b._id} className="hover:bg-gray-50/50">
                    <td className="p-3 font-mono font-bold text-[#202722]">{b.bookingRef}</td>
                    <td className="p-3">{b.user?.name || 'Customer'}</td>
                    <td className="p-3">{b.location?.name}</td>
                    <td className="p-3 font-mono">{b.vehicle?.regNumber}</td>
                    <td className="p-3 uppercase font-bold text-[#176B4D]">{b.status}</td>
                    <td className="p-3 font-bold text-gray-900">₹{b.pricingSnapshot?.totalAmount}</td>
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