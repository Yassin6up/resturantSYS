const escpos = require('escpos');
const escposUSB = require('escpos-usb');
const escposNetwork = require('escpos-network');

class PrinterManager {
  constructor(logger) {
    this.logger = logger;
    this.printers = new Map();
    this.initializeDefaultPrinters();
  }

  initializeDefaultPrinters() {
    // Add default kitchen printer (network)
    this.addPrinter('kitchen', 'Kitchen Printer', 'network', {
      address: process.env.DEFAULT_PRINTER_IP || '192.168.1.100',
      port: 9100
    });

    // Add default bar printer (network)
    this.addPrinter('bar', 'Bar Printer', 'network', {
      address: process.env.DEFAULT_PRINTER_IP || '192.168.1.101',
      port: 9100
    });
  }

  addPrinter(id, name, type, connection) {
    try {
      let device;
      
      switch (type) {
        case 'usb':
          device = new escposUSB();
          break;
        case 'network':
          device = new escposNetwork(connection.address, connection.port);
          break;
        default:
          throw new Error(`Unsupported printer type: ${type}`);
      }

      const printer = new escpos.Printer(device);
      
      this.printers.set(id, {
        id,
        name,
        type,
        connection,
        device,
        printer,
        status: 'connected'
      });

      this.logger.info(`Printer added: ${name} (${type})`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to add printer ${name}:`, error);
      return false;
    }
  }

  removePrinter(id) {
    try {
      const printer = this.printers.get(id);
      if (printer) {
        printer.device.close();
        this.printers.delete(id);
        this.logger.info(`Printer removed: ${id}`);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(`Failed to remove printer ${id}:`, error);
      return false;
    }
  }

  async print(printerId, content) {
    try {
      const printer = this.printers.get(printerId);
      if (!printer) {
        throw new Error(`Printer not found: ${printerId}`);
      }

      this.logger.info(`Printing to ${printer.name}...`);
      
      // Open device
      await printer.device.open();
      
      // Print content
      printer.printer.text(content);
      printer.printer.cut();
      
      // Close device
      printer.device.close();
      
      this.logger.info(`Successfully printed to ${printer.name}`);
      return true;
    } catch (error) {
      this.logger.error(`Print failed for ${printerId}:`, error);
      
      // Update printer status
      const printer = this.printers.get(printerId);
      if (printer) {
        printer.status = 'error';
      }
      
      return false;
    }
  }

  getPrinterStatus() {
    const status = [];
    for (const [id, printer] of this.printers) {
      status.push({
        id: printer.id,
        name: printer.name,
        type: printer.type,
        connection: printer.connection,
        status: printer.status
      });
    }
    return status;
  }

  async testPrinter(printerId) {
    try {
      const testContent = `
POSQ Printer Test
================
Date: ${new Date().toLocaleString()}
Printer: ${printerId}
Status: OK

This is a test print.
If you can read this, the printer is working correctly.

================
POSQ Restaurant POS
      `.trim();

      return await this.print(printerId, testContent);
    } catch (error) {
      this.logger.error(`Test print failed for ${printerId}:`, error);
      return false;
    }
  }
}

module.exports = PrinterManager;