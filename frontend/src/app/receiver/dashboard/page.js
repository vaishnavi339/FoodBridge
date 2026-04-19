'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { listingsAPI, claimsAPI } from '@/services/api';
import { FiSearch, FiMapPin, FiClock, FiPackage, FiCheckCircle, FiTruck, FiSettings, FiUsers, FiAlertTriangle, FiX, FiCheck, FiChevronDown, FiSliders, FiCompass, FiList, FiHeart } from 'react-icons/fi';
import toast from 'react-hot-toast';

const C = { pageBg: '#0d1117', cardBg: '#161b22', border: '#21262d', accent: '#1D9E75', amber: '#EF9F27', red: '#e24b4a', blue: '#378ADD', muted: '#8b949e', text: '#c9d1d9' };

const haversine = (lat1, lng1, lat2, lng2) => { const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180; const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2; return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); };

const getMatchScore = (distKm, hoursLeft, qty) => {
  const distScore = Math.max(0, 100 - distKm * 4);
  const urgScore = hoursLeft < 2 ? 100 : hoursLeft < 6 ? 70 : 40;
  const qtyScore = Math.min(100, qty * 2);
  return Math.round(distScore * 0.5 + urgScore * 0.3 + qtyScore * 0.2);
};

const getUrgency = (hrs) => {
  if (hrs < 2) return { label: 'Urgent', bg: '#2a1010', color: C.red, strip: C.red };
  if (hrs < 6) return { label: `${Math.round(hrs)}h left`, bg: '#2a1f08', color: C.amber, strip: C.amber };
  return { label: `${Math.round(hrs)}h left`, bg: '#0f2a1e', color: C.accent, strip: C.accent };
};

const hoursUntil = (t) => Math.max(0, (new Date(t) - new Date()) / 3600000);
const foodEmoji = (t) => ({ cooked: '🍛', bakery: '🥖', fruits_vegetables: '🥗', dairy: '🥛', packaged: '📦', raw: '🥩', beverages: '🥤', mixed: '🍽️' }[t] || '🍽️');

