import React from 'react';

const MinimalBill = ({ order, businessInfo }) => {
  // Check if order exists
  if (!order || !businessInfo) {
    return (
      <div className="p-8 bg-white" style={{ width: '80mm', minHeight: 'auto' }}>
        <p className="text-center text-gray-500">Loading bill data...</p>
      </div>
    );
  }

  const subtotal = (order.total || 0) - (order.tax || 0) - (order.service_charge || 0);

  return (
    <div className="bill-minimal bg-white" style={{ 
      width: '80mm', 
      minHeight: 'auto', 
      fontFamily: 'monospace, sans-serif',
      fontSize: '12px',
      padding: '15px 10px'
    }}>
      {/* Header - Centered & Compact */}
      <div className="text-center border-b border-gray-300 pb-3 mb-3">
        {businessInfo.logoUrl && (
          <img 
            src={businessInfo.logoUrl} 
            alt={businessInfo.name}
            className="h-10 w-10 object-contain mx-auto mb-2"
          />
        )}
        <h1 className="text-base font-bold uppercase tracking-tight mb-1">{businessInfo.name}</h1>
        {businessInfo.address && (
          <p className="text-xs text-gray-600 leading-tight">{businessInfo.address}</p>
        )}
        <div className="flex justify-center gap-2 text-xs text-gray-500 mt-1">
          {businessInfo.phone && <span>{businessInfo.phone}</span>}
          {businessInfo.email && <span>• {businessInfo.email}</span>}
        </div>
      </div>

      {/* Order Information */}
      <div className="text-center border-b border-gray-300 pb-2 mb-3">
        <p className="font-bold text-sm uppercase tracking-wide">Restaurant Bill</p>
        <p className="text-xs text-gray-600 mt-1">
          #{order.order_code || 'N/A'} • {' '}
          {order.created_at ? new Date(order.created_at).toLocaleDateString('en-US', { 
            day: '2-digit', 
            month: '2-digit', 
            year: '2-digit' 
          }) : 'N/A'} {' '}
          {order.created_at ? new Date(order.created_at).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
          }) : 'N/A'}
        </p>
      </div>

      {/* Customer & Table Info */}
      <div className="border-b border-gray-300 pb-2 mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="font-semibold">Customer:</span>
          <span>{order.customer_name || 'Walk-in'}</span>
        </div>
        {order.table_number && (
          <div className="flex justify-between text-xs">
            <span className="font-semibold">Table:</span>
            <span>{order.table_number}</span>
          </div>
        )}
      </div>

      {/* Items Section */}
      <div className="border-b border-gray-300 pb-3 mb-3">
        <p className="text-center font-bold text-xs uppercase tracking-wide mb-2">Order Items</p>
        
        {order.items && order.items.length > 0 ? order.items.map((item, index) => {
          const itemTotal = ((item.unit_price || 0) * (item.quantity || 0)) + 
            (item.modifiers?.reduce((sum, mod) => sum + ((mod.extra_price || 0) * (item.quantity || 0)), 0) || 0);
          
          return (
            <div key={index} className="mb-2 pb-2 border-b border-dashed border-gray-200 last:border-b-0">
              {/* Item Header */}
              <div className="flex justify-between font-semibold text-sm">
                <span>{item.quantity} × {item.menu_item_name || item.item_name}</span>
                <span>{itemTotal.toFixed(2)}</span>
              </div>
              
              {/* Modifiers */}
              {item.modifiers && item.modifiers.length > 0 && (
                <div className="ml-4 mt-1">
                  {item.modifiers.map((mod, idx) => (
                    <p key={idx} className="text-xs text-gray-600">
                      + {mod.name} (+{(mod.extra_price || 0).toFixed(2)})
                    </p>
                  ))}
                </div>
              )}
              
              {/* Note */}
              {item.note && (
                <p className="ml-4 mt-1 text-xs text-gray-500 italic">
                  Note: {item.note}
                </p>
              )}
              
              {/* Price per item */}
              <p className="ml-4 mt-1 text-xs text-gray-400">
                @ {(item.unit_price || 0).toFixed(2)} each
              </p>
            </div>
          );
        }) : (
          <p className="text-center py-2 text-gray-500 text-xs">No items ordered</p>
        )}
      </div>

      {/* Totals Section */}
      <div className="border-b border-gray-300 pb-3 mb-3">
        <p className="text-center font-bold text-xs uppercase tracking-wide mb-2">Bill Summary</p>
        
        <div className="space-y-1 text-sm">
          {/* Subtotal */}
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{subtotal.toFixed(2)} {businessInfo.currency}</span>
          </div>
          
          {/* Tax */}
          {(order.tax || 0) > 0 && (
            <div className="flex justify-between">
              <span>Tax{businessInfo.taxRate ? ` (${businessInfo.taxRate}%)` : ''}:</span>
              <span>{(order.tax || 0).toFixed(2)} {businessInfo.currency}</span>
            </div>
          )}
          
          {/* Service Charge */}
          {(order.service_charge || 0) > 0 && (
            <div className="flex justify-between">
              <span>Service{businessInfo.serviceCharge ? ` (${businessInfo.serviceCharge}%)` : ''}:</span>
              <span>{(order.service_charge || 0).toFixed(2)} {businessInfo.currency}</span>
            </div>
          )}
          
          {/* Total */}
          <div className="flex justify-between font-bold border-t border-gray-300 mt-2 pt-2">
            <span>TOTAL:</span>
            <span>{(order.total || 0).toFixed(2)} {businessInfo.currency}</span>
          </div>
        </div>
      </div>

      {/* Payment Information */}
      <div className="border-b border-gray-300 pb-3 mb-3">
        <p className="text-center font-bold text-xs uppercase tracking-wide mb-2">Payment</p>
        <div className="flex justify-between text-sm">
          <span>Status:</span>
          <span className="capitalize">{order.payment_status || 'Pending'}</span>
        </div>
        {order.payment_method && (
          <div className="flex justify-between text-sm mt-1">
            <span>Method:</span>
            <span className="capitalize">{order.payment_method}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center">
        <p className="font-semibold text-xs uppercase tracking-wide mb-2">
          Thank You!
        </p>
        {businessInfo.welcomeMessage && (
          <p className="text-xs text-gray-600 mb-2 leading-tight">
            {businessInfo.welcomeMessage}
          </p>
        )}
        <p className="text-xs text-gray-500 mb-2">
          We appreciate your business
        </p>
        
        {/* Order Reference */}
        <div className="border-t border-gray-300 pt-2 mt-2">
          <p className="text-xs text-gray-400">
            Ref: {order.order_code || 'N/A'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {order.created_at ? new Date(order.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            }) : ''}
          </p>
        </div>
      </div>

      {/* Kitchen Copy Indicator */}
      {order.order_type === 'dine_in' && (
        <div className="text-center border-t border-dashed border-gray-400 mt-3 pt-2">
          <p className="text-xs font-bold uppercase">*** Kitchen Copy ***</p>
        </div>
      )}
    </div>
  );
};

export default MinimalBill;