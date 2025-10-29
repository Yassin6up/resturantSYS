import React from 'react';

const MinimalInvoice = ({ order, businessInfo }) => {
  // Check if order exists
  if (!order || !businessInfo) {
    return (
      <div className="p-8 bg-white" style={{ width: '210mm', minHeight: '297mm' }}>
        <p className="text-center text-gray-500 mt-20">Loading invoice data...</p>
      </div>
    );
  }

  const subtotal = (order.total || 0) - (order.tax || 0) - (order.service_charge || 0);

  return (
    <div className="invoice-minimal bg-white" style={{ width: '210mm', minHeight: '297mm', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div className="text-center pt-12 pb-8 px-8">
        {businessInfo.logoUrl && (
          <img 
            src={businessInfo.logoUrl} 
            alt={businessInfo.name}
            className="h-16 w-16 object-contain mx-auto mb-4"
          />
        )}
        <h1 className="text-3xl font-light tracking-wide text-gray-800 mb-2">{businessInfo.name}</h1>
        {businessInfo.address && <p className="text-xs text-gray-500">{businessInfo.address}</p>}
        <div className="flex justify-center gap-3 text-xs text-gray-500 mt-2">
          {businessInfo.phone && <span>{businessInfo.phone}</span>}
          {businessInfo.email && <span>• {businessInfo.email}</span>}
        </div>
      </div>

      {/* Divider */}
      <div className="px-8">
        <div className="border-t border-gray-300"></div>
      </div>

      {/* Invoice Info */}
      <div className="px-8 py-6">
        <div className="flex justify-between items-start text-sm">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Invoice</p>
            <p className="font-medium text-gray-800">#{order.order_code || 'N/A'}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Date</p>
            <p className="font-medium text-gray-800">
              {order.created_at ? new Date(order.created_at).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              }) : 'N/A'}
            </p>
          </div>
        </div>

        {/* Customer Info */}
        <div className="mt-6">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Billed To</p>
          <p className="font-medium text-gray-800">{order.customer_name || 'Walk-in Customer'}</p>
          {order.table_number && (
            <p className="text-sm text-gray-600 mt-1">Table {order.table_number}</p>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="px-8 py-6">
        <div className="border-t border-b border-gray-300 py-4">
          {order.items && order.items.length > 0 ? order.items.map((item, index) => {
            const itemTotal = ((item.unit_price || 0) * (item.quantity || 0)) + 
              (item.modifiers?.reduce((sum, mod) => sum + ((mod.extra_price || 0) * (item.quantity || 0)), 0) || 0);
            
            return (
              <div key={index} className="flex justify-between py-3 border-b border-gray-100 last:border-b-0">
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-gray-500 text-sm">{item.quantity}×</span>
                    <span className="text-gray-800 font-medium">{item.menu_item_name || item.item_name}</span>
                  </div>
                  {item.modifiers && item.modifiers.length > 0 && (
                    <div className="ml-6 mt-1">
                      {item.modifiers.map((mod, idx) => (
                        <p key={idx} className="text-xs text-gray-500">
                          + {mod.name} (+{mod.extra_price} {businessInfo.currency})
                        </p>
                      ))}
                    </div>
                  )}
                  {item.note && (
                    <p className="ml-6 mt-1 text-xs text-gray-500 italic">{item.note}</p>
                  )}
                  <p className="ml-6 mt-1 text-xs text-gray-400">
                    {(item.unit_price || 0).toFixed(2)} {businessInfo.currency} each
                  </p>
                </div>
                <div className="text-right ml-4">
                  <p className="font-medium text-gray-800">{itemTotal.toFixed(2)}</p>
                  <p className="text-xs text-gray-400">{businessInfo.currency}</p>
                </div>
              </div>
            );
          }) : (
            <p className="text-center py-4 text-gray-500 text-sm">No items found</p>
          )}
        </div>
      </div>

      {/* Totals */}
      <div className="px-8 pb-8">
        <div className="flex justify-end">
          <div className="w-72 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{subtotal.toFixed(2)} {businessInfo.currency}</span>
            </div>
            
            {(order.tax || 0) > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Tax {businessInfo.taxRate ? `(${businessInfo.taxRate}%)` : ''}</span>
                <span>{(order.tax || 0).toFixed(2)} {businessInfo.currency}</span>
              </div>
            )}
            
            {(order.service_charge || 0) > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Service {businessInfo.serviceCharge ? `(${businessInfo.serviceCharge}%)` : ''}</span>
                <span>{(order.service_charge || 0).toFixed(2)} {businessInfo.currency}</span>
              </div>
            )}
            
            <div className="border-t border-gray-300 pt-3 mt-3">
              <div className="flex justify-between text-lg font-medium text-gray-900">
                <span>Total</span>
                <span>{(order.total || 0).toFixed(2)} {businessInfo.currency}</span>
              </div>
            </div>

            {/* Payment Status */}
            <div className="pt-3 border-t border-gray-200 mt-3">
              {/* <div className="flex justify-between text-xs">
                <span className="text-gray-500">Payment Status</span>
                <span className="font-medium text-gray-700 capitalize">{order.payment_status || 'Pending'}</span>
              </div> */}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-8 pt-12 pb-12 text-center border-t border-gray-200 mt-8">
        {/* {businessInfo.welcomeMessage && (
          <p className="text-sm text-gray-600 mb-3">{businessInfo.welcomeMessage}</p>
        )} */}
        {businessInfo.logoUrl && (
          <img 
            src={businessInfo.logoUrl} 
            alt={businessInfo.name}
            className="h-10 w-10 object-contain mx-auto mb-3 opacity-40"
          />
        )}
        <p className="text-xs text-gray-400 tracking-wide">
          Your satisfaction is our priority
        </p>
      </div>
    </div>
  );
};

export default MinimalInvoice;