import React from 'react';

const DefaultInvoice = ({ order, businessInfo }) => {
  console.log('🟢 Rendering DefaultInvoice with businessInfo:', businessInfo);
  
  // Check if order exists
  if (!order || !businessInfo) {
    return (
      <div className="p-8 bg-white" style={{ width: '210mm', minHeight: '297mm' }}>
        <p className="text-center text-gray-500 mt-20">Loading invoice data...</p>
      </div>
    );
  }
  
  // Calculate subtotal
  const subtotal = (order.total || 0) - (order.tax || 0) - (order.service_charge || 0);
  
  return (
    <div className="invoice-default bg-white" style={{ width: '210mm', minHeight: '297mm', fontFamily: 'Arial, sans-serif' }}>
      {/* Header Section */}
      <div className="flex justify-between items-start p-8 pb-6">
        {/* Business Info - Left */}
        <div className="flex items-start gap-4">
          {businessInfo.logoUrl && (
            <img 
              src={businessInfo.logoUrl} 
              alt={businessInfo.name}
              className="h-20 w-20 object-contain"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{businessInfo.name}</h1>
            {businessInfo.address && <p className="text-sm text-gray-600">{businessInfo.address}</p>}
            {businessInfo.phone && <p className="text-sm text-gray-600">{businessInfo.phone}</p>}
            {businessInfo.email && <p className="text-sm text-gray-600">{businessInfo.email}</p>}
          </div>
        </div>
        
        {/* Invoice Title - Right */}
        <div className="text-right">
          <h2 className="text-4xl font-bold text-gray-800 mb-2">INVOICE</h2>
          <div className="text-sm text-gray-600">
            <p className="font-semibold text-gray-800">#{order.order_code || 'N/A'}</p>
            <p>{order.created_at ? new Date(order.created_at).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }) : 'N/A'}</p>
            <p>{order.created_at ? new Date(order.created_at).toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit'
            }) : 'N/A'}</p>
          </div>
        </div>
      </div>

      <div className="px-8">
        <div className="border-t-2 border-gray-800"></div>
      </div>

      {/* Customer Information */}
      <div className="px-8 pt-6 pb-4">
        <div className="bg-gray-50 p-4 rounded">
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Bill To</h3>
          <p className="text-base font-semibold text-gray-900">{order.customer_name || 'Walk-in Customer'}</p>
          {order.table_number && (
            <p className="text-sm text-gray-600">Table: {order.table_number}</p>
          )}
          {order.pin && (
            <p className="text-sm text-gray-600">PIN: {order.pin}</p>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="px-8 pb-6">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-800">
              <th className="text-left py-3 text-sm font-semibold text-gray-700 uppercase">Description</th>
              <th className="text-center py-3 text-sm font-semibold text-gray-700 uppercase w-20">Qty</th>
              <th className="text-right py-3 text-sm font-semibold text-gray-700 uppercase w-28">Unit Price</th>
              <th className="text-right py-3 text-sm font-semibold text-gray-700 uppercase w-32">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items && order.items.length > 0 ? order.items.map((item, index) => {
              const itemTotal = (item.unit_price * item.quantity) + 
                (item.modifiers?.reduce((sum, mod) => sum + (mod.extra_price * item.quantity), 0) || 0);
              
              return (
                <tr key={index} className="border-b border-gray-200">
                  <td className="py-3">
                    <p className="font-medium text-gray-900">{item.menu_item_name || item.item_name}</p>
                    {item.modifiers?.map((mod, idx) => (
                      <p key={idx} className="text-xs text-gray-500 ml-2">
                        • {mod.name} (+{mod.extra_price} {businessInfo.currency})
                      </p>
                    ))}
                    {item.note && (
                      <p className="text-xs text-gray-500 italic mt-1">Note: {item.note}</p>
                    )}
                  </td>
                  <td className="text-center py-3 text-gray-700">{item.quantity}</td>
                  <td className="text-right py-3 text-gray-700">
                    {item.unit_price?.toFixed(2)} {businessInfo.currency}
                  </td>
                  <td className="text-right py-3 text-gray-900 font-medium">
                    {itemTotal.toFixed(2)} {businessInfo.currency}
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan="4" className="text-center py-4 text-gray-500">
                  No items found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totals Section */}
      <div className="px-8 pb-8">
        <div className="flex justify-end">
          <div className="w-80">
            {/* Subtotal */}
            <div className="flex justify-between py-2 text-gray-700">
              <span>Subtotal:</span>
              <span>{subtotal.toFixed(2)} {businessInfo.currency}</span>
            </div>
            
            {/* Tax */}
            {order.tax > 0 && (
              <div className="flex justify-between py-2 text-gray-700">
                <span>Tax {businessInfo.taxRate ? `(${businessInfo.taxRate}%)` : ''}:</span>
                <span>{order.tax.toFixed(2)} {businessInfo.currency}</span>
              </div>
            )}
            
            {/* Service Charge */}
            {order.service_charge > 0 && (
              <div className="flex justify-between py-2 text-gray-700">
                <span>Service Charge {businessInfo.serviceCharge ? `(${businessInfo.serviceCharge}%)` : ''}:</span>
                <span>{order.service_charge.toFixed(2)} {businessInfo.currency}</span>
              </div>
            )}
            
            {/* Total */}
            <div className="border-t-2 border-gray-800 mt-2 pt-3">
              <div className="flex justify-between text-xl font-bold text-gray-900">
                <span>TOTAL:</span>
                <span>{order.total?.toFixed(2)} {businessInfo.currency}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Status */}
      <div className="px-8 pb-6">
        <div className="bg-gray-50 p-4 rounded">
          {/* <div>
            <p className="text-sm text-gray-600">Payment Status</p>
            <p className="font-semibold text-gray-900 capitalize">{order.payment_status || 'Pending'}</p>
          </div> */}
        </div>
      </div>

      {/* Footer */}
      <div className="px-8 pt-8 pb-8 border-t border-gray-300">
        {/* {businessInfo.welcomeMessage && (
          <p className="text-center text-gray-600 text-sm mb-2">{businessInfo.welcomeMessage}</p>
        )} */}
        <p className="text-center text-gray-500 text-xs">
          We appreciate your patronage and look forward to serving you again.
        </p>
      </div>
    </div>
  );
};

export default DefaultInvoice;