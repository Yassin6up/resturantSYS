import React from 'react';

const ModernInvoice = ({ order, businessInfo }) => {
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
    <div className="invoice-modern bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8" style={{ width: '210mm', minHeight: '297mm' }}>
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden h-full">
        {/* Header with gradient accent */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              {businessInfo.logoUrl && (
                <div className="bg-white rounded-xl p-2">
                  <img 
                    src={businessInfo.logoUrl} 
                    alt={businessInfo.name}
                    className="h-14 w-14 object-contain"
                  />
                </div>
              )}
              <div>
                <h1 className="text-3xl font-bold mb-1">{businessInfo.name}</h1>
                {businessInfo.address && <p className="text-blue-100 text-sm">{businessInfo.address}</p>}
              </div>
            </div>
            <div className="text-right">
              <p className="text-blue-100 text-sm uppercase tracking-wider mb-1">Invoice</p>
              <p className="text-2xl font-bold">#{order.order_code || 'N/A'}</p>
              <p className="text-blue-100 text-sm mt-2">
                {order.created_at ? new Date(order.created_at).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                }) : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Business Contact Info Bar */}
        <div className="bg-gray-50 px-8 py-3 flex justify-center gap-6 text-sm text-gray-600 border-b border-gray-200">
          {businessInfo.phone && (
            <div className="flex items-center gap-2">
              <span className="text-blue-600">📞</span>
              <span>{businessInfo.phone}</span>
            </div>
          )}
          {businessInfo.email && (
            <div className="flex items-center gap-2">
              <span className="text-blue-600">✉️</span>
              <span>{businessInfo.email}</span>
            </div>
          )}
        </div>

        <div className="p-8">
          {/* Bill To Section */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">Bill To</p>
              <p className="text-lg font-bold text-gray-900">{order.customer_name || 'Walk-in Customer'}</p>
              {order.table_number && (
                <p className="text-sm text-gray-600 mt-2">Table {order.table_number}</p>
              )}
              {order.pin && (
                <p className="text-sm text-gray-600">PIN: {order.pin}</p>
              )}
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5">
              <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-3">Invoice Date</p>
              <p className="text-lg font-bold text-gray-900">
                {order.created_at ? new Date(order.created_at).toLocaleDateString('en-US', { 
                  weekday: 'long',
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }) : 'N/A'}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                {order.created_at ? new Date(order.created_at).toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit'
                }) : 'N/A'}
              </p>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-8">
            <div className="bg-gray-50 rounded-xl overflow-hidden">
              <div className="bg-gradient-to-r from-gray-800 to-gray-700 text-white px-6 py-3 grid grid-cols-12 gap-4 text-sm font-semibold">
                <div className="col-span-6">ITEM DESCRIPTION</div>
                <div className="col-span-2 text-center">QTY</div>
                <div className="col-span-2 text-right">UNIT PRICE</div>
                <div className="col-span-2 text-right">AMOUNT</div>
              </div>
              
              <div className="divide-y divide-gray-200">
                {order.items && order.items.length > 0 ? order.items.map((item, index) => {
                  const itemTotal = ((item.unit_price || 0) * (item.quantity || 0)) + 
                    (item.modifiers?.reduce((sum, mod) => sum + ((mod.extra_price || 0) * (item.quantity || 0)), 0) || 0);
                  
                  return (
                    <div key={index} className="px-6 py-4 grid grid-cols-12 gap-4 items-center hover:bg-blue-50 transition-colors">
                      <div className="col-span-6">
                        <p className="font-semibold text-gray-900">{item.menu_item_name || item.item_name}</p>
                        {item.modifiers && item.modifiers.length > 0 && (
                          <div className="mt-1 space-y-1">
                            {item.modifiers.map((mod, idx) => (
                              <p key={idx} className="text-xs text-gray-500 ml-2">
                                + {mod.name} (+{mod.extra_price} {businessInfo.currency})
                              </p>
                            ))}
                          </div>
                        )}
                        {item.note && (
                          <p className="text-xs text-gray-500 italic mt-1">{item.note}</p>
                        )}
                      </div>
                      <div className="col-span-2 text-center">
                        <span className="inline-flex items-center justify-center bg-blue-100 text-blue-800 font-semibold rounded-lg px-3 py-1">
                          {item.quantity}
                        </span>
                      </div>
                      <div className="col-span-2 text-right text-gray-700">
                        {(item.unit_price || 0).toFixed(2)} {businessInfo.currency}
                      </div>
                      <div className="col-span-2 text-right font-bold text-gray-900">
                        {itemTotal.toFixed(2)} {businessInfo.currency}
                      </div>
                    </div>
                  );
                }) : (
                  <div className="px-6 py-8 text-center text-gray-500">
                    No items found
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Totals Section */}
          <div className="flex justify-end mb-8">
            <div className="w-96">
              <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-6 space-y-3">
                <div className="flex justify-between text-gray-700">
                  <span className="font-medium">Subtotal</span>
                  <span className="font-semibold">{subtotal.toFixed(2)} {businessInfo.currency}</span>
                </div>
                
                {(order.tax || 0) > 0 && (
                  <div className="flex justify-between text-gray-700">
                    <span className="font-medium">Tax {businessInfo.taxRate ? `(${businessInfo.taxRate}%)` : ''}</span>
                    <span className="font-semibold">{(order.tax || 0).toFixed(2)} {businessInfo.currency}</span>
                  </div>
                )}
                
                {(order.service_charge || 0) > 0 && (
                  <div className="flex justify-between text-gray-700">
                    <span className="font-medium">Service Charge {businessInfo.serviceCharge ? `(${businessInfo.serviceCharge}%)` : ''}</span>
                    <span className="font-semibold">{(order.service_charge || 0).toFixed(2)} {businessInfo.currency}</span>
                  </div>
                )}
                
                <div className="border-t-2 border-blue-200 pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-gray-900">TOTAL</span>
                    <span className="text-2xl font-bold text-blue-600">{(order.total || 0).toFixed(2)} {businessInfo.currency}</span>
                  </div>
                </div>

                {/* Payment Status Badge */}
                <div className="pt-3 border-t border-blue-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Payment Status</span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 capitalize">
                      {order.payment_status || 'Pending'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-8 py-6 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              {businessInfo.welcomeMessage && (
                <p className="text-gray-700 font-medium mb-2">{businessInfo.welcomeMessage}</p>
              )}
              <p className="text-sm text-gray-500">
                Questions? Contact us at {businessInfo.email || businessInfo.phone || 'our support desk'}
              </p>
            </div>
            {businessInfo.logoUrl && (
              <div className="bg-white rounded-xl p-3 shadow-md">
                <img 
                  src={businessInfo.logoUrl} 
                  alt={businessInfo.name}
                  className="h-12 w-12 object-contain"
                />
              </div>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-300 text-center">
            <p className="text-xs text-gray-500">
              This is a computer-generated invoice. Thank you for choosing {businessInfo.name}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernInvoice;