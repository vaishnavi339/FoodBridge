'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/context/SocketContext';
import { notificationsAPI } from '@/services/api';
import { FiShoppingCart, FiTruck, FiAlertTriangle, FiSettings, FiUsers, FiBell, FiCheck, FiStar, FiMoreVertical, FiBellOff, FiFilter } from 'react-icons/fi';
import toast from 'react-hot-toast';

// Categories config
const CATEGORIES = [
  { id: 'all', label: 'All notifications', icon: FiBell, color: 'white' },
  { id: 'claim', label: 'Food claims', icon: FiShoppingCart, color: '#378ADD', bg: 'bg-[#378ADD]' },
  { id: 'delivery', label: 'Deliveries', icon: FiTruck, color: '#EF9F27', bg: 'bg-[#EF9F27]' },
  { id: 'urgent', label: 'Urgent alerts', icon: FiAlertTriangle, color: '#e24b4a', bg: 'bg-[#e24b4a]' },
  { id: 'system', label: 'System updates', icon: FiSettings, color: '#8b949e', bg: 'bg-[#8b949e]' },
  { id: 'match', label: 'NGO activity', icon: FiUsers, color: '#1D9E75', bg: 'bg-[#1D9E75]' },
];

export default function NotificationCenter() {
  const router = useRouter();
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState('all');
  const [filterMode, setFilterMode] = useState('all'); // all, unread, read
  const [dateRange, setDateRange] = useState('Today');
  const [loading, setLoading] = useState(true);
  
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [notifications, setNotifications] = useState([]);

  // Fetch real notifications
  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await notificationsAPI.getAll();
      // Transform backend notifications to match local UI format if necessary
      const transformed = res.data.notifications.map(n => ({
        id: n.id,
        type: n.type || 'system',
        title: n.title,
        desc: n.message,
        date: new Date(n.createdAt).toLocaleDateString() === new Date().toLocaleDateString() ? 'Today' : 'Earlier',
        time: new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        unread: !n.read
      }));
      setNotifications(transformed);
    } catch (err) {
      console.error('Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  const unreadCount = notifications.filter(n => n.unread).length;

  // Socket
  useEffect(() => {
    if (!socket) return;
    const handler = (notif) => {
      setNotifications(prev => [{
        id: notif.id || Date.now().toString(),
        type: notif.type || 'system',
        title: notif.title,
        desc: notif.message,
        date: 'Today',
        time: 'Just now',
        unread: true
      }, ...prev]);
      
      toast.success(notif.title, { 
        icon: '🔔', 
        style: {background: '#1D9E75', color: '#fff'} 
      });
    };
    
    socket.on('notification', handler);
    return () => socket.off('notification', handler);
  }, [socket]);

  const markAsRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? {...n, unread: false} : n));
    try { await notificationsAPI.markRead(id); } catch(e) {}
  };

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    switch(notification.type) {
      case 'claim': router.push(`/donor/dashboard`); break;
      case 'delivery': router.push(`/volunteer/dashboard`); break;
      case 'urgent': router.push(`/map`); break;
      case 'match': router.push(`/receiver/dashboard`); break;
    }
  };

  const toggleSelect = (id, e) => {
    e.stopPropagation();
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const markSelectedRead = async () => {
    setNotifications(prev => prev.map(n => selectedIds.has(n.id) ? {...n, unread: false} : n));
    const idsToMark = Array.from(selectedIds);
    setSelectedIds(new Set());
    // Backend doesn't have bulk-read, so we loop or update backend. 
    // For now, let's use the read-all if all are selected, or loop.
    try { 
      await Promise.all(idsToMark.map(id => fetch(`/api/notifications/${id}/read`, { method: 'PUT' })));
    } catch(e) {}
  };

  const deleteSelected = async () => {
    setNotifications(prev => prev.filter(n => !selectedIds.has(n.id)));
    setSelectedIds(newSet => new Set());
    try { await fetch(`/api/notifications/bulk`, { method: 'DELETE', body: JSON.stringify({ids: Array.from(selectedIds)}) }); } catch(e) {}
  };

  // Grouping
  const filtered = notifications.filter(n => {
    if (activeTab !== 'all' && n.type !== activeTab && !(activeTab === 'star' && n.type === 'star')) return false;
    if (filterMode === 'unread' && !n.unread) return false;
    if (filterMode === 'read' && n.unread) return false;
    return true;
  });

  const grouped = filtered.reduce((acc, n) => {
    if (!acc[n.date]) acc[n.date] = [];
    acc[n.date].push(n);
    return acc;
  }, {});

  const getIconData = (type) => {
    if (type === 'claim') return { i: <FiCheck size={18}/>, bg: 'bg-[#378ADD]' };
    if (type === 'delivery') return { i: <FiTruck size={18}/>, bg: 'bg-[#EF9F27]' };
    if (type === 'urgent') return { i: <FiAlertTriangle size={18}/>, bg: 'bg-[#e24b4a]' };
    if (type === 'match') return { i: <FiUsers size={18}/>, bg: 'bg-[#1D9E75]' };
    if (type === 'star') return { i: <FiStar size={18}/>, bg: 'bg-[#EF9F27]' };
    return { i: <FiBell size={18}/>, bg: 'bg-[#8b949e]' };
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-white pt-16 flex justify-center">
      <div className="w-full max-w-6xl flex flex-col md:flex-row h-[calc(100vh-64px)] overflow-hidden">
        
        {/* Left Sidebar (Desktop) / Top Horizontal Pills (Mobile) */}
        <div className="w-full md:w-[320px] bg-[#0d1117] border-r md:border-r-[#21262d] border-b md:border-b-0 border-[#21262d] shrink-0 flex flex-col">
          <div className="p-4 md:p-6 flex justify-between items-center md:items-start md:flex-col gap-2">
            <h1 className="text-lg font-bold text-white desktop-only">Notifications</h1>
            <button 
              onClick={async () => {
                setNotifications(prev => prev.map(n => ({...n, unread: false})));
                try { await fetch('/api/notifications/read-all', { method: 'PUT' }); } catch(e) {}
              }}
              className="text-xs text-slate-400 hover:text-white transition-colors desktop-only text-right w-full"
            >
              Mark all as read
            </button>
          </div>

          <div className="scroll-row px-4 md:px-0 md:flex-col md:flex-1 overflow-y-auto">
            {CATEGORIES.map(cat => {
              const count = notifications.filter(n => n.unread && (cat.id === 'all' || n.type === cat.id)).length;
              const isActive = activeTab === cat.id;
              
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveTab(cat.id)}
                  className={`flex items-center justify-between px-4 py-3 md:py-4 border-l-4 transition-colors whitespace-nowrap md:w-full text-left rounded-lg md:rounded-none
                    ${isActive ? 'border-[#1D9E75] bg-[#1a2332]' : 'border-transparent hover:bg-[#161b22]'}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <cat.icon size={18} className="text-slate-400" />
                    <span className="text-[14px] font-medium">{cat.label}</span>
                  </div>
                  {count > 0 && (
                    <span className={`ml-3 rounded-full text-[10px] font-bold px-2 py-0.5 ${cat.bg || 'bg-white text-black'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="p-4 md:p-6 border-t border-[#21262d] desktop-only">
            <button onClick={() => router.push('/settings')} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white">
              <FiSettings size={16} /> Notification preferences
            </button>
          </div>
        </div>

        {/* Right Feed Area */}
        <div className="flex-1 flex flex-col relative bg-[#0d1117] h-full">
          {/* Top Filter Bar */}
          <div className="p-4 border-b border-[#21262d] flex flex-col sm:flex-row justify-between items-center sm:items-end gap-4 shrink-0 bg-[#0d1117] sticky top-0 z-10">
            <h2 className="font-bold text-lg hidden sm:block text-white">
              {CATEGORIES.find(c => c.id === activeTab)?.label}
            </h2>
            
            <div className="flex items-center gap-4 w-full sm:w-auto overflow-x-auto scroll-row">
              <div className="flex bg-[#161b22] p-1 rounded-lg shrink-0">
                {['All', 'Unread', 'Read'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilterMode(f.toLowerCase())}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${filterMode === f.toLowerCase() ? 'bg-[#1D9E75] text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <select 
                value={dateRange} 
                onChange={(e) => setDateRange(e.target.value)}
                className="bg-[#161b22] border border-[#21262d] text-slate-300 text-xs rounded-lg px-2 py-1.5 outline-none shrink-0"
              >
                <option>Today</option>
                <option>This week</option>
                <option>This month</option>
                <option>All time</option>
              </select>
            </div>
          </div>

          {/* Feed Container */}
          <div className="flex-1 overflow-y-auto p-4 content-area pb-32">
            {Object.keys(grouped).length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                <FiBellOff size={60} className="mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No notifications here</h3>
                <p className="text-sm">They will appear here when active</p>
                {activeTab === 'urgent' && <p className="text-[#1D9E75] font-bold mt-2">That's great — nothing urgent right now!</p>}
              </div>
            ) : (
              Object.keys(grouped).map(dateKey => (
                <div key={dateKey} className="mb-6">
                  {/* Date Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{dateKey}</span>
                    <div className="h-px bg-[#21262d] w-full mt-0.5"></div>
                  </div>
                  
                  {/* Notif Cards */}
                  <div className="space-y-2">
                    {grouped[dateKey].map(notif => {
                      const { i, bg } = getIconData(notif.type);
                      const isSelected = selectedIds.has(notif.id);
                      return (
                        <div 
                          key={notif.id} 
                          onClick={() => handleNotificationClick(notif)}
                          className={`relative flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all animate-slideDown group
                            ${notif.unread ? 'bg-[#1a2332] border-l-2 border-l-[#1D9E75]' : 'bg-[#161b22] border-l-2 border-l-transparent'}
                            ${notif.type === 'urgent' && notif.unread ? 'border-l-[#e24b4a]' : ''}
                            ${isSelected ? 'ring-1 ring-[#1D9E75] bg-[#1a2332]' : ''}
                          `}
                        >
                           {/* Checkbox (hover or selected) */}
                           <div className={`absolute -left-2 top-1/2 -translate-y-1/2 z-10 transition-opacity p-2 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 md:opacity-0'}`} onClick={e => e.stopPropagation()}>
                             <input type="checkbox" checked={isSelected} onChange={(e) => toggleSelect(notif.id, e)} className="w-4 h-4 accent-[#1D9E75] cursor-pointer" />
                           </div>

                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${bg}`}>
                            {i}
                          </div>
                          
                          <div className="flex-1 pr-6 min-w-0">
                            <h4 className="text-[14px] font-[500] text-white mb-0.5 mt-[-2px]">{notif.title}</h4>
                            <p className="text-[13px] md:text-[13px] text-[12px] text-slate-400 line-clamp-2 leading-relaxed mb-1.5">{notif.desc}</p>
                            <span className="text-[11px] text-slate-500 font-medium">{notif.time}</span>
                          </div>

                          <div className="shrink-0 flex flex-col items-end gap-2 h-full py-1">
                            {notif.unread && <div className="w-2 h-2 rounded-full bg-[#1D9E75]"></div>}
                            <button className="text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity p-1 mt-auto" onClick={(e) => {e.stopPropagation();}}>
                              <FiMoreVertical size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Bulk Action Bar */}
          <div className={`absolute bottom-0 left-0 w-full bg-[#161b22] border-t border-[#21262d] p-4 flex flex-col sm:flex-row items-center justify-between gap-4 transition-transform z-20 ${selectedIds.size > 0 ? 'translate-y-0' : 'translate-y-full'}`}>
            <span className="font-bold text-sm">{selectedIds.size} selected</span>
            <div className="flex gap-2 w-full sm:w-auto">
               <button onClick={() => setSelectedIds(new Set())} className="flex-1 sm:flex-none px-4 py-2 border border-[#21262d] rounded-lg text-sm text-slate-300 hover:text-white">Cancel</button>
               <button onClick={markSelectedRead} className="flex-1 sm:flex-none px-4 py-2 bg-[#1D9E75] hover:bg-[#1D9E75]/90 rounded-lg text-sm font-bold text-white">Mark as read</button>
               <button onClick={deleteSelected} className="flex-1 sm:flex-none px-4 py-2 bg-[#e24b4a]/10 text-[#e24b4a] hover:bg-[#e24b4a]/20 border border-[#e24b4a]/30 rounded-lg text-sm font-bold">Delete selected</button>
            </div>
          </div>
        </div>
        
      </div>
       <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slideDown { animation: slideDown 0.3s ease-out forwards; }
      `}} />
    </div>
  );
}
