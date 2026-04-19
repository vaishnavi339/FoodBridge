/**
 * Socket.io Real-Time Handler
 * Manages WebSocket connections for live tracking and notifications
 */

const jwt = require('jsonwebtoken');
const { User } = require('../models');

function setupSocket(io) {
  // Authentication middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.id);

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user.id;
      socket.userRole = user.role;
      socket.userName = user.name;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.userName} (${socket.userRole})`);

    // Join user-specific room for targeted notifications
    socket.join(`user_${socket.userId}`);

    // Join role-based room
    socket.join(`role_${socket.userRole}`);

    // ========== Listing Events ==========

    socket.on('listing:new', (data) => {
      // Broadcast new listing to all receivers
      io.to('role_receiver').to('role_volunteer').emit('listing:new', data);
    });

    socket.on('listing:update', (data) => {
      // Broadcast listing update to all connected users
      io.emit('listing:update', data);
    });

    socket.on('listing:claimed', (data) => {
      // Notify relevant parties
      io.to(`user_${data.donorId}`).emit('listing:claimed', data);
      io.to('role_receiver').emit('listing:statusChange', {
        listingId: data.listingId,
        status: 'claimed',
      });
    });

    // ========== Tracking Events ==========

    socket.on('tracking:join', (claimId) => {
      socket.join(`tracking_${claimId}`);
      console.log(`📍 User ${socket.userName} joined tracking room: ${claimId}`);
    });

    socket.on('tracking:leave', (claimId) => {
      socket.leave(`tracking_${claimId}`);
    });

    socket.on('tracking:update', (data) => {
      // Broadcast location update to tracking room
      io.to(`tracking_${data.claimId}`).emit('tracking:locationUpdate', {
        claimId: data.claimId,
        latitude: data.latitude,
        longitude: data.longitude,
        status: data.status,
        timestamp: new Date(),
      });
    });

    socket.on('tracking:statusChange', (data) => {
      io.to(`tracking_${data.claimId}`).emit('tracking:statusChange', data);

      // Also notify specific users
      if (data.donorId) {
        io.to(`user_${data.donorId}`).emit('claim:statusChange', data);
      }
      if (data.receiverId) {
        io.to(`user_${data.receiverId}`).emit('claim:statusChange', data);
      }
    });

    // ========== Chat / Coordination ==========

    socket.on('chat:message', (data) => {
      io.to(`tracking_${data.claimId}`).emit('chat:message', {
        senderId: socket.userId,
        senderName: socket.userName,
        message: data.message,
        timestamp: new Date(),
      });
    });

    // ========== Disconnect ==========

    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${socket.userName}`);
    });
  });

  return io;
}

module.exports = setupSocket;
