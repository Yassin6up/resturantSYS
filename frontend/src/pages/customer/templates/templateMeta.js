// Metadata for the ecommerce/booking storefront templates, used by both the
// admin TemplatePicker (settings) and the storefront dispatchers.
export const STORE_TEMPLATES = [
  {
    value: 'default',
    label: 'Default - Clean Grid',
    hint: 'Simple product grid, works for any catalog',
    preview: { background: '#fff', accent: '#3B82F6', card: '#f1f5f9' },
  },
  {
    value: 'minimal',
    label: 'Minimal - Editorial',
    hint: 'Lots of white space, large product photography',
    preview: { background: '#fafafa', accent: '#111827', card: '#e5e7eb' },
  },
  {
    value: 'bold',
    label: 'Bold - High Contrast',
    hint: 'Dark hero, punchy colors, built to convert',
    preview: { background: '#0f172a', accent: '#f97316', card: '#1e293b' },
  },
];

export const BOOKING_TEMPLATES = [
  {
    value: 'default',
    label: 'Default - Simple List',
    hint: 'Straightforward list of services, works anywhere',
    preview: { background: '#fff', accent: '#3B82F6', card: '#f1f5f9' },
  },
  {
    value: 'calm',
    label: 'Calm - Spa & Wellness',
    hint: 'Soft colors, generous spacing - salons, spas, clinics',
    preview: { background: '#f7f5f2', accent: '#a78b6c', card: '#eae6de' },
  },
  {
    value: 'professional',
    label: 'Professional - Office',
    hint: 'Structured and formal - offices, consultants, clinics',
    preview: { background: '#f8fafc', accent: '#1e3a5f', card: '#e2e8f0' },
  },
];
