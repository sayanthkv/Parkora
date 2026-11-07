import React, { useState, useEffect } from 'react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { 
  Building, Car, Clock, ShieldCheck, CheckCircle2, 
  AlertCircle, ArrowRight, User, Phone, Mail 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function StaffBookCustomer() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [facility, setFacility] = useState(null);
  const [floors, setFloors] = useState([]);
  const [bays, setBays] = useState([]);
  const [selectedFloorId, setSelectedFloorId] = useState('');
  const [selectedBayId, setSelectedBayId] = useState('');

  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    vehicleRegNumber: '',
    vehicleType: 'car',
    durationHours: 2,
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [createdBooking, setCreatedBooking] = useState(null);

  useEffect(() => {
    const fetchFacilityStructure = async () => {
      setLoading(true);
      setError(null);
      try {
        const shiftRes = await API.get('/staff/shift-context');
        const fac = shiftRes.data.data.facility;
        setFacility(fac);

        // Call the staff-authorized structure endpoint
        const structRes = await API.get('/staff/facility-structure');
        const fls = structRes.data.data.floors || [];
        const bys = structRes.data.data.bays || [];
        setFloors(fls);
        setBays(bys);
        if (fls.length > 0) setSelectedFloorId(fls[0]._id);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load assigned facility layout.');
      } finally {
        setLoading(false);
      }
    };
    fetchFacilityStructure();
  }, []);

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBayId || !selectedFloorId) {
      setError('Please select an available parking bay slot.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await API.post('/staff/book-customer', {
        ...formData,
        floorId: selectedFloorId,
        bayId: selectedBayId,
      });

      setCreatedBooking(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create booking for customer.');
    } finally {
      setSubmitting(false);
    }
  };

  const availableBays = bays.filter(
    (b) => b.floor === selectedFloorId && b.status !== 'maintenance' && b.isEnabled !== false
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pt-28 pb-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto font-body">
      
      {/* Title */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-[#0B3D2E] text-[#F2B705] px-3.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-2">
            <Building className="w-3.5 h-3.5" /> Walk-In Reservation Desk
          </div>
          <h1 className="text-2xl font-heading font-extrabold text-slate-900">
            Book For Customer
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Stationed Lot: <strong>{facility?.name || 'Assigned Facility'}</strong> (Tariff: ₹{facility?.pricing?.hourlyRate}/hr)
          </p>
        </div>
      </div>

      {createdBooking ? (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
          <h2 className="text-xl font-heading font-extrabold text-slate-900">Walk-In Booking Confirmed!</h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            Vehicle <strong>{createdBooking.vehicle?.regNumber}</strong> has been allocated <strong>Bay {createdBooking.bay?.bayNumber}</strong> on {createdBooking.floor?.name} and marked as Active.
          </p>
          <div className="pt-4 flex justify-center gap-3">
            <button
              onClick={() => {
                setCreatedBooking(null);
                setFormData({ customerName: '', customerPhone: '', customerEmail: '', vehicleRegNumber: '', vehicleType: 'car', durationHours: 2 });
              }}
              className="px-6 py-2.5 bg-[#0B3D2E] text-white rounded-xl text-xs font-bold hover:bg-[#145C43] cursor-pointer"
            >
              Book Another Vehicle
            </button>
            <button
              onClick={() => navigate('/staff/terminal')}
              className="px-6 py-2.5 bg-slate-100 text-slate-800 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer"
            >
              Go to Gate Terminal
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleBookingSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Customer & Vehicle Info */}
          <div className="md:col-span-7 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-4 text-xs">
            <h2 className="font-heading font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
              Vehicle & Driver Details
            </h2>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" /> {error}
              </div>
            )}

            <div>
              <label className="block font-bold uppercase text-slate-500 mb-1">Vehicle Registration Number *</label>
              <input
                type="text"
                placeholder="KL 13 AS 1234"
                value={formData.vehicleRegNumber}
                onChange={(e) => setFormData({ ...formData, vehicleRegNumber: e.target.value.toUpperCase() })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase font-bold text-sm text-slate-900 outline-none focus:border-[#0B3D2E]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold uppercase text-slate-500 mb-1">Vehicle Type</label>
                <select
                  value={formData.vehicleType}
                  onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                >
                  <option value="car">Car / SUV</option>
                  <option value="bike">Two-Wheeler</option>
                  <option value="ev">EV Vehicle</option>
                  <option value="heavy">Heavy Vehicle</option>
                </select>
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-500 mb-1">Duration (Hours)</label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={formData.durationHours}
                  onChange={(e) => setFormData({ ...formData, durationHours: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  required
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Customer Information (Optional)
              </span>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Customer Name"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                />
                <input
                  type="tel"
                  placeholder="Phone Number (+91)"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Bay Slot Selector */}
          <div className="md:col-span-5 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-4 text-xs flex flex-col justify-between">
            <div>
              <h2 className="font-heading font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
                Select Parking Bay
              </h2>

              {/* Floor Switcher */}
              <div className="flex gap-2 my-3 overflow-x-auto pb-1">
                {floors.map((fl) => (
                  <button
                    key={fl._id}
                    type="button"
                    onClick={() => { setSelectedFloorId(fl._id); setSelectedBayId(''); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedFloorId === fl._id
                        ? 'bg-[#0B3D2E] text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {fl.name}
                  </button>
                ))}
              </div>

              {/* Bay Grid */}
              <div className="grid grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                {availableBays.length === 0 ? (
                  <div className="col-span-3 text-center text-slate-400 py-6">No bays available on this floor.</div>
                ) : (
                  availableBays.map((bay) => (
                    <button
                      key={bay._id}
                      type="button"
                      onClick={() => setSelectedBayId(bay._id)}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        selectedBayId === bay._id
                          ? 'bg-[#0B3D2E] text-[#F2B705] border-[#0B3D2E] font-black'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200 font-bold'
                      }`}
                    >
                      <span className="block text-sm">{bay.bayNumber}</span>
                      <span className="text-[9px] uppercase opacity-75">{bay.supportedVehicleType}</span>
                    </button>
                  ))
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !selectedBayId}
              className="w-full py-3.5 bg-[#0B3D2E] hover:bg-[#145C43] text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
            >
              {submitting ? 'Confirming...' : 'Approve & Issue Bay Pass'}
              <ArrowRight className="w-4 h-4 text-[#F2B705]" />
            </button>
          </div>

        </form>
      )}

    </div>
  );
}