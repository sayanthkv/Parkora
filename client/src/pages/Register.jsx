import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, AlertCircle, Car, ShieldCheck } from 'lucide-react';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleRegNumber, setVehicleRegNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('car');

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const redirect = searchParams.get('redirect') || '/locations';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await register({
        name,
        email,
        password,
        phone,
        vehicleRegNumber: vehicleRegNumber.toUpperCase().trim(),
        vehicleType,
      });
      navigate(redirect);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8F6] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-gray-200/80 shadow-sm space-y-6">
        
        {/* Header */}
        <div>
          <div className="inline-flex items-center gap-1.5 bg-[#176B4D]/10 text-[#176B4D] px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" /> Fast Parking Reservation
          </div>
          <h2 className="text-2xl font-bold text-[#202722]">Create Your Account</h2>
          <p className="text-xs text-gray-500 mt-1">Register to pre-book parking slots across Kannur.</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              placeholder="e.g. Sayanth Sajeevan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#176B4D]"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#176B4D]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#176B4D]"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Mobile Number</label>
              <input
                type="tel"
                placeholder="+91 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#176B4D]"
              />
            </div>
          </div>

          {/* Vehicle Profile Sub-section */}
          <div className="pt-2 border-t border-gray-100 space-y-3">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block flex items-center gap-1">
              <Car className="w-3.5 h-3.5 text-[#176B4D]" /> Primary Vehicle Info
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Vehicle Reg Number</label>
                <input
                  type="text"
                  placeholder="KL 13 AS 1234"
                  value={vehicleRegNumber}
                  onChange={(e) => setVehicleRegNumber(e.target.value.toUpperCase())}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg font-mono tracking-wider uppercase outline-none focus:ring-2 focus:ring-[#176B4D]"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Vehicle Type</label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#176B4D]"
                >
                  <option value="car">Car / SUV</option>
                  <option value="bike">Two Wheeler</option>
                  <option value="ev">Electric Vehicle</option>
                </select>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#176B4D] hover:bg-[#12533c] text-white font-semibold rounded-lg text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Sign Up & Continue'}
            <UserPlus className="w-4 h-4" />
          </button>
        </form>

        <p className="text-center text-xs text-gray-500">
          Already registered?{' '}
          <Link to={`/login${redirect !== '/locations' ? `?redirect=${redirect}` : ''}`} className="text-[#176B4D] font-bold hover:underline">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
}