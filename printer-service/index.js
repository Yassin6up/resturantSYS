const express = require('express');
<<<<<<< HEAD
<<<<<<< HEAD
const cors = require('cors');
const bodyParser = require('body-parser');
const { io } = require('socket.io-client');
const winston = require('winston');
require('dotenv').config();

const PrinterManager = require('./src/printer-manager');
const ReceiptGenerator = require('./src/receipt-generator');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'posq-printer' },
  transports: [
    new winston.transports.File({ filename: 'logs/printer-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/printer-combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize printer manager
const printerManager = new PrinterManager(logger);
const receiptGenerator = new ReceiptGenerator();

// Connect to main API server via Socket.IO
const apiSocket = io(process.env.API_URL || 'http://localhost:3000', {
  transports: ['websocket']
});

apiSocket.on('connect', () => {
  logger.info('Connected to API server');
});

apiSocket.on('disconnect', () => {
  logger.error('Disconnected from API server');
});

// Listen for print jobs from API server
apiSocket.on('print.job', async (data) => {
  try {
    logger.info(`Received print job: ${data.type} for order ${data.orderId}`);
    await handlePrintJob(data);
  } catch (error) {
    logger.error('Error handling print job:', error);
    apiSocket.emit('print.error', {
      jobId: data.jobId,
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    printers: printerManager.getPrinterStatus()
  });
});

// Get printer status
app.get('/printers', (req, res) => {
  try {
    const printers = printerManager.getPrinterStatus();
    res.json({ printers });
  } catch (error) {
    logger.error('Error fetching printer status:', error);
    res.status(500).json({ error: 'Failed to fetch printer status' });
  }
});

// Test print endpoint
app.post('/test', async (req, res) => {
  try {
    const { printerId } = req.body;
    
    const testContent = receiptGenerator.generateTestReceipt();
    const success = await printerManager.print(printerId, testContent);
    
    if (success) {
      res.json({ message: 'Test print successful' });
    } else {
      res.status(500).json({ error: 'Test print failed' });
    }
  } catch (error) {
    logger.error('Test print error:', error);
    res.status(500).json({ error: 'Test print failed' });
  }
});

// Print receipt endpoint
app.post('/print', async (req, res) => {
  try {
    const { printerId, content, type = 'receipt' } = req.body;
    
    if (!printerId || !content) {
      return res.status(400).json({ error: 'Printer ID and content are required' });
    }

    const success = await printerManager.print(printerId, content);
    
    if (success) {
      res.json({ message: 'Print job successful' });
    } else {
      res.status(500).json({ error: 'Print job failed' });
    }
  } catch (error) {
    logger.error('Print job error:', error);
    res.status(500).json({ error: 'Print job failed' });
  }
});

// Print order receipt
app.post('/print/order', async (req, res) => {
  try {
    const { orderData, printerId } = req.body;
    
    if (!orderData || !printerId) {
      return res.status(400).json({ error: 'Order data and printer ID are required' });
    }

    const receiptContent = receiptGenerator.generateOrderReceipt(orderData);
    const success = await printerManager.print(printerId, receiptContent);
    
    if (success) {
      // Notify API server of successful print
      apiSocket.emit('print.success', {
        orderId: orderData.id,
        printerId,
        timestamp: new Date().toISOString()
      });
      
      res.json({ message: 'Order receipt printed successfully' });
    } else {
      // Notify API server of failed print
      apiSocket.emit('print.error', {
        orderId: orderData.id,
        printerId,
        error: 'Print failed',
        timestamp: new Date().toISOString()
      });
      
      res.status(500).json({ error: 'Order receipt print failed' });
    }
  } catch (error) {
    logger.error('Order print error:', error);
    
    // Notify API server of error
    apiSocket.emit('print.error', {
      orderId: req.body.orderData?.id,
      printerId: req.body.printerId,
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({ error: 'Order receipt print failed' });
  }
});

// Add printer endpoint
app.post('/printers', async (req, res) => {
  try {
    const { id, name, type, connection } = req.body;
    
    if (!id || !name || !type || !connection) {
      return res.status(400).json({ error: 'All printer fields are required' });
    }

    const success = await printerManager.addPrinter(id, name, type, connection);
    
    if (success) {
      res.json({ message: 'Printer added successfully' });
    } else {
      res.status(500).json({ error: 'Failed to add printer' });
    }
  } catch (error) {
    logger.error('Add printer error:', error);
    res.status(500).json({ error: 'Failed to add printer' });
  }
});

// Remove printer endpoint
app.delete('/printers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const success = await printerManager.removePrinter(id);
    
    if (success) {
      res.json({ message: 'Printer removed successfully' });
    } else {
      res.status(500).json({ error: 'Failed to remove printer' });
    }
  } catch (error) {
    logger.error('Remove printer error:', error);
    res.status(500).json({ error: 'Failed to remove printer' });
  }
});

// Handle print job from API server
async function handlePrintJob(data) {
  try {
    const { type, orderData, printerId, jobId } = data;
    
    let content;
    switch (type) {
      case 'order':
        content = receiptGenerator.generateOrderReceipt(orderData);
        break;
      case 'test':
        content = receiptGenerator.generateTestReceipt();
        break;
      default:
        throw new Error(`Unknown print type: ${type}`);
    }

    const success = await printerManager.print(printerId, content);
    
    if (success) {
      apiSocket.emit('print.success', {
        jobId,
        orderId: orderData?.id,
        printerId,
        timestamp: new Date().toISOString()
      });
    } else {
      apiSocket.emit('print.error', {
        jobId,
        orderId: orderData?.id,
        printerId,
        error: 'Print failed',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    logger.error('Handle print job error:', error);
    apiSocket.emit('print.error', {
      jobId: data.jobId,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Start server
app.listen(PORT, () => {
  logger.info(`🖨️  POSQ Printer Service running on port ${PORT}`);
  logger.info(`📡 API Server: ${process.env.API_URL || 'http://localhost:3000'}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down printer service...');
  apiSocket.disconnect();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Shutting down printer service...');
  apiSocket.disconnect();
  process.exit(0);
});
=======
=======
>>>>>>> origin/main
const bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.json());

app.post('/print', async (req, res) => {
  const { printerId, content } = req.body;
  try {
    console.log('Printing on', printerId);
    console.log(content);
    res.json({ ok: true });
  } catch (err) {
    console.error('Print error', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(4000, () => console.log('Printer service running on 4000'));
<<<<<<< HEAD
>>>>>>> e0c392214cbb541e36508749d9336f9cc9e18c38
=======
>>>>>>> origin/main
