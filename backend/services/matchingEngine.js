/**
 * Smart Matching Engine
 * Scores receivers by: distance (40%) + urgency (35%) + demand fairness (25%)
 */

class MatchingEngine {
  /**
   * Calculate distance between two GPS coordinates using Haversine formula
   */
  static haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  static toRad(deg) {
    return deg * (Math.PI / 180);
  }

  /**
   * Calculate distance score (40% weight)
   * Closer receivers get higher scores
   * Max distance threshold: 50km
   */
  static calculateDistanceScore(distanceKm) {
    const maxDistance = 50;
    if (distanceKm >= maxDistance) return 0;
    return ((maxDistance - distanceKm) / maxDistance) * 100;
  }

  /**
   * Calculate urgency score (35% weight)
   * Based on time remaining until food expires
   */
  static calculateUrgencyScore(expiryTime) {
    const now = new Date();
    const expiry = new Date(expiryTime);
    const hoursRemaining = (expiry - now) / (1000 * 60 * 60);

    if (hoursRemaining <= 0) return 100;
    if (hoursRemaining <= 1) return 95;
    if (hoursRemaining <= 2) return 85;
    if (hoursRemaining <= 4) return 70;
    if (hoursRemaining <= 8) return 50;
    if (hoursRemaining <= 12) return 35;
    if (hoursRemaining <= 24) return 20;
    return 10;
  }

  /**
   * Calculate demand fairness score (25% weight)
   * Receivers who have received less food recently get priority
   */
  static calculateDemandScore(receiver) {
    const totalReceived = receiver.totalReceived || 0;
    // Inverse scoring: less received = higher score
    // Cap at 100 donations for normalization
    const maxDonations = 100;
    const normalizedReceived = Math.min(totalReceived, maxDonations);
    const fairnessScore = ((maxDonations - normalizedReceived) / maxDonations) * 100;

    // Boost for verified organizations
    const verificationBonus = receiver.isVerified ? 10 : 0;

    // Boost for NGOs and community kitchens
    const orgTypeBonus = ['ngo', 'community_kitchen'].includes(receiver.orgType) ? 15 : 0;

    return Math.min(fairnessScore + verificationBonus + orgTypeBonus, 100);
  }

  /**
   * Calculate composite match score for a receiver
   */
  static calculateMatchScore(listing, receiver) {
    const distance = this.haversineDistance(
      listing.latitude, listing.longitude,
      receiver.latitude, receiver.longitude
    );

    const distanceScore = this.calculateDistanceScore(distance);
    const urgencyScore = this.calculateUrgencyScore(listing.expiryTime);
    const demandScore = this.calculateDemandScore(receiver);

    // Weighted composite score
    const compositeScore = (
      (distanceScore * 0.40) +
      (urgencyScore * 0.35) +
      (demandScore * 0.25)
    );

    return {
      compositeScore: Math.round(compositeScore * 100) / 100,
      distanceScore: Math.round(distanceScore * 100) / 100,
      urgencyScore: Math.round(urgencyScore * 100) / 100,
      demandScore: Math.round(demandScore * 100) / 100,
      distanceKm: Math.round(distance * 100) / 100,
    };
  }

  /**
   * Find and rank best receivers for a food listing
   */
  static async findBestMatches(listing, receivers, limit = 10) {
    const scoredReceivers = receivers
      .filter(r => r.latitude && r.longitude && r.isActive)
      .map(receiver => {
        const scores = this.calculateMatchScore(listing, receiver);
        return {
          receiver,
          ...scores,
        };
      })
      .filter(r => r.distanceKm <= 50) // Max 50km radius
      .sort((a, b) => b.compositeScore - a.compositeScore)
      .slice(0, limit);

    return scoredReceivers;
  }

  /**
   * Auto-assign the best receiver for a listing
   */
  static async autoAssign(listing, receivers) {
    const matches = await this.findBestMatches(listing, receivers, 1);
    return matches.length > 0 ? matches[0] : null;
  }
}

module.exports = MatchingEngine;
