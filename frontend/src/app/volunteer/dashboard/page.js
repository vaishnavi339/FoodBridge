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
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'history' | 'earnings' | 'settings'
  const [isAvailable, setIsAvailable] = useState(true);
  const [vehicle, setVehicle] = useState('Bike');
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const COLORS = {
    accent: '#1D9E75',
    blue: '#378ADD',
    amber: '#EF9F27',
    red: '#e24b4a',
    cardBg: '#161b22',
    border: '#21262d',
    pageBg: '#0d1117',
    text: '#c9d1d9',
    textMuted: '#8b949e'
  };

  
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
    // Note: Backend profile should handle availability, adding as a user meta update
    try {
      await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: newVal })
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
      const res = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: task.listingId || task.id, type: 'delivery' })
      });
      const data = await res.json();
      if (data.claim) {
        setActiveDelivery({ ...task, claimId: data.claim.id });
      }
    } catch(e) {}
  };

  const completeStep = async () => {
    const claimId = activeDelivery.claimId || activeDelivery.id;
    if (deliveryStatus === 'accepted') {
      setDeliveryStatus('picked_up');
      toast.success('Marked as picked up!');
      try { await fetch(`/api/claims/${claimId}/status`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({status: 'picked_up'})}); } catch(e){}
    } else if (deliveryStatus === 'picked_up') {
      toast.success('Delivery completed! Great job.');
      setActiveDelivery(null);
      setDeliveryStatus('accepted');
      try { await fetch(`/api/claims/${claimId}/status`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({status: 'delivered'})}); } catch(e){}
    }
  };

  const openMaps = (lat, lng) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
  };

  const navItems = [
    { id: 'tasks', label: 'Work Feed', icon: <FiTruck /> },
    { id: 'history', label: 'My Deliveries', icon: <FiClock /> },
    { id: 'earnings', label: 'Earnings', icon: <FiDollarSign /> },
    { id: 'settings', label: 'Settings', icon: <FiX /> }, // Using FiX placeholder, will fix with real icons in loop
  ];

  const getUrgencyColor = (u) => {
    if (u === 'high') return 'bg-[#e24b4a]';
    if (u === 'medium') return 'bg-[#EF9F27]';
    return 'bg-[#1D9E75]';
  };


  return (
    <div className="min-h-screen bg-[#0d1117] text-white flex pt-16">
      
      {/* ─── Desktop Sidebar ─── */}
      <aside className="desktop-only w-[300px] border-r border-[#21262d] bg-[#161b22] flex-shrink-0 flex flex-col h-[calc(100vh-4rem)] sticky top-16 z-40 overflow-hidden">
        <div className="p-6 border-b border-[#21262d]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-[#1D9E75]/20 text-[#1D9E75] flex items-center justify-center font-bold text-xl border border-[#1D9E75]/50 flex-shrink-0">
               {user?.name?.charAt(0) || 'V'}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold truncate">{user?.name || 'Rahul Sharma'}</div>
              <div className="text-[10px] text-[#1D9E75] flex items-center gap-1 font-medium bg-[#1D9E75]/10 px-2 py-0.5 rounded-full w-fit mt-1">
                <FiCheck /> Verified
              </div>
            </div>
          </div>
          
          <button 
            onClick={toggleAvailability}
            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${isAvailable ? 'bg-[#1D9E75]/10 border-[#1D9E75]/50' : 'bg-[#21262d] border-[#30363d]'}`}
          >
            <div className="text-left">
              <div className={`text-xs font-bold ${isAvailable ? 'text-[#1D9E75]' : 'text-slate-400'}`}>{isAvailable ? 'YOU ARE ONLINE' : 'YOU ARE OFFLINE'}</div>
              <div className="text-[10px] text-slate-500">{isAvailable ? 'Receiving tasks' : 'Matching paused'}</div>
            </div>
            <div className={`w-8 h-4 rounded-full relative transition-colors ${isAvailable ? 'bg-[#1D9E75]' : 'bg-[#30363d]'}`}>
              <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all ${isAvailable ? 'left-[16px]' : 'left-1'}`} />
            </div>
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {[
            { id: 'tasks', label: 'Available Tasks', icon: <FiTruck /> },
            { id: 'history', label: 'Delivery History', icon: <FiClock /> },
            { id: 'earnings', label: 'Earnings & Impact', icon: <FiDollarSign /> },
            { id: 'settings', label: 'Profile Settings', icon: <FiCheck /> },
          ].map(item => (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === item.id ? 'bg-[#1D9E75] text-white shadow-lg shadow-[#1D9E75]/20' : 'text-slate-400 hover:bg-[#21262d] hover:text-slate-200'}`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto">
           <div className="bg-[#0d1117] rounded-xl p-3 border border-[#21262d]">
             <div className="text-[10px] text-slate-500 font-bold uppercase mb-2">Selected Vehicle</div>
             <div className="flex gap-1">
               {['Bike', 'Car', 'Auto'].map(v => (
                 <button key={v} onClick={() => setVehicle(v)} className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${vehicle === v ? 'bg-[#1D9E75]/20 border-[#1D9E75] text-[#1D9E75]' : 'border-[#21262d] text-slate-500'}`}>
                   {v}
                 </button>
               ))}
             </div>
           </div>
        </div>
      </aside>

      {/* ─── Main Content Area ─── */}
      <main className="flex-1 flex flex-col h-[calc(100vh-4rem)] relative overflow-y-auto w-full">
        
        {/* Active Delivery takes priority if it exists AND we are on 'tasks' tab */}
        {activeDelivery && activeTab === 'tasks' ? (
          <div className="flex-1 relative w-full h-full flex flex-col md:flex-row animate-fade-in">
            <div className="h-[50vh] md:h-full w-full md:flex-1 relative z-0 shrink-0">
               <DeliveryMap 
                 volunteerLocation={volunteerLocation}
                 pickupLocation={[activeDelivery.lat1, activeDelivery.lng1]}
                 dropLocation={[activeDelivery.lat2, activeDelivery.lng2]}
               />
            </div>
            
            <div className="flex-1 md:w-[400px] md:max-w-md bg-[#161b22] border-t md:border-l md:border-t-0 border-[#21262d] p-6 shadow-2xl z-10 flex flex-col pt-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-[#EF9F27] animate-pulse"></div>
                <div className="text-lg font-bold">In Transit — {activeDelivery.totalDistance} km</div>
              </div>
              
              <div className="space-y-4 mb-8 bg-[#0d1117] p-4 rounded-xl border border-[#21262d]">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#EF9F27]/20 flex items-center justify-center shrink-0 mt-1"><FiMapPin className="text-[#EF9F27]" size={14} /></div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Pickup Location</div>
                    <div className="text-sm font-semibold">{activeDelivery.donor}</div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#378ADD]/20 flex items-center justify-center shrink-0 mt-1"><FiMapPin className="text-[#378ADD]" size={14} /></div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Drop Location</div>
                    <div className="text-sm font-semibold">{activeDelivery.ngo}</div>
                  </div>
                </div>
              </div>

              {/* Progress Steps */}
              <div className="grid grid-cols-3 gap-2 mb-8 text-[10px] font-bold uppercase text-center">
                 <div className="space-y-2 text-[#1D9E75]">
                    <div className="h-1.5 rounded-full bg-[#1D9E75]"></div>
                    Confirmed
                 </div>
                 <div className={`space-y-2 ${deliveryStatus === 'picked_up' ? 'text-[#1D9E75]' : 'text-slate-600 animate-pulse'}`}>
                    <div className={`h-1.5 rounded-full ${deliveryStatus === 'picked_up' ? 'bg-[#1D9E75]' : 'bg-[#21262d]'}`}></div>
                    In Transit
                 </div>
                 <div className="space-y-2 text-slate-600">
                    <div className="h-1.5 rounded-full bg-[#21262d]"></div>
                    Delivered
                 </div>
              </div>

              <div className="mt-auto space-y-3">
                <button onClick={() => openMaps(deliveryStatus === 'accepted' ? activeDelivery.lat1 : activeDelivery.lat2, deliveryStatus === 'accepted' ? activeDelivery.lng1 : activeDelivery.lng2)} className="w-full py-4 rounded-xl border border-[#378ADD] text-[#378ADD] font-bold hover:bg-[#378ADD]/10 transition-all flex items-center justify-center gap-2">
                  <FiMapPin /> View in Navigation
                </button>
                <button onClick={completeStep} className="w-full py-4 rounded-xl bg-[#1D9E75] text-white font-bold hover:bg-[#1D9E75]/90 transition-all shadow-xl shadow-[#1D9E75]/20">
                  {deliveryStatus === 'accepted' ? 'Confirm Food Pickup' : 'Mark as Delivered'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 md:p-8 animate-fade-in max-w-7xl mx-auto w-full">
            {/* Conditional Tab Rendering */}
            {activeTab === 'tasks' && (
              <>
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                  <div>
                    <h1 className="text-2xl font-bold mb-1">Available Deliveries</h1>
                    <p className="text-sm text-slate-500">Pick up surplus food from local donors and deliver to NGOs.</p>
                  </div>
                  <div className="flex items-center gap-3 bg-[#161b22] border border-[#21262d] px-4 py-2 rounded-xl">
                    <FiFilter className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-300">Radius: {radius}km</span>
                    <input type="range" min="1" max="20" value={radius} onChange={e=>setRadius(e.target.value)} className="w-24 accent-[#1D9E75]" />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {availableTasks.map(task => (
                    <div key={task.id} className="bg-[#161b22] border border-[#21262d] rounded-2xl overflow-hidden hover:border-[#1D9E75]/50 transition-all shadow-lg group">
                      <div className="p-5">
                         <div className="flex justify-between items-start mb-6">
                           <div className="flex gap-3">
                             <div className="w-12 h-12 rounded-xl bg-[#1D9E75]/10 flex items-center justify-center text-2xl">🍛</div>
                             <div>
                               <h3 className="font-bold text-white group-hover:text-[#1D9E75] transition-colors">{task.food}</h3>
                               <p className="text-xs text-slate-500 mt-1">{task.donor.split(',')[0]}</p>
                             </div>
                           </div>
                           <div className="flex flex-col items-end gap-1">
                             <span className="text-sm font-bold text-[#1D9E75]">₹{task.payout}</span>
                             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Payout</span>
                           </div>
                         </div>

                         <div className="grid grid-cols-2 gap-4 mb-6">
                           <div className="bg-[#0d1117] p-3 rounded-xl border border-[#21262d] flex items-center gap-3">
                             <FiMapPin className="text-[#378ADD]" size={16} />
                             <div className="text-xs">
                               <div className="text-slate-500 font-bold mb-0.5 uppercase text-[9px]">Total Dist</div>
                               <div className="font-bold text-slate-300">{task.totalDistance} km</div>
                             </div>
                           </div>
                           <div className="bg-[#0d1117] p-3 rounded-xl border border-[#21262d] flex items-center gap-3">
                             <FiClock className={task.expiryHours <= 2 ? 'text-[#e24b4a]' : 'text-[#EF9F27]'} size={16} />
                             <div className="text-xs">
                               <div className="text-slate-500 font-bold mb-0.5 uppercase text-[9px]">Expiry</div>
                               <div className={`font-bold ${task.expiryHours <= 2 ? 'text-[#e24b4a]' : 'text-slate-300'}`}>{task.expiryHours}h left</div>
                             </div>
                           </div>
                         </div>

                         <button onClick={() => acceptTask(task)} className="w-full py-3 rounded-xl bg-[#1D9E75] text-white font-bold text-sm hover:translate-y-[-2px] transition-all shadow-xl shadow-[#1D9E75]/10">
                           Accept & Start Navigation
                         </button>
                      </div>
                    </div>
                  ))}
                  {availableTasks.length === 0 && <div className="col-span-full py-20 text-center bg-[#161b22] border border-dashed border-[#21262d] rounded-2xl text-slate-500">No tasks found nearby.</div>}
                </div>
              </>
            )}

            {activeTab === 'history' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-bold">Delivery History</h1>
                  <span className="text-xs font-bold text-slate-500 bg-[#161b22] px-3 py-1.5 rounded-full border border-[#21262d]">Total: 42 Deliveries</span>
                </div>
                
                <div className="bg-[#161b22] border border-[#21262d] rounded-2xl overflow-hidden shadow-xl">
                  <table className="w-full text-left">
                    <thead className="bg-[#0d1117] text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Status & Date</th>
                        <th className="px-6 py-4">Consignment Info</th>
                        <th className="px-6 py-4 text-center">Payout</th>
                        <th className="px-6 py-4 text-right">Rating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#21262d]">
                      {[
                        { date: 'Today, 2:30 PM', food: '10kg Rice & Dal', route: 'Spice Route → Asha NGO', payout: '₹45', status: 'Delivered', rating: 5 },
                        { date: 'Yesterday', food: 'Fresh Bakery Items', route: 'Bakery Bliss → Hope Home', payout: '₹35', status: 'Delivered', rating: 4 },
                        { date: 'Oct 12, 11:15 AM', food: 'Party Surplus', route: 'Grand Hotel → Uday NGO', payout: '₹0', status: 'Cancelled', rating: 0 },
                      ].map((item, i) => (
                        <tr key={i} className="hover:bg-[#21262d]/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="text-[11px] font-bold text-[#1D9E75] mb-1 uppercase bg-[#1D9E75]/10 px-2 py-0.5 rounded-full w-fit">{item.status}</div>
                            <div className="text-xs text-slate-400 font-medium">{item.date}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-bold text-white">{item.food}</div>
                            <div className="text-xs text-slate-500 mt-1">{item.route}</div>
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-[#EF9F27] text-sm">
                            {item.payout}
                          </td>
                          <td className="px-6 py-4 text-right">
                             <div className="flex justify-end gap-0.5 text-[#EF9F27]">
                               {item.rating > 0 ? Array(item.rating).fill(0).map((_, j) => <FiStar key={j} className="fill-current" />) : <span className="text-slate-600 text-xs">-</span>}
                             </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'earnings' && (
              <div className="space-y-8">
                <h1 className="text-2xl font-bold">Earnings & Impact Dashboard</h1>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-[#161b22] border border-[#21262d] p-6 rounded-2xl">
                    <div className="text-xs font-bold text-slate-500 uppercase mb-4">Total Earnings</div>
                    <div className="text-3xl font-bold text-white">₹1,840</div>
                    <div className="text-[10px] text-[#1D9E75] font-bold mt-2">+₹125 this week</div>
                  </div>
                   <div className="bg-[#161b22] border border-[#21262d] p-6 rounded-2xl">
                    <div className="text-xs font-bold text-slate-500 uppercase mb-4">Avg. Rating</div>
                    <div className="text-3xl font-bold text-white flex items-center gap-2">4.9 <FiStar size={24} className="text-[#EF9F27] fill-current" /></div>
                    <div className="text-[10px] text-slate-500 font-bold mt-2">Based on 38 reviews</div>
                  </div>
                   <div className="bg-[#161b22] border border-[#21262d] p-6 rounded-2xl">
                    <div className="text-xs font-bold text-slate-500 uppercase mb-4">CO2 Offset</div>
                    <div className="text-3xl font-bold text-[#1D9E75]">12.4 kg</div>
                    <div className="text-[10px] text-slate-500 font-bold mt-2">By preventing food waste</div>
                  </div>
                </div>

                 <div className="bg-[#161b22] border border-[#21262d] p-8 rounded-2xl">
                    <h3 className="text-lg font-bold mb-6">Delivery Performance (Last 7 Days)</h3>
                    <div className="flex items-end justify-between h-56 gap-4 px-2">
                      {[
                        { day: 'Mon', val: 45 }, { day: 'Tue', val: 78 }, { day: 'Wed', val: 32 }, 
                        { day: 'Thu', val: 95 }, { day: 'Fri', val: 64 }, { day: 'Sat', val: 48 }, { day: 'Sun', val: 85 }
                      ].map((item, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-3 group h-full justify-end">
                          <span className="text-[10px] font-bold text-[#1D9E75] opacity-0 group-hover:opacity-100 transition-opacity">{item.val}</span>
                          <div className="w-full bg-[#1D9E75]/20 rounded-lg relative overflow-hidden transition-all group-hover:bg-[#1D9E75]/40 border border-[#1D9E75]/10" style={{ height: `${item.val}%` }}>
                            <div className="absolute inset-x-0 bottom-0 bg-[#1D9E75] h-full transition-all group-hover:translate-y-0 translate-y-[10%] shadow-[0_-4px_12px_rgba(29,158,117,0.3)]"></div>
                          </div>
                          <span className="text-[9px] font-bold text-slate-500 uppercase">{item.day}</span>
                        </div>
                      ))}
                    </div>
                 </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="max-w-2xl space-y-8">
                <h1 className="text-2xl font-bold">Profile Settings</h1>
                <div className="bg-[#161b22] border border-[#21262d] p-8 rounded-2xl space-y-6">
                  <div className="flex items-center gap-6 pb-6 border-b border-[#21262d]">
                    <div className="w-20 h-20 rounded-2xl bg-[#1D9E75]/20 text-[#1D9E75] flex items-center justify-center font-bold text-3xl shrink-0">
                       {user?.name?.charAt(0) || 'V'}
                    </div>
                    <div>
                      <h4 className="text-lg font-bold">{user?.name || 'Rahul Sharma'}</h4>
                      <p className="text-sm text-slate-500">{user?.email || 'rahul@example.com'}</p>
                      <button className="text-xs font-bold text-[#1D9E75] mt-2 hover:underline">Change Profile Photo</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Phone Number</label>
                      <input disabled type="text" value="+91 98765 43210" className="w-full bg-[#0d1117] border border-[#21262d] p-3 rounded-xl text-sm focus:border-[#1D9E75] outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Registration ID</label>
                      <input disabled type="text" value="FBRV-99420" className="w-full bg-[#0d1117] border border-[#21262d] p-3 rounded-xl text-sm opacity-50" />
                    </div>
                  </div>

                  <div className="space-y-3 pt-6">
                    <h5 className="text-sm font-bold">Security & Availability</h5>
                    <div className="bg-[#0d1117] p-4 rounded-xl border border-[#21262d] flex items-center justify-between">
                       <span className="text-sm font-medium">Automatic Online Status</span>
                       <button className="w-10 h-5 rounded-full bg-[#1D9E75] relative"><div className="w-4 h-4 bg-white rounded-full absolute top-0.5 right-0.5"></div></button>
                    </div>
                    <div className="bg-[#0d1117] p-4 rounded-xl border border-[#21262d] flex items-center justify-between text-[#e24b4a] opacity-50">
                       <span className="text-sm font-medium">Reset Data & Statistics</span>
                       <span className="text-xs font-bold uppercase tracking-widest cursor-pointer">Reset</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Notifications Drawer */}
      <div className={`fixed inset-0 bg-black/70 z-[100] transition-opacity ${notificationsOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setNotificationsOpen(false)}>
        <div 
          className={`absolute right-0 top-0 h-full w-[350px] bg-[#161b22] border-l border-[#21262d] shadow-2xl transition-transform duration-300 ease-out ${notificationsOpen ? 'translate-x-0' : 'translate-x-full'}`}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-[#21262d]">
            <h2 className="font-bold text-lg">Activity Feed</h2>
            <button onClick={() => setNotificationsOpen(false)} className="text-slate-400 hover:text-white"><FiX size={24}/></button>
          </div>
          <div className="overflow-y-auto h-[calc(100%-80px)] p-4 space-y-3">
             {[
               { icon: <FiBell className="text-[#378ADD]" />, title: 'New task nearby!', text: 'Taj Palace marked 25kg surplus just 2km from you.', time: 'Just now', border: 'border-l-[#378ADD]' },
               { icon: <FiCheck className="text-[#1D9E75]" />, title: 'Delivery Confirmed', text: 'Asha NGO confirmed receipt of your delivery.', time: '1h ago', border: 'border-l-[#1D9E75]' },
               { icon: <FiStar className="text-[#EF9F27]" />, title: 'New Rating!', text: 'You received 5 stars for your previous delivery.', time: '2h ago', border: 'border-l-[#EF9F27]' }
             ].map((n, i) => (
               <div key={i} className={`bg-[#0d1117] p-4 rounded-xl border-l-4 ${n.border} border-y border-r border-[#21262d] hover:bg-[#21262d] cursor-pointer transition-colors`}>
                  <div className="flex gap-3">
                    <div className="shrink-0 mt-1">{n.icon}</div>
                    <div>
                      <div className="text-sm font-bold">{n.title}</div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{n.text}</p>
                      <div className="text-[10px] text-slate-600 mt-2 font-bold uppercase">{n.time}</div>
                    </div>
                  </div>
               </div>
             ))}
          </div>
        </div>
      </div>

    </div>
  );
}
