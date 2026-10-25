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
    <div className="min-h-screen bg-[#F7F4EE] text-[#14201B] flex items-center justify-center pt-28 pb-16 px-4 sm:px-6 lg:px-8 font-body">
      <div className="max-w-md w-full bg-white p-8 sm:p-10 rounded-2xl border border-[#E3DED2] shadow-sm space-y-6">
        
        {/* Header */}
        <div>
          <div className="inline-flex items-center gap-1.5 bg-[#0B3D2E] text-[#F2B705] px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
            <ShieldCheck className="w-3.5 h-3.5" /> Fast Parking Reservation
          </div>
          <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-[#14201B] tracking-tight">
            Create Your Account
          </h2>
          <p className="text-xs text-[#5C6B64] mt-1.5 font-medium">
            Register to pre-book parking slots across Kannur.
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            {error}
          </div>
        )}

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-[#5C6B64] uppercase tracking-wider mb-1.5">Full Name</label>
            <input
              type="text"
              placeholder="e.g. Sayanth Sajeevan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 bg-[#F7F4EE] border border-[#E3DED2] rounded-xl text-sm font-semibold text-[#14201B] outline-none focus:border-[#0B3D2E]"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-[#5C6B64] uppercase tracking-wider mb-1.5">Email Address</label>
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-[#F7F4EE] border border-[#E3DED2] rounded-xl text-sm font-semibold text-[#14201B] outline-none focus:border-[#0B3D2E]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[#5C6B64] uppercase tracking-wider mb-1.5">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 bg-[#F7F4EE] border border-[#E3DED2] rounded-xl text-sm font-semibold text-[#14201B] outline-none focus:border-[#0B3D2E]"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-[#5C6B64] uppercase tracking-wider mb-1.5">Mobile Number</label>
              <input
                type="tel"
                placeholder="+91 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-3 bg-[#F7F4EE] border border-[#E3DED2] rounded-xl text-sm font-semibold text-[#14201B] outline-none focus:border-[#0B3D2E]"
              />
            </div>
          </div>

          {/* Vehicle Profile Sub-section */}
          <div className="pt-3 border-t border-[#E3DED2] space-y-3">
            <span className="text-[11px] font-bold text-[#5C6B64] uppercase tracking-wider flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5 text-[#0B3D2E]" /> Primary Vehicle Info
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#5C6B64] uppercase tracking-wider mb-1.5">Vehicle Reg Number</label>
                <input
                  type="text"
                  placeholder="KL 13 AS 1234"
                  value={vehicleRegNumber}
                  onChange={(e) => setVehicleRegNumber(e.target.value.toUpperCase())}
                  className="w-full p-3 bg-[#F7F4EE] border border-[#E3DED2] rounded-xl text-sm font-bold tracking-wider uppercase text-[#14201B] outline-none focus:border-[#0B3D2E]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#5C6B64] uppercase tracking-wider mb-1.5">Vehicle Type</label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full p-3 bg-[#F7F4EE] border border-[#E3DED2] rounded-xl text-sm font-semibold text-[#14201B] outline-none focus:border-[#0B3D2E] cursor-pointer"
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
            className="w-full py-3.5 bg-[#0B3D2E] hover:bg-[#145C43] text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-sm active:scale-95"
          >
            {loading ? 'Creating Account...' : 'Sign Up & Continue'}
            <UserPlus className="w-4 h-4 text-[#F2B705]" />
          </button>
        </form>

        <div className="pt-2 border-t border-[#E3DED2] text-center text-xs text-[#5C6B64] font-medium">
          Already registered?{' '}
          <Link to={`/login${redirect !== '/locations' ? `?redirect=${redirect}` : ''}`} className="text-[#0B3D2E] font-bold hover:underline">
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  );
}