exports.seed = async function(knex) {
  // Delete existing entries
  await knex('app_settings').del();

  // Insert app settings
  await knex('app_settings').insert([
    // General Settings
    {
      key: 'app_name',
      value: 'POSQ Restaurant',
      type: 'string',
      category: 'general',
      description: 'Application name displayed throughout the app',
      is_public: true
    },
    {
      key: 'app_description',
      value: 'Modern Restaurant Management System',
      type: 'string',
      category: 'general',
      description: 'Application description',
      is_public: true
    },
    {
      key: 'currency',
      value: 'MAD',
      type: 'string',
      category: 'general',
      description: 'Default currency',
      is_public: true
    },
    {
      key: 'tax_rate',
      value: '10',
      type: 'number',
      category: 'general',
      description: 'Tax rate percentage',
      is_public: false
    },
    {
      key: 'service_charge',
      value: '5',
      type: 'number',
      category: 'general',
      description: 'Service charge percentage',
      is_public: false
    },

    // Theme Settings
    {
      key: 'primary_color',
      value: '#3B82F6',
      type: 'color',
      category: 'theme',
      description: 'Primary brand color',
      is_public: true
    },
    {
      key: 'secondary_color',
      value: '#1E40AF',
      type: 'color',
      category: 'theme',
      description: 'Secondary brand color',
      is_public: true
    },
    {
      key: 'accent_color',
      value: '#60A5FA',
      type: 'color',
      category: 'theme',
      description: 'Accent color for highlights',
      is_public: true
    },
    {
      key: 'success_color',
      value: '#10B981',
      type: 'color',
      category: 'theme',
      description: 'Success state color',
      is_public: true
    },
    {
      key: 'warning_color',
      value: '#F59E0B',
      type: 'color',
      category: 'theme',
      description: 'Warning state color',
      is_public: true
    },
    {
      key: 'error_color',
      value: '#EF4444',
      type: 'color',
      category: 'theme',
      description: 'Error state color',
      is_public: true
    },
    {
      key: 'background_color',
      value: '#F8FAFC',
      type: 'color',
      category: 'theme',
      description: 'Background color',
      is_public: true
    },
    {
      key: 'surface_color',
      value: '#FFFFFF',
      type: 'color',
      category: 'theme',
      description: 'Surface/card background color',
      is_public: true
    },
    {
      key: 'text_primary',
      value: '#1E293B',
      type: 'color',
      category: 'theme',
      description: 'Primary text color',
      is_public: true
    },
    {
      key: 'text_secondary',
      value: '#64748B',
      type: 'color',
      category: 'theme',
      description: 'Secondary text color',
      is_public: true
    },

    // Branding Settings
    {
      key: 'logo_url',
      value: '',
      type: 'string',
      category: 'branding',
      description: 'Logo image URL',
      is_public: true
    },
    {
      key: 'favicon_url',
      value: '',
      type: 'string',
      category: 'branding',
      description: 'Favicon image URL',
      is_public: true
    },
    {
      key: 'welcome_message',
      value: 'Welcome to our restaurant!',
      type: 'string',
      category: 'branding',
      description: 'Welcome message for customers',
      is_public: true
    },

    // Layout Settings
    {
      key: 'sidebar_width',
      value: '256',
      type: 'number',
      category: 'layout',
      description: 'Admin sidebar width in pixels',
      is_public: false
    },
    {
      key: 'header_height',
      value: '64',
      type: 'number',
      category: 'layout',
      description: 'Header height in pixels',
      is_public: false
    },
    {
      key: 'border_radius',
      value: '12',
      type: 'number',
      category: 'layout',
      description: 'Default border radius in pixels',
      is_public: true
    },
    {
      key: 'shadow_intensity',
      value: 'medium',
      type: 'string',
      category: 'layout',
      description: 'Shadow intensity (light, medium, heavy)',
      is_public: true
    }
  ]);
};