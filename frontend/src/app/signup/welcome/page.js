'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function SignupWelcome() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [stats, setStats] = useState({ kg: 0, ngos: 0, people: 0 });
  const [role, setRole] = useState(null);
  const [name, setName] = useState('');

  useEffect(() => {
    // We can pull role/name from Auth context if hydrated, or from localStorage
    const saved = JSON.parse(localStorage.getItem('signup_progress') || '{}');
    if (!user && !saved.role) {
      router.push('/');
      return;
    }
    
    setRole(user?.role || saved.role);
    setName(user?.name || saved.formData?.name || 'User');
    
    // Clear localStorage on successful finish
    localStorage.removeItem('signup_progress');

    // Run impact counters
    const animateCount = (target, duration, key) => {
      const start = performance.now();
      const step = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        setStats(prev => ({ ...prev, [key]: Math.round(progress * target) }));
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    // Delay stat animation slightly for better effect
    setTimeout(() => {
      animateCount(2847, 2000, 'kg');
      animateCount(143, 2000, 'ngos');
      animateCount(12400, 2000, 'people');
    }, 500);

  }, [user, router]);

  if (!role) return null;

  const roleColor = role === 'donor' ? '#1D9E75' : '#378ADD';
  const roleLabel = role === 'donor' ? 'Donor' : 'NGO / Volunteer';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <style>{`
        @keyframes drawCircle {
          0% { stroke-dashoffset: 157; opacity: 0; }
          10% { opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 1; }
        }
        @keyframes drawCheck {
          0% { stroke-dashoffset: 50; opacity: 0; }
          50% { stroke-dashoffset: 50; opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 1; }
        }
        .animate-circle {
          stroke-dasharray: 157;
          stroke-dashoffset: 157;
          animation: drawCircle 0.8s ease-out forwards;
        }
        .animate-check {
          stroke-dasharray: 50;
          stroke-dashoffset: 50;
          animation: drawCheck 0.8s ease-out forwards;
          animation-delay: 0.2s;
        }
      `}</style>

      <div className="w-full max-w-lg mb-12 flex flex-col items-center">
        {/* Animated Checkmark */}
        <div className="mb-6 relative w-24 h-24 flex items-center justify-center">
          <svg className="w-full h-full text-[#1D9E75]" viewBox="0 0 52 52">
            <circle className="animate-circle" cx="26" cy="26" r="25" fill="none" stroke="currentColor" strokeWidth="2" />
            <path className="animate-check" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
          </svg>
        </div>

        <h1 className="text-[24px] font-bold text-white mb-4 text-center">
          Welcome to FoodBridge, {name.split(' ')[0]}!
        </h1>
        
        <span 
          className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full text-white shadow-sm"
          style={{ backgroundColor: roleColor }}
        >
          {roleLabel}
        </span>
      </div>

      <div className="w-full max-w-lg">
        {role === 'donor' ? (
          <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-8 shadow-xl mb-10 text-center">
            <h2 className="text-xl font-bold text-white mb-6">You're all set! Make your first donation</h2>
            
            {/* Horizontal mini-stepper */}
            <div className="flex items-center justify-between gap-2 mb-8 text-xs font-medium">
              <div className="flex-1">
                <div className="h-2 w-full bg-[#1D9E75] rounded-full mb-2"></div>
                <span className="text-[#1D9E75]">Post food</span>
              </div>
              <div className="flex-1">
                <div className="h-2 w-full bg-[#21262d] rounded-full mb-2"></div>
                <span className="text-slate-500">Get Matched</span>
              </div>
              <div className="flex-1">
                <div className="h-2 w-full bg-[#21262d] rounded-full mb-2"></div>
                <span className="text-slate-500">Complete</span>
              </div>
            </div>

            <Link 
              href="/donor/donate" 
              className="block w-full bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white font-semibold py-4 px-4 rounded-xl transition-all shadow-md mb-4"
            >
              Post your first listing →
            </Link>
            
            <Link 
              href="/donor/dashboard" 
              className="block w-full bg-transparent border border-[#21262d] hover:bg-[#21262d] text-slate-300 font-semibold py-3.5 px-4 rounded-xl transition-all"
            >
              Explore dashboard first
            </Link>
          </div>
        ) : (
          <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-8 shadow-xl mb-10 text-center">
            <div className="flex justify-center mb-6">
              <svg className="w-12 h-12 text-[#EF9F27]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Your account is under review</h2>
            <p className="text-slate-400 text-sm mb-6">We'll notify you at your email within 24–48 hours once verified.</p>
            
            {/* Progress indicator */}
            <div className="flex items-center justify-between gap-1 mb-8 text-xs font-medium">
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-[#1D9E75] flex items-center justify-center text-white mb-2">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <span className="text-[#1D9E75]">Submitted</span>
              </div>
              <div className="h-0.5 flex-1 bg-[#EF9F27] mx-1 mb-6"></div>
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-[#EF9F27] flex items-center justify-center text-white mb-2 shadow-[0_0_0_3px_rgba(239,159,39,0.2)]">
                  <span className="w-2 h-2 bg-white rounded-full"></span>
                </div>
                <span className="text-[#EF9F27]">Under review</span>
              </div>
              <div className="h-0.5 flex-1 bg-[#21262d] mx-1 mb-6"></div>
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-[#21262d] text-slate-500 flex items-center justify-center mb-2">
                  3
                </div>
                <span className="text-slate-500">Approved</span>
              </div>
            </div>

            <Link 
              href="/receiver/dashboard" 
              className="block w-full bg-[#378ADD] hover:bg-[#378ADD]/90 text-white font-semibold py-4 px-4 rounded-xl transition-all shadow-md"
            >
              Explore the platform
            </Link>
          </div>
        )}
      </div>

      {/* Impact Counters */}
      <div className="w-full max-w-xl">
        <h3 className="text-center text-xs font-semibold text-slate-500 uppercase tracking-widest mb-6">Real-time platform impact</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold mb-1 text-emerald-400">{stats.kg.toLocaleString()}</div>
            <div className="text-xs text-slate-400 leading-tight">kg food saved</div>
          </div>
          <div className="text-center border-x border-[#21262d]">
            <div className="text-2xl font-bold mb-1 text-[#378ADD]">{stats.ngos.toLocaleString()}</div>
            <div className="text-xs text-slate-400 leading-tight">NGOs active</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold mb-1 text-amber-400">{stats.people.toLocaleString()}</div>
            <div className="text-xs text-slate-400 leading-tight">people fed</div>
          </div>
        </div>
      </div>
    </div>
  );
}
