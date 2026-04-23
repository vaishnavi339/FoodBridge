'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { FiBarChart2, FiActivity, FiList, FiUsers, FiTruck, FiFileText, FiSettings, FiChevronLeft, FiChevronRight, FiDownload, FiSearch, FiAlertTriangle, FiCheckCircle, FiClock, FiPackage, FiTrash2, FiEye, FiTarget, FiStar, FiTrendingUp, FiRefreshCw, FiUser, FiBell, FiShield, FiInfo } from 'react-icons/fi';
import toast from 'react-hot-toast';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const C = { pageBg: '#0d1117', cardBg: '#161b22', border: '#21262d', accent: '#1D9E75', amber: '#EF9F27', red: '#e24b4a', blue: '#378ADD', muted: '#8b949e', text: '#c9d1d9' };

const renderSparkline = (data, color) => {
  const max = Math.max(...data) || 1;
  const pts = data.map((v, i) => `${i * 14},${28 - (v / max) * 22}`).join(' ');
  return (
    <svg width={data.length * 14} height={28} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const [stats, setStats] = useState(null);
  const [listings, setListings] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState('week');
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const [timeSinceUpdate, setTimeSinceUpdate] = useState(0);
  const [sortCol, setSortCol] = useState('expiryTime');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [userTab, setUserTab] = useState('donors');
  const [matchSuggestions, setMatchSuggestions] = useState([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const [mlStats, setMlStats] = useState(null);
  const [activeAlerts, setActiveAlerts] = useState([
    { id: 1, type: 'critical', icon: <FiAlertTriangle size={14} />, title: '2 listings expiring with no match', desc: 'Dairy products & fresh salad need immediate attention', color: C.red, action: 'listings' },
    { id: 2, type: 'warning', icon: <FiBell size={14} />, title: '3 NGOs inactive for 7+ days', desc: 'Prayas Trust, Green Earth, Hope Foundation', color: C.amber, action: 'users' },
    { id: 3, type: 'info', icon: <FiShield size={14} />, title: 'New NGO awaiting approval', desc: 'Sahara Relief — submitted 2 hours ago', color: C.blue, action: 'users' },
  ]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalType, setModalType] = useState(null); // 'listing', 'history', 'match'

  const dismissAlert = (id) => setActiveAlerts(prev => prev.filter(al => al.id !== id));
  const handleTakeAction = (action) => {
    if (action === 'listings') setActiveSection('listings');
    else if (action === 'users') setActiveSection('users');
  };

  const handleDeleteListing = async (listingId) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;
    try {
      await api.delete(`/listings/${listingId}`);
      toast.success('Listing deleted successfully');
      fetchAll();
    } catch (e) {
      toast.error('Failed to delete listing');
    }
  };

  const handleForceMatch = async (listing) => {
    setSelectedItem(listing);
    setModalType('match');
    setMatchLoading(true);
    try {
      const res = await api.get(`/admin/listings/${listing.id}/matches`);
      setMatchSuggestions(res.data.matches || []);
    } catch (e) {
      toast.error('Failed to fetch match suggestions');
    } finally {
      setMatchLoading(false);
    }
  };

  const handleViewListing = (listing) => {
    setSelectedItem(listing);
    setModalType('listing');
  };

  const handleViewVolunteerHistory = (volunteer) => {
    setSelectedItem(volunteer);
    setModalType('history');
  };

  useEffect(() => { fetchAll(); const iv = setInterval(fetchAll, 60000); return () => clearInterval(iv); }, []);
  useEffect(() => { const iv = setInterval(() => setTimeSinceUpdate(Math.round((Date.now() - lastUpdated) / 1000)), 1000); return () => clearInterval(iv); }, [lastUpdated]);

  const fetchAll = async () => {
    try {
      const [sRes, lRes, uRes, mlRes] = await Promise.all([
        api.get('/admin/stats').catch(() => ({ data: {} })),
        api.get('/listings?status=').catch(() => ({ data: { listings: [] } })),
        api.get('/admin/users').catch(() => ({ data: { users: [] } })),
        fetch(`${process.env.NEXT_PUBLIC_ML_API_URL || 'http://localhost:5001'}/health`).then(r => r.json()).catch(() => null),
      ]);
      setStats(sRes.data);
      setListings(lRes.data.listings || []);
      setUsers(uRes.data.users || []);
      setMlStats(mlRes);
      setLastUpdated(Date.now());
      setTimeSinceUpdate(0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleUpdateUser = async (userId, updates) => {
    try {
      await api.put(`/admin/users/${userId}`, updates);
      fetchAll();
    } catch (e) { console.error(e); }
  };

  // Demo data
  const wastePercent = 73;
  const sparkData = [12, 18, 14, 22, 19, 25, 20];
  const totalSaved = stats?.totalFood || listings.reduce((s, l) => s + (l.quantity || 0), 0);
  const activeNow = listings.filter(l => l.status === 'available').length;
  const deliveriesToday = stats?.deliveriesToday || 8;
  const totalNGOs = stats?.totalNGOs || 14;
  const activeNGOs = stats?.activeNGOs || 9;

  const events = [
    { time: '2m ago', type: 'Listing created', actor: 'Taj Palace Hotel', detail: 'Buffet Surplus — 25 kg cooked food', status: 'active' },
    { time: '12m ago', type: 'Claimed', actor: 'Meera Foundation', detail: 'Claimed "Bread & Pastries" from Baker\'s Delight', status: 'claimed' },
    { time: '34m ago', type: 'Delivered', actor: 'Vikram Singh', detail: 'Delivered dairy products to Hope Shelter', status: 'delivered' },
    { time: '1h ago', type: 'Expired', actor: 'System', detail: 'Fresh salad listing expired with no claims', status: 'expired' },
    { time: '2h ago', type: 'User registered', actor: 'Green Earth NGO', detail: 'New NGO registration — pending verification', status: 'pending' },
  ];

  const typeColors = { 'Listing created': C.accent, 'Claimed': C.blue, 'Delivered': C.accent, 'Expired': C.red, 'User registered': C.amber };
  const statusStyles = { available: { bg: `${C.accent}1a`, color: C.accent, label: 'Active' }, claimed: { bg: `${C.blue}1a`, color: C.blue, label: 'Claimed' }, in_transit: { bg: `${C.amber}1a`, color: C.amber, label: 'In Transit' }, delivered: { bg: `${C.accent}33`, color: C.accent, label: 'Delivered' }, expired: { bg: `${C.red}1a`, color: C.red, label: 'Expired' } };

  const filteredListings = listings.filter(l => !search || l.title?.toLowerCase().includes(search.toLowerCase()) || l.donor?.orgName?.toLowerCase().includes(search.toLowerCase()));
  const sortedListings = [...filteredListings].sort((a, b) => {
    const av = a[sortCol], bv = b[sortCol];
    const cmp = typeof av === 'string' ? (av || '').localeCompare(bv || '') : (av || 0) - (bv || 0);
    return sortDir === 'asc' ? cmp : -cmp;
  });
  const pageSize = 8;
  const totalPages = Math.ceil(sortedListings.length / pageSize);
  const pagedListings = sortedListings.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (col) => { if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortCol(col); setSortDir('asc'); } };

  const exportCSV = () => {
    const header = ['Title', 'Donor', 'Quantity', 'FoodType', 'Status', 'ExpiryTime'];
    const rows = filteredListings.map(l => [l.title, l.donor?.orgName || '', l.quantity, l.foodType, l.status, l.expiryTime]);
    const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `foodbridge-export-${Date.now()}.csv`; a.click();
  };


  const sideWidth = collapsed ? 64 : 240;

  const navItems = [
    { id: 'overview', icon: <FiBarChart2 size={18} />, label: 'Overview' },
    { id: 'feed', icon: <FiActivity size={18} />, label: 'Live Feed' },
    { id: 'listings', icon: <FiList size={18} />, label: 'All Listings', badge: activeNow },
    { id: 'users', icon: <FiUsers size={18} />, label: 'Users & NGOs' },
    { id: 'volunteers', icon: <FiTruck size={18} />, label: 'Volunteers' },
    { id: 'reports', icon: <FiFileText size={18} />, label: 'Reports' },
    { id: 'settings', icon: <FiSettings size={18} />, label: 'Settings' },
  ];

  const cd = { background: C.cardBg, border: `0.5px solid ${C.border}`, borderRadius: '0.75rem', padding: '1.25rem' };

  return (
    <div style={{ minHeight: '100vh', paddingTop: '4rem', background: C.pageBg, display: 'flex' }}>
      {/* ─── Sidebar ─── */}
      <aside style={{ width: sideWidth, flexShrink: 0, background: C.cardBg, borderRight: `0.5px solid ${C.border}`, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 4rem)', position: 'sticky', top: '4rem', transition: 'width 0.2s ease', overflow: 'hidden' }}>
        {/* Logo */}
        <div style={{ padding: collapsed ? '1rem 0.75rem' : '1.25rem 1rem', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: collapsed ? 'center' : 'flex-start' }}>
          {!collapsed && <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>FoodBridge</span>}
          <span style={{ fontSize: '0.55rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '9999px', background: `${C.red}1a`, color: C.red, border: `1px solid ${C.red}33` }}>Admin</span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0.5rem' }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveSection(item.id)} style={{
              display: 'flex', alignItems: 'center', gap: '0.65rem', width: '100%',
              padding: collapsed ? '0.65rem' : '0.6rem 0.75rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer',
              fontSize: '0.8rem', fontWeight: 500, transition: 'all 0.15s', justifyContent: collapsed ? 'center' : 'flex-start',
              background: activeSection === item.id ? '#1a2332' : 'transparent',
              color: activeSection === item.id ? C.accent : C.muted,
            }} title={collapsed ? item.label : undefined}>
              {item.icon}
              {!collapsed && <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>}
              {!collapsed && item.badge && <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '0.1rem 0.35rem', borderRadius: '9999px', background: `${C.red}1a`, color: C.red }}>{item.badge}</span>}
            </button>
          ))}
        </nav>

        {/* Collapse toggle */}
        <button onClick={() => setCollapsed(!collapsed)} style={{ padding: '0.75rem', borderTop: `1px solid ${C.border}`, background: 'transparent', border: 'none', borderTop: `1px solid ${C.border}`, cursor: 'pointer', color: C.muted, display: 'flex', justifyContent: 'center' }}>
          {collapsed ? <FiChevronRight size={16} /> : <FiChevronLeft size={16} />}
        </button>
      </aside>

      {/* ─── Main ─── */}
      <main style={{ flex: 1, overflow: 'auto', height: 'calc(100vh - 4rem)' }}>
        {/* Top bar */}
        <div style={{ padding: '1rem 2rem', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.cardBg }}>
          <div />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <select value={dateRange} onChange={e => setDateRange(e.target.value)} style={{ background: C.pageBg, border: `1px solid ${C.border}`, borderRadius: '0.5rem', padding: '0.4rem 0.6rem', color: C.text, fontSize: '0.8rem' }}>
              <option value="today">Today</option>
              <option value="week">This week</option>
              <option value="month">This month</option>
            </select>
            <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: C.pageBg, border: `1px solid ${C.border}`, borderRadius: '0.5rem', padding: '0.4rem 0.7rem', color: C.text, fontSize: '0.8rem', cursor: 'pointer' }}>
              <FiDownload size={13} /> Export
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${C.red}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: C.red }}>A</div>
              {!collapsed && <span style={{ fontSize: '0.8rem', color: C.muted }}>Super Admin</span>}
            </div>
          </div>
        </div>

        <div style={{ padding: '1.5rem 2rem' }}>
          {/* ─── KPI Row ─── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Total food saved', value: `${totalSaved}`, unit: 'kg', color: C.accent, sparkline: true },
              { label: 'Active listings', value: activeNow, color: C.blue, live: true },
              { label: 'Deliveries today', value: deliveriesToday, color: C.accent, badge: '+3 vs yesterday' },
              { label: 'Waste prevented', value: `${wastePercent}%`, color: C.accent, ring: true },
              { label: 'NGOs active', value: `${activeNGOs}`, unit: `/ ${totalNGOs}`, color: C.amber },
              { 
                label: 'AI Model Status', 
                value: mlStats ? 'Live' : 'Offline', 
                color: mlStats ? C.accent : C.red,
                isML: true,
                live: !!mlStats
              },
            ].map((kpi, i) => (
              <div key={i} className="animate-fade-in" style={{ ...cd, animationDelay: `${i * 0.06}s` }}
                onMouseEnter={e => e.currentTarget.style.borderColor = `${kpi.color}66`}
                onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
              >
                <p style={{ fontSize: '0.7rem', color: C.muted, marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{kpi.label}</p>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                    {kpi.isML && mlStats ? (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.7rem', color: C.text, fontWeight: 600 }}>MAE: {mlStats.metrics.demand_model.mae_kg} kg</span>
                        <span style={{ fontSize: '0.7rem', color: C.text, fontWeight: 600 }}>Acc: {(mlStats.metrics.claim_model.accuracy * 100).toFixed(1)}%</span>
                      </div>
                    ) : (
                      <span className="animate-countUp" style={{ fontSize: '1.5rem', fontWeight: 700, color: kpi.color, opacity: 0, animationDelay: `${0.2 + i * 0.08}s` }}>{kpi.value}</span>
                    )}
                    {kpi.unit && <span style={{ fontSize: '0.75rem', color: C.muted }}>{kpi.unit}</span>}
                    {kpi.live && <div className="pulse-dot" style={{ width: 8, height: 8, marginLeft: 6 }} />}
                  </div>
                  {kpi.sparkline && renderSparkline(sparkData, kpi.color)}
                  {kpi.badge && <span style={{ fontSize: '0.6rem', fontWeight: 600, padding: '0.15rem 0.4rem', borderRadius: '9999px', background: `${C.accent}1a`, color: C.accent }}>{kpi.badge}</span>}
                  {kpi.ring && (
                    <svg width={36} height={36} style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="18" cy="18" r="14" fill="none" stroke={C.border} strokeWidth="3" />
                      <circle cx="18" cy="18" r="14" fill="none" stroke={C.accent} strokeWidth="3"
                        strokeDasharray={`${wastePercent * 0.88} ${88 - wastePercent * 0.88}`} strokeLinecap="round" />
                    </svg>
                  )}
                </div>
              </div>
            ))}
          </div>

          <p style={{ fontSize: '0.7rem', color: '#484f58', marginBottom: '1.5rem' }}>Last updated {timeSinceUpdate}s ago <FiRefreshCw size={10} style={{ display: 'inline', cursor: 'pointer' }} onClick={fetchAll} /></p>

          {/* ─── Content based on section ─── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem' }}>
            <div>
              {/* Live Feed / Listings Overview */}
              {(activeSection === 'overview' || activeSection === 'feed') && (
                <div style={{ ...cd, marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <FiActivity size={16} style={{ color: C.accent }} /> Live activity feed
                    </h2>
                    <div className="pulse-dot" style={{ width: 8, height: 8 }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {events.map((ev, i) => (
                      <div key={i} className="animate-slideIn" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0', borderBottom: i < events.length - 1 ? `1px solid ${C.border}44` : 'none', animationDelay: `${i * 0.08}s`, opacity: 0 }}>
                        <span style={{ fontSize: '0.7rem', color: '#484f58', minWidth: 50 }}>{ev.time}</span>
                        <span style={{ fontSize: '0.6rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '9999px', background: `${typeColors[ev.type] || C.muted}1a`, color: typeColors[ev.type] || C.muted, whiteSpace: 'nowrap' }}>{ev.type}</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: C.text, minWidth: 120, whiteSpace: 'nowrap' }}>{ev.actor}</span>
                        <span style={{ fontSize: '0.75rem', color: C.muted, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Listings Table */}
              {(activeSection === 'overview' || activeSection === 'listings') && (
                <div style={{ ...cd, marginBottom: activeSection === 'overview' ? 0 : '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>{activeSection === 'overview' ? 'Recent Listings' : 'All Listings'}</h2>
                    <div style={{ position: 'relative' }}>
                      <FiSearch size={14} style={{ position: 'absolute', left: 8, top: 8, color: C.muted }} />
                      <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search..." style={{ background: C.pageBg, border: `1px solid ${C.border}`, borderRadius: '0.5rem', padding: '0.4rem 0.6rem 0.4rem 1.75rem', color: C.text, fontSize: '0.8rem', width: 180, outline: 'none' }} />
                    </div>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                          {[
                            { key: 'title', label: 'Food' },
                            { key: 'donor', label: 'Donor' },
                            { key: 'quantity', label: 'Qty' },
                            { key: 'foodType', label: 'Category' },
                            { key: 'expiryTime', label: 'Expiry' },
                            { key: 'status', label: 'Status' },
                          ].map(col => (
                            <th key={col.key} onClick={() => toggleSort(col.key)} style={{ padding: '0.5rem 0.4rem', textAlign: 'left', color: C.muted, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' }}>
                              {col.label} {sortCol === col.key && (sortDir === 'asc' ? '↑' : '↓')}
                            </th>
                          ))}
                          <th style={{ padding: '0.5rem 0.4rem', textAlign: 'right', color: C.muted, fontWeight: 600 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedListings.map((l, i) => {
                          const st = statusStyles[l.status] || statusStyles.available;
                          return (
                            <tr key={l.id} style={{ borderBottom: `1px solid ${C.border}22` }}>
                              <td style={{ padding: '0.5rem 0.4rem', fontWeight: 500 }}>{l.title}</td>
                              <td style={{ padding: '0.5rem 0.4rem', color: C.muted }}>{l.donor?.orgName || '—'}</td>
                              <td style={{ padding: '0.5rem 0.4rem' }}>{l.quantity} {l.unit}</td>
                              <td style={{ padding: '0.5rem 0.4rem', color: C.muted }}>{l.foodType}</td>
                              <td style={{ padding: '0.5rem 0.4rem', color: C.muted }}>{new Date(l.expiryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                              <td style={{ padding: '0.5rem 0.4rem' }}>
                                <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '0.15rem 0.45rem', borderRadius: '9999px', background: st.bg, color: st.color }}>{st.label}</span>
                              </td>
                              <td style={{ padding: '0.5rem 0.4rem', textAlign: 'right' }}>
                                <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'flex-end' }}>
                                  <button onClick={() => handleViewListing(l)} style={{ background: C.pageBg, border: `1px solid ${C.border}`, borderRadius: '0.35rem', padding: '0.25rem', cursor: 'pointer', color: C.muted }} title="View"><FiEye size={12} /></button>
                                  <button onClick={() => handleForceMatch(l)} style={{ background: C.pageBg, border: `1px solid ${C.border}`, borderRadius: '0.35rem', padding: '0.25rem', cursor: 'pointer', color: C.blue }} title="Force match"><FiTarget size={12} /></button>
                                  <button onClick={() => handleDeleteListing(l.id)} style={{ background: C.pageBg, border: `1px solid ${C.border}`, borderRadius: '0.35rem', padding: '0.25rem', cursor: 'pointer', color: C.red }} title="Delete"><FiTrash2 size={12} /></button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {/* Pagination - only on Listings page */}
                  {activeSection === 'listings' && totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: '0.35rem', padding: '0.3rem 0.6rem', color: page === 1 ? '#484f58' : C.text, cursor: 'pointer', fontSize: '0.75rem' }}>Previous</button>
                      {Array.from({ length: totalPages }, (_, i) => (
                        <button key={i} onClick={() => setPage(i + 1)} style={{ background: page === i + 1 ? C.accent : 'transparent', border: `1px solid ${page === i + 1 ? C.accent : C.border}`, borderRadius: '0.35rem', padding: '0.3rem 0.55rem', color: page === i + 1 ? '#fff' : C.text, cursor: 'pointer', fontSize: '0.75rem', fontWeight: page === i + 1 ? 600 : 400 }}>{i + 1}</button>
                      ))}
                      <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: '0.35rem', padding: '0.3rem 0.6rem', color: page === totalPages ? '#484f58' : C.text, cursor: 'pointer', fontSize: '0.75rem' }}>Next</button>
                    </div>
                  )}
                </div>
              )}
              {/* Users & NGOs Section */}
              {activeSection === 'users' && (
                <div style={cd}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <div>
                      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Users & NGOs</h2>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                        {['donors', 'receivers'].map(tab => (
                          <button key={tab} onClick={() => setUserTab(tab)} style={{
                            background: 'transparent', border: 'none', borderBottom: userTab === tab ? `2px solid ${C.accent}` : 'none',
                            padding: '0.4rem 0', color: userTab === tab ? C.accent : C.muted, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize'
                          }}>
                            {tab === 'receivers' ? 'NGOs / Receivers' : 'Donors / Food Providers'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <FiSearch size={14} style={{ position: 'absolute', left: 8, top: 8, color: C.muted }} />
                      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search organizations..." style={{ background: C.pageBg, border: `1px solid ${C.border}`, borderRadius: '0.5rem', padding: '0.4rem 0.6rem 0.4rem 1.75rem', color: C.text, fontSize: '0.8rem', width: 220, outline: 'none' }} />
                    </div>
                  </div>
                  
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${C.border}`, textAlign: 'left' }}>
                          <th style={{ padding: '0.6rem 0.4rem', color: C.muted }}>Organization</th>
                          <th style={{ padding: '0.6rem 0.4rem', color: C.muted }}>Contact</th>
                          <th style={{ padding: '0.6rem 0.4rem', color: C.muted }}>Location</th>
                          <th style={{ padding: '0.6rem 0.4rem', color: C.muted }}>Status</th>
                          <th style={{ padding: '0.6rem 0.4rem', color: C.muted }}>Stats</th>
                          <th style={{ padding: '0.6rem 0.4rem', color: C.muted, textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.filter(u => 
                          (userTab === 'donors' ? u.role === 'donor' : u.role === 'receiver') &&
                          (!search || u.orgName?.toLowerCase().includes(search.toLowerCase()) || u.name?.toLowerCase().includes(search.toLowerCase()))
                        ).map(u => (
                          <tr key={u.id} style={{ borderBottom: `1px solid ${C.border}22` }}>
                            <td style={{ padding: '0.8rem 0.4rem' }}>
                              <div style={{ fontWeight: 600 }}>{u.orgName || u.name}</div>
                              <div style={{ fontSize: '0.7rem', color: C.muted }}>{u.orgType}</div>
                            </td>
                            <td style={{ padding: '0.8rem 0.4rem' }}>
                              <div>{u.name}</div>
                              <div style={{ fontSize: '0.7rem', color: C.muted }}>{u.email}</div>
                            </td>
                            <td style={{ padding: '0.8rem 0.4rem', color: C.muted, fontSize: '0.75rem' }}>{u.address?.split(',')[0]}</td>
                            <td style={{ padding: '0.8rem 0.4rem' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <span style={{ fontSize: '0.6rem', fontWeight: 600, padding: '0.1rem 0.4rem', borderRadius: '4px', background: u.isVerified ? `${C.accent}1a` : `${C.amber}1a`, color: u.isVerified ? C.accent : C.amber, textAlign: 'center' }}>
                                  {u.isVerified ? 'VERIFIED' : 'PENDING'}
                                </span>
                                <span style={{ fontSize: '0.6rem', fontWeight: 600, padding: '0.1rem 0.4rem', borderRadius: '4px', background: u.isActive ? `${C.blue}1a` : `${C.red}1a`, color: u.isActive ? C.blue : C.red, textAlign: 'center' }}>
                                  {u.isActive ? 'ACTIVE' : 'INACTIVE'}
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: '0.8rem 0.4rem', fontSize: '0.75rem' }}>
                              {u.role === 'donor' ? `${u.totalDonations} donations` : `${u.totalReceived} received`}
                              <div style={{ color: C.amber, display: 'flex', alignItems: 'center', gap: '0.2rem' }}><FiStar size={10} /> {u.rating}</div>
                            </td>
                            <td style={{ padding: '0.8rem 0.4rem', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                                {!u.isVerified && <button onClick={() => handleUpdateUser(u.id, { isVerified: true })} style={{ background: C.accent, border: 'none', borderRadius: '0.35rem', padding: '0.3rem 0.5rem', cursor: 'pointer', color: '#fff', fontSize: '0.7rem', fontWeight: 600 }}>Verify</button>}
                                <button onClick={() => handleUpdateUser(u.id, { isActive: !u.isActive })} style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: '0.35rem', padding: '0.3rem 0.5rem', cursor: 'pointer', color: u.isActive ? C.red : C.accent, fontSize: '0.7rem' }}>
                                  {u.isActive ? 'Suspend' : 'Reactivate'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Volunteers Section */}
              {activeSection === 'volunteers' && (
                <div style={cd}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Volunteer Management</h2>
                    <div style={{ position: 'relative' }}>
                      <FiSearch size={14} style={{ position: 'absolute', left: 8, top: 8, color: C.muted }} />
                      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search volunteers..." style={{ background: C.pageBg, border: `1px solid ${C.border}`, borderRadius: '0.5rem', padding: '0.4rem 0.6rem 0.4rem 1.75rem', color: C.text, fontSize: '0.8rem', width: 220, outline: 'none' }} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
                    {users.filter(u => u.role === 'volunteer' && (!search || u.name?.toLowerCase().includes(search.toLowerCase()))).map(v => (
                      <div key={v.id} style={{ ...cd, display: 'flex', flexDirection: 'column', gap: '0.75rem', background: `${C.cardBg}88` }}>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                          <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${C.blue}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 700, color: C.blue }}>{v.name[0]}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{v.name}</div>
                            <div style={{ fontSize: '0.75rem', color: C.muted }}>Joined {new Date(v.createdAt).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                          <span style={{ color: C.muted }}>Deliveries</span>
                          <span style={{ fontWeight: 600 }}>{v.totalDonations || 0}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                          <span style={{ color: C.muted }}>Rating</span>
                          <span style={{ color: C.amber, display: 'flex', alignItems: 'center', gap: '0.2rem' }}><FiStar size={12} /> {v.rating}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <button onClick={() => handleViewVolunteerHistory(v)} style={{ flex: 1, background: 'transparent', border: `1px solid ${C.border}`, borderRadius: '0.5rem', padding: '0.4rem', color: C.text, fontSize: '0.75rem', cursor: 'pointer' }}>History</button>
                          <button onClick={() => handleUpdateUser(v.id, { isActive: !v.isActive })} style={{ flex: 1, background: 'transparent', border: `1px solid ${v.isActive ? C.red : C.accent}33`, borderRadius: '0.5rem', padding: '0.4rem', color: v.isActive ? C.red : C.accent, fontSize: '0.75rem', cursor: 'pointer' }}>
                            {v.isActive ? 'Suspend' : 'Activate'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reports Section */}
              {activeSection === 'reports' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div style={cd}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Impact Report</h3>
                      <span style={{ fontSize: '0.7rem', color: C.muted }}>By Food Category</span>
                    </div>
                    <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {stats?.charts?.listingsByType ? (
                        <Doughnut 
                          data={{
                            labels: stats.charts.listingsByType.map(i => i.foodType),
                            datasets: [{
                              data: stats.charts.listingsByType.map(i => i.count),
                              backgroundColor: [C.accent, C.blue, C.amber, C.red, '#8b5cf6', '#ec4899', '#06b6d4', '#f59e0b'],
                              borderWidth: 0,
                              hoverOffset: 4,
                            }]
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: { position: 'right', labels: { color: C.muted, boxWidth: 12, font: { size: 10 } } },
                              tooltip: { backgroundColor: C.cardBg, titleColor: C.text, bodyColor: C.muted, borderColor: C.border, borderWidth: 1 }
                            },
                            cutout: '70%',
                          }}
                        />
                      ) : (
                        <div style={{ color: C.muted, fontSize: '0.8rem' }}>Loading chart data...</div>
                      )}
                    </div>
                    <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div style={{ padding: '0.75rem', background: `${C.pageBg}66`, borderRadius: '0.5rem' }}>
                        <p style={{ fontSize: '0.65rem', color: C.muted, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Top Category</p>
                        <p style={{ fontSize: '0.9rem', fontWeight: 700, color: C.accent }}>
                          {stats?.charts?.listingsByType?.[0]?.foodType || 'Cooked Food'}
                        </p>
                      </div>
                      <div style={{ padding: '0.75rem', background: `${C.pageBg}66`, borderRadius: '0.5rem' }}>
                        <p style={{ fontSize: '0.65rem', color: C.muted, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Diversity Score</p>
                        <p style={{ fontSize: '0.9rem', fontWeight: 700, color: C.blue }}>8.4/10</p>
                      </div>
                    </div>
                  </div>

                  <div style={cd}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Efficiency Metrics</h3>
                      <span style={{ fontSize: '0.7rem', color: C.muted }}>Last 7 Days</span>
                    </div>
                    <div style={{ height: 260 }}>
                      <Line 
                        data={{
                          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                          datasets: [
                            {
                              label: 'Avg Claim Time (min)',
                              data: [45, 38, 42, 30, 25, 22, 18],
                              borderColor: C.accent,
                              backgroundColor: `${C.accent}33`,
                              fill: true,
                              tension: 0.4,
                              pointRadius: 4,
                              pointHoverRadius: 6,
                            },
                            {
                              label: 'Claim Rate (%)',
                              data: [65, 72, 68, 85, 92, 95, 98],
                              borderColor: C.blue,
                              backgroundColor: `${C.blue}33`,
                              fill: true,
                              tension: 0.4,
                              pointRadius: 4,
                              pointHoverRadius: 6,
                            }
                          ]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: {
                            y: { grid: { color: `${C.border}33` }, ticks: { color: C.muted, font: { size: 10 } } },
                            x: { grid: { display: false }, ticks: { color: C.muted, font: { size: 10 } } }
                          },
                          plugins: {
                            legend: { display: true, position: 'top', align: 'end', labels: { color: C.muted, boxWidth: 10, font: { size: 10 } } },
                            tooltip: { backgroundColor: C.cardBg, titleColor: C.text, bodyColor: C.muted, borderColor: C.border, borderWidth: 1 }
                          }
                        }}
                      />
                    </div>
                    <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div style={{ padding: '0.75rem', background: `${C.pageBg}66`, borderRadius: '0.5rem' }}>
                        <p style={{ fontSize: '0.65rem', color: C.muted, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Response Delta</p>
                        <p style={{ fontSize: '0.9rem', fontWeight: 700, color: C.accent }}>-12.4% <span style={{ fontSize: '0.7rem', fontWeight: 400 }}>(Faster)</span></p>
                      </div>
                      <div style={{ padding: '0.75rem', background: `${C.pageBg}66`, borderRadius: '0.5rem' }}>
                        <p style={{ fontSize: '0.65rem', color: C.muted, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Throughput</p>
                        <p style={{ fontSize: '0.9rem', fontWeight: 700, color: C.amber }}>1.2k Match/Hr</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Settings Section (Placeholder) */}
              {activeSection === 'settings' && (
                <div style={{ ...cd, maxWidth: 600 }}>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem' }}>Admin Settings</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                      <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem' }}>General Notifications</h3>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: `${C.pageBg}44`, borderRadius: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem' }}>System Alerts (Email)</span>
                        <div style={{ width: 40, height: 20, borderRadius: '999px', background: C.accent, position: 'relative' }}><div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', right: 2, top: 2 }} /></div>
                      </div>
                    </div>
                    <div>
                      <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem' }}>Platform Access</h3>
                      <button style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: '0.5rem', padding: '0.6rem 1rem', color: C.text, fontSize: '0.8rem', cursor: 'pointer' }}>Manage API Keys</button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ─── Alerts Panel ─── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.25rem' }}>System Alerts</h3>
              {activeAlerts.map((al) => (
                <div key={al.id} className="animate-slideIn" style={{
                  ...cd, padding: '1rem', borderLeft: `3px solid ${al.color}`,
                  opacity: 1,
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ color: al.color, marginTop: 2 }}>{al.icon}</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: C.text }}>{al.title}</span>
                  </div>
                  <p style={{ fontSize: '0.7rem', color: C.muted, marginBottom: '0.65rem', marginLeft: '1.5rem' }}>{al.desc}</p>
                  <div style={{ display: 'flex', gap: '0.4rem', marginLeft: '1.5rem' }}>
                    <button 
                      onClick={() => dismissAlert(al.id)}
                      style={{ fontSize: '0.65rem', padding: '0.25rem 0.5rem', borderRadius: '0.35rem', border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, cursor: 'pointer' }}
                    >
                      Dismiss
                    </button>
                    <button 
                      onClick={() => handleTakeAction(al.action)}
                      style={{ fontSize: '0.65rem', padding: '0.25rem 0.5rem', borderRadius: '0.35rem', border: 'none', background: al.color, color: '#fff', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Take action
                    </button>
                  </div>
                </div>
              ))}

              {/* Quick Stats */}
              <div style={{ ...cd, marginTop: '0.5rem' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem' }}>Platform health</h3>
                {[
                  { label: 'API uptime', value: '99.8%', color: C.accent },
                  { label: 'Avg response', value: '124ms', color: C.blue },
                  { label: 'Pending reviews', value: '3', color: C.amber },
                  { label: 'Open tickets', value: '1', color: C.red },
                ].map((s, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: i < 3 ? `1px solid ${C.border}22` : 'none' }}>
                    <span style={{ fontSize: '0.75rem', color: C.muted }}>{s.label}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: s.color }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        {/* ─── Modals ─── */}
        {modalType && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
            <div style={{ ...cd, maxWidth: 500, width: '100%', position: 'relative', border: `1px solid ${C.border}` }}>
              <button 
                onClick={() => { setModalType(null); setSelectedItem(null); }}
                style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '1.25rem' }}
              >
                ×
              </button>
              
              {modalType === 'listing' && selectedItem && (
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Listing Details</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div><span style={{ color: C.muted, fontSize: '0.75rem' }}>Title:</span> <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{selectedItem.title}</div></div>
                    <div><span style={{ color: C.muted, fontSize: '0.75rem' }}>Donor:</span> <div>{selectedItem.donor?.orgName || 'N/A'}</div></div>
                    <div><span style={{ color: C.muted, fontSize: '0.75rem' }}>Quantity:</span> <div>{selectedItem.quantity} {selectedItem.unit}</div></div>
                    <div><span style={{ color: C.muted, fontSize: '0.75rem' }}>Food Type:</span> <div style={{ textTransform: 'capitalize' }}>{selectedItem.foodType}</div></div>
                    <div><span style={{ color: C.muted, fontSize: '0.75rem' }}>Expiry:</span> <div>{new Date(selectedItem.expiryTime).toLocaleString()}</div></div>
                    <div style={{ marginTop: '1rem', padding: '0.75rem', background: C.pageBg, borderRadius: '0.5rem', border: `1px solid ${C.border}` }}>
                      <FiInfo size={14} style={{ color: C.blue, marginRight: '0.5rem' }} />
                      <span style={{ fontSize: '0.75rem', color: C.muted }}>Status: {selectedItem.status}</span>
                    </div>
                  </div>
                </div>
              )}

              {modalType === 'match' && selectedItem && (
                <div style={{ textAlign: 'center' }}>
                  <FiTarget size={40} style={{ color: C.blue, marginBottom: '1rem' }} />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Smart Match Suggestions</h3>
                  <p style={{ color: C.muted, fontSize: '0.85rem', marginBottom: '1.5rem' }}>Comparing {users.length} NGOs for "{selectedItem.title}"...</p>
                  
                  {matchLoading ? (
                    <div style={{ padding: '2rem' }}><FiRefreshCw className="animate-spin" size={24} style={{ color: C.blue }} /></div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {matchSuggestions.length > 0 ? matchSuggestions.map(match => (
                        <div key={match.id} style={{ padding: '0.75rem', background: `${C.accent}11`, border: `1px solid ${C.accent}33`, borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{match.name}</div>
                            <div style={{ fontSize: '0.65rem', color: C.muted }}>Distance: {match.distanceKm?.toFixed(1)} km</div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <span style={{ fontSize: '0.75rem', color: C.accent, fontWeight: 700 }}>{match.compositeScore}% Match</span>
                            <button 
                              onClick={() => {
                                toast.promise(
                                  api.post('/claims', { listingId: selectedItem.id, receiverId: match.id, notes: 'Admin forced match assignment' }),
                                  { loading: 'Assigning...', success: 'Match assigned!', error: 'Assignment failed' }
                                );
                                setModalType(null);
                                fetchAll();
                              }}
                              style={{ fontSize: '0.6rem', background: C.accent, color: '#fff', border: 'none', padding: '0.2rem 0.6rem', borderRadius: '4px', cursor: 'pointer', marginTop: '0.25rem' }}
                            >
                              Assign
                            </button>
                          </div>
                        </div>
                      )) : (
                        <div style={{ padding: '1rem', color: C.muted, fontSize: '0.85rem' }}>No suitable matches found nearby.</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {modalType === 'history' && selectedItem && (
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Volunteer History</h3>
                  <p style={{ color: C.muted, fontSize: '0.8rem', marginBottom: '1rem' }}>Active and past deliveries for {selectedItem.name}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {[
                      { id: 1, task: 'Buffet Surplus Delivery', status: 'delivered', date: '2026-04-20' },
                      { id: 2, task: 'Grocery Pickup', status: 'delivered', date: '2026-04-18' },
                      { id: 3, task: 'Night Shelter Logistics', status: 'cancelled', date: '2026-04-15' },
                    ].map(h => (
                      <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem', background: C.pageBg, borderRadius: '0.4rem', border: `1px solid ${C.border}` }}>
                        <span style={{ fontSize: '0.8rem' }}>{h.task}</span>
                        <span style={{ fontSize: '0.7rem', color: h.status === 'delivered' ? C.accent : C.red }}>{h.status.toUpperCase()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
