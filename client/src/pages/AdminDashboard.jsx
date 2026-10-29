import { useState, useEffect, useMemo } from 'react';
import API from '../api/axios';
import {
  ShieldCheck, Users, RefreshCw, AlertCircle, CheckCircle2, Search, Building,
  Image as ImageIcon, UserCheck, UserX, X, Edit, Trash2, PieChart as PieIcon, BarChart3,
  Layers, Plus, Zap, Mail, Phone, User, Calendar, Clock, Banknote, ShieldAlert, Activity
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
  const [activityLogs, setActivityLogs] = useState([]);

  // Shift & Facility Assignment Modal
  const [assigningShiftFacility, setAssigningShiftFacility] = useState(null);
  const [shift1StaffId, setShift1StaffId] = useState('');
  const [shift2StaffId, setShift2StaffId] = useState('');

  // Modals & Structure States
  const [editingFacility, setEditingFacility] = useState(null);
  const [structureFacility, setStructureFacility] = useState(null);
  const [viewingStaff, setViewingStaff] = useState(null);
  const [editingStaff, setEditingStaff] = useState(null);

  const [facilityFloors, setFacilityFloors] = useState([]);
  const [facilityBays, setFacilityBays] = useState([]);
  const [activeFloorId, setActiveFloorId] = useState(null);

  const [newFloorName, setNewFloorName] = useState('');
  const [newFloorLevel, setNewFloorLevel] = useState(0);
  const [newBay, setNewBay] = useState({
    bayNumber: '',
    supportedVehicleType: 'car',
    customHourlyRate: '',
    isEVCharging: false,
    isMaintenance: false,
  });

  const [staffForm, setStaffForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [newLocation, setNewLocation] = useState({
    name: '', slug: '', description: '', amenities: '24/7 Access, CCTV, Covered Parking',
    street: '', area: '', hourlyRate: 30, baseRate: 20, lat: 11.8689, lng: 75.3725, imageUrl: '',
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [editSelectedFile, setEditSelectedFile] = useState(null);
  const [newStaff, setNewStaff] = useState({
    name: '', email: '', password: '', phone: '', assignedFacility: '', shiftSlot: 'shift_1',
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const [bookingFilter, setBookingFilter] = useState('');
  const [selectedDateFilter, setSelectedDateFilter] = useState('');

  const activeStaffList = useMemo(() => staffList.filter((s) => s.isActive !== false), [staffList]);

  const fetchAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [mRes, lRes, bRes, sRes, actRes] = await Promise.all([
        API.get('/admin/metrics'),
        API.get('/admin/locations-shifts'),
        API.get('/admin/bookings'),
        API.get('/admin/staff'),
        API.get('/admin/staff-activity'),
      ]);
      setMetrics(mRes.data.data);
      setLocations(lRes.data.data || []);
      setBookings(bRes.data.data || []);
      setStaffList(sRes.data.data || []);
      setActivityLogs(actRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch admin dashboard records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const openShiftAssignModal = (facility) => {
    setAssigningShiftFacility(facility);
    setShift1StaffId(facility.shift1Staff?._id || '');
    setShift2StaffId(facility.shift2Staff?._id || '');
  };

  const handleSaveShiftAssignment = async (e) => {
    e.preventDefault();
    if (!assigningShiftFacility) return;
    setSubmitting(true);
    setError(null);

    try {
      // Assign Shift 1 operator
      if (shift1StaffId) {
        await API.patch(`/admin/staff/${shift1StaffId}/assign-shift`, {
          facilityId: assigningShiftFacility._id,
          shiftSlot: 'shift_1',
        });
      }

      // Assign Shift 2 operator
      if (shift2StaffId) {
        await API.patch(`/admin/staff/${shift2StaffId}/assign-shift`, {
          facilityId: assigningShiftFacility._id,
          shiftSlot: 'shift_2',
        });
      }

      setMessage(`Dual shifts updated for ${assigningShiftFacility.name}.`);
      setAssigningShiftFacility(null);
      fetchAdminData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign shifts.');
    } finally {
      setSubmitting(false);
    }
  };

  const openStructureManager = async (facility) => {
    setStructureFacility(facility);
    setLoading(true);
    const defaultRate = facility.pricing?.hourlyRate ?? 30;
    setNewBay((prev) => ({ ...prev, customHourlyRate: defaultRate }));

    try {
      const res = await API.get(`/admin/locations/${facility._id}/structure`);
      const fls = res.data.data.floors || [];
      setFacilityFloors(fls);
      setFacilityBays(res.data.data.bays || []);
      setActiveFloorId(fls[0]?._id || null);
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
      setFacilityFloors((prev) => [...prev, res.data.data]);
      setActiveFloorId(res.data.data._id);
      setNewFloorName('');
      setNewFloorLevel((prev) => prev + 1);
      setMessage(`Floor "${res.data.data.name}" created.`);
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
      setMessage(`Floor "${floorName}" deleted.`);
    } catch (err) {
      setError('Failed to delete floor.');
    }
  };

  const handleCreateBay = async (e) => {
    e.preventDefault();
    if (!structureFacility || !activeFloorId || !newBay.bayNumber.trim()) return;
    setSubmitting(true);
    const defaultRate = structureFacility.pricing?.hourlyRate ?? 30;

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
      setMessage('Bay slot created successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create bay.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBay = async (bayId) => {
    try {
      await API.delete(`/admin/bays/${bayId}`);
      setFacilityBays((prev) => prev.filter((b) => b._id !== bayId));
    } catch (err) {
      setError('Failed to delete bay.');
    }
  };

  const handleToggleBayStatus = async (bay, field) => {
    try {
      const updatedValue = !bay[field];
      const res = await API.put(`/admin/bays/${bay._id}`, { [field]: updatedValue });
      setFacilityBays((prev) => prev.map((b) => (b._id === bay._id ? res.data.data : b)));
    } catch (err) {
      setError('Failed to update bay.');
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

      if (selectedFile) formData.append('imageUrl', selectedFile);

      await API.post('/admin/locations', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMessage('New parking facility created successfully.');
      setSelectedFile(null);
      setNewLocation({
        name: '', slug: '', description: '', amenities: '24/7 Access, CCTV, Covered Parking',
        street: '', area: '', hourlyRate: 30, baseRate: 20, lat: 11.8689, lng: 75.3725, imageUrl: '',
      });
      fetchAdminData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create facility.');
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
      setMessage('Staff operator account created.');
      setNewStaff({ name: '', email: '', password: '', phone: '', assignedFacility: locations[0]?._id || '', shiftSlot: 'shift_1' });
      fetchAdminData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create staff account.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStaffStatus = async (staff) => {
    const isDeactivating = staff.isActive !== false;
    const actionText = isDeactivating ? 'deactivate and unassign' : 'reactivate';
    if (!window.confirm(`Are you sure you want to ${actionText} "${staff.name}"?`)) return;

    setSubmitting(true);
    try {
      const res = await API.patch(`/admin/staff/${staff._id}/deactivate`);
      setStaffList((prev) => prev.map((s) => (s._id === staff._id ? res.data.data : s)));
      setMessage(`Staff account for ${staff.name} updated.`);
    } catch (err) {
      setError('Failed to update staff status.');
    } finally {
      setSubmitting(false);
    }
  };

  const getDisplayAmount = (b) => {
    if (b.paymentStatus === 'paid' && typeof b.amountCollectedPaise === 'number' && b.amountCollectedPaise > 0) {
      return b.amountCollectedPaise / 100;
    }
    if (b.pricingSnapshot?.totalAmountPaise) {
      return b.pricingSnapshot.totalAmountPaise / 100;
    }
    return b.pricingSnapshot?.totalAmount || 0;
  };

  const getDateKey = (dateStr) => {
    if (!dateStr) return 'Unscheduled';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 'Unscheduled' : d.toISOString().split('T')[0];
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const matchesSearch =
        b.bookingRef?.toLowerCase().includes(bookingFilter.toLowerCase()) ||
        b.vehicle?.regNumber?.toLowerCase().includes(bookingFilter.toLowerCase()) ||
        b.user?.name?.toLowerCase().includes(bookingFilter.toLowerCase()) ||
        b.location?.name?.toLowerCase().includes(bookingFilter.toLowerCase());

      const bookingDateKey = getDateKey(b.startTime);
      const matchesDate = selectedDateFilter ? bookingDateKey === selectedDateFilter : true;
      return matchesSearch && matchesDate;
    });
  }, [bookings, bookingFilter, selectedDateFilter]);

  const groupedBookings = useMemo(() => {
    const groups = {};
    filteredBookings.forEach((b) => {
      const key = getDateKey(b.startTime);
      if (!groups[key]) groups[key] = [];
      groups[key].push(b);
    });

    return Object.keys(groups)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map((dateKey) => ({
        dateKey,
        formattedDate: dateKey === 'Unscheduled' ? 'Unscheduled' : new Date(`${dateKey}T00:00:00`).toLocaleDateString('en-IN', {
          weekday: 'long', day: 'numeric', month: 'short', year: 'numeric',
        }),
        items: groups[dateKey],
        totalDayRevenue: groups[dateKey].reduce((sum, item) => sum + getDisplayAmount(item), 0),
      }));
  }, [filteredBookings]);

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
      .reduce((sum, b) => sum + getDisplayAmount(b), 0);
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
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight">Kannur Smart Parking Core</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">Dual-shift staff synchronization, floor bay layouts, financial telemetry, and live audit tracking.</p>
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
      <div className="flex border-b border-slate-200 gap-6 text-xs sm:text-sm font-bold uppercase tracking-wider overflow-x-auto">
        <button
          onClick={() => setActiveTab('metrics')}
          className={`pb-3 transition-colors cursor-pointer whitespace-nowrap ${activeTab === 'metrics' ? 'border-b-2 border-[#0B3D2E] text-[#0B3D2E]' : 'text-slate-500 hover:text-slate-900'}`}
        >
          System Overview
        </button>
        <button
          onClick={() => setActiveTab('locations')}
          className={`pb-3 transition-colors cursor-pointer whitespace-nowrap ${activeTab === 'locations' ? 'border-b-2 border-[#0B3D2E] text-[#0B3D2E]' : 'text-slate-500 hover:text-slate-900'}`}
        >
          Facilities & Shifts
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`pb-3 transition-colors cursor-pointer whitespace-nowrap ${activeTab === 'staff' ? 'border-b-2 border-[#0B3D2E] text-[#0B3D2E]' : 'text-slate-500 hover:text-slate-900'}`}
        >
          Staff Directory
        </button>
        <button
          onClick={() => setActiveTab('shifts_audit')}
          className={`pb-3 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'shifts_audit' ? 'border-b-2 border-[#0B3D2E] text-[#0B3D2E]' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <Activity className="w-3.5 h-3.5" /> Shift Handover & Audit
        </button>
        <button
          onClick={() => setActiveTab('bookings')}
          className={`pb-3 transition-colors cursor-pointer whitespace-nowrap ${activeTab === 'bookings' ? 'border-b-2 border-[#0B3D2E] text-[#0B3D2E]' : 'text-slate-500 hover:text-slate-900'}`}
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

      {/* TAB 2: Facilities with Dual-Shift Staff Slots */}
      {activeTab === 'locations' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
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
                <label className="block font-bold uppercase text-slate-500 mb-1">Feature Points / Amenities</label>
                <input
                  type="text"
                  placeholder="24/7 Access, CCTV, Covered Parking"
                  value={newLocation.amenities}
                  onChange={(e) => setNewLocation({ ...newLocation, amenities: e.target.value })}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-[#0B3D2E]"
                />
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

          <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-heading font-bold text-slate-900">Active Facilities & Dual Shift Roster ({locations.length})</h2>
            <div className="space-y-3.5 max-h-[620px] overflow-y-auto pr-1">
              {locations.map((loc) => {
                const isPayyambalam = loc.name.toLowerCase().includes('payyambalam');
                const shiftInfo = loc.shiftInfo || { activeSlot: 'shift_1', label: 'Shift 1 Active' };

                return (
                  <div key={loc._id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-heading font-bold text-sm text-slate-900">{loc.name}</span>
                          {isPayyambalam ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[9px] uppercase tracking-wider">
                              05:00 - 22:00
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold text-[9px] uppercase tracking-wider">
                              24/7 Multi-Shift
                            </span>
                          )}
                        </div>
                        <span className="text-slate-500 font-medium block mt-0.5">{loc.address?.street}, {loc.address?.area}</span>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => openStructureManager(loc)}
                          className="px-2.5 py-1.5 bg-[#0B3D2E] hover:bg-[#145C43] text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                        >
                          <Layers className="w-3.5 h-3.5 text-[#F2B705]" /> Layout
                        </button>

                        <button
                          type="button"
                          onClick={() => openShiftAssignModal(loc)}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-[#0B3D2E] border border-slate-200 rounded-lg font-bold text-[11px] flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                        >
                          <Users className="w-3.5 h-3.5 text-[#0B3D2E]" /> Manage Shifts
                        </button>
                      </div>
                    </div>

                    {/* Dual Shift Assignment Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-200 text-[11px]">
                      {/* Shift 1 Slot */}
                      <div className={`p-2.5 rounded-lg border ${shiftInfo.activeSlot === 'shift_1' ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-400' : 'bg-white border-slate-200'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-700">
                            {isPayyambalam ? 'Shift 1 (05:00-13:30)' : 'Shift 1 (06:00-18:00)'}
                          </span>
                          {shiftInfo.activeSlot === 'shift_1' && (
                            <span className="px-1.5 py-0.2 bg-emerald-600 text-white font-extrabold rounded text-[9px] uppercase animate-pulse">
                              ON CLOCK
                            </span>
                          )}
                        </div>
                        {loc.shift1Staff ? (
                          <span className="font-bold text-[#0B3D2E] block">{loc.shift1Staff.name} ({loc.shift1Staff.email})</span>
                        ) : (
                          <span className="text-red-500 font-semibold block">⚠️ No Staff Assigned</span>
                        )}
                      </div>

                      {/* Shift 2 Slot */}
                      <div className={`p-2.5 rounded-lg border ${shiftInfo.activeSlot === 'shift_2' ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-400' : 'bg-white border-slate-200'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-700">
                            {isPayyambalam ? 'Shift 2 (13:30-22:00)' : 'Shift 2 (18:00-06:00)'}
                          </span>
                          {shiftInfo.activeSlot === 'shift_2' && (
                            <span className="px-1.5 py-0.2 bg-emerald-600 text-white font-extrabold rounded text-[9px] uppercase animate-pulse">
                              ON CLOCK
                            </span>
                          )}
                        </div>
                        {loc.shift2Staff ? (
                          <span className="font-bold text-[#0B3D2E] block">{loc.shift2Staff.name} ({loc.shift2Staff.email})</span>
                        ) : (
                          <span className="text-red-500 font-semibold block">⚠️ No Staff Assigned</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Staff Directory */}
      {activeTab === 'staff' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-heading font-bold text-slate-900">Register Staff Operator</h2>
            <form onSubmit={handleCreateStaff} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-500 mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={newStaff.name}
                  onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold"
                  required
                />
              </div>
              <div>
                <label className="block font-bold uppercase text-slate-500 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="staff@parkora.in"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold"
                  required
                />
              </div>
              <div>
                <label className="block font-bold uppercase text-slate-500 mb-1">Password</label>
                <input
                  type="password"
                  value={newStaff.password}
                  onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold"
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
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold uppercase text-slate-500 mb-1">Assigned Facility</label>
                  <select
                    value={newStaff.assignedFacility}
                    onChange={(e) => setNewStaff({ ...newStaff, assignedFacility: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="">Unassigned</option>
                    {locations.map((loc) => (
                      <option key={loc._id} value={loc._id}>{loc.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold uppercase text-slate-500 mb-1">Shift Slot</label>
                  <select
                    value={newStaff.shiftSlot}
                    onChange={(e) => setNewStaff({ ...newStaff, shiftSlot: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="shift_1">Shift 1 (Day)</option>
                    <option value="shift_2">Shift 2 (Night/Eve)</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-[#0B3D2E] hover:bg-[#145C43] text-white font-bold rounded-xl mt-2 cursor-pointer shadow-sm text-sm"
              >
                {submitting ? 'Registering...' : 'Create Staff Account'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-8 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-heading font-bold text-slate-900">Registered Personnel ({staffList.length})</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[580px] overflow-y-auto pr-1">
              {staffList.map((staff) => {
                const assignedLoc = staff.assignedFacility?.name || 'Unassigned';
                const isActive = staff.isActive !== false;

                return (
                  <div key={staff._id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-3 flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full text-white font-bold flex items-center justify-center text-sm shrink-0 ${isActive ? 'bg-[#0B3D2E]' : 'bg-slate-400'}`}>
                          {staff.name?.[0] || 'S'}
                        </div>
                        <div>
                          <span className="font-heading font-bold text-sm text-slate-900 block">{staff.name}</span>
                          <span className="text-slate-500 font-medium flex items-center gap-1">
                            <Mail className="w-3 h-3 text-[#0B3D2E]" /> {staff.email}
                          </span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {isActive ? 'ACTIVE' : 'DEACTIVATED'}
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-[11px] space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Facility:</span>
                        <span className="font-bold text-[#0B3D2E]">{isActive ? assignedLoc : 'Unassigned'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Designated Shift:</span>
                        <span className="font-extrabold uppercase text-slate-800">{staff.shiftSlot ? staff.shiftSlot.replace('_', ' ') : 'None'}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleToggleStaffStatus(staff)}
                        className={`w-full py-1.5 font-bold border rounded-lg transition-colors cursor-pointer text-xs ${
                          isActive ? 'bg-white hover:bg-red-50 text-red-600 border-slate-200' : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {isActive ? 'Deactivate Operator' : 'Activate Operator'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Shift Handover & Attendance Audit Log */}
      {activeTab === 'shifts_audit' && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-heading font-bold text-slate-900">Live Shift Status & Audit Verification Stream</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Tracks automatic on-duty logins, handovers between equal shift blocks, and real-time verification at gates.
              </p>
            </div>
            <button
              onClick={fetchAdminData}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-all cursor-pointer self-start sm:self-auto"
            >
              Refresh Audit Feed
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-900">
              <thead className="bg-slate-50 border-b border-slate-200 uppercase text-[10px] font-bold text-slate-500">
                <tr>
                  <th className="p-3.5">Timestamp (IST)</th>
                  <th className="p-3.5">Staff Operator</th>
                  <th className="p-3.5">Facility Location</th>
                  <th className="p-3.5">Duty Shift</th>
                  <th className="p-3.5">Event Action</th>
                  <th className="p-3.5">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {activityLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                      No shift handover or gate activity recorded yet today.
                    </td>
                  </tr>
                ) : (
                  activityLogs.map((log) => {
                    const actionBadge =
                      log.actionType === 'shift_start_login'
                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                        : log.actionType === 'qr_check_in'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200';

                    return (
                      <tr key={log._id} className="hover:bg-slate-50/70">
                        <td className="p-3.5 font-mono text-slate-600 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                        </td>
                        <td className="p-3.5 font-bold text-slate-900 whitespace-nowrap">
                          {log.staff?.name || 'Operator'}
                          <span className="block text-[10px] font-normal text-slate-400">{log.staff?.email}</span>
                        </td>
                        <td className="p-3.5 font-medium text-slate-700 whitespace-nowrap">
                          {log.facility?.name}
                        </td>
                        <td className="p-3.5 font-extrabold uppercase text-[#0B3D2E] whitespace-nowrap">
                          {log.shiftSlot?.replace('_', ' ')}
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase ${actionBadge}`}>
                            {log.actionType?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-600 font-medium max-w-xs truncate">
                          {log.details || 'Routine gate operation'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: Master Bookings List */}
      {activeTab === 'bookings' && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-heading font-bold text-slate-900">Master Reservations Ledger</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Showing {filteredBookings.length} total reservations across {groupedBookings.length} scheduled dates.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                <Calendar className="w-3.5 h-3.5 text-[#0B3D2E]" />
                <input
                  type="date"
                  value={selectedDateFilter}
                  onChange={(e) => setSelectedDateFilter(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-900 outline-none cursor-pointer"
                />
                {selectedDateFilter && (
                  <button type="button" onClick={() => setSelectedDateFilter('')} className="p-1 rounded-full text-slate-400 hover:text-slate-700">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by ref, vehicle, user..."
                  value={bookingFilter}
                  onChange={(e) => setBookingFilter(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-[#0B3D2E]"
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {groupedBookings.map((group) => (
              <div key={group.dateKey} className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-[#0B3D2E] text-white rounded-lg"><Calendar className="w-3.5 h-3.5" /></span>
                    <span className="font-heading font-extrabold text-sm text-slate-900">{group.formattedDate}</span>
                    <span className="bg-white border border-slate-200 text-slate-600 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                      {group.items.length} {group.items.length === 1 ? 'Booking' : 'Bookings'}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-600">
                    Day Total: <strong className="text-[#0B3D2E] font-heading font-extrabold text-sm">₹{group.totalDayRevenue}</strong>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-900">
                    <thead className="bg-white border-b border-slate-200 uppercase text-[10px] font-bold text-slate-400">
                      <tr>
                        <th className="p-3.5">Booking Ref</th>
                        <th className="p-3.5">Customer</th>
                        <th className="p-3.5">Facility & Slot</th>
                        <th className="p-3.5">Vehicle Reg</th>
                        <th className="p-3.5">Scheduled Interval</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {group.items.map((b) => (
                        <tr key={b._id} className="hover:bg-slate-50/70">
                          <td className="p-3.5 font-mono font-bold text-[#0B3D2E] whitespace-nowrap">{b.bookingRef}</td>
                          <td className="p-3.5 font-medium whitespace-nowrap">
                            <span className="font-bold text-slate-900 block">{b.user?.name || 'Customer'}</span>
                            <span className="text-[11px] text-slate-400 font-normal">{b.user?.email}</span>
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            <span className="font-semibold text-slate-900 block">{b.location?.name}</span>
                            <span className="text-[11px] text-[#0B3D2E] font-bold">Bay {b.bay?.bayNumber || 'N/A'}</span>
                          </td>
                          <td className="p-3.5 font-mono uppercase font-bold text-slate-900 whitespace-nowrap">{b.vehicle?.regNumber}</td>
                          <td className="p-3.5 whitespace-nowrap font-medium text-slate-700">
                            {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} – {new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} IST
                          </td>
                          <td className="p-3.5 whitespace-nowrap font-extrabold uppercase text-[#145C43]">{b.status}</td>
                          <td className="p-3.5 text-right font-heading font-extrabold text-sm text-[#0B3D2E] whitespace-nowrap">₹{getDisplayAmount(b)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DUAL SHIFT REASSIGNMENT MODAL */}
      {assigningShiftFacility && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setAssigningShiftFacility(null)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#0B3D2E] block">Shift Roster Management</span>
              <h3 className="text-lg font-heading font-extrabold text-slate-900">{assigningShiftFacility.name}</h3>
              <p className="text-xs text-slate-500 mt-1">
                Assign two operators to divide the operating window into equal duty shifts.
              </p>
            </div>

            <form onSubmit={handleSaveShiftAssignment} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-700 mb-1">
                  {assigningShiftFacility.name.toLowerCase().includes('payyambalam')
                    ? 'Shift 1: 05:00 – 13:30 IST'
                    : 'Shift 1: 06:00 – 18:00 IST'}
                </label>
                <select
                  value={shift1StaffId}
                  onChange={(e) => setShift1StaffId(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-[#0B3D2E]"
                >
                  <option value="">Unassigned Operator</option>
                  {activeStaffList.map((s) => (
                    <option key={s._id} value={s._id}>{s.name} ({s.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-700 mb-1">
                  {assigningShiftFacility.name.toLowerCase().includes('payyambalam')
                    ? 'Shift 2: 13:30 – 22:00 IST'
                    : 'Shift 2: 18:00 – 06:00 IST'}
                </label>
                <select
                  value={shift2StaffId}
                  onChange={(e) => setShift2StaffId(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-[#0B3D2E]"
                >
                  <option value="">Unassigned Operator</option>
                  {activeStaffList.map((s) => (
                    <option key={s._id} value={s._id}>{s.name} ({s.email})</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-[#0B3D2E] hover:bg-[#145C43] text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm active:scale-95 transition-all"
              >
                {submitting ? 'Updating Shifts...' : 'Save Shift Configuration'}
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 overflow-hidden">
              <div className="md:col-span-4 border-r border-slate-200 pr-4 flex flex-col space-y-4">
                <form onSubmit={handleCreateFloor} className="space-y-2 text-xs">
                  <label className="block font-bold text-slate-700 uppercase text-[10px]">Add Floor Level</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Ground Floor"
                      value={newFloorName}
                      onChange={(e) => setNewFloorName(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                      required
                    />
                    <button type="submit" disabled={submitting} className="px-3 bg-[#0B3D2E] text-white rounded-xl font-bold text-xs">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </form>

                <div className="space-y-2 flex-1 overflow-y-auto pr-1">
                  {facilityFloors.map((fl) => (
                    <div
                      key={fl._id}
                      onClick={() => setActiveFloorId(fl._id)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer text-xs ${
                        activeFloorId === fl._id ? 'bg-[#0B3D2E] text-white font-bold' : 'bg-slate-50 text-slate-800'
                      }`}
                    >
                      <span>{fl.name}</span>
                      <button type="button" onClick={() => handleDeleteFloor(fl._id, fl.name)} className="p-1 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="md:col-span-8 flex flex-col space-y-4 overflow-hidden">
                {activeFloorId && (
                  <form onSubmit={handleCreateBay} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 text-xs">
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Bay Code (e.g. G-01)"
                        value={newBay.bayNumber}
                        onChange={(e) => setNewBay({ ...newBay, bayNumber: e.target.value.toUpperCase() })}
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg font-bold"
                        required
                      />
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
                      <button type="submit" disabled={submitting} className="px-4 py-1.5 bg-[#0B3D2E] text-white font-bold rounded-lg text-xs">
                        Add Bay
                      </button>
                    </div>
                  </form>
                )}

                <div className="flex-1 overflow-y-auto space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {currentFloorBays.map((bay) => (
                      <div key={bay._id} className="p-3 rounded-xl border text-xs bg-white flex justify-between items-center">
                        <div>
                          <span className="font-heading font-extrabold">{bay.bayNumber}</span>
                          <span className="text-[10px] text-slate-400 block uppercase">{bay.supportedVehicleType}</span>
                        </div>
                        <button type="button" onClick={() => handleDeleteBay(bay._id)} className="text-slate-400 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}