import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import DefaultInvoice from './templates/DefaultInvoice';
import MinimalInvoice from './templates/MinimalInvoice';
import ModernInvoice from './templates/ModernInvoice';

const InvoiceRenderer = ({ 
  order, 
  template = 'default', 
  onClose,
  businessInfo 
}) => {
  const componentRef = useRef();
    const [selectedTemplate, setSelectedTemplate] = React.useState(template);
  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `Invoice-${order.order_code}`,
    onAfterPrint: () => console.log('Printed successfully!'),
  });

  const renderTemplate = () => {
    const templates = {
      default: DefaultInvoice,
      minimal: MinimalInvoice,
      modern: ModernInvoice,
    };

    const TemplateComponent = templates[selectedTemplate] || DefaultInvoice;
    
    return (
      <TemplateComponent 
        order={order} 
        businessInfo={businessInfo}
      />
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold">Print Invoice</h2>
            <p className="text-gray-600">Order #{order.order_code}</p>
          </div>
          <div className="flex gap-3">
            <select 
              className="form-select border border-gray-300 rounded-lg px-3 py-2"
              onChange={(e) => {setSelectedTemplate(e.target.value)}}
              defaultValue={template}
            >
              <option value="default">Default Template</option>
              <option value="minimal">Minimal Template</option>
              <option value="modern">Modern Template</option>
            </select>
            <button
              onClick={handlePrint}
              className="btn-primary flex items-center gap-2 rounded-lg px-4 py-2"
            >
              <PrinterIcon className="h-5 w-5" />
              Print Invoice
            </button>
            <button
              onClick={onClose}
              className="btn-outline flex items-center gap-2 rounded-lg px-4 py-2"
            >
              Close
            </button>
          </div>
        </div>

        {/* Invoice Preview */}
        <div className="flex-1 overflow-auto p-4 bg-gray-100">
          <div 
            ref={componentRef}
            className="bg-white mx-auto shadow-lg"
            style={{ 
              transform: 'scale(0.8)',
              transformOrigin: 'top center'
            }}
          >
            {renderTemplate()}
          </div>
        </div>
      </div>
    </div>
  );
};

// Add PrinterIcon if not available
const PrinterIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
  </svg>
);

export default InvoiceRenderer;