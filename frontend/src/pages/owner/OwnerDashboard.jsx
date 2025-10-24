import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { restaurantsAPI } from '../../services/api';
import { 
  FaStore, FaUsers, FaTable, FaUtensils, 
  FaChartLine, FaPlus, FaEdit, FaEye,
  FaCheckCircle, FaTimesCircle, FaMoneyBillWave
} from 'react-icons/fa';

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const response = await restaurantsAPI.getRestaurants();
      setRestaurants(response.data || []);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      alert('Failed to load restaurants');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalStats = () => {
    return restaurants.reduce((acc, r) => ({
      totalEmployees: acc.totalEmployees + parseInt(r.employee_count || 0),
      totalTables: acc.totalTables + parseInt(r.table_count || 0),
      totalMenuItems: acc.totalMenuItems + parseInt(r.menu_item_count || 0),
      activeRestaurants: acc.activeRestaurants + (r.is_active ? 1 : 0),
    }), { totalEmployees: 0, totalTables: 0, totalMenuItems: 0, activeRestaurants: 0 });
  };

  const stats = calculateTotalStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <FaStore className="text-purple-400" />
            Restaurant Portfolio
          </h1>
          <p className="text-gray-300">
            Manage all your restaurants from one central dashboard
          </p>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-6 shadow-xl border border-purple-400/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-200 text-sm font-medium mb-1">Total Restaurants</p>
                <p className="text-4xl font-bold text-white">{restaurants.length}</p>
                <p className="text-purple-300 text-xs mt-1">
                  {stats.activeRestaurants} active
                </p>
              </div>
              <FaStore className="text-6xl text-purple-300/30" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 shadow-xl border border-blue-400/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-sm font-medium mb-1">Total Employees</p>
                <p className="text-4xl font-bold text-white">{stats.totalEmployees}</p>
                <p className="text-blue-300 text-xs mt-1">Across all locations</p>
              </div>
              <FaUsers className="text-6xl text-blue-300/30" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-2xl p-6 shadow-xl border border-green-400/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-200 text-sm font-medium mb-1">Total Tables</p>
                <p className="text-4xl font-bold text-white">{stats.totalTables}</p>
                <p className="text-green-300 text-xs mt-1">Available for service</p>
              </div>
              <FaTable className="text-6xl text-green-300/30" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-600 to-orange-800 rounded-2xl p-6 shadow-xl border border-orange-400/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-200 text-sm font-medium mb-1">Total Menu Items</p>
                <p className="text-4xl font-bold text-white">{stats.totalMenuItems}</p>
                <p className="text-orange-300 text-xs mt-1">Active items</p>
              </div>
              <FaUtensils className="text-6xl text-orange-300/30" />
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Your Restaurants</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <FaPlus />
            <span>Add New Restaurant</span>
          </button>
        </div>

        {/* Restaurants Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
            <p className="text-gray-300 mt-4">Loading restaurants...</p>
          </div>
        ) : restaurants.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-12 text-center border border-white/10">
            <FaStore className="text-6xl text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Restaurants Yet</h3>
            <p className="text-gray-400 mb-6">Get started by creating your first restaurant</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all"
            >
              Create Restaurant
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {restaurants.map((restaurant) => (
              <div
                key={restaurant.id}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:border-purple-400/50 transition-all hover:shadow-2xl hover:transform hover:-translate-y-1"
              >
                {/* Restaurant Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold text-white">{restaurant.name}</h3>
                      {restaurant.is_active ? (
                        <FaCheckCircle className="text-green-400" title="Active" />
                      ) : (
                        <FaTimesCircle className="text-red-400" title="Inactive" />
                      )}
                    </div>
                    <p className="text-sm font-mono text-purple-300">{restaurant.code}</p>
                  </div>
                </div>

                {/* Restaurant Details */}
                <div className="space-y-2 mb-4">
                  {restaurant.address && (
                    <p className="text-sm text-gray-300">{restaurant.address}</p>
                  )}
                  {restaurant.phone && (
                    <p className="text-sm text-gray-300">📞 {restaurant.phone}</p>
                  )}
                  {restaurant.email && (
                    <p className="text-sm text-gray-300">📧 {restaurant.email}</p>
                  )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-white/5 rounded-lg p-3 text-center">
                    <FaUsers className="text-blue-400 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-white">{restaurant.employee_count || 0}</p>
                    <p className="text-xs text-gray-400">Employees</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 text-center">
                    <FaTable className="text-green-400 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-white">{restaurant.table_count || 0}</p>
                    <p className="text-xs text-gray-400">Tables</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 text-center">
                    <FaUtensils className="text-orange-400 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-white">{restaurant.menu_item_count || 0}</p>
                    <p className="text-xs text-gray-400">Menu</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/owner/restaurants/${restaurant.id}`)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                  >
                    <FaEye />
                    <span className="text-sm">View</span>
                  </button>
                  <button
                    onClick={() => navigate(`/owner/restaurants/${restaurant.id}/edit`)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <FaEdit />
                    <span className="text-sm">Edit</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Restaurant Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-2xl p-6 max-w-2xl w-full border border-purple-500/30">
              <h2 className="text-2xl font-bold text-white mb-4">Coming Soon</h2>
              <p className="text-gray-300 mb-6">
                Restaurant creation form will be implemented next...
              </p>
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
