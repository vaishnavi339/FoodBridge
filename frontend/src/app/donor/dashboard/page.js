'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { listingsAPI } from '@/services/api';
import { FiPlusCircle, FiPackage, FiClock, FiTruck, FiCheckCircle, FiArrowRight, FiAlertTriangle, FiStar, FiUsers, FiMapPin, FiSettings } from 'react-icons/fi';
import toast from 'react-hot-toast';

/* ── Exact design tokens ── */
const COLORS = {
  pageBg: '#0d1117',
  cardBg: '#161b22',
  cardBorder: '#21262d',
  accent: '#1D9E75',
  amber: '#EF9F27',
  red: '#e24b4a',
};

/* ── Urgency logic (per spec) ── */
const getUrgency = (hoursLeft) => {
  if (hoursLeft < 2) return { label: 'Urgent', bg: '#2a1010', color: COLORS.red, border: `1px solid ${COLORS.red}33` };
  if (hoursLeft < 6) return { label: `${Math.round(hoursLeft)}h left`, bg: '#2a1f08', color: COLORS.amber, border: `1px solid ${COLORS.amber}33` };
  return { label: `${Math.round(hoursLeft)}h left`, bg: '#0f2a1e', color: COLORS.accent, border: `1px solid ${COLORS.accent}33` };
};

const hoursUntil = (expiryTime) => Math.max(0, (new Date(expiryTime) - new Date()) / (1000 * 60 * 60));

