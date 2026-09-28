// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { getNavigation } from './AdminLayout'

describe('business-specific admin navigation', () => {
  const paths = type => getNavigation(type).map(item => item.href)
  it('keeps dining operations in the restaurant workspace', () => {
    expect(paths('restaurant')).toEqual(expect.arrayContaining(['/admin/tables', '/admin/kitchen', '/admin/reservations', '/admin/pos']))
    expect(paths('restaurant')).not.toContain('/admin/services')
  })
  it('gives shops products and POS without dining pages', () => {
    expect(getNavigation('ecommerce').find(item => item.href === '/admin/products').name).toBe('Products')
    expect(paths('ecommerce')).toContain('/admin/categories')
    expect(paths('ecommerce')).not.toContain('/admin/menu')
    expect(paths('ecommerce')).toContain('/admin/pos')
    for (const page of ['tables', 'kitchen', 'reservations', 'services', 'bookings']) expect(paths('ecommerce')).not.toContain(`/admin/${page}`)
  })
  it.each(['appointments', 'hotel', 'office'])('%s uses services, bookings and availability', type => {
    expect(paths(type)).toEqual(expect.arrayContaining(['/admin/services', '/admin/bookings', '/admin/availability', '/admin/website']))
    for (const page of ['menu', 'tables', 'kitchen', 'reservations', 'pos', 'orders', 'inventory']) expect(paths(type)).not.toContain(`/admin/${page}`)
  })
})
