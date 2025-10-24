import { useState, useEffect } from 'react';
import { Search, Filter, Calendar, User, Activity } from 'lucide-react';
import api from '../../services/api';

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/restaurants/logs', {
        params: {
          limit: 100
        }
      });
      setLogs(response.data.logs || []);
    } catch (error) {
      console.error('Failed to load activity logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = !searchTerm || 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.branch_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = filterAction === 'all' || log.action.includes(filterAction.toUpperCase());
    
    const matchesDate = !filterDate || 
      new Date(log.created_at).toISOString().split('T')[0] === filterDate;

    return matchesSearch && matchesAction && matchesDate;
  });

  const actionColors = {
    LOGIN: 'bg-blue-100 text-blue-700',
    LOGOUT: 'bg-gray-100 text-gray-700',
    CREATE: 'bg-green-100 text-green-700',
    UPDATE: 'bg-yellow-100 text-yellow-700',
    DELETE: 'bg-red-100 text-red-700',
    RESTAURANT: 'bg-purple-100 text-purple-700'
  };

  const getActionColor = (action) => {
    for (const [key, color] of Object.entries(actionColors)) {
      if (action.includes(key)) return color;
    }
    return 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Activity Logs</h1>
          <p className="text-slate-600">Track all actions across your restaurants</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="all">All Actions</option>
                <option value="LOGIN">Login</option>
                <option value="CREATE">Create</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
                <option value="RESTAURANT">Restaurant</option>
              </select>
            </div>

            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-slate-600">
              Showing {filteredLogs.length} of {logs.length} logs
            </span>
            {(searchTerm || filterAction !== 'all' || filterDate) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterAction('all');
                  setFilterDate('');
                }}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Logs List */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-slate-600 mt-4">Loading activity logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center">
              <Activity className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">No activity logs found</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredLogs.map((log) => (
                <div key={log.id} className="p-6 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                        {log.branch_name && (
                          <span className="text-sm text-slate-600 flex items-center gap-1">
                            <Activity className="w-4 h-4" />
                            {log.branch_name}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                        <User className="w-4 h-4" />
                        <span className="font-medium">{log.username || 'System'}</span>
                        <span>•</span>
                        <span>{new Date(log.created_at).toLocaleString()}</span>
                      </div>

                      {log.meta && (
                        <div className="mt-2 text-sm text-slate-500 bg-slate-50 p-3 rounded-lg">
                          <pre className="whitespace-pre-wrap font-mono text-xs">
                            {typeof log.meta === 'string' ? log.meta : JSON.stringify(JSON.parse(log.meta), null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
