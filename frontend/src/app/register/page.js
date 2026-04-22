'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { FiUser, FiMail, FiLock, FiPhone, FiMapPin, FiArrowRight, FiArrowLeft, FiAlertCircle, FiHome, FiBriefcase } from 'react-icons/fi';
import toast from 'react-hot-toast';

function RegisterForm() {
  const searchParams = useSearchParams();
  const defaultRole = searchParams.get('role') || '';

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: defaultRole,
    orgName: '',
    orgType: '',
    phone: '',
    address: '',
    latitude: '',
    longitude: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const router = useRouter();

  const update = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const validateStep1 = () => {
    if (!formData.role) return 'Please select a role';
    if (!formData.name) return 'Name is required';
    if (!formData.email) return 'Email is required';
    if (!formData.password || formData.password.length < 6) return 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match';
    return null;
  };

  const handleNext = () => {
    const err = validateStep1();
    if (err) { setError(err); return; }
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = {
        ...formData,
        latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
        longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
      };
      delete data.confirmPassword;

      const user = await register(data);
      toast.success(`Welcome, ${user.name}! 🎉`);

      switch (user.role) {
        case 'donor': router.push('/donor/dashboard'); break;
        case 'receiver':
        case 'volunteer': router.push('/receiver/dashboard'); break;
        default: router.push('/');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { value: 'donor', icon: '🍽️', label: 'Food Donor', desc: 'Restaurant, hotel, grocery, or event' },
    { value: 'receiver', icon: '🏛️', label: 'Food Receiver', desc: 'NGO, community kitchen, or shelter' },
    { value: 'volunteer', icon: '🙋', label: 'Volunteer', desc: 'Help with pickup and delivery' },
  ];

  const orgTypes = formData.role === 'donor'
    ? [
        { value: 'restaurant', label: 'Restaurant' },
        { value: 'hotel', label: 'Hotel' },
        { value: 'grocery', label: 'Grocery Store' },
        { value: 'event', label: 'Event / Catering' },
        { value: 'other', label: 'Other' },
      ]
    : [
        { value: 'ngo', label: 'NGO' },
        { value: 'community_kitchen', label: 'Community Kitchen' },
        { value: 'individual', label: 'Individual' },
        { value: 'other', label: 'Other' },
      ];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-24">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[20%] right-[10%] w-[400px] h-[400px] rounded-full bg-emerald-500/5 blur-3xl" />
        <div className="absolute bottom-[20%] left-[10%] w-[400px] h-[400px] rounded-full bg-indigo-500/5 blur-3xl" />
      </div>

      <div className="w-full max-w-lg relative">
        <div className="text-center mb-8 animate-fade-in">
          <div className="text-4xl mb-4">🌱</div>
          <h1 className="text-3xl font-bold">Join FoodBridge</h1>
          <p className="text-slate-400 mt-2">Create an account and start making impact</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${step >= 1 ? 'gradient-bg text-white' : 'bg-slate-700 text-slate-400'}`}>1</div>
          <div className={`w-16 h-0.5 ${step >= 2 ? 'bg-emerald-500' : 'bg-slate-700'}`} />
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${step >= 2 ? 'gradient-bg text-white' : 'bg-slate-700 text-slate-400'}`}>2</div>
        </div>

        <div className="card p-8 animate-fade-in">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-6">
              <FiAlertCircle size={16} />
              {error}
            </div>
          )}

          {step === 1 ? (
            <div className="space-y-5">
              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">I am a...</label>
                <div className="grid grid-cols-3 gap-3">
                  {roles.map(role => (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => update('role', role.value)}
                      className={`p-4 rounded-xl border text-center transition-all ${
                        formData.role === role.value
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="text-2xl mb-2">{role.icon}</div>
                      <div className="text-xs font-semibold">{role.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
                <div className="relative">
                  <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input type="text" value={formData.name} onChange={e => update('name', e.target.value)} className="input-field pl-10" placeholder="John Doe" required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input type="email" value={formData.email} onChange={e => update('email', e.target.value)} className="input-field pl-10" placeholder="you@example.com" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                  <div className="relative">
                    <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input type="password" value={formData.password} onChange={e => update('password', e.target.value)} className="input-field pl-10" placeholder="••••••" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Confirm</label>
                  <div className="relative">
                    <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input type="password" value={formData.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} className="input-field pl-10" placeholder="••••••" required />
                  </div>
                </div>
              </div>

              <button type="button" onClick={handleNext} className="btn-primary w-full justify-center py-3 text-base">
                Continue <FiArrowRight />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {formData.role !== 'volunteer' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Organization Name</label>
                    <div className="relative">
                      <FiBriefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <input type="text" value={formData.orgName} onChange={e => update('orgName', e.target.value)} className="input-field pl-10" placeholder="Your organization" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Organization Type</label>
                    <select value={formData.orgType} onChange={e => update('orgType', e.target.value)} className="input-field">
                      <option value="">Select type...</option>
                      {orgTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Phone Number</label>
                <div className="relative">
                  <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input type="tel" value={formData.phone} onChange={e => update('phone', e.target.value)} className="input-field pl-10" placeholder="+91-9876543210" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Address</label>
                <div className="relative">
                  <FiMapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input type="text" value={formData.address} onChange={e => update('address', e.target.value)} className="input-field pl-10" placeholder="Full address" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Latitude</label>
                  <input type="number" step="any" value={formData.latitude} onChange={e => update('latitude', e.target.value)} className="input-field" placeholder="28.6139" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Longitude</label>
                  <input type="number" step="any" value={formData.longitude} onChange={e => update('longitude', e.target.value)} className="input-field" placeholder="77.2090" />
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1 justify-center py-3">
                  <FiArrowLeft /> Back
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center py-3 text-base">
                  {loading ? 'Creating...' : <>Create Account <FiArrowRight /></>}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-400">
              Already have an account?{' '}
              <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-medium" style={{ textDecoration: 'none' }}>
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-400">Loading registration...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
