import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const KANNUR_LOCATIONS = [
  {
    id: 'knr-railway',
    name: 'Kannur Railway Station',
    area: 'Station Road, Thavakkara',
    image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=800',
    price: 25,
    totalBays: 40,
    availableBays: 14,
  },
  {
    id: 'thavakkara-ksrtc',
    name: 'Kannur KSRTC Bus Stand',
    area: 'Thavakkara Road',
    image: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&q=80&w=800',
    price: 20,
    totalBays: 30,
    availableBays: 8,
  },
  {
    id: 'payyambalam-beach',
    name: 'Payyambalam Beach Visitor Parking',
    area: 'Beach Road, Kannur',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800',
    price: 15,
    totalBays: 50,
    availableBays: 22,
  },
];

const Home = () => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-slate-50 text-slate-900 min-h-screen w-full font-body"
    >
      
      {/* HERO SECTION WITH BACKDROP IMAGE */}
      <section className="relative min-h-[85vh] flex flex-col justify-between pt-36 pb-24 overflow-hidden">
        
        {/* Backdrop Image */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1920"
            alt="Kannur Landscape"
            className="w-full h-full object-cover object-center scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/55 to-slate-950/75" />
        </div>

        {/* Central Hero Text */}
        <motion.div 
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="relative z-10 max-w-4xl mx-auto px-4 text-center text-white space-y-6 my-auto"
        >
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-4 py-1.5 rounded-full">
            Smart Transport Operations
          </span>
          <h1 className="font-heading text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.15]">
            Parkora Smart Parking
          </h1>
          <p className="text-base sm:text-xl text-slate-200 max-w-2xl mx-auto font-normal leading-relaxed">
            Pre-book guaranteed parking bays across Kannur public stations, transit hubs, and coastal destinations.
          </p>
          <div className="pt-2">
            <Link
              to="/locations"
              className="inline-flex items-center gap-2 bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-bold text-sm px-8 py-3.5 rounded-full transition-all duration-300 shadow-lg active:scale-95"
            >
              Find Parking Bays <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </motion.div>

        {/* Bottom Curved Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none">
          <svg
            className="w-full h-16 sm:h-24 text-slate-50 fill-current"
            viewBox="0 0 1440 120"
            preserveAspectRatio="none"
          >
            <path d="M0,32L120,42.7C240,53,480,75,720,74.7C960,75,1200,53,1320,42.7L1440,32L1440,120L1320,120C1200,120,960,120,720,120C480,120,240,120,120,120L0,120Z"></path>
          </svg>
        </div>

        {/* OVERLAPPING FLOATING STATS CARD */}
        <motion.div 
          initial={{ opacity: 0, y: 35 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="relative z-20 max-w-5xl mx-auto px-4 w-full -mb-32 sm:-mb-24"
        >
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-3xl shadow-xl p-8 sm:p-10 grid grid-cols-1 md:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-slate-200">
            
            <div className="text-center px-4 pt-4 md:pt-0">
              <h2 className="font-heading text-4xl sm:text-5xl font-extrabold text-slate-900">
                200+
              </h2>
              <h3 className="font-heading font-bold text-base text-slate-800 mt-2">
                Active Parking Bays
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Railway Station, KSRTC Stand, and Beach complexes in Kannur.
              </p>
            </div>

            <div className="text-center px-4 pt-4 md:pt-0">
              <h2 className="font-heading text-4xl sm:text-5xl font-extrabold text-emerald-600">
                100%
              </h2>
              <h3 className="font-heading font-bold text-base text-slate-800 mt-2">
                Real-Time Guarantee
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Non-overlapping interval calculations validated server-side.
              </p>
            </div>

            <div className="text-center px-4 pt-4 md:pt-0">
              <h2 className="font-heading text-4xl sm:text-5xl font-extrabold text-slate-900">
                05
              </h2>
              <h3 className="font-heading font-bold text-base text-slate-800 mt-2">
                Major Transit Hubs
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Instant gate check-in via digital QR pass scanning.
              </p>
            </div>

          </div>
        </motion.div>
      </section>

      {/* SPACING ADJUSTMENT */}
      <div className="pt-36 sm:pt-28" />

      {/* LOCATIONS PREVIEW GRID */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3.5 py-1 rounded-full border border-emerald-200">
            Featured Locations
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-slate-900 mt-3">
            Popular Stations in Kannur
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            Reserve your bay in advance to bypass local traffic delays.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {KANNUR_LOCATIONS.map((loc, index) => (
            <motion.div 
              key={loc.id} 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -4 }}
              className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md"
            >
              <div className="relative h-48 bg-slate-100 overflow-hidden">
                <img src={loc.image} alt={loc.name} className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
                <div className="absolute top-3.5 right-3.5 bg-slate-900 text-emerald-400 font-bold text-xs px-3 py-1 rounded-full">
                  ₹{loc.price}/hr
                </div>
              </div>
              <div className="p-6">
                <h3 className="font-heading font-bold text-lg text-slate-900">{loc.name}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                  <MapPin className="h-3.5 w-3.5 text-emerald-600" /> {loc.area}
                </p>
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                  <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                    {loc.availableBays} of {loc.totalBays} Free
                  </span>
                  <Link
                    to="/locations"
                    className="text-slate-900 font-bold flex items-center gap-1 hover:text-emerald-600 transition-colors"
                  >
                    Select Bay <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section id="how-it-works" className="py-16 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3.5 py-1 rounded-full border border-emerald-200">
              Seamless Flow
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-slate-900 mt-3">
              How Parkora Works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { num: '01', title: 'Find Facility', desc: 'Select Kannur Railway Station, KSRTC Stand, or Payyambalam Beach.' },
              { num: '02', title: 'Select Time', desc: 'Set arrival time and duration using 24-hour interval format.' },
              { num: '03', title: 'Reserve Bay', desc: 'Pick your exact bay slot (e.g. G-05) on the floor grid.' },
              { num: '04', title: 'Scan QR Gate', desc: 'Show your digital pass to the staff operator for fast entry.' },
            ].map((step) => (
              <div key={step.num} className="bg-slate-50 border border-slate-200 p-6 rounded-2xl text-center transition-transform hover:-translate-y-1 duration-200">
                <span className="font-heading font-extrabold text-3xl text-emerald-600">
                  {step.num}
                </span>
                <h3 className="font-heading font-bold text-base text-slate-900 mt-2">
                  {step.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </motion.div>
  );
};

export default Home;