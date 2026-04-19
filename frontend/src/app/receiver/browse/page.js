'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { listingsAPI, claimsAPI } from '@/services/api';
import { FiFilter, FiClock, FiMapPin, FiUsers, FiAlertTriangle, FiCheck, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function BrowseFood() {
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [claiming, setClaiming] = useState(null);

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      const res = await listingsAPI.getAll({
        status: 'available',
        lat: user?.latitude || 28.6139,
        lng: user?.longitude || 77.2090,
        radius: 50,
      });
      setListings(res.data.listings);
    } catch (err) {
      console.error('Failed to fetch');
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (listingId) => {
    setClaiming(listingId);
    try {
      const res = await claimsAPI.create({ listingId });
      toast.success('Food claimed successfully! 🎉');
      fetchListings();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to claim');
    } finally {
      setClaiming(null);
    }
  };

  const getTimeRemaining = (expiryTime) => {
    const hours = Math.max(0, (new Date(expiryTime) - new Date()) / (1000 * 60 * 60));
    if (hours <= 0) return { text: 'Expired', color: 'text-red-400', urgent: true };
    if (hours < 2) return { text: `${Math.round(hours * 60)}m left`, color: 'text-red-400', urgent: true };
    if (hours < 6) return { text: `${Math.round(hours)}h left`, color: 'text-amber-400', urgent: true };
    if (hours < 24) return { text: `${Math.round(hours)}h left`, color: 'text-emerald-400', urgent: false };
    return { text: `${Math.round(hours / 24)}d left`, color: 'text-emerald-400', urgent: false };
  };

  const filtered = filter === 'all' ? listings : listings.filter(l => l.foodType === filter);

  const foodEmoji = {
    cooked: '🍛', raw: '🥩', packaged: '📦', bakery: '🥖',
    dairy: '🥛', fruits_vegetables: '🥗', beverages: '🥤', mixed: '🍽️',
  };

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold">Browse Available Food</h1>
          <p className="text-slate-400 mt-1">{listings.length} listings available near you</p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          {[
            { value: 'all', label: 'All' },
            { value: 'cooked', label: '🍛 Cooked' },
            { value: 'bakery', label: '🥖 Bakery' },
            { value: 'fruits_vegetables', label: '🥗 Fruits & Vegs' },
            { value: 'packaged', label: '📦 Packaged' },
            { value: 'dairy', label: '🥛 Dairy' },
            { value: 'beverages', label: '🥤 Beverages' },
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                filter === f.value
                  ? 'gradient-bg text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Listings Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="card shimmer h-64" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold mb-2">No food available</h3>
            <p className="text-slate-400 text-sm">Check back later or adjust your filters</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((listing, i) => {
              const time = getTimeRemaining(listing.expiryTime);
              return (
                <div key={listing.id} className="card p-0 overflow-hidden animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                  {/* Header with urgency */}
                  <div className={`px-5 py-3 flex items-center justify-between ${time.urgent ? 'bg-red-500/10' : 'bg-emerald-500/5'}`}>
                    <div className="flex items-center gap-2">
                      <FiClock size={14} className={time.color} />
                      <span className={`text-xs font-semibold ${time.color}`}>{time.text}</span>
                    </div>
                    {listing.urgencyScore > 70 && (
                      <span className="flex items-center gap-1 text-xs text-amber-400">
                        <FiAlertTriangle size={12} /> Priority
                      </span>
                    )}
                  </div>

                  <div className="p-5">
                    {/* Food Type & Title */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center text-xl flex-shrink-0">
                        {foodEmoji[listing.foodType] || '🍽️'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm leading-tight">{listing.title}</h3>
                        <p className="text-xs text-slate-400 mt-1">
                          by {listing.donor?.orgName || listing.donor?.name || 'Anonymous Donor'}
                        </p>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="flex flex-wrap gap-3 mb-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <FiMapPin size={12} /> {listing.distance ? `${listing.distance} km` : listing.pickupAddress?.split(',')[0]}
                      </span>
                      <span>{listing.quantity} {listing.unit}</span>
                      {listing.servesCount && (
                        <span className="flex items-center gap-1"><FiUsers size={12} /> Serves {listing.servesCount}</span>
                      )}
                    </div>

                    {listing.description && (
                      <p className="text-xs text-slate-500 mb-4 line-clamp-2">{listing.description}</p>
                    )}

                    {/* Category & Allergens */}
                    <div className="flex gap-2 mb-4">
                      <span className="badge badge-info">{listing.category?.replace('_', ' ')}</span>
                      {listing.allergens && <span className="badge badge-warning">⚠️ {listing.allergens}</span>}
                    </div>

                    {/* Match Score & Claim Button */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleClaim(listing.id)}
                        disabled={claiming === listing.id}
                        className="btn-primary flex-1 justify-center text-sm py-2.5"
                      >
                        {claiming === listing.id ? 'Claiming...' : <><FiCheck size={16} /> Claim Food</>}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
