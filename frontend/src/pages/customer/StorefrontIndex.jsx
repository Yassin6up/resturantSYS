import { useTenant } from '../../contexts/TenantContext';
import LandingPage from '../marketing/LandingPage';
import MenuPage from './MenuPage';
import EcommerceStorefront from './EcommerceStorefront';
import BookingPage from './BookingPage';

const BOOKING_TYPES = ['appointments', 'hotel', 'office'];

// Decides what "/" renders: the marketing landing page on the bare apex
// domain (no tenant resolved), or the right storefront for whichever
// business_type the resolved store's subdomain is.
export default function StorefrontIndex() {
  const tenant = useTenant();

  if (tenant.loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400">Loading...</div>;
  }
  if (!tenant.found) {
    return <LandingPage />;
  }
  if (BOOKING_TYPES.includes(tenant.businessType)) {
    return <BookingPage storeName={tenant.name} />;
  }
  if (tenant.businessType === 'ecommerce') {
    return <EcommerceStorefront storeName={tenant.name} />;
  }
  return <MenuPage />;
}