export default function ReceiverDashboard() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [listings, setListings] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('discover');
  const [radiusKm, setRadiusKm] = useState(50);
  const [sortBy, setSortBy] = useState('nearest');
  const [claimModal, setClaimModal] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);

  const userLat = user?.latitude || 28.6139;
  const userLng = user?.longitude || 77.2090;

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('listing:new', () => { fetchData(); toast('🆕 New food available nearby!'); });
    return () => socket.off('listing:new');
  }, [socket]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [lRes, cRes] = await Promise.all([
        listingsAPI.getAll({ status: 'available' }),
        claimsAPI.getMy().catch(() => ({ data: { claims: [] } })),
      ]);
      setListings(lRes.data.listings);
      setClaims(cRes.data.claims || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // Enrich listings with distance, urgency, match score
  const enriched = listings.map(l => {
    const dist = haversine(userLat, userLng, l.latitude, l.longitude);
    const hrs = hoursUntil(l.expiryTime);
    const match = getMatchScore(dist, hrs, l.quantity || 10);
    return { ...l, _dist: dist, _hrs: hrs, _match: match };
  }).filter(l => l._dist <= radiusKm);

  // Sort
  const sorted = [...enriched].sort((a, b) => {
    if (sortBy === 'nearest') return a._dist - b._dist;
    if (sortBy === 'urgent') return a._hrs - b._hrs;
    if (sortBy === 'quantity') return (b.quantity || 0) - (a.quantity || 0);
    return b._match - a._match;
  });

  const urgentCount = enriched.filter(l => l._hrs < 2).length;

  const handleClaim = async () => {
    if (!claimModal) return;
    setClaiming(true);
    try {
      await claimsAPI.create({ listingId: claimModal.id });
      setClaimSuccess(true);
      toast.success(`Claimed successfully! Pickup within 2 hours ✅`, { duration: 4000 });
      setTimeout(() => { setClaimModal(null); setClaimSuccess(false); fetchData(); }, 2000);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to claim');
    }
    finally { setClaiming(false); }
  };

  const navItems = [
    { id: 'discover', label: 'Discover Food', icon: <FiSearch size={18} /> },
    { id: 'claims', label: 'My Claims', icon: <FiList size={18} /> },
    { id: 'tracking', label: 'Delivery Tracking', icon: <FiTruck size={18} /> },
    { id: 'community', label: 'Community Needs', icon: <FiHeart size={18} /> },
    { id: 'settings', label: 'Settings', icon: <FiSettings size={18} /> },
  ];

  const sideCard = { background: C.cardBg, border: `0.5px solid ${C.border}`, borderRadius: '0.75rem', padding: '1rem' };

  return (
    <div className="flex bg-[#0d1117] min-h-screen pt-16 pb-20 md:pb-0">
      {/* ─── Left Sidebar ─── */}
      <aside className="desktop-only" style={{ width: 320, flexShrink: 0, background: C.cardBg, borderRight: `0.5px solid ${C.border}`, display: 'flex', flexDirection: 'column', overflow: 'auto', height: 'calc(100vh - 4rem)', position: 'sticky', top: '4rem' }}>
        {/* Profile */}
        <div style={{ padding: '1.5rem', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: `linear-gradient(135deg, ${C.accent}, #0d6e52)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {(user?.orgName || user?.name || 'N')?.charAt(0)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '1rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.orgName || user?.name || 'NGO'}</span>
                <span style={{ fontSize: '0.6rem', fontWeight: 600, padding: '0.15rem 0.45rem', borderRadius: '9999px', background: `${C.accent}1a`, color: C.accent, border: `1px solid ${C.accent}33`, whiteSpace: 'nowrap' }}>✓ Verified NGO</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: C.muted, marginTop: '0.2rem' }}>Delhi, India • REG-12345</p>
            </div>
          </div>
          {/* Trust score */}
          <div style={{ marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
              <span style={{ fontSize: '0.75rem', color: C.muted }}>Trust score</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: C.accent }}>94%</span>
            </div>
            <div style={{ height: 4, background: C.border, borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '94%', background: C.accent, borderRadius: 999 }} />
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: '0.5rem' }}>
          {[
            { label: 'Total claims', value: claims.length || 12, color: '#fff' },
            { label: 'This month', value: 5, color: C.accent },
            { label: 'People fed', value: 'est. 240', color: C.amber },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, ...sideCard, padding: '0.6rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.6rem', color: C.muted, marginTop: '0.15rem' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Navigation */}
        <nav style={{ padding: '0.75rem', flex: 1 }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%',
              padding: '0.65rem 0.75rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer',
              fontSize: '0.85rem', fontWeight: 500, transition: 'all 0.15s',
              background: activeTab === item.id ? '#1a2332' : 'transparent',
              color: activeTab === item.id ? C.accent : C.muted,
              borderLeft: activeTab === item.id ? `3px solid ${C.accent}` : '3px solid transparent',
            }}>
              {item.icon} {item.label}
            </button>
          ))}
        </nav>

        {/* Nearby NGOs */}
        <div style={{ padding: '1rem 1.5rem', borderTop: `1px solid ${C.border}` }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 600, color: C.muted, marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>NGOs active nearby</p>
          {[{ name: 'Annapurna Trust', dist: '2.1 km' }, { name: 'Hope Foundation', dist: '3.5 km' }, { name: 'Prayas NGO', dist: '4.8 km' }].map((ngo, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: ['#2a1f3e', '#1f2a3e', '#2a3e1f'][i], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                {ngo.name.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.75rem', color: C.text }}>{ngo.name}</span>
                <span style={{ fontSize: '0.65rem', color: C.muted, marginLeft: '0.5rem' }}>{ngo.dist}</span>
              </div>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.accent }} />
            </div>
          ))}
        </div>
      </aside>

      {/* ─── Main Content ─── */}
      <main className="flex-1 w-full p-4 md:p-6 lg:p-8 overflow-y-auto min-h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)]">

        {/* Urgency Banner */}
        {urgentCount > 0 && (
          <div className="animate-fade-in" style={{ background: '#2a1f08', border: `1px solid ${C.amber}33`, borderRadius: '0.75rem', padding: '0.75rem 1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FiAlertTriangle size={18} style={{ color: C.amber, flexShrink: 0 }} />
            <span style={{ fontSize: '0.85rem', color: C.amber, flex: 1 }}><strong>{urgentCount} listing{urgentCount > 1 ? 's' : ''}</strong> expiring within 2 hours — claim now to prevent waste</span>
            <button onClick={() => setSortBy('urgent')} style={{ background: C.amber, color: '#000', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>View urgent</button>
          </div>
        )}

        {/* Top bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Discover food near you</h1>
          <div className="flex items-center gap-4 scroll-row w-full md:w-auto">
            {/* Radius slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} className="shrink-0 bg-[#161b22] px-3 py-1.5 rounded-lg border border-[#21262d]">
              <FiCompass size={14} style={{ color: C.muted }} />
              <input type="range" min="5" max="50" value={radiusKm} onChange={e => setRadiusKm(parseInt(e.target.value))} style={{ width: 100, accentColor: C.accent }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: C.accent, minWidth: 40 }}>{radiusKm} km</span>
            </div>
            {/* Sort */}
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="shrink-0" style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: '0.5rem', padding: '0.4rem 0.6rem', color: C.text, fontSize: '0.8rem', cursor: 'pointer' }}>
              <option value="nearest">Nearest</option>
              <option value="urgent">Most urgent</option>
              <option value="quantity">Largest quantity</option>
              <option value="match">Best match</option>
            </select>
          </div>
        </div>

        {/* Food Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="shimmer" style={{ height: 200, borderRadius: '0.75rem' }} />)}
          </div>
        ) : sorted.length === 0 ? (
          /* Empty state */
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: C.cardBg, border: `2px dashed ${C.border}`, margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>🔍</div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem' }}>No food available in your area right now</h2>
            <p style={{ fontSize: '0.85rem', color: C.muted, marginBottom: '1.5rem' }}>Expand your radius or check back soon</p>
            <button onClick={() => setRadiusKm(50)} style={{ background: C.accent, color: '#fff', border: 'none', padding: '0.6rem 1.5rem', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer' }}>Expand radius to 50 km</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sorted.map((listing, idx) => {
              const urg = getUrgency(listing._hrs);
              const matchColor = listing._match >= 80 ? C.accent : listing._match >= 60 ? C.amber : C.muted;
              return (
                <div key={listing.id} className="animate-fade-in" style={{
                  background: C.cardBg, border: `0.5px solid ${C.border}`, borderRadius: '0.75rem',
                  overflow: 'hidden', transition: 'border-color 0.2s', animationDelay: `${idx * 0.05}s`,
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = `${C.accent}66`}
                  onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
                >
                  {/* Top strip */}
                  <div style={{ height: 4, background: urg.strip }} />
                  <div className="p-3 md:p-4">
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.4rem' }}>{foodEmoji(listing.foodType)}</span>
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>{listing.title}</div>
                          <div style={{ fontSize: '0.7rem', color: C.muted, marginTop: '0.1rem' }}>
                            {listing.donor?.orgName || 'Donor'} {listing.donor?.rating >= 4.5 && <span style={{ color: C.accent }}>✓</span>}
                          </div>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '9999px', background: `${matchColor}1a`, color: matchColor, border: `1px solid ${matchColor}33` }}>
                        {listing._match}% match
                      </span>
                    </div>

                    {/* Info chips */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
                      {[
                        { icon: <FiPackage size={11} />, text: `${listing.quantity} ${listing.unit}`, color: C.text },
                        { icon: <FiMapPin size={11} />, text: `${listing._dist.toFixed(1)} km`, color: C.blue },
                        { icon: <FiClock size={11} />, text: urg.label, color: urg.color },
                      ].map((chip, ci) => (
                        <span key={ci} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '9999px', background: `${C.border}88`, color: chip.color }}>
                          {chip.icon} {chip.text}
                        </span>
                      ))}
                    </div>

                    {/* Description */}
                    {listing.description && (
                      <p style={{ fontSize: '0.75rem', color: C.muted, lineHeight: 1.4, marginBottom: '0.75rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {listing.description}
                      </p>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Link href={`/tracking/${listing.id}`} style={{ textDecoration: 'none', flex: 1, textAlign: 'center', padding: '0.5rem', borderRadius: '0.5rem', border: `1px solid ${C.border}`, color: C.text, fontSize: '0.8rem', fontWeight: 500, transition: 'all 0.15s' }}>
                        View details
                      </Link>
                      <button onClick={() => { setClaimModal(listing); setClaimSuccess(false); }} style={{ flex: 1, background: C.accent, color: '#fff', border: 'none', padding: '0.5rem', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                        Claim now
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ─── Claim Confirmation Modal ─── */}
      {claimModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={() => !claiming && setClaimModal(null)}>
          <div className="animate-scale-in" style={{ background: C.cardBg, borderRadius: '1rem', width: 400, maxWidth: '90vw', padding: '2rem', border: `1px solid ${C.border}` }} onClick={e => e.stopPropagation()}>
            {claimSuccess ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: `${C.accent}1a`, margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FiCheck size={32} style={{ color: C.accent }} />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Claimed successfully!</h3>
                <p style={{ fontSize: '0.85rem', color: C.muted }}>Pickup window: within 2 hours</p>
              </div>
            ) : (
              <>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Confirm food claim</h3>
                <div style={{ background: C.pageBg, borderRadius: '0.75rem', padding: '1rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.8rem', color: C.muted }}>Food</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{claimModal.title}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.8rem', color: C.muted }}>Donor</span>
                    <span style={{ fontSize: '0.8rem' }}>{claimModal.donor?.orgName || 'Donor'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.8rem', color: C.muted }}>Quantity</span>
                    <span style={{ fontSize: '0.8rem' }}>{claimModal.quantity} {claimModal.unit}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.8rem', color: C.muted }}>Distance</span>
                    <span style={{ fontSize: '0.8rem' }}>{claimModal._dist?.toFixed(1)} km</span>
                  </div>
                </div>
                <div style={{ background: '#0f2a1e', borderRadius: '0.5rem', padding: '0.65rem 0.75rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FiClock size={14} style={{ color: C.accent }} />
                  <span style={{ fontSize: '0.8rem', color: C.accent, fontWeight: 500 }}>Estimated pickup window: 30 min – 2 hours</span>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={() => setClaimModal(null)} disabled={claiming} style={{ flex: 1, padding: '0.6rem', borderRadius: '0.5rem', border: `1px solid ${C.border}`, background: 'transparent', color: C.text, fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
                  <button onClick={handleClaim} disabled={claiming} style={{ flex: 1, padding: '0.6rem', borderRadius: '0.5rem', border: 'none', background: C.accent, color: '#fff', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', opacity: claiming ? 0.7 : 1 }}>
                    {claiming ? 'Claiming...' : 'Confirm claim'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
