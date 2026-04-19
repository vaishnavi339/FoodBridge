'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Stepper from '../components/Stepper';

export default function SignupDetails() {
  const router = useRouter();
  const [role, setRole] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('signup_progress') || '{}');
    if (!saved.role) {
      router.push('/signup'); // redirect if no role
      return;
    }
    setRole(saved.role);
    if (saved.formData) {
      setFormData(prev => ({ ...prev, ...saved.formData }));
    }
  }, [router]);

  useEffect(() => {
    if (role) {
      const existing = JSON.parse(localStorage.getItem('signup_progress') || '{}');
      localStorage.setItem('signup_progress', JSON.stringify({ 
        ...existing, 
        step: 1, 
        role, 
        formData: { ...existing.formData, ...formData } 
      }));
    }
  }, [formData, role]);

  const validate = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Full name is required';
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      errors.email = 'Invalid email address';
    }

    const phoneRegex = /^[0-9]{10}$/;
    if (!formData.phone) {
      errors.phone = 'Phone number is required';
    } else if (!phoneRegex.test(formData.phone)) {
      errors.phone = 'Must be exactly 10 digits';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Must confirm password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    return errors;
  };

  const errors = validate();
  const isValid = Object.keys(errors).length === 0;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBlur = (e) => {
    setTouched(prev => ({ ...prev, [e.target.name]: true }));
  };

  const getStrength = (pwd) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const strengthScore = getStrength(formData.password);
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strengthScore] || '';
  const strengthColors = ['bg-[#21262d]', 'bg-[#e24b4a]', 'bg-[#EF9F27]', 'bg-[#1D9E75]', 'bg-[#10b981]'];

  const roleColor = role === 'donor' ? '#1D9E75' : '#378ADD';
  const roleLabel = role === 'donor' ? 'Donor' : 'NGO / Volunteer';
  const activeColorClass = role === 'donor' ? 'bg-[#1D9E75]' : 'bg-[#378ADD]';

  const handleContinue = () => {
    if (isValid) {
      router.push('/signup/profile');
    }
  };

  const ErrorMsg = ({ msg }) => (
    <div className="flex items-center text-[#e24b4a] mt-1 text-xs font-medium">
      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
      {msg}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-[520px]">
        <Link href="/signup" className="text-sm text-slate-400 hover:text-white flex items-center mb-6 w-fit transition-colors">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Back
        </Link>
        
        <Stepper currentStep={1} />
        
        <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-6 sm:p-8 shadow-xl">
          <div className="flex justify-center mb-6">
            <span 
              className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full text-white shadow-sm"
              style={{ backgroundColor: roleColor }}
            >
              {roleLabel}
            </span>
          </div>

          <h2 className="text-2xl font-bold text-center text-white mb-8">Account Details</h2>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Full name</label>
              <input 
                type="text" 
                name="name"
                value={formData.name}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full bg-[#0d1117] border px-4 py-2.5 rounded-xl text-white outline-none transition-colors ${touched.name && errors.name ? 'border-[#e24b4a]' : 'border-[#21262d] focus:border-slate-400'}`}
                placeholder="John Doe"
              />
              {touched.name && errors.name && <ErrorMsg msg={errors.name} />}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email address</label>
              <input 
                type="email" 
                name="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full bg-[#0d1117] border px-4 py-2.5 rounded-xl text-white outline-none transition-colors ${touched.email && errors.email ? 'border-[#e24b4a]' : (!errors.email && formData.email) ? 'border-[#1D9E75]' : 'border-[#21262d] focus:border-slate-400'}`}
                placeholder="you@example.com"
              />
              {touched.email && errors.email && <ErrorMsg msg={errors.email} />}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Phone number</label>
              <div className="relative flex">
                <div className="flex items-center bg-[#21262d] border border-r-0 border-[#21262d] px-3 rounded-l-xl text-sm text-slate-300">
                  +91
                </div>
                <input 
                  type="text" 
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  maxLength="10"
                  className={`w-full bg-[#0d1117] border px-4 py-2.5 rounded-r-xl text-white outline-none transition-colors ${touched.phone && errors.phone ? 'border-[#e24b4a]' : 'border-[#21262d] focus:border-slate-400'}`}
                  placeholder="9876543210"
                />
              </div>
              {touched.phone && errors.phone && <ErrorMsg msg={errors.phone} />}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full bg-[#0d1117] border px-4 py-2.5 pr-10 rounded-xl text-white outline-none transition-colors ${touched.password && errors.password ? 'border-[#e24b4a]' : 'border-[#21262d] focus:border-slate-400'}`}
                  placeholder="••••••••"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                  )}
                </button>
              </div>
              
              {/* Strength Meter */}
              {formData.password && (
                <div className="mt-2">
                  <div className="flex gap-1 h-1.5 mb-1.5">
                    {[1, 2, 3, 4].map((level) => (
                      <div 
                        key={level} 
                        className={`flex-1 rounded-full ${strengthScore >= level ? strengthColors[strengthScore] : 'bg-[#21262d]'}`}
                      />
                    ))}
                  </div>
                  <div className={`text-xs text-right font-medium ${strengthColors[strengthScore].replace('bg-', 'text-')}`}>
                    {strengthLabel}
                  </div>
                </div>
              )}
              {touched.password && errors.password && <ErrorMsg msg={errors.password} />}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirm password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full bg-[#0d1117] border px-4 py-2.5 pr-10 rounded-xl text-white outline-none transition-colors ${touched.confirmPassword && errors.confirmPassword ? 'border-[#e24b4a]' : (!errors.confirmPassword && formData.confirmPassword) ? 'border-[#1D9E75]' : 'border-[#21262d] focus:border-slate-400'}`}
                  placeholder="••••••••"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {formData.confirmPassword && !errors.confirmPassword ? (
                    <svg className="w-5 h-5 text-[#1D9E75]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  ) : touched.confirmPassword && errors.confirmPassword ? (
                    <svg className="w-5 h-5 text-[#e24b4a]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  ) : null}
                </div>
              </div>
              {touched.confirmPassword && errors.confirmPassword && <ErrorMsg msg={errors.confirmPassword} />}
            </div>
          </div>

          <button 
            onClick={handleContinue}
            disabled={!isValid}
            className={`w-full mt-8 font-semibold py-3.5 px-4 rounded-xl transition-all ${
              isValid ? `${activeColorClass} text-white shadow-md hover:brightness-110` : 'bg-[#21262d] text-slate-500 cursor-not-allowed'
            }`}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
