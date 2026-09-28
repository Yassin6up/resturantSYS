import React from 'react';

const DefaultBill = ({ order, businessInfo }) => {
  console.log('🟢 Rendering DefaultBill with businessInfo:', businessInfo);
  
  // Check if order exists
  if (!order || !businessInfo) {
    return (
      <div className="p-8 bg-white" style={{ width: '210mm', minHeight: '297mm' }}>
        <p className="text-center text-gray-500 mt-20">Loading bill data...</p>
      </div>
    );
  }
  
  // Calculate subtotal
  const subtotal = (order.total || 0) - (order.tax || 0) - (order.service_charge || 0);

  return (
    <div className="bill-default bg-white" style={{ width: '80mm', minHeight: 'auto', fontFamily: 'monospace', fontSize: '12px', padding: '10px' }}>
      {/* Restaurant Header */}
      <div className="text-center border-b border-gray-300 pb-2 mb-2">
        {businessInfo.logoUrl && (
          <img 
            src={businessInfo.logoUrl} 
            alt={businessInfo.name}
            className="h-12 w-12 object-contain mx-auto mb-1"
          />
        )}
        <h1 className="text-lg font-bold uppercase tracking-tight">{businessInfo.name}</h1>
        {businessInfo.address && (
          <p className="text-xs">{businessInfo.address}</p>
        )}
        {businessInfo.phone && (
          <p className="text-xs">Tel: {businessInfo.phone}</p>
        )}
        {businessInfo.email && (
          <p className="text-xs">{businessInfo.email}</p>
        )}
      </div>

      {/* Order Information */}
      <div className="text-center border-b border-gray-300 pb-2 mb-2">
        <p className="font-bold">RESTAURANT BILL</p>
        <p className="text-sm">Order: #{order.order_code || 'N/A'}</p>
        <p className="text-xs">
          {order.created_at ? new Date(order.created_at).toLocaleDateString('en-US', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
          }) : 'N/A'} • {' '}
          {order.created_at ? new Date(order.created_at).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false
          }) : 'N/A'}
        </p>
      </div>

      {/* Customer & Table Info */}
      <div className="border-b border-gray-300 pb-2 mb-2">
        <div className="flex justify-between text-xs">
          <span className="font-semibold">Customer:</span>
          <span>{order.customer_name || 'Walk-in'}</span>
        </div>
        {order.table_number && (
          <div className="flex justify-between text-xs">
            <span className="font-semibold">Table:</span>
            <span>{order.table_number}</span>
          </div>
        )}
        {order.pin && (
          <div className="flex justify-between text-xs">
            <span className="font-semibold">PIN:</span>
            <span>{order.pin}</span>
          </div>
        )}
      </div>

      {/* Items List */}
      <div className="border-b border-gray-300 pb-2 mb-2">
        <div className="text-center font-bold text-sm mb-1">ORDER ITEMS</div>
        
        {order.items && order.items.length > 0 ? order.items.map((item, index) => {
          const itemTotal = (item.unit_price * item.quantity) + 
            (item.modifiers?.reduce((sum, mod) => sum + (mod.extra_price * item.quantity), 0) || 0);
          
          return (
            <div key={index} className="mb-2 pb-1 border-b border-dashed border-gray-200 last:border-b-0">
              {/* Item Header */}
              <div className="flex justify-between font-semibold">
                <span>{item.quantity} x {item.menu_item_name || item.item_name}</span>
                <span>{itemTotal.toFixed(2)}</span>
              </div>
              
              {/* Modifiers */}
              {item.modifiers?.map((mod, idx) => (
                <div key={idx} className="text-xs pl-2">
                  + {mod.name} (+{mod.extra_price.toFixed(2)})
                </div>
              ))}
              
              {/* Note */}
              {item.note && (
                <div className="text-xs italic pl-2 text-gray-600">Note: {item.note}</div>
              )}
              
              {/* Price Breakdown */}
              <div className="text-xs pl-2 text-gray-500">
                {item.unit_price?.toFixed(2)} x {item.quantity} = {(item.unit_price * item.quantity).toFixed(2)}
              </div>
            </div>
          );
        }) : (
          <div className="text-center text-gray-500 text-xs">
            No items ordered
          </div>
        )}
      </div>

      {/* Totals Section */}
      <div className="border-b border-gray-300 pb-2 mb-2">
        <div className="text-center font-bold text-sm mb-1">BILL SUMMARY</div>
        
        {/* Subtotal */}
        <div className="flex justify-between text-sm">
          <span>Subtotal:</span>
          <span>{subtotal.toFixed(2)} {businessInfo.currency}</span>
        </div>
        
        {/* Tax */}
        {order.tax > 0 && (
          <div className="flex justify-between text-sm">
            <span>Tax{businessInfo.taxRate ? ` (${businessInfo.taxRate}%)` : ''}:</span>
            <span>{order.tax.toFixed(2)} {businessInfo.currency}</span>
          </div>
        )}
        
        {/* Service Charge */}
        {order.service_charge > 0 && (
          <div className="flex justify-between text-sm">
            <span>Service{businessInfo.serviceCharge ? ` (${businessInfo.serviceCharge}%)` : ''}:</span>
            <span>{order.service_charge.toFixed(2)} {businessInfo.currency}</span>
          </div>
        )}
        
        {/* Total */}
        <div className="flex justify-between font-bold text-sm border-t border-gray-300 mt-1 pt-1">
          <span>TOTAL:</span>
          <span>{order.total?.toFixed(2)} {businessInfo.currency}</span>
        </div>
      </div>

      {/* Payment Information */}
      <div className="border-b border-gray-300 pb-2 mb-2">
        <div className="text-center font-bold text-sm mb-1">PAYMENT</div>
        <div className="flex justify-between text-sm">
          <span>Status:</span>
          <span className="capitalize">{order.payment_status || 'Pending'}</span>
        </div>
        {order.payment_method && (
          <div className="flex justify-between text-sm">
            <span>Method:</span>
            <span className="capitalize">{order.payment_method}</span>
          </div>
        )}
      </div>

      {/* Footer Messages */}
      <div className="text-center">
        <p className="text-xs font-semibold mb-1">THANK YOU FOR DINING WITH US!</p>
        <p className="text-xs text-gray-600 mb-1">
          {businessInfo.welcomeMessage || 'We appreciate your business'}
        </p>
        <p className="text-xs text-gray-500">
          For feedback: {businessInfo.phone || 'Contact restaurant'}
        </p>
        
        {/* Barcode/QR Code Area */}
        <div className="mt-2 pt-2 border-t border-gray-300">
          <div className="text-xs text-gray-500 text-center">
            Order Ref: {order.order_code || 'N/A'}
          </div>
          <div className="text-xs text-gray-400 text-center mt-1">
            {order.created_at ? new Date(order.created_at).toLocaleDateString('en-US') : ''}
          </div>
        </div>
      </div>

      {/* Kitchen Copy Notice (if needed) */}
      {order.order_type === 'dine_in' && (
        <div className="mt-3 pt-2 border-t border-dashed border-gray-400 text-center">
          <p className="text-xs font-bold uppercase">*** KITCHEN COPY ***</p>
        </div>
      )}
    </div>
  );
};

export default DefaultBill;