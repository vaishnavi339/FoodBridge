require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { sequelize } = require('./models');
const setupSocket = require('./socket/handler');

const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const app = express();
const server = http.createServer(app);

// Security and Performance
app.use(helmet());
app.use(compression());

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

// Make io accessible to routes
app.set('io', io);

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 15, // Limit each IP to 15 login/register attempts per hour
  message: { error: 'Too many attempts, please try again in an hour.' }
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '5mb' })); // Reduced limit for production
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api', limiter); // Apply general limiter to all /api routes
app.use('/api/auth', authLimiter, require('./routes/auth')); // Apply stricter limiter to auth
app.use('/api/listings', require('./routes/listings'));
app.use('/api/claims', require('./routes/claims'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/notifications', require('./routes/notifications'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Setup WebSocket handlers
setupSocket(io);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Sync database
    await sequelize.sync();
    console.log('✅ Database synced');

    server.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════╗
║     🍽️  Smart Food Distribution System        ║
║     🚀  Backend API is running!               ║
║     📡  Port: ${PORT}                            ║
║     🔌  WebSocket: Ready                      ║
║     💾  Database: SQLite                       ║
╚═══════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = { app, server, io };
