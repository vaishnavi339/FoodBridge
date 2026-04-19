'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { listingsAPI } from '@/services/api';
import { FiPackage, FiClock, FiMapPin, FiInfo, FiArrowRight, FiAlertCircle, FiNavigation } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function CreateListingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [detectingGPS, setDetectingGPS] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    foodType: '',
    category: 'mixed',
    quantity: '',
    unit: 'kg',
    description: '',
    expiryTime: '',
    pickupAddress: user?.address || '',
    latitude: user?.latitude || '',
    longitude: user?.longitude || '',
    servesCount: '',
    allergens: '',
    specialInstructions: '',
  });

  // Auto-detect location on mount
  useEffect(() => {
    if (!formData.latitude && !formData.longitude) {
      detectLocation();
    }
  }, []);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported by your browser');
      return;
    }
    setDetectingGPS(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData(prev => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        toast.success('Location detected! 📍');
        setDetectingGPS(false);
      },
      (err) => {
        console.log('Geolocation denied, using profile location');
        if (user?.latitude && user?.longitude) {
          setFormData(prev => ({
            ...prev,
            latitude: String(user.latitude),
            longitude: String(user.longitude),
          }));
        }
        setDetectingGPS(false);
      },
      { timeout: 8000 }
    );
  };

  const update = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.title || !formData.foodType || !formData.quantity || !formData.expiryTime || !formData.pickupAddress) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const data = {
        ...formData,
        quantity: parseFloat(formData.quantity),
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        servesCount: formData.servesCount ? parseInt(formData.servesCount) : undefined,
        photos: [],
      };

      const res = await listingsAPI.create(data);
      toast.success('Food listing created! 🎉');

      if (res.data.topMatches?.length > 0) {
        toast.success(`${res.data.topMatches.length} receivers matched nearby!`, { duration: 5000 });
      }

      router.push('/donor/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create listing');
    } finally {
      setLoading(false);
    }
  };

  const foodTypes = [
    { value: 'cooked', label: '🍛 Cooked Food' },
    { value: 'raw', label: '🥩 Raw Ingredients' },
    { value: 'packaged', label: '📦 Packaged' },
    { value: 'bakery', label: '🥖 Bakery' },
    { value: 'dairy', label: '🥛 Dairy' },
    { value: 'fruits_vegetables', label: '🥗 Fruits & Veggies' },
    { value: 'beverages', label: '🥤 Beverages' },
    { value: 'mixed', label: '🍽️ Mixed' },
  ];

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 animate-fade-in">
          <div className="text-4xl mb-4">🍽️</div>
          <h1 className="text-3xl font-bold">Donate Surplus Food</h1>
          <p className="text-slate-400 mt-2">List your surplus food and connect with communities in need</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-8 animate-fade-in space-y-6" style={{ animationDelay: '0.1s' }}>
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <FiAlertCircle size={16} /> {error}
            </div>
          )}

          {/* Food Type */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">Food Type *</label>
            <div className="flex overflow-x-auto scroll-row gap-2 pb-2">
              {foodTypes.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => update('foodType', type.value)}
                  className={`shrink-0 px-4 py-3 rounded-xl border text-center text-xs font-medium transition-all ${
                    formData.foodType === type.value
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                      : 'border-white/10 bg-white/5 hover:border-white/20 text-slate-300'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Listing Title *</label>
            <input type="text" value={formData.title} onChange={e => update('title', e.target.value)} className="input-field" placeholder="e.g., Wedding Buffet Surplus — Mixed Indian Cuisine" required />
          </div>

          {/* Quantity & Unit & Category */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Quantity *</label>
              <input type="number" step="0.1" min="0" value={formData.quantity} onChange={e => update('quantity', e.target.value)} className="input-field" placeholder="25" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Unit</label>
              <select value={formData.unit} onChange={e => update('unit', e.target.value)} className="input-field">
                <option value="kg">Kilograms</option>
                <option value="liters">Liters</option>
                <option value="servings">Servings</option>
                <option value="packets">Packets</option>
                <option value="boxes">Boxes</option>
                <option value="pieces">Pieces</option>
              </select>
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
              <select value={formData.category} onChange={e => update('category', e.target.value)} className="input-field">
                <option value="veg">Vegetarian</option>
                <option value="non_veg">Non-Vegetarian</option>
                <option value="vegan">Vegan</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
            <textarea value={formData.description} onChange={e => update('description', e.target.value)} className="input-field" rows={3} placeholder="Describe the food items, how they were prepared, and their condition..." />
          </div>

          {/* Expiry & Serves */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Expiry Time *</label>
              <input type="datetime-local" value={formData.expiryTime} onChange={e => update('expiryTime', e.target.value)} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Serves (people)</label>
              <input type="number" min="0" value={formData.servesCount} onChange={e => update('servesCount', e.target.value)} className="input-field" placeholder="50" />
            </div>
          </div>

          {/* Pickup Address */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Pickup Address *</label>
            <div className="relative">
              <FiMapPin className="absolute left-3 top-3 text-slate-500" size={18} />
              <input type="text" value={formData.pickupAddress} onChange={e => update('pickupAddress', e.target.value)} className="input-field pl-10" placeholder="Full pickup address" required />
            </div>
          </div>

          {/* Coordinates */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-300">GPS Coordinates</label>
              <button
                type="button"
                onClick={detectLocation}
                disabled={detectingGPS}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                <FiNavigation size={12} className={detectingGPS ? 'animate-pulse' : ''} />
                {detectingGPS ? 'Detecting...' : 'Detect My Location'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <input type="number" step="any" value={formData.latitude} onChange={e => update('latitude', e.target.value)} className="input-field" placeholder="Latitude" />
              </div>
              <div>
                <input type="number" step="any" value={formData.longitude} onChange={e => update('longitude', e.target.value)} className="input-field" placeholder="Longitude" />
              </div>
            </div>
            {formData.latitude && formData.longitude && (
              <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                <FiMapPin size={10} /> Location set: {parseFloat(formData.latitude).toFixed(4)}, {parseFloat(formData.longitude).toFixed(4)}
              </p>
            )}
          </div>

          {/* Allergens & Special Instructions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Allergens</label>
              <input type="text" value={formData.allergens} onChange={e => update('allergens', e.target.value)} className="input-field" placeholder="Nuts, Dairy, Gluten..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Special Instructions</label>
              <input type="text" value={formData.specialInstructions} onChange={e => update('specialInstructions', e.target.value)} className="input-field" placeholder="Bring containers..." />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base">
            {loading ? 'Publishing...' : <>Publish Listing <FiArrowRight /></>}
          </button>
        </form>
      </div>
    </div>
  );
}
