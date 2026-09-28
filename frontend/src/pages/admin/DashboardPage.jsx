import { useState, useEffect } from 'react';
import { authAPI } from '../../services/api';
import RestaurantDashboard from './RestaurantDashboard';
import EcommerceDashboard from './EcommerceDashboard';
import AppointmentsDashboard from './AppointmentsDashboard';
import { useAdminBusiness } from '../../contexts/AdminBusinessContext';

const BOOKING_TYPES = ['appointments', 'hotel', 'office'];

// Picks the right dashboard for this store's business_type - a restaurant
// admin shouldn't land on a Shopify-style overview, and vice versa.
export default function DashboardPage() {
  const { businessType } = useAdminBusiness();

  if (!businessType) {
    return <div className="p-6 text-center text-slate-400">Loading dashboard...</div>;
  }
  if (businessType === 'ecommerce') return <EcommerceDashboard />;
  if (BOOKING_TYPES.includes(businessType)) return <AppointmentsDashboard />;
  return <RestaurantDashboard />;
}
