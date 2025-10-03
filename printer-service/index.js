require('dotenv').config();
const express = require('express');
const cors = require('cors');
const moment = require('moment');

// ESC/POS printer libraries (optional - may need system dependencies)
let escpos, USB, Network;
try {
  escpos = require('escpos');
  USB = require('escpos-usb');
  Network = require('escpos-network');
} catch (error) {
  console.warn('ESC/POS libraries not available. Running in simulation mode.');
}

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Store printer configurations
const printers = new Map();

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    mode: escpos ? 'HARDWARE' : 'SIMULATION'
  });
});

// Get available printers
app.get('/printers', (req, res) => {
  const printerList = Array.from(printers.entries()).map(([id, config]) => ({
    id,
    ...config,
    status: 'unknown' // Would need to ping printer to get real status
  }));
  
  res.json({
    success: true,
    data: printerList
  });
});

// Add/Update printer configuration
app.post('/printers', (req, res) => {
  try {
    const { id, name, type, connectionString, categories } = req.body;
    
    if (!id || !name || !type || !connectionString) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: id, name, type, connectionString'
      });
    }

    printers.set(id, {
      name,
      type: type.toUpperCase(),
      connectionString,
      categories: categories || [],
      addedAt: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Printer configuration saved'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test print
app.post('/test-print/:printerId', async (req, res) => {
  try {
    const { printerId } = req.params;
    const printer = printers.get(printerId);
    
    if (!printer) {
      return res.status(404).json({
        success: false,
        error: 'Printer not found'
      });
    }

    const testContent = `
POSQ Test Print
===============
Printer: ${printer.name}
Type: ${printer.type}
Connection: ${printer.connectionString}
Time: ${moment().format('YYYY-MM-DD HH:mm:ss')}

This is a test print to verify
printer connectivity.

===============
    `;

    const result = await printContent(printer, testContent);
    
    res.json({
      success: true,
      message: 'Test print sent successfully',
      result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Print order receipt
app.post('/print-order', async (req, res) => {
  try {
    const { printerId, order, template } = req.body;
    
    if (!printerId || !order) {
      return res.status(400).json({
        success: false,
        error: 'Missing printerId or order data'
      });
    }

    const printer = printers.get(printerId);
    if (!printer) {
      return res.status(404).json({
        success: false,
        error: 'Printer not found'
      });
    }

    const receipt = generateOrderReceipt(order, template);
    const result = await printContent(printer, receipt);
    
    res.json({
      success: true,
      message: 'Order printed successfully',
      result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Print kitchen ticket
app.post('/print-kitchen', async (req, res) => {
  try {
    const { printerId, order, categoryFilter } = req.body;
    
    const printer = printers.get(printerId);
    if (!printer) {
      return res.status(404).json({
        success: false,
        error: 'Printer not found'
      });
    }

    const ticket = generateKitchenTicket(order, categoryFilter);
    const result = await printContent(printer, ticket);
    
    res.json({
      success: true,
      message: 'Kitchen ticket printed successfully',
      result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Generate order receipt content
function generateOrderReceipt(order, template) {
  const formatPrice = (price) => `${price.toFixed(2)} MAD`;
  const formatDateTime = (date) => moment(date).format('DD/MM/YYYY HH:mm');

  let receipt = `
================================
        RESTAURANT POSQ
================================
Order: ${order.order_code}
Table: ${order.table_number || 'N/A'}
${order.customer_name ? `Customer: ${order.customer_name}` : ''}
Date: ${formatDateTime(order.created_at)}
================================

`;

  // Order items
  order.items.forEach(item => {
    receipt += `${item.quantity}x ${item.item_name}\n`;
    if (item.modifiers && item.modifiers.length > 0) {
      item.modifiers.forEach(mod => {
        receipt += `   + ${mod.modifier_name}\n`;
      });
    }
    if (item.notes) {
      receipt += `   Note: ${item.notes}\n`;
    }
    receipt += `   ${formatPrice(item.unit_price * item.quantity)}\n\n`;
  });

  receipt += `--------------------------------
Subtotal:        ${formatPrice(order.subtotal)}
`;

  if (order.tax > 0) {
    receipt += `Tax (20%):       ${formatPrice(order.tax)}\n`;
  }
  
  if (order.service_charge > 0) {
    receipt += `Service (10%):   ${formatPrice(order.service_charge)}\n`;
  }

  receipt += `================================
TOTAL:           ${formatPrice(order.total)}
================================

Payment: ${order.payment_method}
Status: ${order.status}

Thank you for dining with us!
Visit us again soon.

================================
`;

  return receipt;
}

// Generate kitchen ticket content
function generateKitchenTicket(order, categoryFilter) {
  const formatDateTime = (date) => moment(date).format('HH:mm');

  let ticket = `
========== KITCHEN ==========
Order: ${order.order_code}
Table: ${order.table_number || 'N/A'}
Time: ${formatDateTime(order.created_at)}
============================

`;

  // Filter items by category if specified
  let items = order.items;
  if (categoryFilter && categoryFilter.length > 0) {
    items = items.filter(item => 
      categoryFilter.includes(item.category_id)
    );
  }

  items.forEach(item => {
    ticket += `${item.quantity}x ${item.item_name}\n`;
    
    if (item.modifiers && item.modifiers.length > 0) {
      item.modifiers.forEach(mod => {
        ticket += `   + ${mod.modifier_name}\n`;
      });
    }
    
    if (item.notes) {
      ticket += `   ** ${item.notes} **\n`;
    }
    
    ticket += '\n';
  });

  ticket += `============================
${order.customer_name ? `Customer: ${order.customer_name}` : ''}
============================

`;

  return ticket;
}

// Print content to printer
async function printContent(printer, content) {
  if (!escpos) {
    // Simulation mode - just log the content
    console.log(`\n=== SIMULATED PRINT (${printer.name}) ===`);
    console.log(content);
    console.log('=== END SIMULATED PRINT ===\n');
    
    return {
      mode: 'simulation',
      content: content,
      timestamp: new Date().toISOString()
    };
  }

  try {
    let device;
    
    if (printer.type === 'USB') {
      // USB printer
      const devices = USB.findPrinter();
      if (devices.length === 0) {
        throw new Error('No USB printers found');
      }
      device = new USB(devices[0]);
    } else if (printer.type === 'NETWORK') {
      // Network printer
      const [host, port] = printer.connectionString.split(':');
      device = new Network(host, parseInt(port) || 9100);
    } else {
      throw new Error(`Unsupported printer type: ${printer.type}`);
    }

    const printerInstance = new escpos.Printer(device);
    
    await new Promise((resolve, reject) => {
      device.open((error) => {
        if (error) {
          reject(error);
          return;
        }

        printerInstance
          .font('a')
          .align('lt')
          .style('normal')
          .text(content)
          .cut()
          .close((err) => {
            if (err) reject(err);
            else resolve();
          });
      });
    });

    return {
      mode: 'hardware',
      printer: printer.name,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Print failed: ${error.message}`);
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🖨️  POSQ Printer Service running on port ${PORT}`);
  console.log(`📊 Mode: ${escpos ? 'Hardware' : 'Simulation'}`);
  
  if (!escpos) {
    console.log('💡 Install escpos and escpos-usb packages for hardware printing');
  }
});

module.exports = app;