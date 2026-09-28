import React from 'react';
import DefaultBill from './templates/DefaultInvoice.jsx';

const InvoiceRenderer = ({ 
  order, 
  onClose,
  businessInfo 
}) => {

  const handlePrint = () => {
    if (!order || !businessInfo) {
      alert('No order data available');
      return;
    }

    // Create a new window
    const printWindow = window.open('', '_blank', 'width=400,height=700,left=100,top=100');
    if (!printWindow) {
      alert('Please allow popups for printing');
      return;
    }

    // Get the bill HTML by temporarily rendering it
    const tempDiv = document.createElement('div');
    document.body.appendChild(tempDiv);
    
    // Create a simple render of the bill component
    const billHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bill - ${order.order_code}</title>
          <meta charset="utf-8">
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              @page {
                margin: 0;
                size: 80mm auto;
              }
              body {
                margin: 0;
                padding: 0;
                width: 80mm;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .no-print {
                display: none !important;
              }
            }
            body {
              font-family: system-ui, -apple-system, sans-serif;
              margin: 0;
              padding: 20px;
              background: #f3f4f6;
              display: flex;
              justify-content: center;
              align-items: flex-start;
              min-height: 100vh;
            }
            .bill-container {
              background: white;
              width: 80mm;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            }
            .print-controls {
              position: fixed;
              top: 20px;
              right: 20px;
              background: white;
              padding: 10px;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
              z-index: 10000;
            }
            .print-btn {
              padding: 8px 16px;
              background: #2563eb;
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              margin-right: 8px;
            }
            .close-btn {
              padding: 8px 16px;
              background: #6b7280;
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
            }
          </style>
        </head>
        <body>
          <div class="bill-container">
            <div class="bill-default bg-white" style="width: 80mm; min-height: auto; font-family: monospace; font-size: 12px; padding: 10px;">
              <!-- Restaurant Header -->
              <div class="text-center border-b border-gray-300 pb-2 mb-2">
                ${businessInfo.logoUrl ? `
                  <img 
                    src="${businessInfo.logoUrl}" 
                    alt="${businessInfo.name}"
                    style="height: 48px; width: 48px; object-fit: contain; margin: 0 auto 4px;"
                  />
                ` : ''}
                <h1 style="font-size: 18px; font-weight: bold; text-transform: uppercase; letter-spacing: -0.025em;">${businessInfo.name}</h1>
                ${businessInfo.address ? `
                  <p style="font-size: 11px;">${businessInfo.address}</p>
                ` : ''}
                ${businessInfo.phone ? `
                  <p style="font-size: 11px;">Tel: ${businessInfo.phone}</p>
                ` : ''}
                ${businessInfo.email ? `
                  <p style="font-size: 11px;">${businessInfo.email}</p>
                ` : ''}
              </div>

              <!-- Order Information -->
              <div class="text-center border-b border-gray-300 pb-2 mb-2">
                <p style="font-weight: bold;">RESTAURANT BILL</p>
                <p style="font-size: 14px;">Order: #${order.order_code || 'N/A'}</p>
                <p style="font-size: 11px;">
                  ${order.created_at ? new Date(order.created_at).toLocaleDateString('en-US', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric' 
                  }) : 'N/A'} • ${order.created_at ? new Date(order.created_at).toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: false
                  }) : 'N/A'}
                </p>
              </div>

              <!-- Customer & Table Info -->
              <div class="border-b border-gray-300 pb-2 mb-2">
                <div style="display: flex; justify-content: space-between; font-size: 11px;">
                  <span style="font-weight: 600;">Customer:</span>
                  <span>${order.customer_name || 'Walk-in'}</span>
                </div>
                ${order.table_number ? `
                  <div style="display: flex; justify-content: space-between; font-size: 11px;">
                    <span style="font-weight: 600;">Table:</span>
                    <span>${order.table_number}</span>
                  </div>
                ` : ''}
                ${order.pin ? `
                  <div style="display: flex; justify-content: space-between; font-size: 11px;">
                    <span style="font-weight: 600;">PIN:</span>
                    <span>${order.pin}</span>
                  </div>
                ` : ''}
              </div>

              <!-- Items List -->
              <div class="border-b border-gray-300 pb-2 mb-2">
                <div class="text-center font-bold text-sm mb-1">ORDER ITEMS</div>
                
                ${order.items && order.items.length > 0 ? order.items.map((item, index) => {
                  const itemTotal = (item.unit_price * item.quantity) + 
                    (item.modifiers?.reduce((sum, mod) => sum + (mod.extra_price * item.quantity), 0) || 0);
                  
                  return `
                    <div style="margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px dashed #e5e7eb; last:border-bottom: 0;">
                      <!-- Item Header -->
                      <div style="display: flex; justify-content: space-between; font-weight: 600;">
                        <span>${item.quantity} x ${item.menu_item_name || item.item_name}</span>
                        <span>${itemTotal.toFixed(2)}</span>
                      </div>
                      
                      <!-- Modifiers -->
                      ${item.modifiers?.map((mod, idx) => `
                        <div style="font-size: 11px; padding-left: 8px;">
                          + ${mod.name} (+${mod.extra_price.toFixed(2)})
                        </div>
                      `).join('')}
                      
                      <!-- Note -->
                      ${item.note ? `
                        <div style="font-size: 11px; font-style: italic; padding-left: 8px; color: #6b7280;">Note: ${item.note}</div>
                      ` : ''}
                      
                      <!-- Price Breakdown -->
                      <div style="font-size: 11px; padding-left: 8px; color: #6b7280;">
                        ${item.unit_price?.toFixed(2)} x ${item.quantity} = ${(item.unit_price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  `;
                }).join('') : `
                  <div class="text-center text-gray-500 text-xs">
                    No items ordered
                  </div>
                `}
              </div>

              <!-- Totals Section -->
              <div class="border-b border-gray-300 pb-2 mb-2">
                <div class="text-center font-bold text-sm mb-1">BILL SUMMARY</div>
                
                <!-- Subtotal -->
                <div style="display: flex; justify-content: space-between; font-size: 14px;">
                  <span>Subtotal:</span>
                  <span>${(order.total - (order.tax || 0) - (order.service_charge || 0)).toFixed(2)} ${businessInfo.currency}</span>
                </div>
                
                <!-- Tax -->
                ${order.tax > 0 ? `
                  <div style="display: flex; justify-content: space-between; font-size: 14px;">
                    <span>Tax${businessInfo.taxRate ? ` (${businessInfo.taxRate}%)` : ''}:</span>
                    <span>${order.tax.toFixed(2)} ${businessInfo.currency}</span>
                  </div>
                ` : ''}
                
                <!-- Service Charge -->
                ${order.service_charge > 0 ? `
                  <div style="display: flex; justify-content: space-between; font-size: 14px;">
                    <span>Service${businessInfo.serviceCharge ? ` (${businessInfo.serviceCharge}%)` : ''}:</span>
                    <span>${order.service_charge.toFixed(2)} ${businessInfo.currency}</span>
                  </div>
                ` : ''}
                
                <!-- Total -->
                <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; border-top: 1px solid #d1d5db; margin-top: 4px; padding-top: 4px;">
                  <span>TOTAL:</span>
                  <span>${order.total?.toFixed(2)} ${businessInfo.currency}</span>
                </div>
              </div>

              <!-- Payment Information -->
              <div class="border-b border-gray-300 pb-2 mb-2">
                <div class="text-center font-bold text-sm mb-1">PAYMENT</div>
                <div style="display: flex; justify-content: space-between; font-size: 14px;">
                  <span>Status:</span>
                  <span style="text-transform: capitalize;">${order.payment_status || 'Pending'}</span>
                </div>
                ${order.payment_method ? `
                  <div style="display: flex; justify-content: space-between; font-size: 14px;">
                    <span>Method:</span>
                    <span style="text-transform: capitalize;">${order.payment_method}</span>
                  </div>
                ` : ''}
              </div>

              <!-- Footer Messages -->
              <div class="text-center">
                <p style="font-size: 11px; font-weight: 600; margin-bottom: 4px;">THANK YOU FOR DINING WITH US!</p>
                <p style="font-size: 11px; color: #6b7280; margin-bottom: 4px;">
                  ${businessInfo.welcomeMessage || 'We appreciate your business'}
                </p>
                <p style="font-size: 11px; color: #6b7280;">
                  For feedback: ${businessInfo.phone || 'Contact restaurant'}
                </p>
                
                <!-- Barcode/QR Code Area -->
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #d1d5db;">
                  <div style="font-size: 11px; color: #6b7280; text-align: center;">
                    Order Ref: ${order.order_code || 'N/A'}
                  </div>
                  <div style="font-size: 11px; color: #9ca3af; text-align: center; margin-top: 4px;">
                    ${order.created_at ? new Date(order.created_at).toLocaleDateString('en-US') : ''}
                  </div>
                </div>
              </div>

              <!-- Kitchen Copy Notice -->
              ${order.order_type === 'dine_in' ? `
                <div style="margin-top: 12px; padding-top: 8px; border-top: 1px dashed #9ca3af; text-align: center;">
                  <p style="font-size: 11px; font-weight: bold; text-transform: uppercase;">*** KITCHEN COPY ***</p>
                </div>
              ` : ''}
            </div>
          </div>
          <div class="print-controls no-print">
            <button class="print-btn" onclick="window.print()">🖨️ Print Bill</button>
            <button class="close-btn" onclick="window.close()">❌ Close</button>
          </div>
          <script>
            // Auto print after a short delay
            setTimeout(() => {
              window.print();
            }, 1000);
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(billHTML);
    printWindow.document.close();
    printWindow.focus();

    // Clean up
    document.body.removeChild(tempDiv);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold">Print Bill</h2>
            <p className="text-gray-600 text-sm">Order #{order?.order_code}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="bg-blue-600 text-white flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-blue-700 transition-colors text-sm"
            >
              <PrinterIcon className="h-4 w-4" />
              Print Bill
            </button>
            <button
              onClick={onClose}
              className="border border-gray-300 text-gray-700 flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors text-sm"
            >
              Close
            </button>
          </div>
        </div>

        {/* Bill Preview */}
        <div className="flex-1 overflow-auto p-4 bg-gray-100 flex justify-center">
          <div className="bg-white shadow-lg scale-90 origin-top">
            <DefaultBill 
              order={order} 
              businessInfo={businessInfo}
            />
          </div>
        </div>

        {/* Instructions */}
        <div className="p-3 bg-blue-50 border-t border-blue-200">
          <p className="text-xs text-blue-700 text-center">
            💡 Click "Print Bill" to open print dialog in a new window
          </p>
        </div>
      </div>
    </div>
  );
};

// Printer Icon Component
const PrinterIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
  </svg>
);

export default InvoiceRenderer;