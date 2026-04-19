/**
 * Multi-Channel Notification Service
 * Dispatches notifications via in-app, email, SMS, and push
 */

const { Notification } = require('../models');

class NotificationService {
  constructor(io) {
    this.io = io;
  }

  /**
   * Send in-app notification via Socket.io
   */
  async sendInApp(userId, type, title, message, data = null) {
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      data,
      channel: 'in_app',
    });

    // Emit to specific user's room
    if (this.io) {
      this.io.to(`user_${userId}`).emit('notification', {
        id: notification.id,
        type,
        title,
        message,
        data,
        createdAt: notification.createdAt,
      });
    }

    return notification;
  }

  /**
   * Send SMS via Twilio (stub - configure with real credentials)
   */
  async sendSMS(phone, message) {
    console.log(`[SMS Stub] To: ${phone}, Message: ${message}`);
    // In production, integrate Twilio:
    // const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    // await twilio.messages.create({ body: message, from: process.env.TWILIO_PHONE_NUMBER, to: phone });
    return { success: true, channel: 'sms' };
  }

  /**
   * Send Email via SendGrid (stub - configure with real credentials)
   */
  async sendEmail(email, subject, htmlContent) {
    console.log(`[Email Stub] To: ${email}, Subject: ${subject}`);
    // In production, integrate SendGrid:
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    // await sgMail.send({ to: email, from: process.env.SENDGRID_FROM_EMAIL, subject, html: htmlContent });
    return { success: true, channel: 'email' };
  }

  /**
   * Send Push Notification via Firebase (stub - configure with real credentials)
   */
  async sendPush(userId, title, body, data = {}) {
    console.log(`[Push Stub] To: ${userId}, Title: ${title}`);
    // In production, integrate Firebase:
    // const admin = require('firebase-admin');
    // await admin.messaging().send({ notification: { title, body }, data, token: userFCMToken });
    return { success: true, channel: 'push' };
  }

  /**
   * Send notification across all channels
   */
  async notifyAll(user, type, title, message, data = null) {
    const results = [];

    // Always send in-app
    results.push(await this.sendInApp(user.id, type, title, message, data));

    // Send email if available
    if (user.email) {
      results.push(await this.sendEmail(user.email, title, `<p>${message}</p>`));
    }

    // Send SMS if phone available
    if (user.phone) {
      results.push(await this.sendSMS(user.phone, `${title}: ${message}`));
    }

    // Send push
    results.push(await this.sendPush(user.id, title, message, data));

    return results;
  }

  // ========== Event-specific notifications ==========

  async onListingCreated(listing, donor) {
    return this.sendInApp(
      donor.id,
      'listing_created',
      'Listing Published! 🎉',
      `Your food listing "${listing.title}" is now live and being matched with nearby receivers.`,
      { listingId: listing.id }
    );
  }

  async onListingClaimed(listing, donor, receiver) {
    await this.notifyAll(
      donor,
      'listing_claimed',
      'Food Claimed! 🙌',
      `${receiver.orgName || receiver.name} has claimed your listing "${listing.title}".`,
      { listingId: listing.id }
    );

    await this.notifyAll(
      receiver,
      'claim_approved',
      'Claim Confirmed! ✅',
      `Your claim for "${listing.title}" has been confirmed. Pick up at: ${listing.pickupAddress}`,
      { listingId: listing.id }
    );
  }

  async onDeliveryComplete(listing, donor, receiver) {
    await this.notifyAll(
      donor,
      'delivery_confirmed',
      'Delivery Complete! 🎊',
      `"${listing.title}" has been successfully delivered to ${receiver.orgName || receiver.name}. Thank you for your donation!`,
      { listingId: listing.id }
    );

    await this.notifyAll(
      receiver,
      'delivery_confirmed',
      'Food Received! 🍽️',
      `You have received "${listing.title}". Please rate the donation.`,
      { listingId: listing.id }
    );
  }

  async onNewMatch(receiver, listing, matchScore) {
    return this.sendInApp(
      receiver.id,
      'new_match',
      'New Food Match! 🔔',
      `A new food listing "${listing.title}" is available near you with a match score of ${matchScore}%.`,
      { listingId: listing.id, matchScore }
    );
  }
}

module.exports = NotificationService;
