import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Mail, Phone, Car, ShieldCheck, MapPin, Building, 
  Calendar, CheckCircle2, Edit3, Save, X, AlertCircle, Clock 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    defaultVehicle: user?.defaultVehicle || '',
  });

  const [bookingCount, setBookingCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Redirect Admin if they stumble upon profile page
  useEffect(() => {
    if (user?.role === 'admin') {
      navigate('/admin');
    }
  }, [user, navigate]);

  // Fetch stats / staff profile specifics
  useEffect(() => {
    const fetchProfileDetails = async () => {
      setLoading(true);
      try {
        if (user?.role === 'user') {
          const res = await API.get('/bookings/my-bookings');
          const bookings = res.data.data || res.data || [];
          setBookingCount(bookings.length);
        }
      } catch (err) {
        console.error('Failed to load profile details:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchProfileDetails();
    }
  }, [user]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const res = await API.put('/users/profile', formData);
      const updatedData = res.data.data || res.data;
      
      if (updateUser) {
        updateUser(updatedData);
      }
      
      setMessage('Profile updated successfully!');
      setIsEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen pt-36 pb-16 px-4 max-w-xl mx-auto text-center font-body">
        <p className="text-slate-600">Please sign in to view your profile.</p>
      </div>
    );
  }

  const isStaff = user.role === 'staff';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pt-32 pb-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8 font-body">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0B3D2E] to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500 text-slate-950 font-heading font-extrabold text-2xl flex items-center justify-center shrink-0 shadow-md">
            {user.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h1 className="text-xl sm:text-2xl font-heading font-extrabold">{user.name || 'Account Profile'}</h1>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                isStaff ? 'bg-amber-400 text-slate-950' : 'bg-emerald-400 text-slate-950'
              }`}>
                {isStaff ? 'Staff Operator' : 'Verified User'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">{user.email}</p>
          </div>
        </div>

        <button
          onClick={() => setIsEditing(!isEditing)}
          className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-4 py-2.5 rounded-xl border border-white/20 transition-all cursor-pointer active:scale-95"
        >
          {isEditing ? <X className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
          {isEditing ? 'Cancel Edit' : 'Edit Profile'}
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Left / Edit Column */}
        <div className="md:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-heading font-bold text-slate-900">Personal Details</h2>
            {isEditing && <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Editing Mode</span>}
          </div>

          {isEditing ? (
            <form onSubmit={handleUpdate} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-500 mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-[#0B3D2E] focus:bg-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-500 mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-[#0B3D2E] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-500 mb-1">Default Vehicle Reg Number</label>
                <div className="relative">
                  <Car className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="KL-13-AB-1234"
                    value={formData.defaultVehicle}
                    onChange={(e) => setFormData({ ...formData, defaultVehicle: e.target.value })}
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-[#0B3D2E] focus:bg-white uppercase"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 bg-[#0B3D2E] hover:bg-[#145C43] text-white font-bold rounded-xl text-xs transition-all shadow-sm cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs cursor-pointer hover:bg-slate-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <span className="text-slate-500 font-medium flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-600" /> Full Name
                </span>
                <span className="font-bold text-slate-900">{user.name || 'Not provided'}</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <span className="text-slate-500 font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4 text-emerald-600" /> Email Address
                </span>
                <span className="font-bold text-slate-900">{user.email}</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <span className="text-slate-500 font-medium flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-600" /> Contact Phone
                </span>
                <span className="font-bold text-slate-900">{user.phone || 'N/A'}</span>
              </div>

              {!isStaff && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-500 font-medium flex items-center gap-2">
                    <Car className="w-4 h-4 text-emerald-600" /> Preferred Vehicle
                  </span>
                  <span className="font-bold text-slate-900 font-mono uppercase">
                    {user.defaultVehicle || 'KL-13-AB-1234'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Details Column (Role Specific) */}
        <div className="md:col-span-5 space-y-6">
          
          {/* USER SPECIFIC STATS */}
          {!isStaff && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-base font-heading font-bold text-slate-900">Activity Overview</h2>
              
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-center">
                <span className="text-3xl font-heading font-extrabold text-[#0B3D2E] block">{bookingCount}</span>
                <span className="text-xs text-emerald-800 font-bold uppercase tracking-wider mt-1 block">Total Reservations</span>
              </div>

              <div className="pt-2 text-xs text-slate-500 space-y-2">
                <div className="flex items-center justify-between">
                  <span>Account Status:</span>
                  <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-[10px] uppercase">Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Registered Member:</span>
                  <span className="font-semibold text-slate-800">Kannur Region</span>
                </div>
              </div>
            </div>
          )}

          {/* STAFF SPECIFIC WORK DETAILS */}
          {isStaff && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Building className="w-4 h-4 text-[#0B3D2E]" />
                <h2 className="text-base font-heading font-bold text-slate-900">Staff Assignment</h2>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">Assigned Facility</span>
                  <span className="font-heading font-bold text-sm text-slate-900 block mt-0.5">
                    {user.assignedFacility?.name || 'Kannur Railway Station Parking'}
                  </span>
                  <p className="text-slate-500 mt-0.5">
                    {user.assignedFacility?.address?.street || 'Thavakkara'}, {user.assignedFacility?.address?.area || 'Station Road'}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 font-bold text-[10px] uppercase block">Shift Hours</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3 text-emerald-600" /> 08:00 - 20:00
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 font-bold text-[10px] uppercase block">Status</span>
                    <span className="font-bold text-emerald-700 flex items-center gap-1 mt-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> On Duty
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}