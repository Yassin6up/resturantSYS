import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Edit, TrendingUp, ShoppingCart, Users, Package, 
  DollarSign, Activity, Calendar, MapPin, Phone, Mail, Globe,
  CheckCircle, XCircle, BarChart3
} from 'lucide-react';
import api from '../../services/api';

export default function RestaurantDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [restaurant, setRestaurant] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadRestaurantDetails();
  }, [id]);

  const loadRestaurantDetails = async () => {
    try {
      setLoading(true);
      const [restaurantRes, analyticsRes] = await Promise.all([
        api.get(`/api/restaurants/${id}`),
        api.get(`/api/restaurants/${id}/analytics`)
      ]);
      
      setRestaurant(restaurantRes.data.restaurant);
      setAnalytics(analyticsRes.data);
    } catch (error) {
      console.error('Failed to load restaurant details:', error);
      alert('Failed to load restaurant details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Restaurant Not Found</h2>
        <button
          onClick={() => navigate('/owner')}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const settings = typeof restaurant.settings === 'string' 
    ? JSON.parse(restaurant.settings) 
    : restaurant.settings || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/owner')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-slate-900">{restaurant.name}</h1>
                {restaurant.is_active ? (
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Active
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium flex items-center gap-1">
                    <XCircle className="w-4 h-4" />
                    Inactive
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {restaurant.address}
                </span>
                {restaurant.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    {restaurant.phone}
                  </span>
                )}
              </div>
            </div>
            
            <button
              onClick={() => navigate(`/owner/restaurants/${id}/edit`)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-medium transition-all flex items-center gap-2 shadow-lg shadow-blue-500/30"
            >
              <Edit className="w-5 h-5" />
              Edit Restaurant
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <DollarSign className="w-6 h-6" />
              </div>
              <TrendingUp className="w-5 h-5 opacity-80" />
            </div>
            <div className="text-3xl font-bold mb-1">
              {settings.currency || 'MAD'} {analytics?.totalRevenue?.toLocaleString() || '0'}
            </div>
            <div className="text-blue-100">Total Revenue</div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <Activity className="w-5 h-5 opacity-80" />
            </div>
            <div className="text-3xl font-bold mb-1">
              {analytics?.totalOrders?.toLocaleString() || '0'}
            </div>
            <div className="text-green-100">Total Orders</div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <Package className="w-6 h-6" />
              </div>
              <BarChart3 className="w-5 h-5 opacity-80" />
            </div>
            <div className="text-3xl font-bold mb-1">
              {analytics?.totalMenuItems?.toLocaleString() || '0'}
            </div>
            <div className="text-purple-100">Menu Items</div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <Users className="w-6 h-6" />
              </div>
              <Users className="w-5 h-5 opacity-80" />
            </div>
            <div className="text-3xl font-bold mb-1">
              {analytics?.totalEmployees?.toLocaleString() || '0'}
            </div>
            <div className="text-orange-100">Employees</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="border-b border-slate-200">
            <div className="flex gap-1 p-2 overflow-x-auto">
              {[
                { id: 'overview', label: 'Overview', icon: Activity },
                { id: 'products', label: 'Top Products', icon: Package },
                { id: 'employees', label: 'Employees', icon: Users },
                { id: 'inventory', label: 'Inventory', icon: Package }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-8">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-4">Restaurant Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-slate-500">Branch Code</label>
                        <p className="text-slate-900 font-medium">{restaurant.code}</p>
                      </div>
                      <div>
                        <label className="text-sm text-slate-500">Email</label>
                        <p className="text-slate-900 font-medium">{restaurant.email || 'Not set'}</p>
                      </div>
                      <div>
                        <label className="text-sm text-slate-500">Currency</label>
                        <p className="text-slate-900 font-medium">{settings.currency || 'MAD'}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-slate-500">Tax Rate</label>
                        <p className="text-slate-900 font-medium">{settings.tax_rate || 0}%</p>
                      </div>
                      <div>
                        <label className="text-sm text-slate-500">Service Charge</label>
                        <p className="text-slate-900 font-medium">{settings.service_charge || 0}%</p>
                      </div>
                      <div>
                        <label className="text-sm text-slate-500">Timezone</label>
                        <p className="text-slate-900 font-medium">{settings.timezone || 'Not set'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    {analytics?.recentOrders?.length > 0 ? (
                      analytics.recentOrders.map((order) => (
                        <div key={order.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                          <div>
                            <p className="font-medium text-slate-900">Order #{order.order_code}</p>
                            <p className="text-sm text-slate-500">
                              {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-900">{settings.currency} {order.total?.toFixed(2)}</p>
                            <p className="text-sm text-slate-500">{order.status}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-500 text-center py-8">No recent orders</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'products' && (
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">Top Selling Products</h3>
                <div className="space-y-3">
                  {analytics?.topProducts?.length > 0 ? (
                    analytics.topProducts.map((product, index) => (
                      <div key={product.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{product.name}</p>
                            <p className="text-sm text-slate-500">{product.category_name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-900">{product.total_sold || 0} sold</p>
                          <p className="text-sm text-slate-500">{settings.currency} {product.price?.toFixed(2)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 text-center py-8">No product data available</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'employees' && (
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">Employee List</h3>
                <div className="space-y-3">
                  {analytics?.employees?.length > 0 ? (
                    analytics.employees.map((employee) => (
                      <div key={employee.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                        <div>
                          <p className="font-medium text-slate-900">{employee.full_name}</p>
                          <p className="text-sm text-slate-500">{employee.role} • {employee.email}</p>
                        </div>
                        <div className="text-right">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            employee.is_active 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {employee.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 text-center py-8">No employees found</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'inventory' && (
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">Inventory Status</h3>
                <div className="space-y-3">
                  {analytics?.inventory?.length > 0 ? (
                    analytics.inventory.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                        <div>
                          <p className="font-medium text-slate-900">{item.name}</p>
                          <p className="text-sm text-slate-500">{item.sku || 'No SKU'}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-900">{item.current_stock || 0} {item.unit}</p>
                          {item.current_stock <= item.min_stock && (
                            <span className="text-xs text-red-600 font-medium">Low Stock</span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 text-center py-8">No inventory items</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
