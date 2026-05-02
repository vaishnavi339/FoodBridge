'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

export default function HomePage() {
  const router = useRouter();
  const counterSectionRef = useRef(null);
  const elementsRef = useRef([]);

  useEffect(() => {
    // Counter Animation
    const animateCount = (element, target, duration, isPercentage = false) => {
      const start = performance.now();
      const step = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease out cubic
        let val = Math.floor(eased * target);
        element.innerText = val.toLocaleString() + (isPercentage ? '%' : (target > 5000 ? '+' : ''));
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const counterObserver = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        const els = entries[0].target.querySelectorAll('.counter-val');
        if (els.length >= 4 && els[0].innerText === '0') {
          animateCount(els[0], 12400, 2000);
          animateCount(els[1], 2847, 2000);
          animateCount(els[2], 143, 2000);
          animateCount(els[3], 98, 2000, true);
        }
      }
    }, { threshold: 0.3 });

    if (counterSectionRef.current) {
      counterObserver.observe(counterSectionRef.current);
    }

    // Slide up animations observer
    const slideObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.animationPlayState = 'running';
          slideObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    elementsRef.current.forEach(el => {
      if (el) {
        el.style.animationPlayState = 'paused';
        slideObserver.observe(el);
      }
    });

    return () => {
      counterObserver.disconnect();
      slideObserver.disconnect();
    };
  }, []);

  const addToRefs = (el) => {
    if (el && !elementsRef.current.includes(el)) {
      elementsRef.current.push(el);
    }
  };

  return (
    <div className="bg-[#0d1117] min-h-screen text-white font-sans overflow-x-hidden selection:bg-[#1D9E75] selection:text-white">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes pulseDot { 0%{box-shadow: 0 0 0 0 rgba(29, 158, 117, 0.4)} 70%{box-shadow: 0 0 0 6px rgba(29, 158, 117, 0)} 100%{box-shadow: 0 0 0 0 rgba(29, 158, 117, 0)} }
        .animate-float-0 { animation: float 3s ease-in-out infinite; }
        .animate-float-1 { animation: float 3s ease-in-out infinite 0.3s; }
        .animate-float-2 { animation: float 3s ease-in-out infinite 0.6s; }
        .animate-fade-in { animation: fadeIn 1s ease-out forwards; }
        .obs-slide-up { animation: slideUp 0.6s ease-out forwards; opacity: 0; }
        .pulse-badge { animation: pulseDot 2s infinite; }
      `}} />

      {/* Navbar - hidden on mobile, replaced by MobileTabBar */}
      <nav className="desktop-only sticky top-0 z-50 bg-[#0d1117] border-b border-[#21262d]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
              <span className="text-2xl">🌱</span>
              <span className="font-bold text-xl tracking-tight">FoodBridge</span>
            </div>
            {/* Desktop Center Links */}
            <div className="hidden md:flex space-x-8 text-sm font-medium text-slate-300">
              <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
              <a href="#impact" className="hover:text-white transition-colors">Impact</a>
              <a href="#for-ngos" className="hover:text-white transition-colors">For NGOs</a>
              <a href="#for-donors" className="hover:text-white transition-colors">For Donors</a>
            </div>
            {/* CTA Buttons */}
            <div className="flex items-center gap-4">
              <Link href="/login" className="hidden sm:block text-sm font-medium text-slate-300 hover:text-white transition-colors">Sign in</Link>
              <Link href="/signup" className="text-sm font-semibold bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white px-4 py-2 rounded-lg transition-colors">Join now</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Section 1 - Hero */}
      <section className="w-full min-h-[90vh] flex flex-col items-center justify-center pt-10 pb-20 px-4 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1D9E75]/10 via-[#0d1117] to-[#0d1117] pointer-events-none" />
        
        <div className="text-center z-10 max-w-4xl mx-auto w-full">
          <h1 className="text-[28px] sm:text-[48px] font-[600] leading-tight mb-6 animate-fade-in">
            Every meal saved is
            <br />
            <span className="text-[#1D9E75]">a life changed</span>
          </h1>
          
          <p className="text-[18px] text-slate-400 max-w-[560px] mx-auto mb-10 leading-relaxed animate-fade-in" style={{animationDelay: '0.1s'}}>
            FoodBridge connects surplus food from restaurants, hotels and events to NGOs and communities who need it most — in real time.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20 animate-fade-in" style={{animationDelay: '0.2s'}}>
            <Link href="/signup?role=donor" className="w-full sm:w-auto flex items-center justify-center bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white font-semibold h-[48px] px-[20px] rounded-xl transition-all shadow-lg shadow-[#1D9E75]/20">
              Donate food
            </Link>
            <Link href="/signup?role=receiver" className="w-full sm:w-auto flex items-center justify-center bg-transparent border border-[#1D9E75] text-[#1D9E75] hover:bg-[#1D9E75]/10 font-semibold h-[48px] px-[20px] rounded-xl transition-all">
              Find food near me
            </Link>
          </div>

          {/* Hero Visual Stat Cards */}
          <div className="flex flex-row sm:justify-center items-center gap-4 animate-fade-in scroll-row w-full px-4" style={{animationDelay: '0.3s'}}>
            <div className="bg-[#161b22] border border-[#21262d] rounded-[12px] p-4 flex flex-col items-center justify-center min-w-[140px] sm:w-40 shadow-xl animate-float-0 shrink-0">
              <span className="text-xl sm:text-2xl font-bold text-[#1D9E75]">2,847 kg</span>
              <span className="text-[10px] sm:text-xs text-slate-400 mt-1">food saved this week</span>
            </div>
            <div className="bg-[#161b22] border border-[#21262d] rounded-[12px] p-4 flex flex-col items-center justify-center min-w-[140px] sm:w-40 shadow-xl animate-float-1 shrink-0">
              <span className="text-xl sm:text-2xl font-bold text-[#378ADD]">143 NGOs</span>
              <span className="text-[10px] sm:text-xs text-slate-400 mt-1">active on platform</span>
            </div>
            <div className="bg-[#161b22] border border-[#21262d] rounded-[12px] p-4 flex flex-col items-center justify-center min-w-[140px] sm:w-40 shadow-xl animate-float-2 shrink-0">
              <span className="text-xl sm:text-2xl font-bold text-[#EF9F27]">6 min</span>
              <span className="text-[10px] sm:text-xs text-slate-400 mt-1">avg matching time</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2 - Live impact counter */}
      <section id="impact" ref={counterSectionRef} className="w-full bg-[#0d1117] border-y border-[#21262d] py-16">
        <div className="max-w-5xl mx-auto px-4 w-full flex flex-col sm:flex-row justify-center divide-y sm:divide-y-0 sm:divide-x divide-[#21262d]">
          <div className="flex flex-col items-center px-8 py-6 sm:py-0 w-full sm:w-1/4">
            <span className="counter-val text-[48px] font-[600] text-white">0</span>
            <span className="text-[14px] text-slate-400">people fed</span>
          </div>
          <div className="flex flex-col items-center px-8 py-6 sm:py-0 w-full sm:w-1/4">
            <span className="counter-val text-[48px] font-[600] text-white">0</span>
            <span className="text-[14px] text-slate-400">food rescued</span>
          </div>
          <div className="flex flex-col items-center px-8 py-6 sm:py-0 w-full sm:w-1/4">
            <span className="counter-val text-[48px] font-[600] text-white">0</span>
            <span className="text-[14px] text-slate-400">NGOs onboarded</span>
          </div>
          <div className="flex flex-col items-center px-8 py-6 sm:py-0 w-full sm:w-1/4">
            <span className="counter-val text-[48px] font-[600] text-white">0</span>
            <span className="text-[14px] text-slate-400">match success rate</span>
          </div>
        </div>
      </section>

      {/* Section 3 - How it works */}
      <section id="how-it-works" className="w-full py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16 text-white obs-slide-up" ref={addToRefs}>From surplus to served in minutes</h2>
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative">
            {/* Step 1 */}
            <div className="w-full md:w-1/3 bg-[#161b22] border border-[#21262d] rounded-[12px] p-8 hover:border-[#1D9E75] transition-colors z-10 obs-slide-up" style={{animationDelay: '0.1s'}} ref={addToRefs}>
              <div className="w-12 h-12 rounded-full bg-[#1D9E75]/10 flex flex-col items-center justify-center mb-6">
                <svg className="w-6 h-6 text-[#1D9E75]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Post in 2 minutes</h3>
              <p className="text-sm text-slate-400 line-clamp-3">Snap a photo, add quantity and expiry time. Our smart form takes under 2 minutes to complete.</p>
            </div>

            <svg className="hidden md:block w-8 h-8 text-[#21262d] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>

            {/* Step 2 */}
            <div className="w-full md:w-1/3 bg-[#161b22] border border-[#21262d] rounded-[12px] p-8 hover:border-[#EF9F27] transition-colors z-10 obs-slide-up" style={{animationDelay: '0.2s'}} ref={addToRefs}>
              <div className="w-12 h-12 rounded-full bg-[#EF9F27]/10 flex flex-col items-center justify-center mb-6">
                <svg className="w-6 h-6 text-[#EF9F27]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Smart matching</h3>
              <p className="text-sm text-slate-400">Our algorithm finds the nearest NGO based on distance, urgency, and capacity — no manual coordination.</p>
            </div>

            <svg className="hidden md:block w-8 h-8 text-[#21262d] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>

            {/* Step 3 */}
            <div className="w-full md:w-1/3 bg-[#161b22] border border-[#21262d] rounded-[12px] p-8 hover:border-[#378ADD] transition-colors z-10 obs-slide-up" style={{animationDelay: '0.3s'}} ref={addToRefs}>
              <div className="w-12 h-12 rounded-full bg-[#378ADD]/10 flex flex-col items-center justify-center mb-6">
                <svg className="w-6 h-6 text-[#378ADD]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Delivered with tracking</h3>
              <p className="text-sm text-slate-400">Volunteers pick up and deliver with live GPS tracking. Both parties get real-time status updates.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4 - For Donors */}
      <section id="for-donors" className="w-full py-24 px-4 bg-[#161b22]/30 border-t border-[#21262d]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-16">
          <div className="w-full md:w-1/2 obs-slide-up" ref={addToRefs}>
            <div className="inline-block px-3 py-1 rounded-full bg-[#1D9E75]/10 text-[#1D9E75] text-xs font-bold mb-6 border border-[#1D9E75]/20">
              For restaurants, hotels & events
            </div>
            <h2 className="text-3xl font-bold mb-8 text-white">Turn your surplus into impact</h2>
            
            <ul className="space-y-5 mb-10">
              <li className="flex items-start text-slate-300">
                <svg className="w-6 h-6 text-[#1D9E75] mr-3 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                Zero cost, zero hassle — we handle matching and logistics
              </li>
              <li className="flex items-start text-slate-300">
                <svg className="w-6 h-6 text-[#1D9E75] mr-3 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                Real-time confirmation — know exactly where your food goes
              </li>
              <li className="flex items-start text-slate-300">
                <svg className="w-6 h-6 text-[#1D9E75] mr-3 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                Impact certificate — get monthly reports for CSR documentation
              </li>
            </ul>

            <Link href="/signup?role=donor" className="inline-flex bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white font-semibold py-3.5 px-6 rounded-xl transition-all shadow-md">
              Start donating
            </Link>
          </div>
          
          <div className="w-full md:w-1/2 obs-slide-up" ref={addToRefs}>
            {/* Mockup Card */}
            <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-6 shadow-2xl relative select-none max-w-md mx-auto">
              <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 bg-[#1D9E75]/10 border border-[#1D9E75]/20 rounded-full">
                <div className="w-2 h-2 rounded-full bg-[#1D9E75] pulse-badge"></div>
                <span className="text-[#1D9E75] text-xs font-bold uppercase tracking-wider">Live</span>
              </div>
              <h3 className="text-lg font-bold mb-4 text-white">Post food</h3>
              
              <div className="space-y-4">
                <div className="h-12 bg-[#0d1117] border border-[#21262d] rounded-xl flex items-center px-4 text-slate-400 text-sm">
                  Buffet Surplus — 2 Trays
                </div>
                <div className="flex gap-4">
                  <div className="flex-1 h-12 bg-[#0d1117] border border-[#21262d] rounded-xl flex items-center px-4 text-slate-400 text-sm">
                    10 kg
                  </div>
                  <div className="flex-1 h-12 bg-[#0d1117] border border-[#21262d] rounded-xl flex items-center px-4 text-slate-400 text-sm">
                    Expires in 4h
                  </div>
                </div>
                <div className="w-full h-12 bg-[#1D9E75]/20 border border-[#1D9E75]/50 flex items-center justify-center text-[#1D9E75] font-semibold text-sm rounded-xl">
                  Find NGO match
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5 - For NGOs */}
      <section id="for-ngos" className="w-full py-24 px-4">
        <div className="max-w-6xl mx-auto flex flex-col-reverse md:flex-row items-center gap-16">
          <div className="w-full md:w-1/2 obs-slide-up" ref={addToRefs}>
            {/* Mockup Card */}
             <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-6 shadow-2xl select-none max-w-md mx-auto">
              <h3 className="text-lg font-bold mb-4 text-white">Food near you</h3>
              <div className="space-y-3">
                <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-4 flex">
                  <div className="w-1 h-full bg-[#EF9F27] rounded-full mr-3 shrink-0"></div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-white">Fresh Bread & Pastries</h4>
                    <p className="text-xs text-slate-500 mb-3">Baker's Delight • 2.1 km away</p>
                    <div className="w-full h-8 bg-[#378ADD] text-white text-xs font-bold rounded-lg flex items-center justify-center">Claim</div>
                  </div>
                </div>
                <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-4 flex opacity-60">
                   <div className="w-1 h-full bg-red-400 rounded-full mr-3 shrink-0"></div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-white">Cooked Rice (20kg)</h4>
                    <p className="text-xs text-slate-500 mb-3">Event Caterers • 5.4 km away</p>
                    <div className="w-full h-8 bg-[#378ADD] text-white text-xs font-bold rounded-lg flex items-center justify-center">Claim</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="w-full md:w-1/2 obs-slide-up" ref={addToRefs}>
            <div className="inline-block px-3 py-1 rounded-full bg-[#378ADD]/10 text-[#378ADD] text-xs font-bold mb-6 border border-[#378ADD]/20">
              For NGOs and community kitchens
            </div>
            <h2 className="text-3xl font-bold mb-8 text-white">Never miss available food nearby</h2>
            
            <ul className="space-y-5 mb-10">
              <li className="flex items-start text-slate-300">
                <svg className="w-6 h-6 text-[#378ADD] mr-3 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                Real-time alerts when food is available in your area
              </li>
              <li className="flex items-start text-slate-300">
                <svg className="w-6 h-6 text-[#378ADD] mr-3 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                Filter by food type, quantity, and distance
              </li>
              <li className="flex items-start text-slate-300">
                <svg className="w-6 h-6 text-[#378ADD] mr-3 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                Verified donor network — safe, reliable, consistent
              </li>
            </ul>

            <Link href="/signup?role=receiver" className="inline-flex bg-[#378ADD] hover:bg-[#378ADD]/90 text-white font-semibold py-3.5 px-6 rounded-xl transition-all shadow-md">
              Register your NGO
            </Link>
          </div>
        </div>
      </section>

      {/* Section 6 - Testimonials */}
      <section className="w-full py-24 px-4 bg-[#161b22]/30 border-y border-[#21262d]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16 text-white obs-slide-up" ref={addToRefs}>Trusted by donors and NGOs across Delhi</h2>
          
          <div className="flex flex-row md:grid md:grid-cols-3 gap-6 scroll-row pb-6">
            <div className="bg-[#161b22] border border-[#21262d] rounded-[16px] p-8 flex flex-col relative obs-slide-up min-w-[85vw] md:min-w-0" ref={addToRefs} style={{animationDelay: '0s'}}>
              <span className="text-5xl font-serif text-[#1D9E75] absolute top-6 left-6 leading-none">"</span>
              <p className="text-sm text-slate-300 mb-8 mt-6 relative z-10 leading-relaxed italic">
                We used to throw away 20kg of food every day. FoodBridge changed that completely.
              </p>
              <div className="mt-auto border-t border-[#21262d] pt-4">
                <div className="font-bold text-sm text-white">— Rajesh Kumar</div>
                <div className="text-xs text-slate-500 mb-2">Head Chef, Taj Palace Hotel</div>
                <div className="flex text-[#EF9F27] text-sm">★★★★★</div>
              </div>
            </div>

            <div className="bg-[#161b22] border border-[#21262d] rounded-[16px] p-8 flex flex-col relative obs-slide-up min-w-[85vw] md:min-w-0" ref={addToRefs} style={{animationDelay: '0.1s'}}>
               <span className="text-5xl font-serif text-[#1D9E75] absolute top-6 left-6 leading-none">"</span>
              <p className="text-sm text-slate-300 mb-8 mt-6 relative z-10 leading-relaxed italic">
                We now receive 3–4 donations weekly. The real-time matching is incredible.
              </p>
              <div className="mt-auto border-t border-[#21262d] pt-4">
                <div className="font-bold text-sm text-white">— Priya Singh</div>
                <div className="text-xs text-slate-500 mb-2">Director, Asha Foundation</div>
                <div className="flex text-[#EF9F27] text-sm">★★★★★</div>
              </div>
            </div>

            <div className="bg-[#161b22] border border-[#21262d] rounded-[16px] p-8 flex flex-col relative obs-slide-up min-w-[85vw] md:min-w-0" ref={addToRefs} style={{animationDelay: '0.2s'}}>
               <span className="text-5xl font-serif text-[#1D9E75] absolute top-6 left-6 leading-none">"</span>
              <p className="text-sm text-slate-300 mb-8 mt-6 relative z-10 leading-relaxed italic">
                Setup took 5 minutes. First donation matched in under 10 minutes. Absolutely seamless.
              </p>
              <div className="mt-auto border-t border-[#21262d] pt-4">
                <div className="font-bold text-sm text-white">— Amit Verma</div>
                <div className="text-xs text-slate-500 mb-2">Event Manager, Spice Route</div>
                <div className="flex text-[#EF9F27] text-sm">★★★★★</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 7 - CTA banner */}
      <section className="w-full py-24 px-4 bg-[#0f2a1e] border-y border-[#1D9E75]/50">
        <div className="max-w-4xl mx-auto text-center obs-slide-up" ref={addToRefs}>
          <h2 className="text-[32px] font-bold text-white mb-4">Ready to make a difference?</h2>
          <p className="text-emerald-500/70 text-lg mb-10">Join 500+ donors and 143 NGOs already on FoodBridge</p>
          
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
             <Link href="/signup?role=donor" className="w-full sm:w-auto text-center bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white font-semibold py-3.5 px-6 rounded-xl transition-all shadow-md">
              I want to donate food
            </Link>
             <Link href="/signup?role=receiver" className="w-full sm:w-auto text-center bg-transparent border border-[#1D9E75] text-[#1D9E75] hover:bg-[#1D9E75]/10 font-semibold py-3.5 px-6 rounded-xl transition-all">
              I represent an NGO
            </Link>
          </div>
        </div>
      </section>

      {/* Section 8 - Footer */}
      <footer className="w-full bg-[#161b22] border-t border-[#21262d] pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4 cursor-pointer">
                <span className="text-2xl">🌱</span>
                <span className="font-bold text-xl text-white tracking-tight">FoodBridge</span>
              </div>
              <p className="text-sm text-slate-400">Made with purpose in Delhi</p>
            </div>
            
            <details className="md:hidden group">
              <summary className="font-bold text-white mb-1 cursor-pointer list-none flex justify-between items-center border-b border-[#21262d] pb-2">
                Company <span className="text-[#1D9E75] group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="flex flex-col space-y-3 text-sm text-slate-400 mt-3 pl-2">
                <a href="#" className="hover:text-white transition-colors">About</a>
                <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
                <a href="#" className="hover:text-white transition-colors">Impact report</a>
                <a href="#" className="hover:text-white transition-colors">Contact</a>
              </div>
            </details>
            <div className="hidden md:flex flex-col space-y-3 text-sm text-slate-400">
              <span className="font-bold text-white mb-1">Company</span>
              <a href="#" className="hover:text-white transition-colors">About</a>
              <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
              <a href="#" className="hover:text-white transition-colors">Impact report</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>

            <details className="md:hidden group">
              <summary className="font-bold text-white mb-1 cursor-pointer list-none flex justify-between items-center border-b border-[#21262d] pb-2">
                Platform <span className="text-[#1D9E75] group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="flex flex-col space-y-3 text-sm text-slate-400 mt-3 pl-2">
                 <a href="/signup?role=donor" className="hover:text-white transition-colors">For Donors</a>
                 <a href="/signup?role=receiver" className="hover:text-white transition-colors">For NGOs</a>
                 <a href="/login" className="hover:text-white transition-colors">Volunteer portal</a>
                 <a href="/admin" className="hover:text-white transition-colors mt-4">Admin login</a>
              </div>
            </details>
            <div className="hidden md:flex flex-col space-y-3 text-sm text-slate-400">
               <span className="font-bold text-white mb-1">Platform</span>
               <a href="/signup?role=donor" className="hover:text-white transition-colors">For Donors</a>
               <a href="/signup?role=receiver" className="hover:text-white transition-colors">For NGOs</a>
               <a href="/login" className="hover:text-white transition-colors">Volunteer portal</a>
               <a href="/admin" className="hover:text-white transition-colors mt-4">Admin login</a>
            </div>
          </div>
          
          <div className="text-center pt-8 border-t border-[#21262d]">
            <p className="text-sm text-slate-500">© 2024 FoodBridge. Built to reduce food waste.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}


