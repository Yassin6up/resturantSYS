class ReceiptGenerator {
  generateOrderReceipt(orderData) {
    const {
      order_code,
      table_number,
      customer_name,
      items,
      total,
      tax,
      service_charge,
      created_at,
      branch_name = 'POSQ Restaurant'
    } = orderData;

    const receipt = [];
    
    // Header
    receipt.push(this.centerText(branch_name));
    receipt.push(this.centerText('='.repeat(32)));
    receipt.push('');
    
    // Order info
    receipt.push(`Order: ${order_code}`);
    receipt.push(`Table: ${table_number}`);
    if (customer_name) {
      receipt.push(`Customer: ${customer_name}`);
    }
    receipt.push(`Date: ${new Date(created_at).toLocaleString()}`);
    receipt.push('');
    
    // Items
    receipt.push('ITEMS:');
    receipt.push('-'.repeat(32));
    
    items.forEach(item => {
      const lineTotal = item.quantity * item.unit_price;
      receipt.push(`${item.item_name}`);
      receipt.push(`  ${item.quantity}x ${item.unit_price.toFixed(2)} MAD`);
      
      if (item.note) {
        receipt.push(`  Note: ${item.note}`);
      }
      
      if (item.modifiers && item.modifiers.length > 0) {
        item.modifiers.forEach(modifier => {
          receipt.push(`  + ${modifier.name} (+${modifier.extra_price.toFixed(2)} MAD)`);
        });
      }
      
      receipt.push(`  Subtotal: ${lineTotal.toFixed(2)} MAD`);
      receipt.push('');
    });
    
    // Totals
    receipt.push('-'.repeat(32));
    const subtotal = total - tax - service_charge;
    receipt.push(`Subtotal: ${subtotal.toFixed(2)} MAD`);
    
    if (tax > 0) {
      receipt.push(`Tax: ${tax.toFixed(2)} MAD`);
    }
    
    if (service_charge > 0) {
      receipt.push(`Service Charge: ${service_charge.toFixed(2)} MAD`);
    }
    
    receipt.push('='.repeat(32));
    receipt.push(`TOTAL: ${total.toFixed(2)} MAD`);
    receipt.push('');
    
    // Footer
    receipt.push(this.centerText('Thank you for your order!'));
    receipt.push(this.centerText('Please pay at the cashier'));
    receipt.push('');
    receipt.push(this.centerText('='.repeat(32)));
    
    return receipt.join('\n');
  }

  generateTestReceipt() {
    const receipt = [];
    
    receipt.push(this.centerText('POSQ Printer Test'));
    receipt.push(this.centerText('='.repeat(32)));
    receipt.push('');
    receipt.push(`Date: ${new Date().toLocaleString()}`);
    receipt.push(`Time: ${new Date().toLocaleTimeString()}`);
    receipt.push('');
    receipt.push('This is a test print to verify');
    receipt.push('that the printer is working');
    receipt.push('correctly.');
    receipt.push('');
    receipt.push('If you can read this text clearly,');
    receipt.push('the printer is functioning properly.');
    receipt.push('');
    receipt.push(this.centerText('='.repeat(32)));
    receipt.push(this.centerText('Test Complete'));
    receipt.push('');
    
    return receipt.join('\n');
  }

  generateKitchenReceipt(orderData) {
    const {
      order_code,
      table_number,
      items,
      created_at,
      branch_name = 'POSQ Kitchen'
    } = orderData;

    const receipt = [];
    
    // Header
    receipt.push(this.centerText(branch_name));
    receipt.push(this.centerText('KITCHEN ORDER'));
    receipt.push(this.centerText('='.repeat(32)));
    receipt.push('');
    
    // Order info
    receipt.push(`Order: ${order_code}`);
    receipt.push(`Table: ${table_number}`);
    receipt.push(`Time: ${new Date(created_at).toLocaleString()}`);
    receipt.push('');
    
    // Items
    receipt.push('ITEMS TO PREPARE:');
    receipt.push('-'.repeat(32));
    
    items.forEach(item => {
      receipt.push(`${item.quantity}x ${item.item_name}`);
      
      if (item.note) {
        receipt.push(`  Note: ${item.note}`);
      }
      
      if (item.modifiers && item.modifiers.length > 0) {
        receipt.push(`  Modifiers:`);
        item.modifiers.forEach(modifier => {
          receipt.push(`    - ${modifier.name}`);
        });
      }
      
      receipt.push('');
    });
    
    // Footer
    receipt.push('-'.repeat(32));
    receipt.push(this.centerText('PREPARE ORDER'));
    receipt.push('');
    
    return receipt.join('\n');
  }

  generateBarReceipt(orderData) {
    const {
      order_code,
      table_number,
      items,
      created_at,
      branch_name = 'POSQ Bar'
    } = orderData;

    // Filter items for bar (beverages)
    const barItems = items.filter(item => 
      item.item_name.toLowerCase().includes('juice') ||
      item.item_name.toLowerCase().includes('coffee') ||
      item.item_name.toLowerCase().includes('tea') ||
      item.item_name.toLowerCase().includes('drink') ||
      item.item_name.toLowerCase().includes('beverage')
    );

    if (barItems.length === 0) {
      return null; // No bar items to print
    }

    const receipt = [];
    
    // Header
    receipt.push(this.centerText(branch_name));
    receipt.push(this.centerText('BAR ORDER'));
    receipt.push(this.centerText('='.repeat(32)));
    receipt.push('');
    
    // Order info
    receipt.push(`Order: ${order_code}`);
    receipt.push(`Table: ${table_number}`);
    receipt.push(`Time: ${new Date(created_at).toLocaleString()}`);
    receipt.push('');
    
    // Items
    receipt.push('BEVERAGES TO PREPARE:');
    receipt.push('-'.repeat(32));
    
    barItems.forEach(item => {
      receipt.push(`${item.quantity}x ${item.item_name}`);
      
      if (item.note) {
        receipt.push(`  Note: ${item.note}`);
      }
      
      if (item.modifiers && item.modifiers.length > 0) {
        receipt.push(`  Modifiers:`);
        item.modifiers.forEach(modifier => {
          receipt.push(`    - ${modifier.name}`);
        });
      }
      
      receipt.push('');
    });
    
    // Footer
    receipt.push('-'.repeat(32));
    receipt.push(this.centerText('PREPARE BEVERAGES'));
    receipt.push('');
    
    return receipt.join('\n');
  }

  centerText(text, width = 32) {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + text;
  }

  formatCurrency(amount, currency = 'MAD') {
    return `${amount.toFixed(2)} ${currency}`;
  }

  formatTime(date) {
    return new Date(date).toLocaleTimeString();
  }

  formatDate(date) {
    return new Date(date).toLocaleDateString();
  }
}

module.exports = ReceiptGenerator;