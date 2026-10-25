import { useState, useEffect } from 'react';
import API from '../api/axios';
import {
  ShieldCheck, MapPin, Users, Ticket, IndianRupee,
  PlusCircle, RefreshCw, AlertCircle, CheckCircle2, Search, Building,
  Image as ImageIcon, UserCheck, UserX, UserPlus, X, Edit, Trash2, PieChart as PieIcon, BarChart3
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('metrics');

  const [metrics, setMetrics] = useState(null);
  const [locations, setLocations] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [staffList, setStaffList] = useState([]);

  // Modal States
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [editingFacility, setEditingFacility] = useState(null);
  const [reassignStaffId, setReassignStaffId] = useState('');

  // Form State for Adding New Location
  const [newLocation, setNewLocation] = useState({
    name: '',
    slug: '',
    street: '',
    area: '',
    hourlyRate: 30,
    baseRate: 20,
    lat: 11.8689,
    lng: 75.3725,
    imageUrl: '',
  });

  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    assignedFacility: '',
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [bookingFilter, setBookingFilter] = useState('');

  const fetchAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [mRes, lRes, bRes, sRes] = await Promise.all([
        API.get('/admin/metrics'),
        API.get('/locations'),
        API.get('/admin/bookings'),
        API.get('/admin/staff'),
      ]);
      setMetrics(mRes.data.data);
      setLocations(lRes.data.data || lRes.data || []);
      setBookings(bRes.data.data || []);
      setStaffList(sRes.data.data || []);

      const fetchedLocations = lRes.data.data || lRes.data || [];
      if (fetchedLocations.length > 0 && !newStaff.assignedFacility) {
        setNewStaff((prev) => ({ ...prev, assignedFacility: fetchedLocations[0]._id }));
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

  // Image Upload Handlers
  const handleImageChange = (e, targetForm = 'new') => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (targetForm === 'new') {
          setNewLocation({ ...newLocation, imageUrl: reader.result });
        } else {
          setEditingFacility({ ...editingFacility, imageUrl: reader.result });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Create Facility
  const handleCreateLocation = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const payload = {
        name: newLocation.name,
        slug: newLocation.slug || newLocation.name.toLowerCase().replace(/\s+/g, '-'),
        imageUrl: newLocation.imageUrl || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800',
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
      setNewLocation({ name: '', slug: '', street: '', area: '', hourlyRate: 30, baseRate: 20, lat: 11.8689, lng: 75.3725, imageUrl: '' });
      fetchAdminData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create facility.');
    } finally {
      setSubmitting(false);
    }
  };

  // Update Facility
  const handleUpdateLocation = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const payload = {
        name: editingFacility.name,
        imageUrl: editingFacility.imageUrl || editingFacility.image,
        address: {
          street: editingFacility.address?.street || editingFacility.street,
          area: editingFacility.address?.area || editingFacility.area,
          city: 'Kannur',
          state: 'Kerala',
        },
        pricing: {
          hourlyRate: Number(editingFacility.pricing?.hourlyRate ?? editingFacility.hourlyRate),
          baseRate: Number(editingFacility.pricing?.baseRate ?? editingFacility.baseRate),
        },
      };

      await API.put(`/admin/locations/${editingFacility._id}`, payload);
      setMessage('Facility updated successfully.');
      setEditingFacility(null);
      fetchAdminData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update facility.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Facility
  const handleDeleteLocation = async (facilityId, facilityName) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${facilityName}"?`)) return;

    setSubmitting(true);
    setError(null);
    try {
      await API.delete(`/admin/locations/${facilityId}`);
      setMessage(`Facility "${facilityName}" deleted successfully.`);
      fetchAdminData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete facility.');
    } finally {
      setSubmitting(false);
    }
  };

  // Create Staff
  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      await API.post('/admin/staff', newStaff);
      setMessage('Staff operator account created successfully.');
      setNewStaff({ name: '', email: '', password: '', phone: '', assignedFacility: locations[0]?._id || '' });
      fetchAdminData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create staff account.');
    } finally {
      setSubmitting(false);
    }
  };

  // Staff Reassignment Handler
  const handleReassignStaff = async (staffId, facilityId) => {
    setSubmitting(true);
    setError(null);
    try {
      await API.patch(`/admin/staff/${staffId}/assign`, { facilityId });
      setMessage('Staff reassigned to facility successfully.');
      setSelectedFacility(null);
      fetchAdminData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reassign staff member.');
    } finally {
      setSubmitting(false);
    }
  };

  // Staff Deactivation Handler
  const handleDeactivateStaff = async (staffId) => {
    if (!window.confirm('Are you sure you want to deactivate this staff account?')) return;
    setSubmitting(true);
    setError(null);
    try {
      await API.patch(`/admin/staff/${staffId}/deactivate`);
      setMessage('Staff operator deactivated.');
      setSelectedFacility(null);
      fetchAdminData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to deactivate staff member.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredBookings = bookings.filter(
    (b) =>
      b.bookingRef?.toLowerCase().includes(bookingFilter.toLowerCase()) ||
      b.vehicle?.regNumber?.toLowerCase().includes(bookingFilter.toLowerCase()) ||
      b.user?.name?.toLowerCase().includes(bookingFilter.toLowerCase())
  );

  // --- CHART DATA GENERATION ---
  const activeBookedCount = metrics?.activeBookings ?? 0;
  const totalBays = metrics?.totalBays ?? 200;
  const availableBaysCount = Math.max(0, totalBays - activeBookedCount);

  const bayOccupancyData = [
    { name: 'Active Parked', value: activeBookedCount, color: '#0B3D2E' },
    { name: 'Available Bays', value: availableBaysCount, color: '#10B981' },
  ];

  const facilityRevenueData = locations.map((loc) => {
    const revenue = bookings
      .filter((b) => b.location?._id === loc._id || b.location === loc._id)
      .reduce((sum, b) => sum + (b.pricingSnapshot?.totalAmount || 0), 0);
    return { name: loc.name ? loc.name.replace('Kannur ', '') : 'Facility', revenue };
  });

  return (
    <div className="min-h-screen bg-white text-slate-900 pt-28 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 font-body">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-[#0B3D2E] text-[#F2B705] px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" /> Admin Console
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight">Kannur System Control</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">Configure locations, manage staff accounts, and monitor reservation metrics.</p>
        </div>

        <button
          onClick={fetchAdminData}
          className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-900 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#0B3D2E] ${loading ? 'animate-spin' : ''}`} />
          Refresh Console
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs sm:text-sm font-bold uppercase tracking-wider">
        <button
          onClick={() => setActiveTab('metrics')}
          className={`pb-3 transition-colors cursor-pointer ${activeTab === 'metrics' ? 'border-b-2 border-[#0B3D2E] text-[#0B3D2E]' : 'text-slate-500 hover:text-slate-900'}`}
        >
          System Overview
        </button>
        <button
          onClick={() => setActiveTab('locations')}
          className={`pb-3 transition-colors cursor-pointer ${activeTab === 'locations' ? 'border-b-2 border-[#0B3D2E] text-[#0B3D2E]' : 'text-slate-500 hover:text-slate-900'}`}
        >
          Manage Facilities
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`pb-3 transition-colors cursor-pointer ${activeTab === 'staff' ? 'border-b-2 border-[#0B3D2E] text-[#0B3D2E]' : 'text-slate-500 hover:text-slate-900'}`}
        >
          Staff Accounts
        </button>
        <button
          onClick={() => setActiveTab('bookings')}
          className={`pb-3 transition-colors cursor-pointer ${activeTab === 'bookings' ? 'border-b-2 border-[#0B3D2E] text-[#0B3D2E]' : 'text-slate-500 hover:text-slate-900'}`}
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

      {/* TAB 1: Metrics & Visual Charts Overview */}
      {activeTab === 'metrics' && (
        <div className="space-y-8">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <span className="text-slate-500 text-[10px] uppercase font-bold tracking-widest block">Configured Facilities</span>
              <span className="text-3xl font-heading font-extrabold text-slate-900">{metrics?.totalLocations ?? 0}</span>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <span className="text-slate-500 text-[10px] uppercase font-bold tracking-widest block">Total Parking Bays</span>
              <span className="text-3xl font-heading font-extrabold text-slate-900">{metrics?.totalBays ?? 0}</span>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <span className="text-slate-500 text-[10px] uppercase font-bold tracking-widest block">Active Parked Vehicles</span>
              <span className="text-3xl font-heading font-extrabold text-[#0B3D2E]">{metrics?.activeBookings ?? 0}</span>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <span className="text-slate-500 text-[10px] uppercase font-bold tracking-widest block">Total Facility Revenue</span>
              <span className="text-3xl font-heading font-extrabold text-[#0B3D2E]">₹{metrics?.totalRevenue ?? 0}</span>
            </div>
          </div>

          {/* Visual Data Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Pie Chart: Bay Occupancy */}
            <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-[#0B3D2E]" />
                <h3 className="font-heading font-bold text-sm text-slate-900">Live Bay Occupancy Ratio</h3>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={bayOccupancyData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                      {bayOccupancyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bar Chart: Revenue by Facility */}
            <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#0B3D2E]" />
                <h3 className="font-heading font-bold text-sm text-slate-900">Facility Revenue (₹)</h3>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={facilityRevenueData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="revenue" fill="#0B3D2E" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Facility Management & CRUD */}
      {activeTab === 'locations' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Add Facility Form */}
          <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-heading font-bold text-slate-900">Add New Facility</h2>
            <form onSubmit={handleCreateLocation} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-500 mb-1">Facility Name</label>
                <input
                  type="text"
                  placeholder="e.g. Kannur Fort Parking Lot"
                  value={newLocation.name}
                  onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:border-[#0B3D2E]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-500 mb-1 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[#0B3D2E]" /> Cover Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageChange(e, 'new')}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-slate-100 file:text-xs file:font-bold file:text-slate-800 hover:file:bg-slate-200 cursor-pointer"
                />
                {newLocation.imageUrl && (
                  <div className="mt-2.5 relative rounded-xl overflow-hidden h-32 border border-slate-200">
                    <img src={newLocation.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setNewLocation({ ...newLocation, imageUrl: '' })}
                      className="absolute top-2 right-2 p-1 bg-slate-900/80 text-white rounded-full"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-500 mb-1">Street Address</label>
                  <input
                    type="text"
                    placeholder="Fort Road"
                    value={newLocation.street}
                    onChange={(e) => setNewLocation({ ...newLocation, street: e.target.value })}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:border-[#0B3D2E]"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase text-slate-500 mb-1">Area</label>
                  <input
                    type="text"
                    placeholder="Ayikkara"
                    value={newLocation.area}
                    onChange={(e) => setNewLocation({ ...newLocation, area: e.target.value })}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:border-[#0B3D2E]"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-500 mb-1">Base Rate (₹)</label>
                  <input
                    type="number"
                    value={newLocation.baseRate}
                    onChange={(e) => setNewLocation({ ...newLocation, baseRate: e.target.value })}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:border-[#0B3D2E]"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase text-slate-500 mb-1">Hourly Rate (₹)</label>
                  <input
                    type="number"
                    value={newLocation.hourlyRate}
                    onChange={(e) => setNewLocation({ ...newLocation, hourlyRate: e.target.value })}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:border-[#0B3D2E]"
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

          {/* Facilities List & Action Controls */}
          <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-heading font-bold text-slate-900">Active Kannur Facilities ({locations.length})</h2>
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {locations.map((loc) => {
                const assignedStaff = staffList.find(
                  (s) => s.assignedFacility?._id === loc._id || s.assignedFacility === loc._id
                );

                const facilityImage = loc.imageUrl || loc.image;

                return (
                  <div key={loc._id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {facilityImage ? (
                        <img src={facilityImage} alt={loc.name} className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                          <Building className="w-5 h-5 text-slate-500" />
                        </div>
                      )}
                      <div>
                        <span className="font-heading font-bold text-sm text-slate-900 block">{loc.name}</span>
                        <span className="text-slate-500 font-medium">{loc.address?.street}, {loc.address?.area}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <span className="font-bold text-[#0B3D2E] bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg shadow-sm">
                        ₹{loc.pricing?.hourlyRate}/hr
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedFacility({ loc, assignedStaff })}
                        className="p-2 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200"
                        title="View Staff"
                      >
                        <Users className="w-3.5 h-3.5 text-[#0B3D2E]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingFacility(loc)}
                        className="p-2 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200"
                        title="Edit Facility"
                      >
                        <Edit className="w-3.5 h-3.5 text-blue-600" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteLocation(loc._id, loc.name)}
                        className="p-2 bg-white hover:bg-red-50 text-red-600 rounded-lg border border-slate-200"
                        title="Delete Facility"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Staff Management */}
      {activeTab === 'staff' && (
        <div className="max-w-xl bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-heading font-bold text-slate-900">Register Staff Operator</h2>
          <form onSubmit={handleCreateStaff} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold uppercase text-slate-500 mb-1">Staff Member Name</label>
              <input
                type="text"
                placeholder="Full Name"
                value={newStaff.name}
                onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:border-[#0B3D2E]"
                required
              />
            </div>
            <div>
              <label className="block font-bold uppercase text-slate-500 mb-1">Staff Email Address</label>
              <input
                type="email"
                placeholder="staff@parkora.in"
                value={newStaff.email}
                onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:border-[#0B3D2E]"
                required
              />
            </div>
            <div>
              <label className="block font-bold uppercase text-slate-500 mb-1">Password</label>
              <input
                type="password"
                placeholder="Secure Password"
                value={newStaff.password}
                onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:border-[#0B3D2E]"
                required
              />
            </div>
            <div>
              <label className="block font-bold uppercase text-slate-500 mb-1">Assigned Facility</label>
              <select
                value={newStaff.assignedFacility}
                onChange={(e) => setNewStaff({ ...newStaff, assignedFacility: e.target.value })}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:border-[#0B3D2E]"
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
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-base font-heading font-bold text-slate-900">All System Reservations ({filteredBookings.length})</h2>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Filter by ref, vehicle, or user..."
                value={bookingFilter}
                onChange={(e) => setBookingFilter(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-[#0B3D2E]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-900">
              <thead className="bg-slate-50 border-b border-slate-200 uppercase text-[10px] font-bold text-slate-500">
                <tr>
                  <th className="p-3.5">Booking Ref</th>
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Facility</th>
                  <th className="p-3.5">Vehicle</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredBookings.map((b) => (
                  <tr key={b._id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-[#0B3D2E]">{b.bookingRef}</td>
                    <td className="p-3.5 font-semibold">{b.user?.name || 'Customer'}</td>
                    <td className="p-3.5 font-medium text-slate-500">{b.location?.name}</td>
                    <td className="p-3.5 font-mono uppercase font-bold">{b.vehicle?.regNumber}</td>
                    <td className="p-3.5 uppercase font-bold text-[#145C43]">{b.status}</td>
                    <td className="p-3.5 font-bold text-slate-900">₹{b.pricingSnapshot?.totalAmount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EDIT FACILITY MODAL */}
      {editingFacility && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 sm:p-8 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setEditingFacility(null)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-heading font-extrabold text-slate-900">Edit Facility Details</h3>
            <form onSubmit={handleUpdateLocation} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-500 mb-1">Facility Name</label>
                <input
                  type="text"
                  value={editingFacility.name}
                  onChange={(e) => setEditingFacility({ ...editingFacility, name: e.target.value })}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-500 mb-1">Facility Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageChange(e, 'edit')}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs"
                />
                {(editingFacility.imageUrl || editingFacility.image) && (
                  <img src={editingFacility.imageUrl || editingFacility.image} alt="Cover Preview" className="mt-2 h-28 w-full object-cover rounded-xl border" />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-500 mb-1">Street</label>
                  <input
                    type="text"
                    value={editingFacility.address?.street || editingFacility.street || ''}
                    onChange={(e) => setEditingFacility({ ...editingFacility, street: e.target.value })}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase text-slate-500 mb-1">Area</label>
                  <input
                    type="text"
                    value={editingFacility.address?.area || editingFacility.area || ''}
                    onChange={(e) => setEditingFacility({ ...editingFacility, area: e.target.value })}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-[#0B3D2E] text-white font-bold rounded-xl mt-2 text-sm shadow-sm active:scale-95"
              >
                {submitting ? 'Updating...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGNED STAFF INSPECTOR MODAL */}
      {selectedFacility && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedFacility(null)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">Facility Operator</span>
              <h3 className="text-lg font-heading font-extrabold text-slate-900 mt-0.5">{selectedFacility.loc.name}</h3>
            </div>

            {selectedFacility.assignedStaff ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#0B3D2E] text-white font-bold flex items-center justify-center text-sm">
                    {selectedFacility.assignedStaff.name?.[0] || 'S'}
                  </div>
                  <div>
                    <span className="font-bold text-sm text-slate-900 block">{selectedFacility.assignedStaff.name}</span>
                    <span className="text-xs text-slate-500">{selectedFacility.assignedStaff.email}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Phone: {selectedFacility.assignedStaff.phone || 'N/A'}</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#145C43] font-bold text-[10px] uppercase">Active</span>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleDeactivateStaff(selectedFacility.assignedStaff._id)}
                    className="flex-1 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <UserX className="w-3.5 h-3.5" /> Deactivate Staff
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500 font-medium space-y-2">
                <UserCheck className="w-6 h-6 text-slate-400 mx-auto" />
                <p>No staff operator is currently assigned to this facility.</p>
              </div>
            )}

            <div className="space-y-3 pt-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Assign / Reassign Staff
              </label>
              <div className="flex gap-2">
                <select
                  value={reassignStaffId}
                  onChange={(e) => setReassignStaffId(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-[#0B3D2E]"
                >
                  <option value="">Select Staff Member...</option>
                  {staffList.map((s) => (
                    <option key={s._id} value={s._id}>{s.name} ({s.email})</option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!reassignStaffId || submitting}
                  onClick={() => handleReassignStaff(reassignStaffId, selectedFacility.loc._id)}
                  className="px-4 py-2.5 bg-[#0B3D2E] hover:bg-[#145C43] text-white font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50 shrink-0"
                >
                  Reassign
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}