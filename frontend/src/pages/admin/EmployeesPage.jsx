import { useState, useEffect } from 'react'
import { employeesAPI } from '../../services/api'
import { 
  UserGroupIcon, 
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

function EmployeesPage() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    role: 'cashier',
    pin: '',
    salary: '',
    phone: '',
    email: '',
    hire_date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    loadEmployees()
  }, [])

  const loadEmployees = async () => {
    try {
      setLoading(true)
      const response = await employeesAPI.getEmployees()
      if (response.data.success) {
        setEmployees(response.data.employees)
      }
    } catch (error) {
      toast.error('Failed to load employees')
      console.error('Load employees error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (employee = null) => {
    if (employee) {
      setEditingEmployee(employee)
      setFormData({
        username: employee.username,
        password: '',
        full_name: employee.full_name,
        role: employee.role,
        pin: employee.pin || '',
        salary: employee.salary || '',
        phone: employee.phone || '',
        email: employee.email || '',
        hire_date: employee.hire_date || new Date().toISOString().split('T')[0]
      })
    } else {
      setEditingEmployee(null)
      setFormData({
        username: '',
        password: '',
        full_name: '',
        role: 'cashier',
        pin: '',
        salary: '',
        phone: '',
        email: '',
        hire_date: new Date().toISOString().split('T')[0]
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingEmployee(null)
    setFormData({
      username: '',
      password: '',
      full_name: '',
      role: 'cashier',
      pin: '',
      salary: '',
      phone: '',
      email: '',
      hire_date: new Date().toISOString().split('T')[0]
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.username.trim() || !formData.full_name.trim()) {
      toast.error('Please fill in all required fields')
      return
    }

    if (!editingEmployee && !formData.password.trim()) {
      toast.error('Password is required for new employees')
      return
    }

    try {
      setLoading(true)
      
      const submitData = { ...formData }
      if (editingEmployee && !submitData.password) {
        delete submitData.password
      }

      if (editingEmployee) {
        await employeesAPI.updateEmployee(editingEmployee.id, submitData)
        toast.success('Employee updated successfully')
      } else {
        await employeesAPI.createEmployee(submitData)
        toast.success('Employee created successfully')
      }

      await loadEmployees()
      handleCloseModal()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save employee')
      console.error('Save employee error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (employee) => {
    if (!window.confirm(`Are you sure you want to deactivate ${employee.full_name}?`)) {
      return
    }

    try {
      setLoading(true)
      await employeesAPI.deleteEmployee(employee.id)
      toast.success('Employee deactivated successfully')
      await loadEmployees()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to deactivate employee')
      console.error('Delete employee error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleActivate = async (employee) => {
    try {
      setLoading(true)
      await employeesAPI.activateEmployee(employee.id)
      toast.success('Employee activated successfully')
      await loadEmployees()
    } catch (error) {
      toast.error('Failed to activate employee')
      console.error('Activate employee error:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emp.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emp.role.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = filterRole === 'all' || emp.role === filterRole
    return matchesSearch && matchesRole
  })

  const getRoleBadgeColor = (role) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-800 border-purple-200',
      manager: 'bg-blue-100 text-blue-800 border-blue-200',
      cashier: 'bg-green-100 text-green-800 border-green-200',
      kitchen: 'bg-orange-100 text-orange-800 border-orange-200',
      waiter: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
    return colors[role] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Employee Management</h1>
          <p className="text-gray-600 mt-2">Manage your team members and their roles</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="btn-primary"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Employee
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="card-body text-center">
            <UserGroupIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{employees.length}</div>
            <div className="text-sm text-gray-600">Total Employees</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body text-center">
            <CheckCircleIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">
              {employees.filter(e => e.is_active).length}
            </div>
            <div className="text-sm text-gray-600">Active</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body text-center">
            <XCircleIcon className="h-8 w-8 text-red-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">
              {employees.filter(e => !e.is_active).length}
            </div>
            <div className="text-sm text-gray-600">Inactive</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body text-center">
            <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-purple-600 font-bold text-lg">$</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {employees.filter(e => e.salary).length}
            </div>
            <div className="text-sm text-gray-600">With Salary</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, username, or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input pl-10"
              />
            </div>

            {/* Role Filter */}
            <div>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="form-input"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="cashier">Cashier</option>
                <option value="kitchen">Kitchen</option>
                <option value="waiter">Waiter</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="card">
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Salary
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading && filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <div className="loading-spinner mx-auto mb-2"></div>
                      <p className="text-gray-600">Loading employees...</p>
                    </td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">No employees found</p>
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((employee) => (
                    <tr key={employee.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {employee.full_name}
                          </div>
                          <div className="text-sm text-gray-500">@{employee.username}</div>
                          {employee.pin && (
                            <div className="text-xs text-gray-400">PIN: {employee.pin}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`badge ${getRoleBadgeColor(employee.role)}`}>
                          {employee.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{employee.phone || '-'}</div>
                        <div className="text-sm text-gray-500">{employee.email || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {employee.salary ? `${parseFloat(employee.salary).toFixed(2)} MAD` : '-'}
                        </div>
                        {employee.hire_date && (
                          <div className="text-xs text-gray-500">
                            Since {new Date(employee.hire_date).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {employee.is_active ? (
                          <span className="badge badge-success">Active</span>
                        ) : (
                          <span className="badge badge-danger">Inactive</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleOpenModal(employee)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        {employee.is_active ? (
                          <button
                            onClick={() => handleDelete(employee)}
                            className="text-red-600 hover:text-red-900"
                            title="Deactivate"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivate(employee)}
                            className="text-green-600 hover:text-green-900"
                            title="Activate"
                          >
                            <CheckCircleIcon className="h-5 w-5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-2xl">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Full Name *</label>
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="form-input"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">Username *</label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="form-input"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      Password {!editingEmployee && '*'}
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="form-input"
                      placeholder={editingEmployee ? 'Leave blank to keep current' : ''}
                      required={!editingEmployee}
                    />
                  </div>

                  <div>
                    <label className="form-label">Role *</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="form-input"
                      required
                    >
                      <option value="cashier">Cashier</option>
                      <option value="waiter">Waiter</option>
                      <option value="kitchen">Kitchen</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label">PIN (4 digits)</label>
                    <input
                      type="text"
                      maxLength="4"
                      value={formData.pin}
                      onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })}
                      className="form-input"
                      placeholder="1234"
                    />
                  </div>

                  <div>
                    <label className="form-label">Hire Date</label>
                    <input
                      type="date"
                      value={formData.hire_date}
                      onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>

              {/* Contact & Compensation */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact & Compensation</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="form-input"
                      placeholder="+212 6XX XXX XXX"
                    />
                  </div>

                  <div>
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="form-input"
                      placeholder="employee@example.com"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="form-label">Monthly Salary (MAD)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.salary}
                      onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                      className="form-input"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn-outline"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : editingEmployee ? 'Update Employee' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default EmployeesPage
