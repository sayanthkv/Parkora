import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapPin, Calendar, Clock, Car, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const [selectedLocation, setSelectedLocation] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [durationHours, setDurationHours] = useState('2');
  const [vehicleType, setVehicleType] = useState('car');

  const handleSearch = (e) => {
    e.preventDefault();
    const queryParams = new URLSearchParams({
      location: selectedLocation,
      date,
      startTime,
      durationHours,
      vehicleType,
    });
    navigate(`/locations?${queryParams.toString()}`);
  };

  return (
    <div className="min-h-screen bg-[#F7F8F6]">
      {/* Hero Section */}
      <section className="relative pt-10 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Headlines */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 bg-[#176B4D]/10 text-[#176B4D] px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Smart Transit in Kannur
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold text-[#202722] leading-tight tracking-tight">
              Your parking spot. <br />
              <span className="text-[#176B4D]">Before you arrive.</span>
            </h1>

            <p className="text-base sm:text-lg text-gray-600 max-w-xl leading-relaxed">
              Find and reserve parking around Kannur Railway Station, Thavakkara Bus Stand, Payyambalam Beach, and District Hospital before you hit the road.
            </p>

            <div className="flex items-center gap-6 pt-2">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                <ShieldCheck className="w-4 h-4 text-[#176B4D]" /> Real-time Bay Holds
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                <ShieldCheck className="w-4 h-4 text-[#176B4D]" /> Instant QR Ticket
              </div>
            </div>
          </div>

          {/* Right Column: Editorial Search Card */}
          <div className="lg:col-span-6">
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-[#202722] mb-1">Find & Reserve Parking</h2>
              <p className="text-xs text-gray-500 mb-6">Select your destination and expected arrival window.</p>

              <form onSubmit={handleSearch} className="space-y-4">
                
                {/* Location Select */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Destination / Location
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                    <select
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-[#202722] focus:ring-2 focus:ring-[#176B4D] focus:border-transparent outline-none transition-all"
                    >
                      <option value="">All Destinations in Kannur</option>
                      <option value="kannur-railway-station">Kannur Railway Station</option>
                      <option value="kannur-central-bus-terminal">Kannur Central Bus Terminal</option>
                      <option value="payyambalam-beach-parking">Payyambalam Beach</option>
                      <option value="kannur-district-hospital">Kannur District Hospital</option>
                    </select>
                  </div>
                </div>

                {/* Date & Start Time Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      Arrival Date
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                      <input
                        type="date"
                        value={date}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-[#202722] focus:ring-2 focus:ring-[#176B4D] outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      Arrival Time
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-[#202722] focus:ring-2 focus:ring-[#176B4D] outline-none"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Duration & Vehicle Type Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      Duration
                    </label>
                    <select
                      value={durationHours}
                      onChange={(e) => setDurationHours(e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-[#202722] focus:ring-2 focus:ring-[#176B4D] outline-none"
                    >
                      <option value="1">1 Hour</option>
                      <option value="2">2 Hours</option>
                      <option value="4">4 Hours</option>
                      <option value="8">8 Hours</option>
                      <option value="24">24 Hours</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      Vehicle Type
                    </label>
                    <div className="relative">
                      <Car className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                      <select
                        value={vehicleType}
                        onChange={(e) => setVehicleType(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-[#202722] focus:ring-2 focus:ring-[#176B4D] outline-none"
                      >
                        <option value="car">Car / SUV</option>
                        <option value="bike">Two Wheeler</option>
                        <option value="ev">Electric Vehicle</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Submit CTA */}
                <button
                  type="submit"
                  className="w-full py-3 mt-2 bg-[#176B4D] hover:bg-[#12533c] text-white font-semibold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  Search Available Spaces
                  <ArrowRight className="w-4 h-4" />
                </button>

              </form>
            </div>
          </div>

        </div>
      </section>

      {/* 3 Step Workflow */}
      <section className="bg-white py-16 border-y border-gray-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl font-bold text-[#202722]">How Parkora Works</h2>
            <p className="text-sm text-gray-500 mt-1">Guaranteed parking in three simple steps.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 bg-[#F7F8F6] rounded-xl border border-gray-200/60">
              <div className="w-10 h-10 rounded-lg bg-[#176B4D]/10 text-[#176B4D] flex items-center justify-center font-bold text-lg mb-4">
                1
              </div>
              <h3 className="text-base font-bold text-[#202722]">Choose Facility & Bay</h3>
              <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                Browse locations in Kannur and pick a specific floor and bay (Ground, L1, EV Charging).
              </p>
            </div>

            <div className="p-6 bg-[#F7F8F6] rounded-xl border border-gray-200/60">
              <div className="w-10 h-10 rounded-lg bg-[#176B4D]/10 text-[#176B4D] flex items-center justify-center font-bold text-lg mb-4">
                2
              </div>
              <h3 className="text-base font-bold text-[#202722]">Confirm Reservation</h3>
              <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                Enter your vehicle registration number and lock in your interval with zero advance markup.
              </p>
            </div>

            <div className="p-6 bg-[#F7F8F6] rounded-xl border border-gray-200/60">
              <div className="w-10 h-10 rounded-lg bg-[#176B4D]/10 text-[#176B4D] flex items-center justify-center font-bold text-lg mb-4">
                3
              </div>
              <h3 className="text-base font-bold text-[#202722]">Scan QR at Check-in</h3>
              <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                Show your digital QR ticket to the staff operator upon arrival at the facility gate.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}