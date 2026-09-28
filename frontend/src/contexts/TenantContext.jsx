import { createContext, useContext, useState, useEffect } from 'react';
import { tenantAPI } from '../services/api';

// Resolves once per page load whether this request landed on a store's own
// subdomain (found: true, with its business_type) or the bare marketing
// domain / an unrecognized host (found: false -> show the landing page).
const TenantContext = createContext({ loading: true, found: false, businessType: 'restaurant' });

export function TenantProvider({ children }) {
  const [tenant, setTenant] = useState({ loading: true, found: false, businessType: 'restaurant' });

  useEffect(() => {
    tenantAPI.getCurrent()
      .then(({ data }) => {
        if (data.found) {
          setTenant({ loading: false, found: true, id: data.id, settings: data.settings || {}, businessType: data.business_type, name: data.name, logoUrl: data.logo_url, description: data.description });
        } else {
          setTenant({ loading: false, found: false, businessType: null });
        }
      })
      .catch(() => setTenant({ loading: false, found: false, businessType: null }));
  }, []);

  return <TenantContext.Provider value={tenant}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  return useContext(TenantContext);
}
