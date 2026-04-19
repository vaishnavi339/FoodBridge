'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useSocket } from '@/context/SocketContext';
import { useAuth } from '@/context/AuthContext';
import { listingsAPI, claimsAPI } from '@/services/api';
import { FiMapPin, FiClock, FiUser, FiPackage, FiTruck, FiCheckCircle, FiPhone, FiAlertTriangle } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function TrackingPage() {
  const params = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchListing();
  }, [params.id]);

  useEffect(() => {
    if (!socket || !listing) return;

    const claimId = listing.claims?.[0]?.id;
    if (claimId) {
      socket.emit('tracking:join', claimId);

      socket.on('tracking:statusChange', (data) => {
        toast.success(`Status updated: ${data.status}`);
        fetchListing();
      });

      return () => {
        socket.emit('tracking:leave', claimId);
        socket.off('tracking:statusChange');
      };
    }
  }, [socket, listing?.id]);

  const fetchListing = async () => {
    try {
      const res = await listingsAPI.getById(params.id);
      setListing(res.data.listing);
    } catch (err) {
      console.error('Failed to fetch listing');
    } finally {
      setLoading(false);
    }
  };

  const updateClaimStatus = async (claimId, status) => {
    try {
      await claimsAPI.updateStatus(claimId, status);
      toast.success(`Status updated to ${status}!`);
      fetchListing();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    }
  };

  const getTimeRemaining = (expiryTime) => {
    const hours = Math.max(0, (new Date(expiryTime) - new Date()) / (1000 * 60 * 60));
    if (hours <= 0) return 'Expired';
    if (hours < 1) return `${Math.round(hours * 60)} minutes left`;
    if (hours < 24) return `${Math.round(hours)} hours left`;
    return `${Math.round(hours / 24)} days left`;
  };

  const timelineSteps = [
    { key: 'available', label: 'Listed', icon: <FiPackage />, desc: 'Food listing published' },
    { key: 'claimed', label: 'Claimed', icon: <FiUser />, desc: 'Receiver matched & claimed' },
    { key: 'picked_up', label: 'Picked Up', icon: <FiTruck />, desc: 'Food picked up from donor' },
    { key: 'in_transit', label: 'In Transit', icon: <FiMapPin />, desc: 'On the way to receiver' },
    { key: 'delivered', label: 'Delivered', icon: <FiCheckCircle />, desc: 'Successfully delivered' },
  ];

  const getStepStatus = (stepKey) => {
    const statusOrder = ['available', 'claimed', 'picked_up', 'in_transit', 'delivered'];
    const currentStatus = listing?.claims?.[0]?.status || listing?.status || 'available';

    // Map claim status to timeline
    let currentIdx = statusOrder.indexOf(currentStatus);
    if (currentStatus === 'approved') currentIdx = 1;
    const stepIdx = statusOrder.indexOf(stepKey);

    if (stepIdx < currentIdx) return 'completed';
    if (stepIdx === currentIdx) return 'active';
    return 'pending';
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading tracking info...</p>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="card p-12 text-center">
          <div className="text-4xl mb-4">❌</div>
          <h2 className="text-xl font-bold mb-2">Listing Not Found</h2>
          <p className="text-slate-400">This food listing doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const claim = listing.claims?.[0];
  const currentStatus = claim?.status || listing.status;

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
            <FiPackage size={14} />
            <span>Tracking</span>
          </div>
          <h1 className="text-3xl font-bold">{listing.title}</h1>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Timeline */}
          <div className="lg:col-span-2">
            <div className="card p-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <h2 className="text-lg font-bold mb-6">Delivery Timeline</h2>

              <div className="space-y-0">
                {timelineSteps.map((step, i) => {
                  const status = getStepStatus(step.key);
                  return (
                    <div key={step.key} className="timeline-step">
                      <div className={`timeline-dot ${
                        status === 'completed' ? 'gradient-bg text-white' :
                        status === 'active' ? 'bg-amber-500 text-white animate-pulse' :
                        'bg-slate-700 text-slate-500'
                      }`}>
                        {status === 'completed' ? '✓' : step.icon}
                      </div>
                      <div>
                        <h3 className={`font-semibold text-sm ${
                          status === 'active' ? 'text-amber-400' :
                          status === 'completed' ? 'text-emerald-400' :
                          'text-slate-500'
                        }`}>
                          {step.label}
                          {status === 'active' && <span className="ml-2 text-xs">(Current)</span>}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">{step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Status Actions */}
              {claim && currentStatus !== 'delivered' && currentStatus !== 'cancelled' && (
                <div className="mt-6 pt-4 border-t border-white/10">
                  <h3 className="text-sm font-semibold mb-3">Update Status</h3>
                  <div className="flex flex-wrap gap-2">
                    {currentStatus === 'approved' && (
                      <button onClick={() => updateClaimStatus(claim.id, 'picked_up')} className="btn-primary text-sm">
                        <FiTruck size={14} /> Mark Picked Up
                      </button>
                    )}
                    {currentStatus === 'picked_up' && (
                      <button onClick={() => updateClaimStatus(claim.id, 'in_transit')} className="btn-primary text-sm">
                        <FiMapPin size={14} /> Mark In Transit
                      </button>
                    )}
                    {currentStatus === 'in_transit' && (
                      <button onClick={() => updateClaimStatus(claim.id, 'delivered')} className="btn-primary text-sm">
                        <FiCheckCircle size={14} /> Mark Delivered
                      </button>
                    )}
                    {!['delivered', 'cancelled'].includes(currentStatus) && (
                      <button onClick={() => updateClaimStatus(claim.id, 'cancelled')} className="btn-danger text-sm">
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              )}

              {currentStatus === 'delivered' && (
                <div className="mt-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                    <FiCheckCircle size={18} />
                    Delivery Complete! 🎉
                  </div>
                  <p className="text-sm text-slate-400 mt-1">
                    This food has been successfully delivered. Thank you for making a difference!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Listing Details Sidebar */}
          <div className="space-y-4">
            {/* Food Details */}
            <div className="card p-5 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <h3 className="font-semibold text-sm mb-4">Food Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Type</span>
                  <span className="font-medium">{listing.foodType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Category</span>
                  <span className="font-medium">{listing.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Quantity</span>
                  <span className="font-medium">{listing.quantity} {listing.unit}</span>
                </div>
                {listing.servesCount && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Serves</span>
                    <span className="font-medium">{listing.servesCount} people</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Expiry</span>
                  <span className={`font-medium text-xs ${listing.urgencyScore > 70 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {getTimeRemaining(listing.expiryTime)}
                  </span>
                </div>
                {listing.allergens && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Allergens</span>
                    <span className="text-amber-400 text-xs">⚠️ {listing.allergens}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Donor Info */}
            <div className="card p-5 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <h3 className="font-semibold text-sm mb-4">Donor</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 gradient-bg rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {listing.donor?.name?.[0] || 'D'}
                </div>
                <div>
                  <p className="font-medium text-sm">{listing.donor?.orgName || listing.donor?.name}</p>
                  <p className="text-xs text-slate-400">{listing.donor?.orgType}</p>
                </div>
              </div>
              {listing.donor?.phone && (
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                  <FiPhone size={12} /> {listing.donor.phone}
                </div>
              )}
            </div>

            {/* Receiver Info */}
            {claim && (
              <div className="card p-5 animate-fade-in" style={{ animationDelay: '0.4s' }}>
                <h3 className="font-semibold text-sm mb-4">Receiver</h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400 font-bold text-sm">
                    {claim.receiver?.name?.[0] || 'R'}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{claim.receiver?.orgName || claim.receiver?.name}</p>
                    <p className="text-xs text-slate-400">Match Score: {claim.matchScore}%</p>
                  </div>
                </div>
                {claim.distanceKm && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                    <FiMapPin size={12} /> {claim.distanceKm} km away
                  </div>
                )}
              </div>
            )}

            {/* Pickup Location */}
            <div className="card p-5 animate-fade-in" style={{ animationDelay: '0.5s' }}>
              <h3 className="font-semibold text-sm mb-3">Pickup Location</h3>
              <div className="flex items-start gap-2">
                <FiMapPin size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-slate-400">{listing.pickupAddress}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