export default function DonorDashboard() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [listings, setListings] = useState([]);
  const [allListings, setAllListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [activities, setActivities] = useState([]);


  useEffect(() => { fetchListings(); }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('listing:claimed', (data) => {
      toast.success('Your listing was claimed!');
      addActivity('claimed', 'A receiver claimed your food listing');
      fetchListings();
    });
    socket.on('listing:update', (data) => {
      addActivity('update', 'Listing status updated');
    });
    return () => { socket.off('listing:claimed'); socket.off('listing:update'); };
  }, [socket]);

  const addActivity = (type, message) => {
    setActivities(prev => [{ type, message, time: new Date() }, ...prev].slice(0, 10));
  };

  const fetchListings = async () => {
    try {
      // Fetch all listings for this donor using donorId filter
      const res = await listingsAPI.getAll({ status: '', donorId: user?.id });
      let mine = res.data.listings || [];

      // Client-side filter as extra safety net
      if (mine.length === 0 && user?.id) {
        const all = await listingsAPI.getAll({ status: '' });
        mine = (all.data.listings || []).filter(
          l => l.donorId === user?.id || l.donor?.id === user?.id
        );
      }

      setListings(mine);
      setAllListings(mine);
      setActivities([
        { type: 'claimed', message: 'Meera Foundation claimed your "Buffet Surplus"', time: new Date(Date.now() - 12 * 60000) },
        { type: 'delivered', message: 'Food delivered to Annapurna Kitchen', time: new Date(Date.now() - 45 * 60000) },
        { type: 'transit', message: 'Packaged snacks are in transit', time: new Date(Date.now() - 90 * 60000) },
        { type: 'expiring', message: 'Dairy Products listing expiring soon', time: new Date(Date.now() - 150 * 60000) },
      ]);
    } catch (err) { console.error('Failed to fetch listings', err); }
    finally { setLoading(false); }
  };

  // Stats — use listing data OR fall back to user profile totals
  const stats = {
    total: listings.length > 0 ? listings.length : (user?.totalDonations || 0),
    active: listings.filter(l => l.status === 'available').length,
    claimed: listings.filter(l => ['claimed', 'in_transit'].includes(l.status)).length,
    delivered: listings.filter(l => l.status === 'delivered').length || 0,
    urgent: listings.filter(l => l.urgencyScore > 70).length,
  };


  const categoryBreakdown = (() => {
    const cats = {};
    const src = listings.length > 0 ? listings : allListings;
    src.forEach(l => { const t = l.foodType || 'mixed'; cats[t] = (cats[t] || 0) + 1; });
    const total = Object.values(cats).reduce((s, v) => s + v, 0) || 1;
    const labels = { cooked: 'Cooked meals', bakery: 'Bakery items', fruits_vegetables: 'Fruits & veggies', packaged: 'Packaged goods', dairy: 'Dairy products', raw: 'Raw ingredients', beverages: 'Beverages', mixed: 'Mixed items' };
    return Object.entries(cats).map(([k, c]) => ({ key: k, label: labels[k] || k, count: c, pct: Math.round((c / total) * 100) })).sort((a, b) => b.pct - a.pct);
  })();

  const totalKgSaved = listings.reduce((s, l) => s + (l.unit === 'kg' ? l.quantity : l.quantity * 0.5), 0);

  const donations = user?.totalDonations || listings.length || 0;
  const rating = user?.rating || 4.8;
  const impactScore = Math.min(99, Math.round(donations * 2.5 + rating * 5));
  const level = impactScore >= 90 ? 5 : impactScore >= 70 ? 4 : impactScore >= 50 ? 3 : impactScore >= 25 ? 2 : 1;
  const levelLabels = { 1: 'New donor', 2: 'Rising donor', 3: 'Active donor', 4: 'Top donor', 5: 'Elite donor' };
  const toNextLevel = Math.max(0, [10, 20, 28, 36, 50][level - 1] - donations);

  const memberSince = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Jan 2024';

  const foodEmoji = (t) => ({ cooked: '🍛', bakery: '🥖', fruits_vegetables: '🥗', dairy: '🥛', packaged: '📦', raw: '🥩', beverages: '🥤', mixed: '🍽️' }[t] || '🍽️');

  const timeAgo = (d) => { const m = Math.round((Date.now() - new Date(d)) / 60000); if (m < 1) return 'Just now'; if (m < 60) return `${m}m ago`; if (m < 1440) return `${Math.round(m / 60)}h ago`; return `${Math.round(m / 1440)}d ago`; };

  const feedIcons = { claimed: { icon: '✓', bg: '#0f2a1e', color: COLORS.accent }, delivered: { icon: '✓✓', bg: '#0f2a1e', color: COLORS.accent }, transit: { icon: '🚚', bg: '#0f1a2e', color: '#3b82f6' }, expiring: { icon: '⚠', bg: '#2a1010', color: COLORS.red }, update: { icon: '🔄', bg: '#1a1a2e', color: '#818cf8' } };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: <FiPackage size={18} /> },
    { id: 'listings', label: 'My Listings', icon: <FiPlusCircle size={18} /> },
    { id: 'analytics', label: 'Impact Analytics', icon: <FiUsers size={18} /> },
    { id: 'settings', label: 'Settings', icon: <FiSettings size={18} /> },
  ];

  /* ── Card style helper ── */
  const sideCard = { background: COLORS.cardBg, border: `0.5px solid ${COLORS.cardBorder}`, borderRadius: '0.75rem', padding: '1rem' };
  const cardStyle = { ...sideCard, padding: '1.5rem', transition: 'border-color 0.2s ease' };

  const cardHover = { borderColor: `${COLORS.accent}66` };

  const barColors = [COLORS.accent, COLORS.amber, '#6366f1', '#f87171'];

  return (
    <div className="flex bg-[#0d1117] min-h-screen pt-16">
      {/* ─── Left Sidebar ─── */}
      <aside className="desktop-only" style={{ width: 300, flexShrink: 0, background: COLORS.cardBg, borderRight: `0.5px solid ${COLORS.cardBorder}`, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 4rem)', position: 'sticky', top: '4rem' }}>
        <div style={{ padding: '1.5rem', borderBottom: `1px solid ${COLORS.cardBorder}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: `linear-gradient(135deg, ${COLORS.accent}, #0d6e52)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {user?.name?.charAt(0) || 'D'}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '1rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.orgName || user?.name || 'Donor'}</div>
              <div style={{ fontSize: '0.75rem', color: '#8b949e' }}>Member since {memberSince}</div>
            </div>
          </div>
          <div style={{ background: `${COLORS.accent}1a`, border: `1px solid ${COLORS.accent}33`, borderRadius: '0.5rem', padding: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: COLORS.accent, fontWeight: 600 }}>Elite Donor</span>
            <span style={{ fontSize: '0.7rem', color: COLORS.accent, fontWeight: 700 }}>Lvl {level}</span>
          </div>
        </div>

        <nav style={{ padding: '0.75rem', flex: 1 }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%',
              padding: '0.65rem 0.75rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer',
              fontSize: '0.85rem', fontWeight: 500, transition: 'all 0.15s',
              background: activeTab === item.id ? '#1a2332' : 'transparent',
              color: activeTab === item.id ? COLORS.accent : '#8b949e',
              borderLeft: activeTab === item.id ? `3px solid ${COLORS.accent}` : '3px solid transparent',
            }}>
              {item.icon} {item.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: '1.5rem', borderTop: `1px solid ${COLORS.cardBorder}` }}>
          <Link href="/donor/create-listing" style={{ textDecoration: 'none', background: COLORS.accent, color: '#fff', padding: '0.6rem', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <FiPlusCircle size={16} /> New Donation
          </Link>
        </div>
      </aside>

      {/* ─── Main Content ─── */}
      <main className="flex-1 w-full p-4 md:p-6 lg:p-8 overflow-y-auto h-[calc(100vh-4rem)]">
        {activeTab === 'overview' && (
          <div className="animate-fade-in">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
              <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Dashboard Overview</h1>
                <p style={{ color: '#8b949e', marginTop: '0.25rem', fontSize: '0.85rem' }}>Welcome back, {user?.name?.split(' ')[0]}</p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: COLORS.accent }}>{impactScore}</div>
                  <div style={{ fontSize: '0.65rem', color: '#8b949e', textTransform: 'uppercase' }}>Impact Score</div>
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total listings', value: stats.total, icon: <FiPackage size={18} />, color: '#818cf8' },
                { label: 'Active now', value: stats.active, icon: <FiClock size={18} />, color: COLORS.amber },
                { label: 'In progress', value: stats.claimed, icon: <FiTruck size={18} />, color: '#3b82f6' },
                { label: 'Delivered', value: stats.delivered, icon: <FiCheckCircle size={18} />, color: COLORS.accent },
              ].map((s, i) => (
                <div key={i} style={cardStyle}>
                  <div style={{ color: s.color, marginBottom: '0.5rem' }}>{s.icon}</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{s.value}</div>
                  <div style={{ fontSize: '0.75rem', color: '#8b949e' }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-6">
              <div style={cardStyle}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Active Listings</h3>
                {listings.filter(l => l.status === 'available').length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: '#8b949e', textAlign: 'center', padding: '2rem' }}>No active listings</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {listings.filter(l => l.status === 'available').slice(0, 4).map(l => (
                      <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: COLORS.pageBg, borderRadius: '0.5rem', border: `1px solid ${COLORS.cardBorder}` }}>
                        <span style={{ fontSize: '1.2rem' }}>{foodEmoji(l.foodType)}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{l.title}</div>
                          <div style={{ fontSize: '0.7rem', color: '#8b949e' }}>{l.quantity} {l.unit} • {timeAgo(l.createdAt)}</div>
                        </div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px', background: `${COLORS.accent}1a`, color: COLORS.accent }}>{l.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={cardStyle}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Category Mix</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {categoryBreakdown.slice(0, 4).map((cat, i) => (
                    <div key={cat.key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.75rem' }}>
                        <span>{cat.label}</span>
                        <span>{cat.pct}%</span>
                      </div>
                      <div style={{ height: 4, background: COLORS.cardBorder, borderRadius: 2 }}>
                        <div style={{ height: '100%', width: `${cat.pct}%`, background: barColors[i], borderRadius: 2 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'listings' && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>My Donation Listings</h1>
              <Link href="/donor/create-listing" style={{ background: COLORS.accent, color: '#fff', textDecoration: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>
                Create New Listing
              </Link>
            </div>

            <div style={cardStyle}>
              {listings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🥗</div>
                  <h3 style={{ fontWeight: 600 }}>No donations yet</h3>
                  <p style={{ color: '#8b949e', fontSize: '0.85rem' }}>Start by creating your first food listing.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${COLORS.cardBorder}`, textAlign: 'left' }}>
                        <th style={{ padding: '1rem 0.5rem', fontSize: '0.8rem', color: '#8b949e' }}>Item</th>
                        <th style={{ padding: '1rem 0.5rem', fontSize: '0.8rem', color: '#8b949e' }}>Status</th>
                        <th style={{ padding: '1rem 0.5rem', fontSize: '0.8rem', color: '#8b949e' }}>Date</th>
                        <th style={{ padding: '1rem 0.5rem', fontSize: '0.8rem', color: '#8b949e', textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listings.map(l => (
                        <tr key={l.id} style={{ borderBottom: `1px solid ${COLORS.cardBorder}44` }}>
                          <td style={{ padding: '1rem 0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <span>{foodEmoji(l.foodType)}</span>
                              <div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{l.title}</div>
                                <div style={{ fontSize: '0.75rem', color: '#8b949e' }}>{l.quantity} {l.unit}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '1rem 0.5rem' }}>
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '9999px', background: l.status === 'delivered' ? `${COLORS.accent}1a` : `${COLORS.amber}1a`, color: l.status === 'delivered' ? COLORS.accent : COLORS.amber }}>
                              {l.status.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: '1rem 0.5rem', fontSize: '0.8rem', color: '#8b949e' }}>{new Date(l.createdAt).toLocaleDateString()}</td>
                          <td style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
                            <button style={{ background: 'transparent', border: 'none', color: COLORS.accent, fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>Manage</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="animate-fade-in">
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '2rem' }}>Impact Tracking</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[
                { label: 'Est. People Fed', val: donations * 8, color: COLORS.accent },
                { label: 'Food Safe (kg)', val: Math.round(totalKgSaved), color: '#3b82f6' },
                { label: 'CO2 Prevented', val: `${Math.round(totalKgSaved * 2.5)} kg`, color: COLORS.amber },
              ].map((s, i) => (
                <div key={i} style={cardStyle}>
                  <div style={{ fontSize: '0.75rem', color: '#8b949e', marginBottom: '0.5rem' }}>{s.label}</div>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: s.color }}>{s.val}</div>
                </div>
              ))}
            </div>
            <div style={cardStyle}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem' }}>Donation Trends</h3>
              <div style={{ height: 200, background: 'linear-gradient(180deg, #1d9e7511 0%, #0d1117 100%)', borderRadius: '0.75rem', border: `1px solid ${COLORS.cardBorder}`, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', padding: '2rem 1rem 1rem 1rem' }}>
                {[
                  { day: 'Mon', val: 42 }, { day: 'Tue', val: 65 }, { day: 'Wed', val: 45 }, 
                  { day: 'Thu', val: 82 }, { day: 'Fri', val: 58 }, { day: 'Sat', val: 94 }, { day: 'Sun', val: 75 }
                ].map((item, i) => (
                  <div key={i} style={{ width: '10%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: COLORS.accent }}>{item.val}</span>
                    <div style={{ width: '100%', height: `${item.val}%`, background: COLORS.accent, borderRadius: '4px 4px 0 0', opacity: 0.6 + (i * 0.05), boxShadow: `0 0 10px ${COLORS.accent}22` }} />
                    <span style={{ fontSize: '0.6rem', color: '#8b949e', fontWeight: 600, marginTop: '0.25rem' }}>{item.day}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="animate-fade-in" style={{ maxWidth: 600 }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '2rem' }}>Settings</h1>
            <div style={cardStyle}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem' }}>Donor Profile</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {[
                  { label: 'Full Name', val: user?.name },
                  { label: 'Organization Name', val: user?.orgName },
                  { label: 'Email Address', val: user?.email },
                ].map((f, i) => (
                  <div key={i}>
                    <p style={{ fontSize: '0.75rem', color: '#8b949e', marginBottom: '0.4rem' }}>{f.label}</p>
                    <input readOnly value={f.val || ''} style={{ width: '100%', background: COLORS.pageBg, border: `1px solid ${COLORS.cardBorder}`, borderRadius: '0.5rem', padding: '0.75rem', color: '#fff', fontSize: '0.85rem' }} />
                  </div>
                ))}
              </div>
              <button style={{ marginTop: '2rem', background: COLORS.accent, color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', fontWeight: 600, width: '100%' }}>Update Profile</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
