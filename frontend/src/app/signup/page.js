'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function SignupRoleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRole = searchParams.get('role');
  const [role, setRole] = useState(defaultRole || null);

  const handleRoleSelect = (selectedRole) => {
    setRole(selectedRole);
    const existing = JSON.parse(localStorage.getItem('signup_progress') || '{}');
    localStorage.setItem('signup_progress', JSON.stringify({ ...existing, role: selectedRole, step: 1 }));
    router.push('/signup/details');
  };

  useEffect(() => {
    if (defaultRole) {
       handleRoleSelect(defaultRole);
       return;
    }
    const saved = JSON.parse(localStorage.getItem('signup_progress') || '{}');
    if (saved.role) {
      setRole(saved.role);
    }
  }, [defaultRole]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center mb-10 w-full max-w-4xl">
        <div className="flex justify-center items-center gap-2 mb-4">
          <span className="text-4xl">🌱</span>
          <h1 className="text-3xl font-bold text-white tracking-tight">FoodBridge</h1>
        </div>
        <h2 className="text-xl text-slate-300 font-medium">Join FoodBridge — how will you contribute?</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-4xl">
        {/* Donor Card */}
        <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-6 md:p-8 flex flex-col hover:border-[#1D9E75]/50 transition-colors shadow-lg">
          <div className="h-16 w-16 bg-[#1D9E75]/10 rounded-full flex items-center justify-center mb-6">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">I'm a food donor</h3>
          <p className="text-slate-400 mb-6 text-sm">Restaurant, hotel, grocery store, or event organizer</p>
          
          <ul className="space-y-3 mb-8 flex-1">
            <li className="flex items-start text-sm text-slate-400">
              <svg className="w-5 h-5 text-[#1D9E75] mr-3 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              Post surplus food in under 2 minutes
            </li>
            <li className="flex items-start text-sm text-slate-400">
              <svg className="w-5 h-5 text-[#1D9E75] mr-3 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              Get matched with nearby NGOs instantly
            </li>
            <li className="flex items-start text-sm text-slate-400">
              <svg className="w-5 h-5 text-[#1D9E75] mr-3 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              Track your impact and donation history
            </li>
          </ul>
          
          <button 
            onClick={() => handleRoleSelect('donor')}
            className="w-full bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white font-semibold py-3.5 px-4 rounded-xl transition-colors shadow-md shadow-[#1D9E75]/20"
          >
            Continue as donor
          </button>
        </div>

        {/* NGO Card */}
        <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-6 md:p-8 flex flex-col hover:border-[#378ADD]/50 transition-colors shadow-lg">
          <div className="h-16 w-16 bg-[#378ADD]/10 rounded-full flex items-center justify-center mb-6">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" stroke="#378ADD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">I'm an NGO or volunteer</h3>
          <p className="text-slate-400 mb-6 text-sm">Registered NGO, community kitchen, or individual volunteer</p>
          
          <ul className="space-y-3 mb-8 flex-1">
            <li className="flex items-start text-sm text-slate-400">
              <svg className="w-5 h-5 text-[#378ADD] mr-3 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              Discover available food near you
            </li>
            <li className="flex items-start text-sm text-slate-400">
              <svg className="w-5 h-5 text-[#378ADD] mr-3 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              Claim and coordinate pickup in real time
            </li>
            <li className="flex items-start text-sm text-slate-400">
              <svg className="w-5 h-5 text-[#378ADD] mr-3 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              Manage deliveries and track impact
            </li>
          </ul>
          
          <button 
            onClick={() => handleRoleSelect('receiver')}
            className="w-full bg-[#378ADD] hover:bg-[#378ADD]/90 text-white font-semibold py-3.5 px-4 rounded-xl transition-colors shadow-md shadow-[#378ADD]/20"
          >
            Continue as NGO / volunteer
          </button>
        </div>
      </div>

      <div className="mt-10">
        <p className="text-slate-400 text-sm">
          Already have an account?{' '}
          <Link href="/login" className="text-white hover:underline decoration-[#1D9E75] underline-offset-4 transition-all">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupRoleSelection() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white">Loading...</div>}>
      <SignupRoleContent />
    </Suspense>
  );
}
