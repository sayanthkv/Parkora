import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, AlertCircle, ShieldCheck } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const redirect = searchParams.get('redirect') || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login(email, password);
      navigate(redirect);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F4EE] text-[#14201B] flex items-center justify-center pt-28 pb-16 px-4 sm:px-6 lg:px-8 font-body">
      <div className="max-w-md w-full bg-white p-8 sm:p-10 rounded-2xl border border-[#E3DED2] shadow-sm space-y-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#0B3D2E] bg-[#E3DED2]/60 px-3.5 py-1.5 rounded-full inline-block mb-3">
            Account Access
          </span>
          <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-[#14201B] tracking-tight">
            Sign In to Parkora
          </h2>
          <p className="text-xs text-[#5C6B64] mt-1.5 font-medium">
            Manage your reservations and QR parking passes.
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-[#5C6B64] uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. user@example.com"
              className="w-full p-3 bg-[#F7F4EE] border border-[#E3DED2] rounded-xl text-sm font-semibold text-[#14201B] outline-none focus:border-[#0B3D2E]"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-[#5C6B64] uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full p-3 bg-[#F7F4EE] border border-[#E3DED2] rounded-xl text-sm font-semibold text-[#14201B] outline-none focus:border-[#0B3D2E]"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#0B3D2E] hover:bg-[#145C43] text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-sm active:scale-95"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
            <LogIn className="w-4 h-4 text-[#F2B705]" />
          </button>
        </form>

        <div className="pt-2 border-t border-[#E3DED2] text-center text-xs text-[#5C6B64] font-medium">
          Don't have an account?{' '}
          <Link to="/register" className="text-[#0B3D2E] font-bold hover:underline">
            Register here
          </Link>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#5C6B64] pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-[#0B3D2E]" />
          <span>Encrypted JWT Authentication</span>
        </div>
      </div>
    </div>
  );
}