import { CheckIcon } from '@heroicons/react/24/outline';

// Generic storefront-template picker, shared by the Store Templates
// (ecommerce) and Booking Page (appointments/hotel/office) settings tabs.
// The restaurant vertical keeps its own hand-illustrated Menu Templates tab
// in SettingsPage.jsx untouched - this is for the two newer verticals.
export default function TemplatePicker({ title, description, templates, value, onChange }) {
  return (
    <div className="card">
      <div className="card-header">
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        <p className="text-gray-600">{description}</p>
      </div>
      <div className="card-body">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(t => (
            <div
              key={t.value}
              onClick={() => onChange(t.value)}
              className={`cursor-pointer border-2 rounded-xl p-5 transition-all duration-200 ${
                value === t.value
                  ? 'border-blue-600 bg-blue-50 shadow-lg'
                  : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-base font-bold text-gray-900">{t.label}</h3>
                {value === t.value && (
                  <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckIcon className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </div>
              <div
                className="rounded-lg p-4 border border-gray-200 mb-3"
                style={{ background: t.preview?.background || '#fff' }}
              >
                <div className="space-y-2">
                  <div
                    className="h-2.5 rounded-full"
                    style={{ width: '55%', background: t.preview?.accent || '#3B82F6' }}
                  />
                  <div className="grid grid-cols-3 gap-1.5">
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        className="aspect-square rounded"
                        style={{ background: t.preview?.card || '#f1f5f9' }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500">{t.hint}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
