import { useState, useEffect } from 'react';
import API from '../api/axios';
import {
  ShieldCheck, Users, RefreshCw, AlertCircle, CheckCircle2, Search, Building,
  Image as ImageIcon, UserCheck, UserX, X, Edit, Trash2, PieChart as PieIcon, BarChart3,
  Layers, Plus, Zap, Mail, Phone, User
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

  // Modals & Drawers State
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [editingFacility, setEditingFacility] = useState(null);
  const [structureFacility, setStructureFacility] = useState(null);
  const [viewingStaff, setViewingStaff] = useState(null);
  const [editingStaff, setEditingStaff] = useState(null);

  const [facilityFloors, setFacilityFloors] = useState([]);
  const [facilityBays, setFacilityBays] = useState([]);
  const [activeFloorId, setActiveFloorId] = useState(null);

  // Forms for Floor & Bay Creation
  const [newFloorName, setNewFloorName] = useState('');
  const [newFloorLevel, setNewFloorLevel] = useState(0);
  const [newBay, setNewBay] = useState({
    bayNumber: '',
    supportedVehicleType: 'car',
    customHourlyRate: '',
    isEVCharging: false,
    isMaintenance: false,
  });

  const [reassignStaffId, setReassignStaffId] = useState('');

  // Form State for Staff Editing
  const [staffForm, setStaffForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });

  // Form State for Adding New Location
  const [newLocation, setNewLocation] = useState({
    name: '',
    slug: '',
    description: '',
    amenities: '24/7 Access, CCTV, Covered Parking',
    street: '',
    area: '',
    hourlyRate: 30,
    baseRate: 20,
    lat: 11.8689,
    lng: 75.3725,
    imageUrl: '',
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [editSelectedFile, setEditSelectedFile] = useState(null);

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

  // Filter staff list to only show active operators for assigning tasks
  const activeStaffList = staffList.filter((s) => s.isActive !== false);

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

  const openStructureManager = async (facility) => {
    setStructureFacility(facility);
    setLoading(true);

    const defaultRate = facility.pricing?.hourlyRate ?? facility.hourlyRate ?? 30;
    setNewBay((prev) => ({
      ...prev,
      customHourlyRate: defaultRate,
    }));

    try {
      const res = await API.get(`/admin/locations/${facility._id}/structure`);
      const fls = res.data.data.floors || [];
      setFacilityFloors(fls);
      setFacilityBays(res.data.data.bays || []);
      if (fls.length > 0) {
        setActiveFloorId(fls[0]._id);
      } else {
        setActiveFloorId(null);
      }
    } catch (err) {
      setError('Failed to fetch facility floor structure.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFloor = async (e) => {
    e.preventDefault();
    if (!structureFacility || !newFloorName.trim()) return;
    setSubmitting(true);
    try {
      const res = await API.post(`/admin/locations/${structureFacility._id}/floors`, {
        name: newFloorName,
        level: newFloorLevel,
      });
      const created = res.data.data;
      setFacilityFloors((prev) => [...prev, created]);
      setActiveFloorId(created._id);
      setNewFloorName('');
      setNewFloorLevel((prev) => prev + 1);
      setMessage(`Floor "${created.name}" created.`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create floor.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFloor = async (floorId, floorName) => {
    if (!window.confirm(`Delete "${floorName}" and all bays assigned to it?`)) return;
    try {
      await API.delete(`/admin/floors/${floorId}`);
      setFacilityFloors((prev) => prev.filter((f) => f._id !== floorId));
      setFacilityBays((prev) => prev.filter((b) => b.floor !== floorId));
      if (activeFloorId === floorId) {
        const remaining = facilityFloors.filter((f) => f._id !== floorId);
        setActiveFloorId(remaining[0]?._id || null);
      }
      setMessage(`Floor "${floorName}" deleted.`);
    } catch (err) {
      setError('Failed to delete floor.');
    }
  };

  const handleCreateBay = async (e) => {
    e.preventDefault();
    if (!structureFacility || !activeFloorId || !newBay.bayNumber.trim()) return;
    setSubmitting(true);

    const defaultRate = structureFacility.pricing?.hourlyRate ?? structureFacility.hourlyRate ?? 30;

    try {
      const res = await API.post(
        `/admin/locations/${structureFacility._id}/floors/${activeFloorId}/bays`,
        {
          ...newBay,
          customHourlyRate: newBay.customHourlyRate !== '' ? Number(newBay.customHourlyRate) : defaultRate,
        }
      );
      setFacilityBays((prev) => [...prev, res.data.data]);
      setNewBay({
        bayNumber: '',
        supportedVehicleType: 'car',
        customHourlyRate: defaultRate,
        isEVCharging: false,
        isMaintenance: false,
      });
      setMessage('New bay slot created successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create bay slot.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBay = async (bayId) => {
    try {
      await API.delete(`/admin/bays/${bayId}`);
      setFacilityBays((prev) => prev.filter((b) => b._id !== bayId));
    } catch (err) {
      setError('Failed to delete bay slot.');
    }
  };

  const handleToggleBayStatus = async (bay, field) => {
    try {
      const updatedValue = !bay[field];
      const res = await API.put(`/admin/bays/${bay._id}`, { [field]: updatedValue });
      setFacilityBays((prev) => prev.map((b) => (b._id === bay._id ? res.data.data : b)));
    } catch (err) {
      setError('Failed to update bay configuration.');
    }
  };

  const handleImageChange = (e, targetForm = 'new') => {
    const file = e.target.files[0];
    if (file) {
      if (targetForm === 'new') {
        setSelectedFile(file);
      } else {
        setEditSelectedFile(file);
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        if (targetForm === 'new') {
          setNewLocation((prev) => ({ ...prev, imageUrl: reader.result }));
        } else {
          setEditingFacility((prev) => ({ ...prev, imageUrl: reader.result }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateLocation = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('name', newLocation.name);
      formData.append('slug', newLocation.slug || newLocation.name.toLowerCase().replace(/\s+/g, '-'));
      formData.append('description', newLocation.description);
      formData.append('amenities', newLocation.amenities);
      formData.append('address[street]', newLocation.street);
      formData.append('address[area]', newLocation.area);
      formData.append('address[city]', 'Kannur');
      formData.append('address[state]', 'Kerala');
      formData.append('pricing[hourlyRate]', Number(newLocation.hourlyRate));
      formData.append('pricing[baseRate]', Number(newLocation.baseRate));
      formData.append('coordinates[lat]', Number(newLocation.lat));
      formData.append('coordinates[lng]', Number(newLocation.lng));

      if (selectedFile) {
        formData.append('imageUrl', selectedFile);
      }

      await API.post('/admin/locations', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setMessage('New parking facility created successfully.');
      setSelectedFile(null);
      setNewLocation({
        name: '',
        slug: '',
        description: '',
        amenities: '24/7 Access, CCTV, Covered Parking',
        street: '',
        area: '',
        hourlyRate: 30,
        baseRate: 20,
        lat: 11.8689,
        lng: 75.3725,
        imageUrl: '',
      });
      fetchAdminData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create facility.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateLocation = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('name', editingFacility.name);
      formData.append('description', editingFacility.description || '');
      
      const amenitiesVal = Array.isArray(editingFacility.amenities)
        ? editingFacility.amenities.join(', ')
        : editingFacility.amenities || '';
      formData.append('amenities', amenitiesVal);

      formData.append('address[street]', editingFacility.address?.street || editingFacility.street || '');
      formData.append('address[area]', editingFacility.address?.area || editingFacility.area || '');
      formData.append('address[city]', 'Kannur');
      formData.append('address[state]', 'Kerala');
      formData.append('pricing[hourlyRate]', Number(editingFacility.pricing?.hourlyRate ?? editingFacility.hourlyRate));
      formData.append('pricing[baseRate]', Number(editingFacility.pricing?.baseRate ?? editingFacility.baseRate));

      if (editSelectedFile) {
        formData.append('imageUrl', editSelectedFile);
      }

      await API.put(`/admin/locations/${editingFacility._id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setMessage('Facility updated successfully.');
      setEditSelectedFile(null);
      setEditingFacility(null);
      fetchAdminData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update facility.');
    } finally {
      setSubmitting(false);
    }
  };

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

  const handleUpdateStaff = async (e) => {
    e.preventDefault();
    if (!editingStaff) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await API.put(`/admin/staff/${editingStaff._id}`, staffForm);
      const updatedStaff = res.data.data;
      
      setStaffList((prev) => prev.map((s) => (s._id === updatedStaff._id ? updatedStaff : s)));
      setMessage(`Staff account for ${staffForm.name} updated successfully.`);
      setEditingStaff(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update staff credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReassignStaff = async (staffId, facilityId) => {
    setSubmitting(true);
    setError(null);
    try {
      await API.patch(`/admin/staff/${staffId}/assign`, { facilityId });
      setMessage('Staff reassigned successfully.');
      setSelectedFacility(null);
      fetchAdminData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reassign staff member.');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Activation State (Deactivating automatically clears facility assignment)
  const handleToggleStaffStatus = async (staff) => {
    const isDeactivating = staff.isActive !== false;
    const actionText = isDeactivating ? 'deactivate and unassign' : 'reactivate';

    if (!window.confirm(`Are you sure you want to ${actionText} "${staff.name}"?`)) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await API.patch(`/admin/staff/${staff._id}/deactivate`);
      const updatedStaff = res.data.data;

      // Real-time update of state lists
      setStaffList((prev) =>
        prev.map((s) => (s._id === staff._id ? updatedStaff : s))
      );

      if (viewingStaff?._id === staff._id) {
        setViewingStaff(updatedStaff);
      }

      setMessage(
        `Staff account for ${staff.name} ${
          updatedStaff.isActive ? 'activated' : 'deactivated & unassigned'
        }.`
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change staff activation status.');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditStaffModal = (staff) => {
    setEditingStaff(staff);
    setStaffForm({
      name: staff.name || '',
      email: staff.email || '',
      phone: staff.phone || '',
      password: '',
    });
  };

  const handleRedirectToStaffDetails = (staffMember) => {
    setSelectedFacility(null);
    setActiveTab('staff');
    setViewingStaff(staffMember);
  };

  const filteredBookings = bookings.filter(
    (b) =>
      b.bookingRef?.toLowerCase().includes(bookingFilter.toLowerCase()) ||
      b.vehicle?.regNumber?.toLowerCase().includes(bookingFilter.toLowerCase()) ||
      b.user?.name?.toLowerCase().includes(bookingFilter.toLowerCase())
  );

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

  const currentFloorBays = facilityBays.filter((b) => b.floor === activeFloorId);

  return (
    <div className="min-h-screen bg-white text-slate-900 pt-28 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 font-body">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-[#0B3D2E] text-[#F2B705] px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" /> Admin Console
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight">Kannur System Control</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">Configure locations, manage floor layouts & bays, assign staff, and monitor live metrics.</p>
        </div>

        <button
          onClick={fetchAdminData}
          className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-900 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#0B3D2E] ${loading ? 'animate-spin' : ''}`} />
          Refresh Console
        </button>
      </div>

      {/* Navigation Tabs */}
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

      {/* TAB 1: System Overview */}
      {activeTab === 'metrics' && (
        <div className="space-y-8">
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

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
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

      {/* TAB 2: Facility Management */}
      {activeTab === 'locations' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Add Facility Form */}
          <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-heading font-bold text-slate-900">Add New Facility</h2>
            <form onSubmit={handleCreateLocation} className="space-y-3 text-xs">
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
                <label className="block font-bold uppercase text-slate-500 mb-1">Facility Description</label>
                <textarea
                  rows={2}
                  placeholder="Overview description for public listing..."
                  value={newLocation.description}
                  onChange={(e) => setNewLocation({ ...newLocation, description: e.target.value })}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-[#0B3D2E]"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-500 mb-1">Feature Points / Amenities (Comma Separated)</label>
                <input
                  type="text"
                  placeholder="e.g. 24/7 Access, CCTV, Covered Parking"
                  value={newLocation.amenities}
                  onChange={(e) => setNewLocation({ ...newLocation, amenities: e.target.value })}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-[#0B3D2E]"
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
                  <div className="mt-2.5 relative rounded-xl overflow-hidden h-28 border border-slate-200">
                    <img src={newLocation.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setNewLocation((prev) => ({ ...prev, imageUrl: '' }));
                      }}
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

          {/* Active Facilities List */}
          <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-heading font-bold text-slate-900">Active Kannur Facilities ({locations.length})</h2>
            <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
              {locations.map((loc) => {
                const assignedStaff = staffList.find(
                  (s) => (s.assignedFacility?._id === loc._id || s.assignedFacility === loc._id) && s.isActive !== false
                );
                const facilityImage = loc.imageUrl || loc.image;

                return (
                  <div key={loc._id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                        <span className="font-bold text-[#0B3D2E] bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-sm">
                          ₹{loc.pricing?.hourlyRate}/hr
                        </span>

                        <button
                          type="button"
                          onClick={() => openStructureManager(loc)}
                          className="px-2.5 py-1.5 bg-[#0B3D2E] hover:bg-[#145C43] text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                          title="Configure Floors & Bays"
                        >
                          <Layers className="w-3.5 h-3.5 text-[#F2B705]" /> Layout
                        </button>

                        <button
  type="button"
  onClick={() => setSelectedFacility({ loc, assignedStaff })}
  className={`p-2 rounded-lg border cursor-pointer transition-all ${
    assignedStaff
      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
      : 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200'
  }`}
  title={assignedStaff ? `Assigned to: ${assignedStaff.name}` : 'No Staff Assigned'}
>
  {assignedStaff ? (
    <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
  ) : (
    <UserX className="w-3.5 h-3.5 text-red-600" />
  )}
</button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditSelectedFile(null);
                            setEditingFacility({
                              ...loc,
                              amenities: Array.isArray(loc.amenities) ? loc.amenities.join(', ') : loc.amenities || '',
                            });
                          }}
                          className="p-2 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 cursor-pointer"
                          title="Edit Facility"
                        >
                          <Edit className="w-3.5 h-3.5 text-blue-600" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLocation(loc._id, loc.name)}
                          className="p-2 bg-white hover:bg-red-50 text-red-600 rounded-lg border border-slate-200 cursor-pointer"
                          title="Delete Facility"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {loc.description && (
                      <p className="text-[11px] text-slate-600 line-clamp-2">{loc.description}</p>
                    )}

                    {loc.amenities && loc.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {loc.amenities.map((item, idx) => (
                          <span key={idx} className="bg-white text-slate-700 px-2 py-0.5 rounded-full border border-slate-200 text-[10px] font-semibold">
                            ✓ {item}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Staff Management & Accounts List */}
      {activeTab === 'staff' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Create Staff Account Form */}
          <div className="lg:col-span-4 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
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
                <label className="block font-bold uppercase text-slate-500 mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+91 9876543210"
                  value={newStaff.phone}
                  onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:border-[#0B3D2E]"
                />
              </div>
              <div>
                <label className="block font-bold uppercase text-slate-500 mb-1">Assigned Facility</label>
                <select
                  value={newStaff.assignedFacility}
                  onChange={(e) => setNewStaff({ ...newStaff, assignedFacility: e.target.value })}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:border-[#0B3D2E]"
                >
                  <option value="">None / Unassigned</option>
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

          {/* Registered Staff Profiles & Accounts List */}
          <div className="lg:col-span-8 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-heading font-bold text-slate-900">Registered System Staff ({staffList.length})</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[580px] overflow-y-auto pr-1">
              {staffList.map((staff) => {
                const assignedLoc = staff.assignedFacility?.name || 'Unassigned';
                const isActive = staff.isActive !== false;

                return (
                  <div key={staff._id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-3 flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full text-white font-bold flex items-center justify-center text-sm shrink-0 ${
                          isActive ? 'bg-[#0B3D2E]' : 'bg-slate-400'
                        }`}>
                          {staff.name?.[0] || 'S'}
                        </div>
                        <div>
                          <span className="font-heading font-bold text-sm text-slate-900 block">{staff.name}</span>
                          <span className="text-slate-500 font-medium flex items-center gap-1">
                            <Mail className="w-3 h-3 text-[#0B3D2E]" /> {staff.email}
                          </span>
                        </div>
                      </div>

                      {/* Dynamic Status Badge */}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {isActive ? 'ACTIVE OPERATOR' : 'DEACTIVATED'}
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-[11px] space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Assigned Facility:</span>
                        <span className="font-bold text-[#0B3D2E]">{isActive ? assignedLoc : 'Unassigned (Disabled)'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Phone:</span>
                        <span className="font-semibold text-slate-800">{staff.phone || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setViewingStaff(staff)}
                        className="flex-1 py-1.5 bg-white hover:bg-slate-100 text-slate-800 font-bold border border-slate-200 rounded-lg text-center cursor-pointer"
                      >
                        View Profile
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditStaffModal(staff)}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-blue-600 font-bold border border-slate-200 rounded-lg cursor-pointer"
                        title="Edit Account Details"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      
                      {/* Dynamic Toggle Action Button */}
                      <button
                        type="button"
                        onClick={() => handleToggleStaffStatus(staff)}
                        className={`px-3 py-1.5 font-bold border rounded-lg transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-white hover:bg-red-50 text-red-600 border-slate-200'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent'
                        }`}
                        title={isActive ? 'Deactivate Staff' : 'Activate Staff'}
                      >
                        {isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

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

      {/* VIEW STAFF PROFILE MODAL */}
      {viewingStaff && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setViewingStaff(null)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-full text-white font-heading font-bold text-xl flex items-center justify-center shadow-md ${
                viewingStaff.isActive !== false ? 'bg-[#0B3D2E]' : 'bg-slate-400'
              }`}>
                {viewingStaff.name?.[0] || 'S'}
              </div>
              <div>
                <h3 className="text-xl font-heading font-extrabold text-slate-900">{viewingStaff.name}</h3>
                <span className="text-xs font-semibold text-[#0B3D2E] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Staff Operator Account
                </span>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#0B3D2E]" /> Email Address:
                </span>
                <span className="font-bold text-slate-900">{viewingStaff.email}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#0B3D2E]" /> Phone Number:
                </span>
                <span className="font-bold text-slate-900">{viewingStaff.phone || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-[#0B3D2E]" /> Assigned Facility:
                </span>
                <span className="font-bold text-[#0B3D2E]">
                  {viewingStaff.isActive !== false ? (viewingStaff.assignedFacility?.name || 'Unassigned') : 'Unassigned (Deactivated)'}
                </span>
              </div>

              {/* Dynamic Account Status Badge */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-500 font-medium">Account Status:</span>
                <span className={`font-bold px-2.5 py-0.5 rounded-full text-[10px] uppercase ${
                  viewingStaff.isActive !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                }`}>
                  {viewingStaff.isActive !== false ? 'ACTIVE OPERATOR' : 'DEACTIVATED'}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setViewingStaff(null);
                  openEditStaffModal(viewingStaff);
                }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-all border border-slate-200 cursor-pointer"
              >
                Edit Account
              </button>

              {/* Dynamic Toggle Action Button */}
              <button
                type="button"
                onClick={() => handleToggleStaffStatus(viewingStaff)}
                className={`flex-1 py-2.5 font-bold rounded-xl text-xs transition-all shadow-sm cursor-pointer ${
                  viewingStaff.isActive !== false
                    ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                    : 'bg-[#0B3D2E] hover:bg-[#145C43] text-white'
                }`}
              >
                {viewingStaff.isActive !== false ? 'Deactivate Account' : 'Activate Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT STAFF CREDENTIALS MODAL */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 sm:p-8 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setEditingStaff(null)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-heading font-extrabold text-slate-900">Edit Staff Account</h3>

            <form onSubmit={handleUpdateStaff} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-500 mb-1">Staff Name</label>
                <input
                  type="text"
                  value={staffForm.name}
                  onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:border-[#0B3D2E]"
                  required
                />
              </div>
              <div>
                <label className="block font-bold uppercase text-slate-500 mb-1">Email Address</label>
                <input
                  type="email"
                  value={staffForm.email}
                  onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:border-[#0B3D2E]"
                  required
                />
              </div>
              <div>
                <label className="block font-bold uppercase text-slate-500 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={staffForm.phone}
                  onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:border-[#0B3D2E]"
                />
              </div>
              <div>
                <label className="block font-bold uppercase text-slate-500 mb-1">Reset Password (Optional)</label>
                <input
                  type="password"
                  placeholder="Leave blank to keep existing password"
                  value={staffForm.password}
                  onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:border-[#0B3D2E]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-[#0B3D2E] hover:bg-[#145C43] text-white font-bold rounded-xl mt-2 text-xs cursor-pointer shadow-sm active:scale-95 transition-all"
              >
                {submitting ? 'Saving Credentials...' : 'Update Staff Account'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* FLOOR & BAY STRUCTURE BUILDER MODAL */}
      {structureFacility && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-4xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[92vh] flex flex-col">
            <button
              onClick={() => setStructureFacility(null)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#0B3D2E] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Facility Structure Builder
              </span>
              <h3 className="text-xl font-heading font-extrabold text-slate-900 mt-1">{structureFacility.name}</h3>
              <p className="text-xs text-slate-500 font-medium">Add custom floors and configure individual slot bays with vehicle types and custom hourly rates.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 overflow-hidden">
              <div className="md:col-span-4 border-r border-slate-200 pr-4 flex flex-col space-y-4">
                <form onSubmit={handleCreateFloor} className="space-y-2 text-xs">
                  <label className="block font-bold text-slate-700 uppercase text-[10px]">Add Floor Level</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Ground Floor / Level 1"
                      value={newFloorName}
                      onChange={(e) => setNewFloorName(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                      required
                    />
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-3 bg-[#0B3D2E] hover:bg-[#145C43] text-white rounded-xl font-bold text-xs cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </form>

                <div className="space-y-2 flex-1 overflow-y-auto pr-1">
                  <label className="block font-bold text-slate-400 uppercase text-[10px]">Configured Floors ({facilityFloors.length})</label>
                  {facilityFloors.map((fl) => {
                    const count = facilityBays.filter((b) => b.floor === fl._id).length;
                    return (
                      <div
                        key={fl._id}
                        onClick={() => setActiveFloorId(fl._id)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all text-xs ${
                          activeFloorId === fl._id
                            ? 'bg-[#0B3D2E] text-white border-[#0B3D2E] shadow-sm font-bold'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                        }`}
                      >
                        <div>
                          <span>{fl.name}</span>
                          <span className="block text-[10px] opacity-75">{count} Bays configured</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFloor(fl._id, fl.name);
                          }}
                          className="p-1 hover:bg-red-500/20 text-slate-400 hover:text-red-500 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="md:col-span-8 flex flex-col space-y-4 overflow-hidden">
                {activeFloorId ? (
                  <>
                    <form onSubmit={handleCreateBay} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 text-xs">
                      <span className="font-bold text-slate-900 block">Add Bay to Active Floor</span>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Bay Code</label>
                          <input
                            type="text"
                            placeholder="G-01"
                            value={newBay.bayNumber}
                            onChange={(e) => setNewBay({ ...newBay, bayNumber: e.target.value.toUpperCase() })}
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg font-bold uppercase text-xs"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Vehicle Type</label>
                          <select
                            value={newBay.supportedVehicleType}
                            onChange={(e) => setNewBay({ ...newBay, supportedVehicleType: e.target.value })}
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                          >
                            <option value="car">Car / SUV</option>
                            <option value="bike">Two-Wheeler</option>
                            <option value="ev">EV Vehicle</option>
                            <option value="heavy">Heavy Vehicle</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                            Custom Rate (₹/hr)
                          </label>
                          <input
                            type="number"
                            placeholder={`Default (₹${structureFacility?.pricing?.hourlyRate ?? structureFacility?.hourlyRate ?? 30})`}
                            value={newBay.customHourlyRate}
                            onChange={(e) => setNewBay({ ...newBay, customHourlyRate: e.target.value })}
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 outline-none focus:border-[#0B3D2E]"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-semibold">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newBay.isEVCharging}
                            onChange={(e) => setNewBay({ ...newBay, isEVCharging: e.target.checked })}
                            className="rounded accent-[#0B3D2E]"
                          />
                          <span>EV Charger Port</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-amber-700">
                          <input
                            type="checkbox"
                            checked={newBay.isMaintenance}
                            onChange={(e) => setNewBay({ ...newBay, isMaintenance: e.target.checked })}
                            className="rounded accent-amber-600"
                          />
                          <span>Maintenance Lock</span>
                        </label>
                        <button
                          type="submit"
                          disabled={submitting}
                          className="ml-auto px-4 py-1.5 bg-[#0B3D2E] hover:bg-[#145C43] text-white font-bold rounded-lg text-xs cursor-pointer shadow-sm"
                        >
                          Save Bay Slot
                        </button>
                      </div>
                    </form>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                      <label className="block font-bold text-slate-400 uppercase text-[10px]">
                        Configured Bay Slots ({currentFloorBays.length})
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {currentFloorBays.map((bay) => (
                          <div
                            key={bay._id}
                            className={`p-3 rounded-xl border text-xs flex flex-col justify-between space-y-2 ${
                              bay.isMaintenance
                                ? 'bg-amber-50 border-amber-300 text-amber-900'
                                : 'bg-white border-slate-200 text-slate-800 shadow-sm'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-heading font-extrabold text-sm">{bay.bayNumber}</span>
                              <div className="flex items-center gap-1">
                                {bay.isEVCharging && <Zap className="w-3.5 h-3.5 text-[#F2B705]" />}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBay(bay._id)}
                                  className="text-slate-400 hover:text-red-600 p-0.5 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                              <span className="uppercase">{bay.supportedVehicleType}</span>
                              <span className="text-[#0B3D2E]">
                                {bay.customHourlyRate ? `₹${bay.customHourlyRate}/hr` : 'Std Rate'}
                              </span>
                            </div>

                            <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between">
                              <button
                                type="button"
                                onClick={() => handleToggleBayStatus(bay, 'isMaintenance')}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                                  bay.isMaintenance
                                    ? 'bg-amber-200 text-amber-900'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                }`}
                              >
                                {bay.isMaintenance ? 'Under Maintenance' : 'Active Bay'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium border border-dashed border-slate-200 rounded-2xl p-8">
                    Select or create a floor on the left panel to start adding bay slots.
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* EDIT FACILITY MODAL */}
      {editingFacility && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 sm:p-8 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setEditSelectedFile(null);
                setEditingFacility(null);
              }}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full cursor-pointer"
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
                <label className="block font-bold uppercase text-slate-500 mb-1">Facility Description</label>
                <textarea
                  rows={3}
                  value={editingFacility.description || ''}
                  onChange={(e) => setEditingFacility({ ...editingFacility, description: e.target.value })}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                  placeholder="Overview description..."
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-500 mb-1">Feature Points / Amenities (Comma Separated)</label>
                <input
                  type="text"
                  value={editingFacility.amenities || ''}
                  onChange={(e) => setEditingFacility({ ...editingFacility, amenities: e.target.value })}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                  placeholder="24/7 Access, CCTV, Covered Parking"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-500 mb-1">Facility Cover Image</label>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-500 mb-1">Base Rate (₹)</label>
                  <input
                    type="number"
                    value={editingFacility.pricing?.baseRate ?? editingFacility.baseRate ?? 0}
                    onChange={(e) => setEditingFacility({ ...editingFacility, baseRate: e.target.value })}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase text-slate-500 mb-1">Hourly Rate (₹)</label>
                  <input
                    type="number"
                    value={editingFacility.pricing?.hourlyRate ?? editingFacility.hourlyRate ?? 30}
                    onChange={(e) => setEditingFacility({ ...editingFacility, hourlyRate: e.target.value })}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-[#0B3D2E] hover:bg-[#145C43] text-white font-bold rounded-xl mt-2 text-sm shadow-sm active:scale-95 cursor-pointer transition-all"
              >
                {submitting ? 'Updating...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* FACILITY STAFF REASSIGNMENT & REDIRECT MODAL */}
      {selectedFacility && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedFacility(null)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full cursor-pointer"
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

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => handleRedirectToStaffDetails(selectedFacility.assignedStaff)}
                    className="w-full py-2.5 bg-[#0B3D2E] hover:bg-[#145C43] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    <User className="w-4 h-4 text-[#F2B705]" /> Show Staff Details in Profile
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500 font-medium space-y-2">
                <UserCheck className="w-6 h-6 text-slate-400 mx-auto" />
                <p>No active staff operator is currently assigned to this facility.</p>
              </div>
            )}

            <div className="space-y-3 pt-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Reassign Active Staff Operator
              </label>
              <div className="flex gap-2">
                <select
  value={reassignStaffId}
  onChange={(e) => setReassignStaffId(e.target.value)}
  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-[#0B3D2E]"
>
  <option value="">Select Active Staff Member...</option>
  {activeStaffList.map((s) => {
    const isAssignedToThis = s.assignedFacility?._id === selectedFacility?.loc?._id || s.assignedFacility === selectedFacility?.loc?._id;
    const isAssignedToOther = s.assignedFacility && !isAssignedToThis;

    let labelSuffix = '';
    if (isAssignedToThis) {
      labelSuffix = ' — (Currently Assigned Here)';
    } else if (isAssignedToOther) {
      labelSuffix = ' — (Already Assigned)';
    }

    return (
      <option key={s._id} value={s._id}>
        {s.name} ({s.email}){labelSuffix}
      </option>
    );
  })}
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