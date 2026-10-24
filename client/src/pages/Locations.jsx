import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { MapPin, Clock, Car, ShieldCheck, Zap, ArrowRight, Filter } from 'lucide-react';

export default function Locations() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter States
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

  const handleSelectLocation = (slug) => {
    // Preserve URL parameters when progressing to booking flow
    const query = searchParams.toString();
    navigate(`/book/${slug}${query ? `?${query}` : ''}`);
  };

  return (
    <div className="min-h-screen bg-[#F7F8F6] py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#202722]">Parking Facilities in Kannur</h1>
        <p className="text-sm text-gray-600 mt-1">Select a facility to view real-time floor layouts and reserve your bay.</p>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200/80 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by facility name or area..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-[#202722] outline-none focus:ring-2 focus:ring-[#176B4D]"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Filter className="w-4 h-4 text-gray-500 hidden sm:block" />
          <span className="text-xs font-semibold text-gray-600 hidden sm:block">Vehicle:</span>
          
          <select
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value)}
            className="w-full md:w-auto px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-[#202722] outline-none focus:ring-2 focus:ring-[#176B4D]"
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
        <div className="py-20 text-center text-gray-500">Loading Kannur parking facilities...</div>
      ) : error ? (
        <div className="py-20 text-center text-red-600">{error}</div>
      ) : filteredLocations.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-xl border border-gray-200 text-gray-500">
          No parking locations match your search filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredLocations.map((loc) => (
            <div
              key={loc._id}
              className="bg-white rounded-xl border border-gray-200/80 p-6 flex flex-col justify-between hover:border-[#176B4D] transition-all group"
            >
              <div>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-[#202722] group-hover:text-[#176B4D] transition-colors">
                      {loc.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {loc.address.street}, {loc.address.area}
                    </p>
                  </div>

                  <div className="text-right bg-[#176B4D]/10 px-3 py-1.5 rounded-lg border border-[#176B4D]/20">
                    <span className="text-xs text-gray-500 block -mb-1">Rate</span>
                    <span className="text-base font-bold text-[#176B4D]">₹{loc.pricing.hourlyRate}/hr</span>
                  </div>
                </div>

                <p className="text-xs text-gray-600 line-clamp-2 mb-4 leading-relaxed">
                  {loc.description}
                </p>

                {/* Badges & Operating Hours */}
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded text-[11px] text-gray-700 font-medium">
                    <Clock className="w-3 h-3 text-gray-500" />
                    {loc.operatingHours.is24x7 ? '24/7 Access' : `${loc.operatingHours.openTime} - ${loc.operatingHours.closeTime}`}
                  </span>

                  {loc.amenities.map((amenity, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded text-[11px] text-gray-700 font-medium"
                    >
                      {amenity === 'EV Charging' ? <Zap className="w-3 h-3 text-amber-500" /> : <ShieldCheck className="w-3 h-3 text-gray-400" />}
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => handleSelectLocation(loc.slug)}
                className="w-full py-2.5 bg-[#176B4D] hover:bg-[#12533c] text-white font-medium rounded-lg text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                Select Floor & Book Bay
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}