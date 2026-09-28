const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./src/routes/auth');
const menuRoutes = require('./src/routes/menu');
const orderRoutes = require('./src/routes/orders');
const paymentRoutes = require('./src/routes/payments');
const tableRoutes = require('./src/routes/tables');
const inventoryRoutes = require('./src/routes/inventory');
const settingsRoutes = require('./src/routes/settings');
const { router: syncRoutes } = require('./src/routes/sync');
const reportRoutes = require('./src/routes/reports');
const uploadRoutes = require('./src/routes/upload');
const appSettingsRoutes = require('./src/routes/app-settings');
const backupRoutes = require('./src/routes/backup');
const employeesRoutes = require('./src/routes/employees');
const restaurantsRoutes = require('./src/routes/restaurants');
const googleImagesRoutes = require('./src/routes/google-images');
const variantsRoutes = require('./src/routes/variants');
const loyaltyRoutes = require('./src/routes/loyalty');
const customerAuthRoutes = require('./src/routes/customerAuth');
const customerRoutes = require('./src/routes/customer');
const whatsappRoutes = require('./src/routes/whatsapp');
const whatsappService = require('./src/services/whatsapp');
const billingRoutes = require('./src/routes/billing');
const servicesRoutes = require('./src/routes/services');
const bookingsRoutes = require('./src/routes/bookings');
const availabilityRoutes = require('./src/routes/availability');
const themesRoutes = require('./src/routes/themes');
const billingService = require('./src/services/billing');

const { initializeDatabase } = require('./src/database/init');
const { ensureVariantsTable } = require('./src/utils/ensure-variants-table');
const { setupSocketHandlers } = require('./src/socket/handlers');
const { errorHandler } = require('./src/middleware/errorHandler');
const { rateLimiter } = require('./src/middleware/rateLimiter');
const { resolveTenant } = require('./src/middleware/tenant');

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());
const appDomain = process.env.APP_DOMAIN;

// With automatic per-restaurant subdomains, new allowed origins are created
// by restaurant sign-up, not by a deploy - an exact-match allowlist alone
// can never keep up. Any subdomain of APP_DOMAIN is trusted; everything
// else must be explicitly listed in FRONTEND_URL (admin panel, local dev).
const corsOriginCheck = (origin, callback) => {
  if (!origin) return callback(null, true);
  if (allowedOrigins.includes(origin)) return callback(null, true);

  if (appDomain) {
    try {
      const hostname = new URL(origin).hostname;
      if (hostname === appDomain || hostname.endsWith(`.${appDomain}`)) {
        return callback(null, true);
      }
    } catch (e) {
      // malformed Origin header - fall through to rejection
    }
  }

  return callback(new Error('Not allowed by CORS'));
};

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: corsOriginCheck,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Store io instance for use in routes
app.set('io', io);

// Trust proxy for Replit environment (1 proxy hop)
app.set('trust proxy', 1);

// Middleware
app.use(helmet());
app.use(cors({
  origin: corsOriginCheck,
  credentials: true
}));
app.use(morgan('combined'));
// Stripe webhook signature verification needs the exact raw request bytes,
// which express.json() consumes when it parses. Stash them via `verify` so
// webhook routes can use req.rawBody instead of adding their own raw-body
// middleware after this has already run (that middleware would receive an
// already-drained stream and get nothing).
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => { req.rawBody = buf; }
}));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimiter);
app.use(resolveTenant);

// Static files
app.use('/uploads', express.static('uploads'));

// Serve frontend build in production
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/catalog-import', require('./src/routes/catalogImport'));
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/app-settings', appSettingsRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/restaurants', restaurantsRoutes);
app.use('/api/google-images', googleImagesRoutes);
app.use('/api/variants', variantsRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/customer-auth', customerAuthRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/reservations', require('./src/routes/reservations'));
app.use('/api/themes', themesRoutes);
app.use('/api/availability', availabilityRoutes);

// Health check
// Liveness only - always OK if the process can respond at all. Used for "is
// this container even running" checks (e.g. the Dockerfile HEALTHCHECK).
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    mode: process.env.MODE || 'LOCAL'
  });
});

// Readiness - actually checks the database is reachable. Use this one for
// load-balancer / orchestrator checks that decide whether to route traffic
// to this instance (a running-but-DB-less instance should be taken out of
// rotation, not sent orders it can't fulfill).
app.get('/health/ready', async (req, res) => {
  try {
    const { db } = require('./src/database/init');
    await db.raw('SELECT 1');
    res.json({ status: 'ready', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: 'not_ready', error: error.message });
  }
});

// Setup Socket.IO handlers
setupSocketHandlers(io);

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3001;

// Each Socket.IO instance only knows about its own connected clients by
// default - fine for a single process, but broadcasts (order updates,
// kitchen tickets) would silently miss clients connected to a *different*
// replica once this runs behind a load balancer with more than one
// instance. The Redis adapter shares room membership and broadcasts across
// all instances via pub/sub. Skipped entirely in local dev (no REDIS_URL).
async function setupSocketAdapter() {
  if (!process.env.REDIS_URL) return;
  const { createClient } = require('redis');
  const { createAdapter } = require('@socket.io/redis-adapter');

  const pubClient = createClient({ url: process.env.REDIS_URL });
  const subClient = pubClient.duplicate();
  pubClient.on('error', err => console.error('Redis pub client error:', err));
  subClient.on('error', err => console.error('Redis sub client error:', err));

  await Promise.all([pubClient.connect(), subClient.connect()]);
  io.adapter(createAdapter(pubClient, subClient));
  console.log('🔌 Socket.IO using Redis adapter (multi-instance mode)');
}

async function startServer() {
  try {
    // Initialize database
    await initializeDatabase();

    // Ensure product variants table exists
    await ensureVariantsTable();

    await setupSocketAdapter();

    server.listen(PORT, () => {
      console.log(`🚀 POSQ Server running on port ${PORT}`);
      console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5000'}`);
      console.log(`🗄️  Database: ${process.env.DB_TYPE || 'sqlite'}`);
      console.log(`⚙️  Mode: ${process.env.MODE || 'LOCAL'}`);
    });

    whatsappService.startQueueWorker();
    whatsappService.resumeConnectedSessions().catch(err =>
      console.error('Failed to resume WhatsApp sessions:', err)
    );

    setInterval(() => {
      billingService.suspendOverdueRestaurants().catch(err =>
        console.error('Billing overdue-suspension check failed:', err)
      );
    }, 60 * 60 * 1000); // hourly is plenty for a 7-day grace period
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) startServer();
module.exports = app;

// Docker sends SIGTERM on `docker stop` / a scale-down / a rolling deploy.
// Without handling it, in-flight requests (an order being placed, a
// WhatsApp campaign mid-send) get killed mid-write instead of finishing.
let shuttingDown = false;
function gracefulShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, closing server...`);

  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });

  // Don't hang forever if a connection never drains (e.g. an open
  // long-poll or a stuck socket).
  setTimeout(() => {
    console.warn('Forcing shutdown after 10s timeout');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
