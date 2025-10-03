require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const winston = require('winston');
const { Network } = require('escpos-network');
const { USB } = require('escpos-usb');

const app = express();
const PORT = process.env.PORT || 4000;

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

app.use(bodyParser.json());

// Printer configurations
const printers = new Map();

// Initialize printers
async function initializePrinters() {
  try {
    // Network printer example
    const networkPrinter = new Network('192.168.1.100', 9100);
    printers.set('kitchen', networkPrinter);
    
    // USB printer example (if available)
    try {
      const usbPrinter = new USB();
      const devices = await usbPrinter.getDevices();
      if (devices.length > 0) {
        printers.set('bar', usbPrinter);
        logger.info('USB printer initialized');
      }
    } catch (err) {
      logger.warn('No USB printer found');
    }

    logger.info('Printers initialized');
  } catch (error) {
    logger.error('Failed to initialize printers:', error);
  }
}

// Print order receipt
async function printOrderReceipt(printer, orderData) {
  try {
    await printer.open();
    
    // Header
    await printer.align('center');
    await printer.size(2, 2);
    await printer.text('DAR TAJINE RESTAURANT\n');
    await printer.size(1, 1);
    await printer.text('123 Avenue Mohammed V\n');
    await printer.text('Casablanca, Morocco\n');
    await printer.text('Tel: +212 5 22 123 456\n');
    await printer.drawLine();
    
    // Order info
    await printer.align('left');
    await printer.text(`Order: ${orderData.orderCode}\n`);
    await printer.text(`Table: ${orderData.tableNumber}\n`);
    await printer.text(`Date: ${new Date().toLocaleString()}\n`);
    await printer.text(`Customer: ${orderData.customerName || 'N/A'}\n`);
    await printer.drawLine();
    
    // Items
    await printer.text('ITEMS:\n');
    for (const item of orderData.items) {
      await printer.text(`${item.quantity}x ${item.name}\n`);
      if (item.note) {
        await printer.text(`  Note: ${item.note}\n`);
      }
      if (item.modifiers && item.modifiers.length > 0) {
        for (const modifier of item.modifiers) {
          await printer.text(`  + ${modifier.name}\n`);
        }
      }
      await printer.text(`  ${item.unitPrice * item.quantity} MAD\n\n`);
    }
    
    await printer.drawLine();
    
    // Totals
    await printer.align('right');
    await printer.text(`Subtotal: ${orderData.total} MAD\n`);
    if (orderData.tax > 0) {
      await printer.text(`Tax: ${orderData.tax} MAD\n`);
    }
    if (orderData.serviceCharge > 0) {
      await printer.text(`Service: ${orderData.serviceCharge} MAD\n`);
    }
    await printer.size(2, 1);
    await printer.text(`TOTAL: ${orderData.total + orderData.tax + orderData.serviceCharge} MAD\n`);
    
    await printer.drawLine();
    await printer.text('Thank you for your visit!\n');
    await printer.text('Bon appetit!\n\n');
    
    // QR code for order tracking
    await printer.align('center');
    await printer.qrcode(orderData.qrCode, 1, 8);
    await printer.text('\n');
    
    await printer.cut();
    await printer.close();
    
    logger.info(`Order receipt printed: ${orderData.orderCode}`);
  } catch (error) {
    logger.error('Print error:', error);
    throw error;
  }
}

// Print kitchen ticket
async function printKitchenTicket(printer, orderData) {
  try {
    await printer.open();
    
    // Header
    await printer.align('center');
    await printer.size(2, 2);
    await printer.text('KITCHEN ORDER\n');
    await printer.size(1, 1);
    await printer.drawLine();
    
    // Order info
    await printer.align('left');
    await printer.text(`Order: ${orderData.orderCode}\n`);
    await printer.text(`Table: ${orderData.tableNumber}\n`);
    await printer.text(`Time: ${new Date().toLocaleString()}\n`);
    await printer.drawLine();
    
    // Items
    await printer.text('ITEMS TO PREPARE:\n');
    for (const item of orderData.items) {
      await printer.size(2, 1);
      await printer.text(`${item.quantity}x ${item.name}\n`);
      await printer.size(1, 1);
      if (item.note) {
        await printer.text(`  Note: ${item.note}\n`);
      }
      if (item.modifiers && item.modifiers.length > 0) {
        for (const modifier of item.modifiers) {
          await printer.text(`  + ${modifier.name}\n`);
        }
      }
      await printer.text('\n');
    }
    
    await printer.drawLine();
    await printer.text('Please prepare and notify when ready!\n');
    await printer.cut();
    await printer.close();
    
    logger.info(`Kitchen ticket printed: ${orderData.orderCode}`);
  } catch (error) {
    logger.error('Kitchen print error:', error);
    throw error;
  }
}

// API Routes
app.post('/print/order', async (req, res) => {
  try {
    const { printerId, orderData } = req.body;
    
    if (!printerId || !orderData) {
      return res.status(400).json({ error: 'Printer ID and order data required' });
    }
    
    const printer = printers.get(printerId);
    if (!printer) {
      return res.status(404).json({ error: 'Printer not found' });
    }
    
    await printOrderReceipt(printer, orderData);
    
    res.json({ success: true, message: 'Order printed successfully' });
  } catch (error) {
    logger.error('Print order error:', error);
    res.status(500).json({ error: 'Failed to print order' });
  }
});

app.post('/print/kitchen', async (req, res) => {
  try {
    const { printerId, orderData } = req.body;
    
    if (!printerId || !orderData) {
      return res.status(400).json({ error: 'Printer ID and order data required' });
    }
    
    const printer = printers.get(printerId);
    if (!printer) {
      return res.status(404).json({ error: 'Printer not found' });
    }
    
    await printKitchenTicket(printer, orderData);
    
    res.json({ success: true, message: 'Kitchen ticket printed successfully' });
  } catch (error) {
    logger.error('Print kitchen error:', error);
    res.status(500).json({ error: 'Failed to print kitchen ticket' });
  }
});

app.post('/print/test', async (req, res) => {
  try {
    const { printerId } = req.body;
    
    if (!printerId) {
      return res.status(400).json({ error: 'Printer ID required' });
    }
    
    const printer = printers.get(printerId);
    if (!printer) {
      return res.status(404).json({ error: 'Printer not found' });
    }
    
    await printer.open();
    await printer.align('center');
    await printer.size(2, 2);
    await printer.text('PRINTER TEST\n');
    await printer.size(1, 1);
    await printer.text('POSQ Restaurant POS\n');
    await printer.text('Test successful!\n');
    await printer.text(new Date().toLocaleString() + '\n');
    await printer.cut();
    await printer.close();
    
    res.json({ success: true, message: 'Test print successful' });
  } catch (error) {
    logger.error('Test print error:', error);
    res.status(500).json({ error: 'Failed to print test' });
  }
});

app.get('/printers', (req, res) => {
  const printerList = Array.from(printers.keys()).map(id => ({
    id,
    type: printers.get(id).constructor.name,
    status: 'connected'
  }));
  
  res.json(printerList);
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    printers: printers.size
  });
});

// Error handling
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function startServer() {
  try {
    await initializePrinters();
    
    app.listen(PORT, () => {
      logger.info(`Printer service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start printer service:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

startServer();