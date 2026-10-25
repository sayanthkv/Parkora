import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { MapPin, Clock, ShieldCheck, Zap, ArrowRight, Filter } from 'lucide-react';

export default function Locations() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [vehicleFilter, setVehicleFilter] = useState(searchParams.get('vehicleType') || 'all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await API.get('/locations');
        setLocations(res.data.data);
      } catch (err) {
        setError('Failed to load parking locations.');
      } finally {
        setLoading(false);
      }
    };
    fetchLocations();
  }, []);

  const filteredLocations = locations.filter((loc) => {
    const matchesQuery =
      loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.address.area.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesVehicle =
      vehicleFilter === 'all' || loc.supportedVehicleTypes.includes(vehicleFilter);

    return matchesQuery && matchesVehicle;
  });

  const handleSelectLocation = (slug, id) => {
    const targetId = slug || id;
    if (!targetId) return;
    const query = searchParams.toString();
    navigate(`/book/${targetId}${query ? `?${query}` : ''}`);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 pt-28 pb-16 px-4 sm:px-6 lg:px-8 font-body">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#0B3D2E] bg-slate-100 px-3.5 py-1.5 rounded-full border border-slate-200">
            Coverage Area
          </span>
          <h1 className="text-3xl sm:text-4xl font-heading font-extrabold text-slate-900 mt-3 tracking-tight">
            Parking Facilities in Kannur
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Select a facility to view real-time floor layouts and reserve your bay.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by facility name or area..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:border-[#0B3D2E]"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <Filter className="w-4 h-4 text-[#0B3D2E] hidden sm:block" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 hidden sm:block">Vehicle:</span>
            
            <select
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value)}
              className="w-full md:w-auto px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:border-[#0B3D2E] cursor-pointer"
            >
              <option value="all">All Vehicles</option>
              <option value="car">Cars / SUVs</option>
              <option value="bike">Two Wheelers</option>
              <option value="ev">EV Charging Available</option>
            </select>
          </div>
        </div>

        {/* Grid List */}
        {loading ? (
          <div className="py-20 text-center text-sm font-medium text-slate-500">Loading Kannur parking facilities...</div>
        ) : error ? (
          <div className="py-20 text-center text-sm font-semibold text-red-600">{error}</div>
        ) : filteredLocations.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 text-sm text-slate-500 font-medium">
            No parking locations match your search filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredLocations.map((loc) => (
              <div
                key={loc._id}
                className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 flex flex-col justify-between hover:border-[#0B3D2E] transition-all shadow-sm hover:shadow-md group"
              >
                <div>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <h3 className="text-xl font-heading font-bold text-slate-900 group-hover:text-[#0B3D2E] transition-colors">
                        {loc.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-[#0B3D2E]" />
                        {loc.address?.street}, {loc.address?.area}
                      </p>
                    </div>

                    <div className="text-right bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block -mb-0.5">Rate</span>
                      <span className="text-base font-heading font-extrabold text-[#0B3D2E]">₹{loc.pricing?.hourlyRate}/hr</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2 mb-5 leading-relaxed font-normal">
                    {loc.description}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-6">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-semibold">
                      <Clock className="w-3.5 h-3.5 text-[#0B3D2E]" />
                      {loc.operatingHours?.is24x7 ? '24/7 Access' : `${loc.operatingHours?.openTime} - ${loc.operatingHours?.closeTime}`}
                    </span>

                    {loc.amenities?.map((amenity, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-semibold"
                      >
                        {amenity === 'EV Charging' ? <Zap className="w-3.5 h-3.5 text-amber-500" /> : <ShieldCheck className="w-3.5 h-3.5 text-[#0B3D2E]" />}
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSelectLocation(loc.slug, loc._id)}
                  className="w-full py-3.5 bg-[#0B3D2E] hover:bg-[#145C43] text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  Select Floor & Book Bay
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}