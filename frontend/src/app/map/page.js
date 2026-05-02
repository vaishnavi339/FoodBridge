'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';
import { listingsAPI, partnersAPI } from '@/services/api';
import { FiClock, FiMapPin, FiUsers, FiAlertTriangle, FiRefreshCw, FiNavigation, FiSliders, FiHome, FiShoppingBag, FiHeart } from 'react-icons/fi';

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });

// Auto-fit map bounds to listings
function MapBoundsUpdater({ listings, userLocation }) {
  const [map, setMap] = useState(null);

  useEffect(() => {
    if (!map) return;
    import('leaflet').then(L => {
      if (listings.length > 0) {
        const points = listings.map(l => [l.latitude, l.longitude]);
        if (userLocation) points.push([userLocation.lat, userLocation.lng]);
        const bounds = L.default.latLngBounds(points);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      } else if (userLocation) {
        map.setView([userLocation.lat, userLocation.lng], 12);
      } else {
        // Fallback: India center
        map.setView([20.5937, 78.9629], 5);
      }
    });
  }, [map, listings, userLocation]);

  // Grab map ref on mount
  useEffect(() => {
    // We use a small workaround: the parent MapContainer passes map via useMap inside children
  }, []);

  return null;
}

// Separate component to access useMap inside MapContainer
const MapAutoFit = dynamic(
  () => Promise.resolve(function MapAutoFitInner({ listings, userLocation, aiMarkers }) {
    const { useMap } = require('react-leaflet');
    const map = useMap();

    useEffect(() => {
      if (!map) return;
      import('leaflet').then(L => {
        // Always include listing + AI marker points
        let listingPoints = listings.map(l => [l.latitude, l.longitude]);
        const aiPoints = (aiMarkers || []).map(m => [m.latitude, m.longitude]);
        let allPoints = [...listingPoints, ...aiPoints];

        if (allPoints.length > 0) {
          // Fit to listings — ignore user GPS to ensure markers always visible
          const bounds = L.default.latLngBounds(allPoints);
          map.fitBounds(bounds, { padding: [60, 60], maxZoom: 13 });
        } else if (userLocation) {
          // No listings — centre on user
          map.setView([userLocation.lat, userLocation.lng], 12);
        } else {
          // Ultimate fallback: Delhi
          map.setView([28.6139, 77.2090], 11);
        }
      });
    }, [map, listings.length, userLocation, aiMarkers?.length]);

    return null;
  }),
  { ssr: false }
);

