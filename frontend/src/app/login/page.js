'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { FiMail, FiLock, FiArrowRight, FiAlertCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name}!`);

      switch (user.role) {
        case 'admin': router.push('/admin'); break;
        case 'donor': router.push('/donor/dashboard'); break;
        case 'receiver':
        case 'volunteer': router.push('/receiver/dashboard'); break;
        default: router.push('/');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (email, password) => {
    setEmail(email);
    setPassword(password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ paddingTop: '5rem' }}>
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[20%] left-[10%] w-[400px] h-[400px] rounded-full bg-emerald-500/5 blur-3xl" />
        <div className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] rounded-full bg-indigo-500/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8 animate-fade-in">
          <div className="text-4xl mb-4">🍽️</div>
          <h1 className="text-3xl font-bold">Welcome Back</h1>
          <p className="text-slate-400 mt-2">Sign in to continue to FoodBridge</p>
        </div>

        <div className="card p-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-6">
              <FiAlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 text-base"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Signing in...
                </span>
              ) : (
                <>Sign In <FiArrowRight /></>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-400">
              Don't have an account?{' '}
              <Link href="/signup" className="text-emerald-400 hover:text-emerald-300 font-medium" style={{ textDecoration: 'none' }}>
                Register here
              </Link>
            </p>
          </div>
        </div>

        {/* Quick Login (Demo) */}
        <div className="mt-6 card p-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <p className="text-xs text-slate-500 mb-3 text-center">Quick Demo Login</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => quickLogin('admin@foodbridge.org', 'admin123')} className="btn-secondary text-xs justify-center py-2">
              ⚙️ Admin
            </button>
            <button onClick={() => quickLogin('rajesh@tajhotel.com', 'password123')} className="btn-secondary text-xs justify-center py-2">
              🏨 Donor
            </button>
            <button onClick={() => quickLogin('meera@meerafoundation.org', 'password123')} className="btn-secondary text-xs justify-center py-2">
              🏛️ NGO
            </button>
            <button onClick={() => quickLogin('vikram@volunteer.com', 'password123')} className="btn-secondary text-xs justify-center py-2">
              🙋 Volunteer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
