import React from 'react';

const ModernThermalBill = ({ order, businessInfo }) => {
  console.log('🟢 Rendering ModernThermalBill with businessInfo:', businessInfo);
  
  // Check if order exists
  if (!order || !businessInfo) {
    return (
      <div className="p-8 bg-white" style={{ width: '80mm', minHeight: 'auto' }}>
        <p className="text-center text-gray-500">Loading bill data...</p>
      </div>
    );
  }
  
  // Calculate subtotal
  const subtotal = (order.total || 0) - (order.tax || 0) - (order.service_charge || 0);

  return (
    <div className="modern-thermal-bill bg-white" style={{ 
      width: '80mm', 
      minHeight: 'auto', 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '12px',
      padding: '12px',
      lineHeight: '1.3'
    }}>
      {/* Modern Header with Gradient Accent */}
      <div className="text-center border-b-2 border-gray-800 pb-3 mb-3">
        {businessInfo.logoUrl && (
          <div className="flex justify-center mb-2">
            <img 
              src={businessInfo.logoUrl} 
              alt={businessInfo.name}
              className="h-10 w-10 object-contain"
            />
          </div>
        )}
        <h1 className="text-base font-black uppercase tracking-wide text-gray-900">
          {businessInfo.name}
        </h1>
        <div className="space-y-0.5 mt-1">
          {businessInfo.address && (
            <p className="text-[10px] text-gray-600">{businessInfo.address}</p>
          )}
          {businessInfo.phone && (
            <p className="text-[10px] text-gray-600">📞 {businessInfo.phone}</p>
          )}
        </div>
      </div>

      {/* Order Header with Modern Badge */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-700 text-white px-3 py-2 rounded-lg mb-3 text-center">
        <div className="text-xs font-semibold uppercase tracking-wider">RESTAURANT BILL</div>
        <div className="flex justify-between items-center mt-1 text-[10px]">
          <span>#{order.order_code || 'N/A'}</span>
          <span>•</span>
          <span>
            {order.created_at ? new Date(order.created_at).toLocaleDateString('en-US', { 
              day: '2-digit', 
              month: 'short', 
              year: 'numeric' 
            }) : 'N/A'}
          </span>
          <span>•</span>
          <span>
            {order.created_at ? new Date(order.created_at).toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: false
            }) : 'N/A'}
          </span>
        </div>
      </div>

      {/* Customer Info Grid */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-[11px]">
        <div className="bg-gray-50 rounded-md p-2">
          <div className="font-semibold text-gray-700 text-[10px] uppercase tracking-wide">Customer</div>
          <div className="font-medium">{order.customer_name || 'Walk-in'}</div>
        </div>
        <div className="bg-gray-50 rounded-md p-2">
          <div className="font-semibold text-gray-700 text-[10px] uppercase tracking-wide">Table</div>
          <div className="font-medium">{order.table_number || 'N/A'}</div>
        </div>
      </div>

      {/* Items Section */}
      <div className="mb-3">
        <div className="text-center font-black text-xs uppercase tracking-wide mb-2 text-gray-800">
          🍽️ Order Items
        </div>
        
        {order.items && order.items.length > 0 ? order.items.map((item, index) => {
          const itemTotal = (item.unit_price * item.quantity) + 
            (item.modifiers?.reduce((sum, mod) => sum + (mod.extra_price * item.quantity), 0) || 0);
          
          return (
            <div key={index} className="mb-2 pb-2 border-b border-gray-200 last:border-b-0">
              {/* Item Main Row */}
              <div className="flex justify-between items-start mb-1">
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 flex items-center gap-1">
                    <span className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.5 rounded font-bold">
                      {item.quantity}x
                    </span>
                    {item.menu_item_name || item.item_name}
                  </div>
                  
                  {/* Modifiers */}
                  {item.modifiers?.map((mod, idx) => (
                    <div key={idx} className="text-[10px] text-green-700 ml-4 mt-0.5">
                      ➕ {mod.name} (+{mod.extra_price.toFixed(2)})
                    </div>
                  ))}
                  
                  {/* Note */}
                  {item.note && (
                    <div className="text-[10px] italic text-gray-600 ml-4 mt-0.5">
                      📝 {item.note}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900">{itemTotal.toFixed(2)}</div>
                  <div className="text-[10px] text-gray-500">
                    {item.unit_price?.toFixed(2)} × {item.quantity}
                  </div>
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="text-center text-gray-500 text-xs py-4">
            No items ordered
          </div>
        )}
      </div>

      {/* Totals Section */}
      <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg p-3 mb-3 border border-gray-200">
        <div className="text-center font-black text-xs uppercase tracking-wide mb-2 text-gray-800">
          💰 Bill Summary
        </div>
        
        <div className="space-y-1.5">
          {/* Subtotal */}
          <div className="flex justify-between text-[11px]">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-semibold">{subtotal.toFixed(2)} {businessInfo.currency}</span>
          </div>
          
          {/* Tax */}
          {order.tax > 0 && (
            <div className="flex justify-between text-[11px]">
              <span className="text-gray-600">Tax{businessInfo.taxRate ? ` (${businessInfo.taxRate}%)` : ''}</span>
              <span className="font-semibold">{order.tax.toFixed(2)} {businessInfo.currency}</span>
            </div>
          )}
          
          {/* Service Charge */}
          {order.service_charge > 0 && (
            <div className="flex justify-between text-[11px]">
              <span className="text-gray-600">Service{businessInfo.serviceCharge ? ` (${businessInfo.serviceCharge}%)` : ''}</span>
              <span className="font-semibold">{order.service_charge.toFixed(2)} {businessInfo.currency}</span>
            </div>
          )}
          
          {/* Total */}
          <div className="flex justify-between font-black text-sm border-t border-gray-300 mt-2 pt-2">
            <span className="text-gray-900">TOTAL</span>
            <span className="text-blue-700">{order.total?.toFixed(2)} {businessInfo.currency}</span>
          </div>
        </div>
      </div>

      {/* Payment Status */}
      <div className="flex justify-between items-center bg-gray-100 rounded-md px-3 py-2 mb-3">
        <span className="text-[11px] font-semibold text-gray-700">Payment Status:</span>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full capitalize ${
          order.payment_status === 'paid' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-orange-100 text-orange-800'
        }`}>
          {order.payment_status || 'Pending'}
        </span>
      </div>

      {/* Footer */}
      <div className="text-center border-t border-gray-300 pt-3">
        <div className="text-xs font-black text-gray-900 mb-1">
          THANK YOU! 🎉
        </div>
        <p className="text-[10px] text-gray-600 mb-2 leading-tight">
          {businessInfo.welcomeMessage || 'We appreciate your business and hope to see you again soon!'}
        </p>
        
        {/* Order Reference */}
        <div className="bg-gray-100 rounded-md p-2 mt-2">
          <div className="text-[10px] font-semibold text-gray-700">Order Reference</div>
          <div className="text-[9px] text-gray-500 font-mono">#{order.order_code || 'N/A'}</div>
          <div className="text-[9px] text-gray-400 mt-0.5">
            Printed: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </div>
        </div>

        {/* Support Info */}
        <div className="mt-2 text-[9px] text-gray-500">
          For assistance: {businessInfo.phone || businessInfo.email || 'Contact restaurant'}
        </div>
      </div>

      {/* Kitchen Copy Notice */}
      {order.order_type === 'dine_in' && (
        <div className="mt-3 pt-2 border-t-2 border-dashed border-gray-400 text-center">
          <p className="text-[10px] font-black uppercase text-gray-700 tracking-wide">
            ⭐ KITCHEN COPY ⭐
          </p>
        </div>
      )}
    </div>
  );
};

export default ModernThermalBill;