function MapContent({ listings, partners, userLocation }) {
  const [L, setL] = useState(null);

  useEffect(() => {
    import('leaflet').then(mod => {
      setL(mod.default);
      delete mod.default.Icon.Default.prototype._getIconUrl;
      mod.default.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });
    });
  }, []);

  const createIcon = (urgency) => {
    if (!L) return undefined;
    const color = urgency > 70 ? '#ef4444' : urgency > 40 ? '#f59e0b' : '#10b981';
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        width: 32px; height: 32px; border-radius: 50%; 
        background: ${color}; border: 3px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        display: flex; align-items: center; justify-content: center;
        font-size: 14px; cursor: pointer;
      ">🍽️</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  const createUserIcon = () => {
    if (!L) return undefined;
    return L.divIcon({
      className: 'user-marker',
      html: `<div style="
        width: 20px; height: 20px; border-radius: 50%;
        background: #3b82f6; border: 3px solid white;
        box-shadow: 0 0 0 4px rgba(59,130,246,0.3), 0 4px 12px rgba(0,0,0,0.4);
      "></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
  };

  const createPartnerIcon = (type) => {
    if (!L) return undefined;
    let icon = '🤝';
    let color = '#ec4899'; // pink for NGO
    
    if (type === 'restaurant') {
      icon = '🍴';
      color = '#f59e0b';
    } else if (type === 'hotel') {
      icon = '🏨';
      color = '#8b5cf6';
    } else if (type === 'grocery') {
      icon = '🛒';
      color = '#10b981';
    }

    return L.divIcon({
      className: 'partner-marker',
      html: `<div style="
        width: 28px; height: 28px; border-radius: 8px; 
        background: ${color}; border: 2px solid white;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        display: flex; align-items: center; justify-content: center;
        font-size: 14px; cursor: pointer;
      ">${icon}</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
  };

  if (!L) return null;

  return (
    <>
      {userLocation && (
        <Marker position={[userLocation.lat, userLocation.lng]} icon={createUserIcon()}>
          <Popup>
            <div style={{ minWidth: '120px', fontFamily: 'Inter, sans-serif', color: '#1e293b' }}>
              <strong>Your location</strong>
            </div>
          </Popup>
        </Marker>
      )}
      {listings.map(listing => (
        <Marker
          key={`listing-${listing.id}`}
          position={[listing.latitude, listing.longitude]}
          icon={createIcon(listing.urgencyScore)}
          eventHandlers={{ click: () => window.scrollToCard?.(listing.id) }} 
        >
          <Popup>
            <div style={{ minWidth: '220px', fontFamily: 'Inter, sans-serif' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px', color: '#1e293b' }}>{listing.title}</h3>
              <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                by {listing.donor?.orgName || listing.donor?.name || 'Donor'}
              </p>
              <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: '#94a3b8', marginBottom: '8px' }}>
                <span>📦 {listing.quantity} {listing.unit}</span>
                {listing.servesCount && <span>👥 Serves {listing.servesCount}</span>}
              </div>
              <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>{listing.pickupAddress}</p>
              {listing._distanceKm != null && (
                <p style={{ fontSize: '11px', color: '#3b82f6', marginBottom: '8px' }}>📍 {listing._distanceKm.toFixed(1)} km from you</p>
              )}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{
                  padding: '2px 8px', borderRadius: '9999px', fontSize: '10px', fontWeight: 600,
                  background: listing.urgencyScore > 70 ? '#fef2f2' : '#f0fdf4',
                  color: listing.urgencyScore > 70 ? '#ef4444' : '#22c55e',
                }}>
                  {listing.urgencyScore > 70 ? '⚠️ Urgent' : '✅ Available'}
                </span>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
      {partners.map(partner => (
        <Marker
          key={`partner-${partner.id}`}
          position={[partner.latitude, partner.longitude]}
          icon={createPartnerIcon(partner.orgType)}
        >
          <Popup>
            <div style={{ minWidth: '200px', fontFamily: 'Inter, sans-serif' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ 
                  fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', 
                  color: partner.role === 'receiver' ? '#ec4899' : '#8b5cf6',
                  background: partner.role === 'receiver' ? '#fdf2f8' : '#f5f3ff',
                  padding: '2px 6px', borderRadius: '4px'
                }}>
                  {partner.orgType || partner.role}
                </span>
                {partner.rating && <span style={{ fontSize: '11px', color: '#f59e0b' }}>⭐ {partner.rating}</span>}
              </div>
              <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '2px', color: '#1e293b' }}>{partner.orgName || partner.name}</h3>
              <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>{partner.address}</p>
              
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px', marginTop: '4px' }}>
                <a href={`tel:${partner.phone}`} style={{ 
                  display: 'flex', alignItems: 'center', gap: '6px', 
                  fontSize: '11px', color: '#3b82f6', textDecoration: 'none', fontWeight: 600 
                }}>
                  📞 {partner.phone || 'No phone'}
                </a>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}

// Haversine distance (km)
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function MapPage() {
  const { user } = useAuth();
  const [allListings, setAllListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [mounted, setMounted] = useState(false);
  // Default to Delhi — GPS will refine if user is actually near listings
  const [userLocation, setUserLocation] = useState({ lat: 28.6139, lng: 77.2090 });
  const [radiusKm, setRadiusKm] = useState(100);
  const [locatingUser, setLocatingUser] = useState(false);
  const [allPartners, setAllPartners] = useState([]);
  const [showNGOs, setShowNGOs] = useState(true);
  const [showRestaurants, setShowRestaurants] = useState(true);
  const [showHotels, setShowHotels] = useState(true);

  // AI Search State
  const [aiQuery, setAiQuery] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMarkers, setAiMarkers] = useState([]);
  // When user searches a city, we store its coords here and use them for filtering
  const [searchLocation, setSearchLocation] = useState(null); // { lat, lng, city }
  const [nearbyDonors, setNearbyDonors] = useState([]);

  useEffect(() => {
    setMounted(true);
    fetchListings();
    fetchPartners();
    detectUserLocation();
    window.scrollToCard = (id) => {
      document.getElementById(`m-card-${id}`)?.scrollIntoView({ behavior: 'smooth', inline: 'center' });
    };
  }, []);

  // Delhi fallback for demo — ensures map always shows food data
  const DELHI_DEFAULT = { lat: 28.6139, lng: 77.2090 };

  const detectUserLocation = () => {
    setLocatingUser(true);
    if (!navigator.geolocation) {
      setLocatingUser(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        // Only use GPS if user is within 200km of Delhi cluster
        const toRad = d => d * Math.PI / 180;
        const dLat = toRad(lat - 28.6139);
        const dLon = toRad(lng - 77.2090);
        const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat)) * Math.cos(toRad(28.6139)) * Math.sin(dLon/2)**2;
        const distFromDelhi = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        if (distFromDelhi < 200) {
          setUserLocation({ lat, lng });
        }
        // else: keep Delhi default so demo always shows markers
        setLocatingUser(false);
      },
      () => {
        // GPS denied — keep Delhi default
        setLocatingUser(false);
      },
      { timeout: 5000 }
    );
  };


  const fetchListings = async () => {
    setLoading(true);
    try {
      const res = await listingsAPI.getAll({ status: 'available' });
      setAllListings(res.data.listings);
    } catch (err) {
      console.error('Failed to fetch listings');
    } finally {
      setLoading(false);
    }
  };

  const fetchPartners = async () => {
    try {
      const res = await partnersAPI.getAll();
      setAllPartners(res.data.partners);
    } catch (err) {
      console.error('Failed to fetch partners');
    }
  };

  const resetSearch = () => {
    setSearchLocation(null);
    setAiResult(null);
    setAiMarkers([]);
    setNearbyDonors([]);
    setAiQuery('');
    setRadiusKm(100);
  };

  const handleAISearch = async (e) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;

    setAiLoading(true);
    setAiResult(null);
    setAiMarkers([]);
    setNearbyDonors([]);

    try {
      const res = await fetch('http://localhost:5001/predict/ngo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: aiQuery })
      });
      const data = await res.json();
      setAiResult(data);

      if (data.found) {
        // Build NGO markers from AI results
        const newMarkers = (data.ngos || []).filter(n => n.lat && n.lng).map(n => ({
          id: `ai-${n.name}`,
          latitude: n.lat,
          longitude: n.lng,
          orgName: n.name,
          address: n.address,
          orgType: 'ngo',
          role: 'receiver',
          phone: n.contact,
          isAI: true
        }));
        setAiMarkers(newMarkers);

        // Set search location to city center so map re-centers and filters update
        if (data.lat && data.lng) {
          const loc = { lat: data.lat, lng: data.lng, city: data.city };
          setSearchLocation(loc);
          setRadiusKm(50); // tighten radius when city is known

          // Fetch nearby donor partners (restaurants, hotels, etc.) from backend
          try {
            const pRes = await fetch(
              `http://localhost:5000/api/partners/nearby?lat=${data.lat}&lng=${data.lng}&radius=100`
            );
            const pData = await pRes.json();
            setNearbyDonors(pData.partners || []);
          } catch (_) {
            setNearbyDonors([]);
          }
        }
      } else {
        setAiMarkers([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  // Active reference location: prefer search city, fall back to user GPS
  const activeLocation = searchLocation || userLocation;

  // Filter by food type
  const typeFiltered = filter === 'all' ? allListings : allListings.filter(l => l.foodType === filter);

  // Filter by radius from active location + add distance info
  const listingsWithDistance = typeFiltered.map(listing => {
    if (activeLocation) {
      const dist = haversineDistance(activeLocation.lat, activeLocation.lng, listing.latitude, listing.longitude);
      return { ...listing, _distanceKm: dist };
    }
    return { ...listing, _distanceKm: null };
  }).sort((a, b) => {
    if (a._distanceKm != null && b._distanceKm != null) return a._distanceKm - b._distanceKm;
    return 0;
  });

  const nearestListing = activeLocation ? listingsWithDistance[0] : null;
  const maxRadiusKm = Math.max(500, nearestListing ? Math.ceil(nearestListing._distanceKm / 50) * 50 : 500);
  const filtered = listingsWithDistance.filter(listing => {
    if (!activeLocation) return true;
    return listing._distanceKm <= radiusKm;
  });

  // Merge DB partners + nearby donors fetched after city search
  const allDisplayPartners = searchLocation
    ? [...nearbyDonors, ...aiMarkers]
    : allPartners;

  const filteredPartners = allDisplayPartners.filter(p => {
    if (!p.isAI) {
      if (p.orgType === 'ngo' && !showNGOs) return false;
      if (p.orgType === 'restaurant' && !showRestaurants) return false;
      if (p.orgType === 'hotel' && !showHotels) return false;
    }
    if (activeLocation && p.latitude && p.longitude) {
      const dist = haversineDistance(activeLocation.lat, activeLocation.lng, p.latitude, p.longitude);
      return dist <= (searchLocation ? 150 : radiusKm);
    }
    return true;
  });

  const getTimeRemaining = (expiryTime) => {
    const hours = Math.max(0, (new Date(expiryTime) - new Date()) / (1000 * 60 * 60));
    if (hours <= 0) return 'Expired';
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${Math.round(hours)}h`;
    return `${Math.round(hours / 24)}d`;
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen pt-16">
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <div className="w-96 glass border-r border-white/10 flex flex-col overflow-hidden hidden lg:flex">
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold">Live Food Map</h2>
              <div className="flex items-center gap-1">
                {searchLocation && (
                  <button
                    onClick={resetSearch}
                    title="Reset to my location"
                    className="px-2 py-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-[10px] font-bold transition-all"
                  >
                    Reset
                  </button>
                )}
                <button
                  onClick={detectUserLocation}
                  title="Detect my location"
                  className={`p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-blue-400 transition-all ${locatingUser ? 'animate-pulse text-blue-400' : ''}`}
                >
                  <FiNavigation size={16} />
                </button>
                <button onClick={fetchListings} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all">
                  <FiRefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="pulse-dot" />
              <span className="text-xs text-slate-400">
                {filtered.length} listings {activeLocation ? `within ${radiusKm} km` : 'available'}
              </span>
            </div>
            {searchLocation ? (
              <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                <FiMapPin size={10} />
                Showing results for {searchLocation.city}
              </div>
            ) : userLocation ? (
              <div className="mt-2 text-xs text-blue-400 flex items-center gap-1">
                <FiNavigation size={10} />
                Your location detected
              </div>
            ) : null}
          </div>

          {/* AI NGO Search Section */}
          <div className="p-4 border-b border-white/10 bg-blue-500/5">
            <span className="text-[10px] uppercase font-bold text-blue-400 block mb-2 tracking-wider">AI NGO Finder</span>
            <form onSubmit={handleAISearch} className="relative">
              <input
                type="text"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                placeholder="Find NGOs in any city..."
                className="w-full bg-[#0d1117] border border-white/10 rounded-lg py-2 px-3 text-xs outline-none focus:border-blue-500 transition-all"
              />
              <button 
                type="submit" 
                disabled={aiLoading}
                className="absolute right-1 top-1 bottom-1 px-2 bg-blue-500 text-white rounded text-[10px] font-bold hover:bg-blue-600 disabled:opacity-50"
              >
                {aiLoading ? '...' : 'Find'}
              </button>
            </form>

            {aiResult && (
              <div className="mt-3 space-y-2 animate-fade-in">
                {aiResult.found ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">Found {aiResult.ngos.length} NGOs in {aiResult.city}</span>
                      <button onClick={resetSearch} className="text-[10px] text-red-400 hover:text-red-300">Clear</button>
                    </div>
                    {nearbyDonors.length > 0 && (
                      <div className="text-[9px] text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                        🍴 {nearbyDonors.length} donor{nearbyDonors.length !== 1 ? 's' : ''} (restaurants/hotels) found nearby
                      </div>
                    )}
                    <div className="max-h-44 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {aiResult.ngos.map((ngo, i) => (
                        <div key={i} className="bg-white/5 p-2 rounded border border-white/5 hover:border-emerald-500/30 transition-all">
                          <h4 className="text-[11px] font-bold text-emerald-300">{ngo.name}</h4>
                          <p className="text-[9px] text-slate-500 truncate">{ngo.address}</p>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-[8px] text-emerald-400 bg-emerald-500/10 px-1 rounded">{ngo.specialty}</span>
                            <a href={`tel:${ngo.contact}`} className="text-[8px] text-blue-400 hover:underline">{ngo.contact}</a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-[10px] text-red-400 bg-red-500/10 p-2 rounded border border-red-500/20 text-center">
                    {aiResult.message || 'No NGOs found for this query.'}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Radius Slider */}
          {userLocation && (
            <div className="px-4 py-3 border-b border-white/10">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400 flex items-center gap-1"><FiSliders size={10} /> Radius</span>
                <span className="text-xs font-semibold text-emerald-400">{radiusKm} km</span>
              </div>
              <input
                type="range"
                min="5"
                max={maxRadiusKm}
                value={radiusKm}
                onChange={(e) => setRadiusKm(parseInt(e.target.value))}
                className="w-full accent-emerald-500 h-1"
              />
              <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                <span>5 km</span>
                <span>{maxRadiusKm} km</span>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="p-3 border-b border-white/10 flex gap-2 overflow-x-auto">
            {['all', 'cooked', 'bakery', 'fruits_vegetables', 'packaged', 'dairy'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  filter === f ? 'gradient-bg text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {f === 'all' ? 'All Food' : f === 'fruits_vegetables' ? 'Fruits' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Partner Toggles — only shown after a city is searched */}
          {searchLocation && (
            <div className="px-4 py-3 border-b border-white/10 bg-white/5">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-2 tracking-wider">
                Show Partners in {searchLocation.city}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowNGOs(!showNGOs)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border transition-all ${showNGOs ? 'bg-pink-500/20 border-pink-500/50 text-pink-300' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                >
                  <FiHeart size={12} /> <span className="text-[10px] font-bold">NGOs</span>
                </button>
                <button
                  onClick={() => setShowRestaurants(!showRestaurants)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border transition-all ${showRestaurants ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                >
                  <FiShoppingBag size={12} /> <span className="text-[10px] font-bold">Eat</span>
                </button>
                <button
                  onClick={() => setShowHotels(!showHotels)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border transition-all ${showHotels ? 'bg-purple-500/20 border-purple-500/50 text-purple-300' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                >
                  <FiHome size={12} /> <span className="text-[10px] font-bold">Hotels</span>
                </button>
              </div>
            </div>
          )}

          {/* Listings List */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="p-8 text-center">
                <div className="text-3xl mb-2">🔍</div>
                <p className="text-sm text-slate-500">No listings in this area</p>
                {nearestListing ? (
                  <>
                    <p className="text-xs text-slate-600 mt-1">
                      Nearest listing is {nearestListing._distanceKm.toFixed(1)} km away
                    </p>
                    <button
                      onClick={() => setRadiusKm(Math.ceil(nearestListing._distanceKm))}
                      className="mt-4 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 text-blue-300 hover:bg-slate-700 transition-colors"
                    >
                      Show nearest listing
                    </button>
                  </>
                ) : (
                  <p className="text-xs text-slate-600 mt-1">No available listings match this filter</p>
                )}
              </div>
            )}
            {filtered.map(listing => (
              <div key={listing.id} className="p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center text-lg flex-shrink-0">
                    {listing.foodType === 'cooked' ? '🍛' : listing.foodType === 'bakery' ? '🥖' : listing.foodType === 'fruits_vegetables' ? '🥗' : listing.foodType === 'dairy' ? '🥛' : '📦'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">{listing.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{listing.donor?.orgName || 'Donor'}</p>
                    <div className="flex gap-3 mt-2 text-xs text-slate-400">
                      <span>{listing.quantity} {listing.unit}</span>
                      <span className={listing.urgencyScore > 70 ? 'text-red-400' : 'text-emerald-400'}>
                        <FiClock size={10} className="inline mr-1" />
                        {getTimeRemaining(listing.expiryTime)}
                      </span>
                      {listing._distanceKm != null && (
                        <span className="text-blue-400">
                          <FiMapPin size={10} className="inline mr-1" />
                          {listing._distanceKm.toFixed(1)} km
                        </span>
                      )}
                    </div>
                  </div>
                  {listing.urgencyScore > 70 && (
                    <FiAlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-1" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <MapContainer
            center={[20.5937, 78.9629]}
            zoom={5}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            <MapAutoFit
              listings={filtered}
              userLocation={searchLocation || userLocation}
              aiMarkers={aiMarkers}
            />
            <MapContent
              listings={filtered}
              partners={filteredPartners}
              userLocation={searchLocation || userLocation}
            />
          </MapContainer>

          {/* Map Legend */}
          <div className="absolute bottom-6 right-6 glass rounded-xl p-4 z-[1000]">
            <h4 className="text-xs font-semibold mb-2">Legend</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-slate-400">Available ({'>'}6h)</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-slate-400">Moderate (2-6h)</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-slate-400">Urgent ({'<'}2h)</span>
              </div>
              {userLocation && (
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full bg-blue-500" style={{ boxShadow: '0 0 0 2px rgba(59,130,246,0.3)' }} />
                  <span className="text-slate-400">You</span>
                </div>
              )}
              <div className="pt-2 mt-2 border-t border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded bg-pink-500" />
                  <span className="text-slate-400">NGOs</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded bg-amber-500" />
                  <span className="text-slate-400">Restaurants</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded bg-purple-500" />
                  <span className="text-slate-400">Hotels</span>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute top-20 left-4 right-4 z-[1000] lg:hidden flex gap-2 scroll-row pb-2" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {['all', 'cooked', 'bakery', 'fruits_vegetables', 'packaged', 'dairy'].map(f => (
              <button
                key={`m-${f}`}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shadow-lg shrink-0 ${
                  filter === f ? 'gradient-bg text-white' : 'bg-slate-800/90 text-slate-200 border border-slate-700/50 backdrop-blur-sm'
                }`}
              >
                {f === 'all' ? 'All' : f === 'fruits_vegetables' ? 'Fruits' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <div className="absolute bottom-20 left-0 right-0 z-[1000] lg:hidden bg-gradient-to-t from-[#0d1117] to-transparent pt-12 pb-4 pointer-events-none">
            <div className="pointer-events-auto">
               <div className="flex justify-center mb-2">
                 <div className="w-10 h-1.5 bg-slate-400/50 rounded-full" />
               </div>
               <div className="px-4 mb-3 flex items-center justify-between">
                 <h3 className="font-bold text-white text-sm">{filtered.length} listings available</h3>
               </div>
               
               <div className="scroll-row px-4 w-full">
                 {filtered.map(listing => (
                   <div key={listing.id} id={`m-card-${listing.id}`} className="w-[140px] shrink-0 bg-[#161b22] border border-[#21262d] rounded-[12px] p-3 shadow-2xl flex flex-col snap-center cursor-pointer">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 mb-2">
                        {listing.foodType === 'cooked' ? '🍛' : listing.foodType === 'bakery' ? '🥖' : '📦'}
                      </div>
                      <h4 className="text-white text-xs font-bold truncate">{listing.title}</h4>
                      <p className="text-slate-400 text-[10px] truncate mb-2">{listing.donor?.orgName || 'Donor'}</p>
                      
                      <div className="mt-auto flex items-center justify-between">
                         <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${listing.urgencyScore > 70 ? 'bg-[#e24b4a]/20 text-[#e24b4a]' : 'bg-[#1D9E75]/20 text-[#1D9E75]'}`}>
                           {getTimeRemaining(listing.expiryTime)}
                         </span>
                         {listing._distanceKm != null && <span className="text-blue-400 text-[9px] font-bold">{listing._distanceKm.toFixed(1)}km</span>}
                      </div>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
