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

const { initializeDatabase } = require('./src/database/init');
const { ensureVariantsTable } = require('./src/utils/ensure-variants-table');
const { setupSocketHandlers } = require('./src/socket/handlers');
const { errorHandler } = require('./src/middleware/errorHandler');
const { rateLimiter } = require('./src/middleware/rateLimiter');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
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
  origin: true,
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimiter);

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

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    mode: process.env.MODE || 'LOCAL'
  });
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

async function startServer() {
  try {
    // Initialize database
    await initializeDatabase();
    
    // Ensure product variants table exists
    await ensureVariantsTable();
    
    server.listen(PORT, () => {
      console.log(`🚀 POSQ Server running on port ${PORT}`);
      console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5000'}`);
      console.log(`🗄️  Database: ${process.env.DB_TYPE || 'sqlite'}`);
      console.log(`⚙️  Mode: ${process.env.MODE || 'LOCAL'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();