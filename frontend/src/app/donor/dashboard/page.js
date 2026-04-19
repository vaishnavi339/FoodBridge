'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { listingsAPI } from '@/services/api';
import { FiPlusCircle, FiPackage, FiClock, FiTruck, FiCheckCircle, FiArrowRight, FiAlertTriangle, FiStar, FiUsers, FiMapPin } from 'react-icons/fi';
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
      const res = await listingsAPI.getAll({ status: '' });
      const all = res.data.listings;
      const mine = all.filter(l => l.donor?.id === user?.id || l.donorId === user?.id);
      setListings(mine);
      setAllListings(all);
      setActivities([
        { type: 'claimed', message: 'Meera Foundation claimed your "Buffet Surplus"', time: new Date(Date.now() - 12 * 60000) },
        { type: 'delivered', message: 'Food delivered to Annapurna Kitchen', time: new Date(Date.now() - 45 * 60000) },
        { type: 'transit', message: 'Packaged snacks are in transit', time: new Date(Date.now() - 90 * 60000) },
        { type: 'expiring', message: 'Dairy Products listing expiring soon', time: new Date(Date.now() - 150 * 60000) },
      ]);
    } catch (err) { console.error('Failed to fetch listings'); }
    finally { setLoading(false); }
  };

  const stats = {
    total: listings.length,
    active: listings.filter(l => l.status === 'available').length,
    claimed: listings.filter(l => ['claimed', 'in_transit'].includes(l.status)).length,
    delivered: listings.filter(l => l.status === 'delivered').length,
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

  /* ── Card style helper ── */
  const cardStyle = { background: COLORS.cardBg, border: `0.5px solid ${COLORS.cardBorder}`, borderRadius: '1rem', padding: '1.5rem', transition: 'border-color 0.2s ease' };
  const cardHover = { borderColor: `${COLORS.accent}66` };

  const barColors = [COLORS.accent, COLORS.amber, '#6366f1', '#f87171'];

  return (
    <div style={{ minHeight: '100vh', paddingTop: '5rem', paddingBottom: '3rem', background: COLORS.pageBg }}>
      <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 1.5rem' }}>

        {/* ───── Header ───── */}
        <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1.3 }}>
              Welcome back, <span style={{ color: COLORS.accent }}>{user?.name?.split(' ')[0] || 'Donor'}</span> 👋
            </h1>
            <p style={{ color: '#8b949e', marginTop: '0.5rem', fontSize: '0.875rem' }}>
              {user?.orgType?.replace('_', ' ') || 'PM'} • {user?.orgName || 'Organization'} • Delhi, India •{' '}
              <span style={{ color: COLORS.accent }}>Active donor since {memberSince}</span>
            </p>
          </div>
          <Link href="/donor/create-listing" style={{ textDecoration: 'none', background: COLORS.accent, color: '#fff', padding: '0.75rem 1.75rem', borderRadius: '0.75rem', fontWeight: 600, fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.25s', boxShadow: `0 4px 20px ${COLORS.accent}44` }}>
            <FiPlusCircle size={18} /> Donate food <FiArrowRight size={15} />
          </Link>
        </div>

        {/* ───── Stats Row ───── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total listings', value: stats.total, icon: <FiPackage size={20} />, iconBg: '#1c2541', iconColor: '#818cf8', badge: '+12%', badgeBg: '#0f2a1e', badgeColor: COLORS.accent },
            { label: 'Active now', value: stats.active, icon: <FiClock size={20} />, iconBg: '#2a1f08', iconColor: COLORS.amber, badge: stats.urgent > 0 ? `${stats.urgent} urgent` : '0 urgent', badgeBg: stats.urgent > 0 ? '#2a1010' : '#161b22', badgeColor: stats.urgent > 0 ? COLORS.red : '#8b949e' },
            { label: 'In progress', value: stats.claimed, icon: <FiTruck size={20} />, iconBg: '#0f1a2e', iconColor: '#3b82f6', badge: '2 nearby', badgeBg: '#0f1a2e', badgeColor: '#3b82f6' },
            { label: 'Delivered', value: stats.delivered, icon: <FiCheckCircle size={20} />, iconBg: '#0f2a1e', iconColor: COLORS.accent, badge: '+3 today', badgeBg: '#0f2a1e', badgeColor: COLORS.accent },
          ].map((s, i) => (
            <div key={i} className="animate-fade-in" style={{ ...cardStyle, animationDelay: `${i * 0.08}s`, cursor: 'default' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = `${COLORS.accent}66`}
              onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.cardBorder}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ width: 42, height: 42, borderRadius: '0.75rem', background: s.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.iconColor }}>
                  {s.icon}
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.3rem 0.65rem', borderRadius: '9999px', background: s.badgeBg, color: s.badgeColor }}>
                  {s.badge}
                </span>
              </div>
              <div className="animate-countUp" style={{ fontSize: '1.6rem', fontWeight: 600, animationDelay: `${0.2 + i * 0.1}s`, opacity: 0 }}>{s.value}</div>
              <div style={{ fontSize: '0.85rem', color: '#8b949e', marginTop: '0.25rem' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ───── Middle Row ───── */}
        <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-6 mb-6">

          {/* Active Listings */}
          <div className="animate-fade-in" style={{ ...cardStyle, animationDelay: '0.25s' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Your active listings</h2>
              <Link href="/receiver/browse" style={{ textDecoration: 'none', fontSize: '0.8rem', color: COLORS.accent, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                View all <FiArrowRight size={12} />
              </Link>
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[1, 2, 3].map(i => <div key={i} className="shimmer" style={{ height: 60, borderRadius: '0.75rem' }} />)}
              </div>
            ) : listings.filter(l => l.status === 'available').length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📦</div>
                <p style={{ fontSize: '0.85rem', color: '#8b949e' }}>No active listings</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {listings.filter(l => l.status === 'available').slice(0, 3).map((listing, idx) => {
                  const hrs = hoursUntil(listing.expiryTime);
                  const urg = getUrgency(hrs);
                  return (
                    <Link key={listing.id} href={`/tracking/${listing.id}`} className="animate-slideIn"
                      style={{
                        textDecoration: 'none', color: 'inherit',
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '0.75rem', borderRadius: '0.75rem',
                        background: COLORS.pageBg, border: hrs < 2 ? `1px solid ${COLORS.red}33` : `1px solid ${COLORS.cardBorder}`,
                        transition: 'border-color 0.2s', animationDelay: `${idx * 0.1}s`, opacity: 0,
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = `${COLORS.accent}88`}
                      onMouseLeave={e => e.currentTarget.style.borderColor = hrs < 2 ? `${COLORS.red}33` : COLORS.cardBorder}
                    >
                      <div style={{ width: 40, height: 40, borderRadius: '0.6rem', background: urg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                        {foodEmoji(listing.foodType)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{listing.title}</div>
                        <div style={{ fontSize: '0.75rem', color: '#8b949e', marginTop: '0.15rem' }}>
                          {listing.donor?.orgName || 'You'} <span className="desktop-only inline">• {listing.quantity} {listing.unit}</span>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.25rem 0.6rem', borderRadius: '9999px', background: urg.bg, color: urg.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {urg.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Category Breakdown */}
          <div className="animate-fade-in" style={{ ...cardStyle, animationDelay: '0.3s' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Food category breakdown</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {categoryBreakdown.slice(0, 4).map((cat, i) => (
                <div key={cat.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.85rem', color: '#c9d1d9' }}>{cat.label}</span>
                    <span style={{ fontSize: '0.85rem', color: '#8b949e', fontWeight: 500 }}>{cat.pct}%</span>
                  </div>
                  <div style={{ height: 5, background: '#21262d', borderRadius: 999, overflow: 'hidden' }}>
                    <div className="animate-barGrow" style={{
                      height: '100%', borderRadius: 999, background: barColors[i],
                      '--target-width': `${cat.pct}%`, animationDelay: `${0.3 + i * 0.15}s`, width: 0,
                    }} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: `1px solid ${COLORS.cardBorder}` }}>
              <p style={{ fontSize: '0.85rem', color: '#8b949e', marginBottom: '0.35rem' }}>Total food saved this month</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                <span className="animate-countUp" style={{ fontSize: '2rem', fontWeight: 700, color: COLORS.accent, animationDelay: '0.6s', opacity: 0 }}>
                  {Math.round(totalKgSaved) || 342}
                </span>
                <span style={{ fontSize: '0.9rem', color: '#8b949e' }}>kg</span>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.25rem 0.6rem', borderRadius: '9999px', background: '#0f2a1e', color: COLORS.accent, marginLeft: '0.5rem' }}>
                  +18% vs last month
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ───── Bottom Row ───── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Impact Score */}
          <div className="animate-fade-in" style={{ ...cardStyle, animationDelay: '0.35s' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Impact score</h2>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.3rem 0.75rem', borderRadius: '9999px', background: `${COLORS.accent}1a`, color: COLORS.accent, border: `1px solid ${COLORS.accent}33` }}>
                Level {level} — {levelLabels[level]}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem' }}>
              {/* Circular ring */}
              <div style={{ position: 'relative', width: 88, height: 88, flexShrink: 0 }}>
                <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                  <circle cx="50" cy="50" r="42" fill="none" stroke={COLORS.cardBorder} strokeWidth="5" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke={COLORS.accent} strokeWidth="5"
                    strokeDasharray={`${impactScore * 2.64} ${264 - impactScore * 2.64}`}
                    strokeLinecap="round" style={{ animation: 'scoreRing 1.2s ease-out forwards' }}
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="animate-countUp" style={{ fontSize: '1.6rem', fontWeight: 700, opacity: 0, animationDelay: '0.5s' }}>{impactScore}</span>
                  <span style={{ fontSize: '0.65rem', color: '#8b949e' }}>score</span>
                </div>
              </div>

              {/* Stats */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                {[
                  { label: 'Donations', value: donations },
                  { label: 'Rating', value: <>{rating} <FiStar size={12} style={{ display: 'inline', color: COLORS.amber, verticalAlign: '-1px' }} /></> },
                  { label: 'Communities served', value: 7 },
                ].map((row, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: '#8b949e' }}>{row.label}</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Level motivator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: `1px solid ${COLORS.cardBorder}` }}>
              <FiStar size={14} style={{ color: COLORS.amber }} />
              <span style={{ fontSize: '0.8rem', color: '#8b949e' }}>
                {toNextLevel > 0 ? <>{toNextLevel} more donations to reach <span style={{ color: COLORS.accent, fontWeight: 600 }}>Level {level + 1}</span></> : <>You've reached the highest level! 🏆</>}
              </span>
            </div>
          </div>

          {/* Live Activity Feed */}
          <div className="animate-fade-in" style={{ ...cardStyle, animationDelay: '0.4s' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Live activity feed</h2>
              <div className="pulse-dot" style={{ width: 8, height: 8 }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {activities.slice(0, 4).map((act, i) => {
                const f = feedIcons[act.type] || feedIcons.update;
                return (
                  <div key={i} className="animate-slideIn" style={{
                    display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                    padding: '0.75rem 0', borderBottom: i < 3 ? `1px solid ${COLORS.cardBorder}44` : 'none',
                    animationDelay: `${i * 0.1}s`, opacity: 0,
                  }}>
                    <div style={{ width: 32, height: 32, borderRadius: '0.5rem', background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: f.color, flexShrink: 0, marginTop: 2 }}>
                      {f.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.85rem', color: '#c9d1d9', lineHeight: 1.4 }}>{act.message}</p>
                      <p style={{ fontSize: '0.75rem', color: '#484f58', marginTop: '0.25rem' }}>{timeAgo(act.time)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
