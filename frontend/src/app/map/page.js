'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';
import { listingsAPI } from '@/services/api';
import { FiClock, FiMapPin, FiUsers, FiAlertTriangle, FiRefreshCw, FiNavigation, FiSliders } from 'react-icons/fi';

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
  () => Promise.resolve(function MapAutoFitInner({ listings, userLocation }) {
    const { useMap } = require('react-leaflet');
    const map = useMap();

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
          map.setView([20.5937, 78.9629], 5);
        }
      });
    }, [map, listings.length, userLocation]);

    return null;
  }),
  { ssr: false }
);

function MapContent({ listings }) {
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

  if (!L) return null;

  return listings.map(listing => (
    <Marker
      key={listing.id}
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
  ));
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
  const [userLocation, setUserLocation] = useState(null);
  const [radiusKm, setRadiusKm] = useState(100); // default 100km — show wide area
  const [locatingUser, setLocatingUser] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchListings();
    detectUserLocation();
    window.scrollToCard = (id) => {
      document.getElementById(`m-card-${id}`)?.scrollIntoView({ behavior: 'smooth', inline: 'center' });
    };
  }, []);

  const detectUserLocation = () => {
    setLocatingUser(true);

    // Try browser geolocation first
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocatingUser(false);
        },
        () => {
          // Geolocation denied/failed — fallback to user profile coords
          if (user?.latitude && user?.longitude) {
            setUserLocation({ lat: user.latitude, lng: user.longitude });
          }
          // If no user profile either, map stays on India center (handled by MapAutoFit)
          setLocatingUser(false);
        },
        { timeout: 5000 }
      );
    } else if (user?.latitude && user?.longitude) {
      setUserLocation({ lat: user.latitude, lng: user.longitude });
      setLocatingUser(false);
    } else {
      setLocatingUser(false);
    }
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

  // Filter by food type
  const typeFiltered = filter === 'all' ? allListings : allListings.filter(l => l.foodType === filter);

  // Filter by radius from user location + add distance info
  const filtered = typeFiltered.map(listing => {
    if (userLocation) {
      const dist = haversineDistance(userLocation.lat, userLocation.lng, listing.latitude, listing.longitude);
      return { ...listing, _distanceKm: dist };
    }
    return { ...listing, _distanceKm: null };
  }).filter(listing => {
    if (!userLocation) return true; // No location — show all
    return listing._distanceKm <= radiusKm;
  }).sort((a, b) => {
    // Sort by distance (nearest first)
    if (a._distanceKm != null && b._distanceKm != null) return a._distanceKm - b._distanceKm;
    return 0;
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
                {filtered.length} listings {userLocation ? `within ${radiusKm} km` : 'available'}
              </span>
            </div>
            {userLocation && (
              <div className="mt-2 text-xs text-blue-400 flex items-center gap-1">
                <FiNavigation size={10} />
                Your location detected
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
                max="500"
                value={radiusKm}
                onChange={(e) => setRadiusKm(parseInt(e.target.value))}
                className="w-full accent-emerald-500 h-1"
              />
              <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                <span>5 km</span>
                <span>500 km</span>
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
                {f === 'all' ? 'All' : f === 'fruits_vegetables' ? 'Fruits' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Listings List */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="p-8 text-center">
                <div className="text-3xl mb-2">🔍</div>
                <p className="text-sm text-slate-500">No listings in this area</p>
                <p className="text-xs text-slate-600 mt-1">Try increasing your radius</p>
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
            <MapAutoFit listings={filtered} userLocation={userLocation} />
            <MapContent listings={filtered} />
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
