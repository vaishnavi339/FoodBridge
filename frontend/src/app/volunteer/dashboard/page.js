'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { FiMenu, FiX, FiBell, FiMapPin, FiClock, FiStar, FiFilter, FiCheck, FiTruck, FiDollarSign } from 'react-icons/fi';
import toast from 'react-hot-toast';

const DeliveryMap = dynamic(() => import('./MapComponent'), { 
  ssr: false, 
  loading: () => (
    <div style={{ height: '400px', background: '#161b22', borderRadius: '12px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#8b949e', fontSize: '14px' }}>
      Loading map...
    </div>
  )
});

export default function VolunteerDashboard() {
  const { user } = useAuth();
  const socket = useSocket();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Dashboard State
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'history'
  const [isAvailable, setIsAvailable] = useState(true);
  const [vehicle, setVehicle] = useState('Bike');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  
  // Tasks Feed State
  const [radius, setRadius] = useState(5);
  const [availableTasks, setAvailableTasks] = useState([]);
  
  // Active Delivery State
  const [activeDelivery, setActiveDelivery] = useState(null); // null if none
  const [deliveryStatus, setDeliveryStatus] = useState('accepted'); // accepted -> picked_up -> delivered
  const [volunteerLocation, setVolunteerLocation] = useState(null);
  
  // Mock initialization
  useEffect(() => {
    // Generate some mock tasks
    setAvailableTasks([
      {
        id: 'task-1',
        food: 'Buffet Surplus (25 kg)',
        donor: 'Taj Palace Hotel, Chanakyapuri',
        ngo: 'Asha NGO, Lajpat Nagar',
        pickupDistance: 2.1,
        totalDistance: 6.9,
        estTime: '18 min',
        urgency: 'high', // high/medium/low
        expiryHours: 2,
        payout: 45,
        lat1: 28.59, lng1: 77.16,
        lat2: 28.56, lng2: 77.24,
      },
      {
        id: 'task-2',
        food: 'Fresh Bread & Pastries',
        donor: "Baker's Delight, Connaught Place",
        ngo: 'Hope Foundation, Paharganj',
        pickupDistance: 0.8,
        totalDistance: 2.2,
        estTime: '8 min',
        urgency: 'low',
        expiryHours: 12,
        payout: 0,
        lat1: 28.63, lng1: 77.21,
        lat2: 28.64, lng2: 77.21,
      }
    ]);
  }, []);

  const toggleAvailability = async () => {
    const newVal = !isAvailable;
    setIsAvailable(newVal);
    toast.success(newVal ? 'You are now online' : 'You are off duty');
    try {
      await fetch('/api/volunteers/availability', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ available: newVal })
      });
    } catch (e) {}
  };

  useEffect(() => {
    if (!activeDelivery || !('geolocation' in navigator)) return;
    
    const watchId = navigator.geolocation.watchPosition((pos) => {
      const coords = [pos.coords.latitude, pos.coords.longitude];
      setVolunteerLocation(coords);
      if (socket) {
        socket.emit('volunteer_location', {
          deliveryId: activeDelivery.id,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
      }
    }, null, { enableHighAccuracy: true, maximumAge: 5000 });

    return () => navigator.geolocation.clearWatch(watchId);
  }, [activeDelivery, socket]);

  const acceptTask = async (task) => {
    if (!confirm(`Accept delivery for ${task.food}?`)) return;
    
    // Optimistic UI
    setActiveDelivery(task);
    setDeliveryStatus('accepted');
    setActiveTab('tasks');
    setAvailableTasks(prev => prev.filter(t => t.id !== task.id));
    toast.success('Task accepted! Navigating to map.');

    try {
      await fetch('/api/deliveries/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveryId: task.id })
      });
    } catch(e) {}
  };

  const completeStep = async () => {
    if (deliveryStatus === 'accepted') {
      setDeliveryStatus('picked_up');
      toast.success('Marked as picked up!');
      try { await fetch(`/api/deliveries/${activeDelivery.id}/status`, { method: 'PATCH', body: JSON.stringify({status: 'picked_up'})}); } catch(e){}
    } else if (deliveryStatus === 'picked_up') {
      toast.success('Delivery completed! Great job.');
      setActiveDelivery(null);
      setDeliveryStatus('accepted');
      try { await fetch(`/api/deliveries/${activeDelivery.id}/status`, { method: 'PATCH', body: JSON.stringify({status: 'delivered'})}); } catch(e){}
    }
  };

  const openMaps = (lat, lng) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
  };

  const getUrgencyColor = (u) => {
    if (u === 'high') return 'bg-[#e24b4a]';
    if (u === 'medium') return 'bg-[#EF9F27]';
    return 'bg-[#1D9E75]';
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-white flex flex-col md:flex-row font-sans selection:bg-[#1D9E75] selection:text-white pt-16">
      
      {/* Mobile Header Nav */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-[#21262d] bg-[#161b22]">
        <span className="font-bold">Volunteer Portal</span>
        <div className="flex gap-4">
          <button onClick={() => setNotificationsOpen(true)} className="relative text-slate-400">
            <FiBell size={20} />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#378ADD] rounded-full"></span>
          </button>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-400">
            {isMobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>
      </div>

      {/* Left Sidebar (Desktop) */}
      <aside className="desktop-only md:w-[300px] border-r border-[#21262d] bg-[#0d1117] flex-shrink-0 flex flex-col h-[calc(100vh-64px)] fixed md:sticky top-16 overflow-y-auto z-40 p-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-[52px] h-[52px] rounded-full bg-[#1D9E75]/20 text-[#1D9E75] flex items-center justify-center font-bold text-lg border border-[#1D9E75]/50 shrink-0">
             {user?.name?.charAt(0) || 'V'}
          </div>
          <div>
            <div className="text-[16px] font-bold">{user?.name || 'Rahul Sharma'}</div>
            <div className="text-xs text-[#1D9E75] flex items-center gap-1 font-medium bg-[#1D9E75]/10 px-2 py-0.5 rounded-full w-fit mt-1">
              <FiCheck /> Verified Volunteer
            </div>
          </div>
        </div>

        {/* Vehicle Selection */}
        <div className="flex gap-2 mb-6">
          {['Bike', 'Car', 'Auto'].map(v => (
            <button 
              key={v} 
              onClick={() => setVehicle(v)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-full transition-colors border ${vehicle === v ? 'bg-[#161b22] border-slate-500 text-white' : 'border-[#21262d] text-slate-500 hover:text-slate-300'}`}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Availability Toggle */}
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4 mb-6 flex items-center justify-between">
          <div>
            <div className="font-semibold text-sm">{isAvailable ? 'Available for pickups' : 'Off duty'}</div>
            <div className="text-xs text-slate-500">{isAvailable ? 'Receiving task alerts' : 'Matching paused'}</div>
          </div>
          <button 
            onClick={toggleAvailability}
            className={`w-12 h-6 rounded-full relative transition-colors ${isAvailable ? 'bg-[#1D9E75]' : 'bg-[#21262d]'}`}
          >
            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${isAvailable ? 'left-7' : 'left-1'}`} />
          </button>
        </div>

        {/* Active Delivery Sidebar Card */}
        {activeDelivery && (
          <div className="mb-6 bg-[#161b22] border-y border-r border-l-4 border-l-[#1D9E75] border-y-[#21262d] border-r-[#21262d] rounded-xl rounded-l-none p-4 shadow-lg">
            <div className="text-xs font-bold text-[#1D9E75] mb-2 uppercase tracking-wide">Active Delivery</div>
            <div className="text-sm font-bold mb-1 line-clamp-1">{activeDelivery.food}</div>
            
            <div className="space-y-3 mt-4">
              <div className="flex gap-2 text-xs">
                <FiMapPin className="text-[#EF9F27] mt-0.5 shrink-0" />
                <div className="text-slate-300">
                  <span className="text-slate-500 block mb-0.5">Pickup from</span>
                  {activeDelivery.donor}
                </div>
              </div>
              <div className="flex gap-2 text-xs">
                <FiMapPin className="text-[#378ADD] mt-0.5 shrink-0" />
                <div className="text-slate-300">
                  <span className="text-slate-500 block mb-0.5">Drop to</span>
                  {activeDelivery.ngo}
                </div>
              </div>
            </div>

             <div className="mt-4 flex items-center justify-between text-xs font-semibold text-[#EF9F27] bg-[#EF9F27]/10 p-2 rounded-lg">
              <span>{activeDelivery.totalDistance} km</span>
              <span>~{activeDelivery.estTime}</span>
            </div>

            <button 
              onClick={() => openMaps(
                deliveryStatus === 'accepted' ? activeDelivery.lat1 : activeDelivery.lat2,
                deliveryStatus === 'accepted' ? activeDelivery.lng1 : activeDelivery.lng2
              )}
              className="w-full mt-4 bg-transparent border border-[#378ADD] text-[#378ADD] hover:bg-[#378ADD]/10 py-2 rounded-lg text-sm font-bold transition-colors"
            >
              Open in Maps
            </button>

            <button 
              onClick={completeStep}
              className="w-full mt-2 bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white py-2 rounded-lg text-sm font-bold transition-all shadow-md"
            >
              {deliveryStatus === 'accepted' ? 'Mark as picked up' : 'Mark as delivered'}
            </button>
          </div>
        )}

        {!activeDelivery && (
          <>
            {/* Quick Stats Column */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-3 flex flex-col items-center justify-center text-center">
                <div className="text-lg font-bold text-white leading-none mb-1">42</div>
                <div className="text-[10px] text-slate-400 leading-tight">Deliveries<br/>completed</div>
              </div>
              <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-3 flex flex-col items-center justify-center text-center">
                <div className="text-lg font-bold text-[#1D9E75] leading-none mb-1">8</div>
                <div className="text-[10px] text-slate-400 leading-tight">This<br/>week</div>
              </div>
              <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-3 flex flex-col items-center justify-center text-center">
                <div className="text-lg font-bold text-[#EF9F27] flex items-center leading-none mb-1">4.9<FiStar size={12} className="ml-0.5 fill-current"/></div>
                <div className="text-[10px] text-slate-400 leading-tight">Avg<br/>rating</div>
              </div>
            </div>

            {/* Earnings Tracker */}
            <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4">
              <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">This month</div>
              <div className="flex items-end gap-2 mb-4">
                <span className="text-3xl font-bold text-white">₹1,840</span>
                <span className="text-xs text-slate-500 mb-1">₹45 / delivery</span>
              </div>
              {/* Mini SVG Bar Chart */}
              <div className="flex items-end justify-between h-10 gap-1 opacity-70">
                {[40, 60, 20, 80, 50, 90, 70].map((h, i) => (
                  <div key={i} className="w-full bg-[#378ADD] rounded-t-sm transition-all hover:opacity-100" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
          </>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-[calc(100vh-64px)] relative overflow-y-auto w-full">
        
        {/* Mobile Top Controls Row */}
        <div className="mobile-only scroll-row p-4 border-b border-[#21262d] bg-[#0d1117] shrink-0 sticky top-0 z-40">
           <div className="flex items-center gap-2 shrink-0 border-r border-[#21262d] pr-4">
            <div className="w-10 h-10 rounded-full bg-[#1D9E75]/20 text-[#1D9E75] flex items-center justify-center font-bold text-lg shrink-0">
               {user?.name?.charAt(0) || 'V'}
            </div>
            <div>
              <div className="text-sm font-bold">{user?.name || 'Rahul'}</div>
              <div className="text-[10px] text-[#1D9E75] flex items-center gap-1 font-medium bg-[#1D9E75]/10 px-1.5 rounded-full w-fit mt-0.5">
                <FiCheck /> Verified
              </div>
            </div>
          </div>

          {/* Vehicle Selection */}
          <div className="flex gap-1 shrink-0 px-2 items-center border-r border-[#21262d]">
            {['Bike', 'Car', 'Auto'].map(v => (
              <button key={v} onClick={() => setVehicle(v)} className={`px-3 py-1 text-xs font-semibold rounded-full border ${vehicle === v ? 'bg-[#161b22] border-slate-500 text-white' : 'border-[#21262d] text-slate-500'}`}>
                {v}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0 pl-2">
            <span className="text-xs text-slate-400 font-bold">{isAvailable ? 'Online' : 'Offline'}</span>
            <button onClick={toggleAvailability} className={`w-10 h-5 rounded-full relative transition-colors ${isAvailable ? 'bg-[#1D9E75]' : 'bg-[#21262d]'}`}>
              <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-all ${isAvailable ? 'left-[22px]' : 'left-[3px]'}`} />
            </button>
          </div>
        </div>

        {!activeDelivery && (
           <div className="flex items-center gap-1 p-2 bg-[#0d1117] border-b border-[#21262d] overflow-x-auto hide-scrollbar">
            <button onClick={() => setActiveTab('tasks')} className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === 'tasks' ? 'border-[#1D9E75] text-white' : 'border-transparent text-slate-400 hover:text-slate-300'}`}>Available Tasks</button>
            <button onClick={() => setActiveTab('history')} className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === 'history' ? 'border-[#1D9E75] text-white' : 'border-transparent text-slate-400 hover:text-slate-300'}`}>Delivery History</button>
          </div>
        )}

        {/* ----- TASK FEED VIEW ----- */}
        {!activeDelivery && activeTab === 'tasks' && (
          <div className="p-4 md:p-6 overflow-y-auto w-full max-w-3xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
              <h1 className="text-xl font-bold">Available pickups near you</h1>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-[#161b22] border border-[#21262d] px-3 py-1.5 rounded-lg text-sm">
                  <FiFilter className="text-slate-400" />
                  <span className="text-slate-300">{radius} km</span>
                  <input type="range" min="1" max="20" value={radius} onChange={e=>setRadius(e.target.value)} className="w-20 accent-[#1D9E75]" />
                </div>
              </div>
            </div>
            
            <p className="text-sm text-slate-400 mb-4 font-medium">{availableTasks.length} tasks available</p>

            <div className="space-y-4">
              {availableTasks.map(task => (
                <div key={task.id} className="bg-[#161b22] border border-[#21262d] rounded-xl flex overflow-hidden shadow-lg hover:border-slate-600 transition-colors">
                  {/* Urgency Strip */}
                  <div className={`w-1 ${getUrgencyColor(task.urgency)} shrink-0`} />
                  
                  <div className="p-4 w-full">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-[15px] font-bold text-white leading-tight">{task.food}</h3>
                        <p className="text-[12px] text-slate-400 mt-1">{task.donor}</p>
                      </div>
                      {task.payout > 0 && (
                        <span className="bg-[#1D9E75]/10 text-[#1D9E75] border border-[#1D9E75]/30 px-2 py-0.5 rounded text-[11px] font-bold whitespace-nowrap">
                          ₹{task.payout}
                        </span>
                      )}
                    </div>
                    
                    {/* Info Chips */}
                    <div className="flex flex-wrap gap-2 mb-4">
                       <span className="flex items-center gap-1.5 text-xs bg-[#0d1117] border border-[#21262d] px-2 py-1 rounded-md text-slate-300">
                         <FiMapPin className="text-[#378ADD]" /> {task.pickupDistance} km away
                       </span>
                       <span className={`flex items-center gap-1.5 text-xs bg-[#0d1117] border border-[#21262d] px-2 py-1 rounded-md ${task.expiryHours <= 2 ? 'text-[#e24b4a]' : 'text-slate-300'}`}>
                         <FiClock /> {task.expiryHours}h left
                       </span>
                    </div>

                    {/* Route Preview */}
                    <div className="bg-[#0d1117] border border-[#21262d] rounded-lg p-3 mb-4 text-[13px] relative isolate">
                      <div className="absolute left-[20.5px] top-[24px] bottom-[24px] w-0.5 border-l-2 border-dashed border-[#21262d] -z-10" />
                      
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-5 h-5 rounded-full bg-[#161b22] border-[3px] border-[#EF9F27] shrink-0 mt-0.5" />
                        <div className="flex-1 flex justify-between">
                          <span className="text-slate-300"><span className="text-slate-500 mr-1">Pickup:</span>{task.donor.split(',')[0]}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-[#161b22] border-[3px] border-[#378ADD] shrink-0 mt-0.5" />
                        <div className="flex-1 flex justify-between">
                           <span className="text-slate-300"><span className="text-slate-500 mr-1">Drop:</span>{task.ngo.split(',')[0]}</span>
                           <span className="text-[#EF9F27] font-semibold bg-[#EF9F27]/10 px-2 rounded-md">{task.totalDistance} km</span>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => acceptTask(task)}
                      className="w-full bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white font-bold py-2.5 rounded-lg transition-colors shadow-md"
                    >
                      Accept task
                    </button>
                  </div>
                </div>
              ))}
              
              {availableTasks.length === 0 && (
                <div className="text-center py-10 bg-[#161b22] border border-[#21262d] rounded-xl text-slate-400">
                  No tasks available within your radius.<br/>Try expanding the filter.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ----- ACTIVE DELIVERY MAP VIEW ----- */}
        {activeDelivery && (
          <div className="flex-1 relative w-full h-full flex flex-col md:flex-row">
            <div className="h-[50vh] md:h-full w-full md:flex-1 relative z-0 shrink-0">
               <DeliveryMap 
                 volunteerLocation={volunteerLocation}
                 pickupLocation={[activeDelivery.lat1, activeDelivery.lng1]}
                 dropLocation={[activeDelivery.lat2, activeDelivery.lng2]}
               />
            </div>
            
            {/* Floating Status Card */}
            <div className="flex-1 md:w-[400px] md:max-w-md bg-[#161b22] border-t md:border-l md:border-t-0 border-[#21262d] p-4 md:p-6 shadow-2xl z-10 flex flex-col pt-6 md:pt-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2.5 h-2.5 rounded-full bg-[#EF9F27] animate-pulse"></div>
                <div className="text-sm font-bold">
                  {deliveryStatus === 'accepted' ? 'En route to pickup' : 'In transit'} — {activeDelivery.totalDistance} km
                </div>
              </div>
              
              <div className="text-xs text-slate-400 space-y-1 mb-4 flex-1">
                <div><span className="font-semibold text-slate-300">Pickup:</span> {activeDelivery.donor.split(',')[0]}</div>
                <div><span className="font-semibold text-slate-300">Drop:</span> {activeDelivery.ngo.split(',')[0]}</div>
              </div>

              {/* Step indicator */}
              <div className="flex items-center justify-between gap-1 mb-5 text-[10px] font-bold uppercase tracking-wider text-center pt-4">
                <div className={`flex-1 flex flex-col items-center gap-1 ${deliveryStatus === 'picked_up' ? 'text-[#1D9E75]' : deliveryStatus==='accepted' ? 'text-[#1D9E75] animate-pulse' : 'text-[#1D9E75]'}`}>
                  <div className={`w-full h-1.5 rounded-full ${deliveryStatus==='accepted' ? 'bg-[#1D9E75]' : 'bg-[#1D9E75]'}`}></div>
                  Accepted
                </div>
                <div className={`flex-1 flex flex-col items-center gap-1 ${deliveryStatus === 'picked_up' ? 'text-[#1D9E75] animate-pulse' : 'text-[#21262d]'}`}>
                  <div className={`w-full h-1.5 rounded-full ${deliveryStatus==='picked_up' ? 'bg-[#1D9E75]' : 'bg-[#21262d]'}`}></div>
                  In Transit
                </div>
                 <div className={`flex-1 flex flex-col items-center gap-1 text-[#21262d]`}>
                  <div className={`w-full h-1.5 rounded-full bg-[#21262d]`}></div>
                  Delivered
                </div>
              </div>

              <button 
                onClick={completeStep}
                className="w-full bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white font-bold py-3 md:py-4 rounded-lg transition-colors shadow-md mt-auto"
              >
                {deliveryStatus === 'accepted' ? 'Confirm Pickup' : 'Mark as Delivered'}
              </button>
            </div>
          </div>
        )}

        {/* ----- DELIVERY HISTORY ----- */}
        {!activeDelivery && activeTab === 'history' && (
          <div className="p-4 md:p-6 overflow-y-auto w-full mx-auto max-w-5xl">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-xl font-bold">Delivery History</h1>
              <input 
                type="text" 
                placeholder="Search NGOs or Donors..." 
                className="bg-[#161b22] border border-[#21262d] rounded-lg px-3 py-1.5 text-sm w-48 focus:border-slate-500 outline-none"
              />
            </div>

            <div className="overflow-x-auto bg-[#161b22] border border-[#21262d] rounded-xl shadow-lg pb-4 w-full scroll-row">
              <table className="w-full min-w-[700px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#21262d] text-xs uppercase tracking-wider text-slate-500 bg-[#0d1117]/50">
                    <th className="p-4 font-semibold whitespace-nowrap">Date</th>
                    <th className="p-4 font-semibold whitespace-nowrap">Food Item</th>
                    <th className="p-4 font-semibold whitespace-nowrap">Route</th>
                    <th className="p-4 font-semibold whitespace-nowrap">Dist / Time</th>
                    <th className="p-4 font-semibold whitespace-nowrap">Status</th>
                    <th className="p-4 font-semibold whitespace-nowrap">Rating</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  <tr className="border-b border-[#21262d] hover:bg-[#21262d]/30 transition-colors">
                    <td className="p-4 text-slate-300 whitespace-nowrap">Today, 2:30 PM</td>
                    <td className="p-4 font-medium whitespace-nowrap">10kg Rice & Dal</td>
                    <td className="p-4"><span className="text-slate-500 text-xs block whitespace-nowrap">Spice Route →</span> Asha NGO</td>
                    <td className="p-4 text-slate-400 whitespace-nowrap">4.2 km <br/><span className="text-xs">22 mins</span></td>
                    <td className="p-4"><span className="text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md text-xs font-bold whitespace-nowrap">Delivered</span></td>
                    <td className="p-4 text-[#EF9F27] flex gap-0.5 mt-1.5 whitespace-nowrap">★★★★★</td>
                  </tr>
                  <tr className="border-b border-[#21262d] hover:bg-[#21262d]/30 transition-colors">
                    <td className="p-4 text-slate-300 whitespace-nowrap">Yesterday</td>
                    <td className="p-4 font-medium whitespace-nowrap">Bakery Items</td>
                    <td className="p-4"><span className="text-slate-500 text-xs block whitespace-nowrap">OvenFresh →</span> Hope Shelter</td>
                    <td className="p-4 text-slate-400 whitespace-nowrap">1.8 km <br/><span className="text-xs">12 mins</span></td>
                    <td className="p-4"><span className="text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md text-xs font-bold whitespace-nowrap">Delivered</span></td>
                    <td className="p-4 text-[#EF9F27] flex gap-0.5 mt-1.5 whitespace-nowrap">★★★★<span className="text-[#21262d]">★</span></td>
                  </tr>
                  <tr className="border-b border-[#21262d] hover:bg-[#21262d]/30 transition-colors">
                    <td className="p-4 text-slate-300 whitespace-nowrap">Oct 12</td>
                    <td className="p-4 font-medium whitespace-nowrap">Wedding Buffet</td>
                    <td className="p-4"><span className="text-slate-500 text-xs block whitespace-nowrap">Grand Hotel →</span> Uday Found.</td>
                    <td className="p-4 text-slate-400 whitespace-nowrap">6.5 km <br/><span className="text-xs">35 mins</span></td>
                    <td className="p-4"><span className="text-red-400 bg-red-400/10 px-2 py-1 rounded-md text-xs font-bold whitespace-nowrap">Cancelled</span></td>
                    <td className="p-4 text-slate-500 text-xs flex items-center gap-1 mt-1.5 whitespace-nowrap"><FiClock/> No rating</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center mt-4 text-xs text-slate-500">
              <span>Showing 1-3 of 42 deliveries</span>
              <div className="flex gap-2">
                <button className="px-3 py-1 border border-[#21262d] rounded bg-[#161b22] hover:text-white">Prev</button>
                <button className="px-3 py-1 border border-[#21262d] rounded bg-[#161b22] hover:text-white">Next</button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Notifications Drawer */}
      <div className={`fixed inset-0 bg-black/50 z-50 transition-opacity ${notificationsOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setNotificationsOpen(false)}>
        <div 
          className={`absolute right-0 top-0 h-full w-[300px] bg-[#0d1117] border-l border-[#21262d] shadow-2xl transition-transform duration-300 ease-in-out ${notificationsOpen ? 'translate-x-0' : 'translate-x-full'}`}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-[#21262d]">
            <h2 className="font-bold text-lg">Notifications</h2>
            <button onClick={() => setNotificationsOpen(false)} className="text-slate-400 hover:text-white"><FiX size={20}/></button>
          </div>
          <div className="p-4 text-sm text-[#378ADD] hover:underline cursor-pointer border-b border-[#21262d]">
            Mark all read
          </div>
          <div className="overflow-y-auto h-[calc(100%-110px)]">
            <div className="p-4 border-b border-[#21262d] hover:bg-[#161b22] transition-colors cursor-pointer border-l-4 border-l-[#378ADD] bg-[#161b22]/50">
              <div className="flex gap-3 mb-1">
                <div className="text-[#378ADD] mt-0.5"><FiBell /></div>
                <div>
                  <div className="font-semibold text-sm text-white">New task nearby!</div>
                  <div className="text-xs text-slate-400 leading-snug tracking-tight">Taj Palace marked 25kg surplus just 2km from you.</div>
                  <div className="text-[10px] text-slate-500 mt-2">Just now</div>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-b border-[#21262d] hover:bg-[#161b22] transition-colors cursor-pointer border-l-4 border-l-[#1D9E75]">
              <div className="flex gap-3 mb-1">
                <div className="text-[#1D9E75] mt-0.5"><FiCheck /></div>
                <div>
                  <div className="font-semibold text-sm text-white">Delivery Confirmed</div>
                  <div className="text-xs text-slate-400 leading-snug tracking-tight">Asha NGO confirmed receipt of your delivery.</div>
                  <div className="text-[10px] text-slate-500 mt-2">1h ago</div>
                </div>
              </div>
            </div>

            <div className="p-4 border-b border-[#21262d] hover:bg-[#161b22] transition-colors cursor-pointer border-l-4 border-l-[#EF9F27]">
              <div className="flex gap-3 mb-1">
                <div className="text-[#EF9F27] mt-0.5"><FiStar /></div>
                <div>
                  <div className="font-semibold text-sm text-white">New Rating Received</div>
                  <div className="text-xs text-slate-400 leading-snug tracking-tight">You received 5 stars for your previous delivery!</div>
                  <div className="text-[10px] text-slate-500 mt-2">2h ago</div>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-b border-[#21262d] hover:bg-[#161b22] transition-colors cursor-pointer border-l-4 border-l-[#e24b4a]">
              <div className="flex gap-3 mb-1">
                <div className="text-[#e24b4a] mt-0.5"><FiX /></div>
                <div>
                  <div className="font-semibold text-sm text-white">Task Cancelled</div>
                  <div className="text-xs text-slate-400 leading-snug tracking-tight">A donor cancelled a pickup you were assigned to.</div>
                  <div className="text-[10px] text-slate-500 mt-2">Yesterday</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
