import { useState, useEffect } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { ordersAPI, reportsAPI, menuAPI } from '../../services/api';
import {
  CurrencyDollarIcon,
  ShoppingBagIcon,
  CubeIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const STATUS_STYLE = {
  PENDING: 'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PREPARING: 'bg-blue-100 text-blue-700',
  READY: 'bg-indigo-100 text-indigo-700',
  SERVED: 'bg-indigo-100 text-indigo-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export default function EcommerceDashboard() {
  const { orders } = useSocket();
  const [stats, setStats] = useState({ revenue: 0, orderCount: 0, avgOrderValue: 0, productCount: 0 });
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const [salesRes, itemsRes, topRes] = await Promise.all([
        reportsAPI.getDailySales({ date: today }),
        menuAPI.getMenuItems(),
        reportsAPI.getTopItems({ limit: 5 }),
      ]);
      const summary = salesRes.data.summary || {};
      setStats({
        revenue: parseFloat(summary.total_revenue || 0),
        orderCount: parseInt(summary.total_orders || 0),
        avgOrderValue: parseFloat(summary.average_order_value || 0),
        productCount: (itemsRes.data.items || itemsRes.data || []).length || 0,
      });
      setTopProducts(topRes.data.topItems || []);
    } catch (error) {
      toast.error('Failed to load store overview');
    } finally {
      setLoading(false);
    }
  };

  const markFulfilled = async (orderId) => {
    try {
      await ordersAPI.updateOrderStatus(orderId, 'COMPLETED');
      toast.success('Order marked as fulfilled');
    } catch (error) {
      toast.error('Failed to update order');
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-slate-400">Loading your store overview...</div>;
  }

  const recentOrders = orders.slice(0, 8);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Store Overview</h1>
        <p className="text-slate-500 text-sm">Today's performance at a glance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today's Sales", value: `${stats.revenue.toFixed(2)} MAD`, icon: CurrencyDollarIcon, color: 'text-green-600 bg-green-50' },
          { label: 'Orders Today', value: stats.orderCount, icon: ShoppingBagIcon, color: 'text-blue-600 bg-blue-50' },
          { label: 'Avg. Order Value', value: `${stats.avgOrderValue.toFixed(2)} MAD`, icon: ArrowTrendingUpIcon, color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Products', value: stats.productCount, icon: CubeIcon, color: 'text-purple-600 bg-purple-50' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${c.color}`}>
              <c.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{c.value}</p>
            <p className="text-sm text-slate-500">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Recent Orders</h2>
            <Link to="/admin/orders" className="text-sm text-blue-600 font-medium">View all</Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="p-8 text-center text-slate-400 text-sm">No orders yet - share your store link to start selling.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-5 py-2.5">Order</th>
                  <th className="text-left px-5 py-2.5">Customer</th>
                  <th className="text-left px-5 py-2.5">Status</th>
                  <th className="text-right px-5 py-2.5">Total</th>
                  <th className="px-5 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentOrders.map(o => (
                  <tr key={o.id}>
                    <td className="px-5 py-3 font-medium text-slate-900">{o.order_code}</td>
                    <td className="px-5 py-3 text-slate-500">{o.customer_name || 'Guest'}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLE[o.status] || 'bg-slate-100 text-slate-600'}`}>{o.status}</span>
                    </td>
                    <td className="px-5 py-3 text-right text-slate-900">{o.total?.toFixed?.(2) ?? o.total} MAD</td>
                    <td className="px-5 py-3 text-right">
                      {!['COMPLETED', 'CANCELLED'].includes(o.status) && (
                        <button onClick={() => markFulfilled(o.id)} className="text-xs text-green-600 font-medium hover:underline">
                          Mark fulfilled
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <ChartBarIcon className="w-4 h-4 text-slate-400" /> Top Products
          </h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-slate-400">No sales yet.</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{p.item_name}</span>
                  <span className="text-slate-400">{p.total_quantity} sold</span>
                </div>
              ))}
            </div>
          )}
          <Link to="/admin/products" className="mt-5 block text-center py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800">
            Manage Products
          </Link>
        </div>
      </div>
    </div>
  );
}
