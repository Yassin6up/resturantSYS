import { Outlet, useLocation, useNavigate , Link, Navigate } from 'react-router-dom'
import { AdminBusinessContext } from '../../contexts/AdminBusinessContext'
import { useAuth } from '../../contexts/AuthContext'
import { useSocket } from '../../contexts/SocketContext'
import { useTheme } from '../../contexts/ThemeContext'
import { authAPI } from '../../services/api'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  TableCellsIcon,
  QueueListIcon,
  BeakerIcon,
  ChartBarIcon,
  CogIcon,
  ArrowRightOnRectangleIcon,
  BellIcon,
  WifiIcon,
  UserGroupIcon,
  GiftIcon,
  ChatBubbleLeftRightIcon,
  ShoppingCartIcon,
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  DevicePhoneMobileIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { useState  , useRef , useEffect} from 'react'
import { QRCodeCanvas } from 'qrcode.react'

// Every vertical shares POS/reports/employees/customers/WhatsApp/settings;
// only the menu-vs-services and orders-vs-bookings and kitchen/tables
// (restaurant-only) items change per business_type.
const BOOKING_TYPES = ['appointments', 'hotel', 'office'];

// 'owner' is included alongside 'admin' everywhere admin-level access
// applies, so a solo self-signup owner (no separate admin employee) can run
// their own store's day-to-day from /admin instead of seeing an empty menu.
export function getNavigation(businessType) {
  const isBooking = BOOKING_TYPES.includes(businessType);
  const catalogItem = isBooking
    ? { name: 'Services', href: '/admin/services', icon: ClipboardDocumentListIcon, roles: ['admin', 'owner', 'manager'] }
    : { name: businessType === 'ecommerce' ? 'Products' : 'Menu', href: businessType === 'ecommerce' ? '/admin/products' : '/admin/menu', icon: ClipboardDocumentListIcon, roles: ['admin', 'owner', 'manager'] };
  const ordersItem = isBooking
    ? { name: 'Appointments & Reservations', href: '/admin/bookings', icon: QueueListIcon, roles: ['admin', 'owner', 'manager', 'cashier'] }
    : { name: 'Orders', href: '/admin/orders', icon: QueueListIcon, roles: ['admin', 'owner', 'manager', 'cashier'] };
  const availabilityItem = { name: 'Availability', href: '/admin/availability', icon: ClockIcon, roles: ['admin', 'owner', 'manager'] };

  const nav = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: HomeIcon, roles: ['admin', 'owner', 'manager', 'cashier'] },
  ];
  if (!isBooking) {
    nav.push({ name: 'POS', href: '/admin/pos', icon: ShoppingCartIcon, roles: ['admin', 'owner', 'manager', 'cashier'] });
  }
  nav.push(catalogItem);
  if (businessType === 'ecommerce') nav.push({ name: 'Categories', href: '/admin/categories', icon: QueueListIcon, roles: ['admin', 'owner', 'manager'] });
  if (businessType === 'restaurant') {
    nav.push({ name: 'Reservations', href: '/admin/reservations', icon: ClockIcon, roles: ['admin', 'owner', 'manager', 'waiter'] });
    nav.push({ name: 'Tables', href: '/admin/tables', icon: TableCellsIcon, roles: ['admin', 'owner', 'manager'] });
  }
  if (isBooking || businessType === 'restaurant') {
    nav.push(availabilityItem);
  }
  nav.push(ordersItem);
  if (businessType === 'restaurant') {
    nav.push({ name: 'Kitchen', href: '/admin/kitchen', icon: BeakerIcon, roles: ['admin', 'owner', 'manager', 'kitchen'] });
    nav.push({ name: 'Inventory', href: '/admin/inventory', icon: ChartBarIcon, roles: ['admin', 'owner', 'manager'] });
  }
  if (businessType === 'ecommerce') nav.push({ name: 'Inventory', href: '/admin/inventory', icon: ChartBarIcon, roles: ['admin','owner','manager'] });
  nav.push(
    { name: 'Employees', href: '/admin/employees', icon: UserGroupIcon, roles: ['admin', 'owner', 'manager'] },
    { name: 'Customers', href: '/admin/customers', icon: GiftIcon, roles: ['admin', 'owner', 'manager'] },
    { name: 'WhatsApp', href: '/admin/whatsapp', icon: ChatBubbleLeftRightIcon, roles: ['admin', 'owner', 'manager'] },
    { name: 'Reports', href: '/admin/reports', icon: ChartBarIcon, roles: ['admin', 'owner', 'manager'] },
    { name: 'Website & Themes', href: '/admin/website', icon: DevicePhoneMobileIcon, roles: ['admin', 'owner', 'manager'] },
    { name: 'Settings', href: '/admin/settings', icon: CogIcon, roles: ['admin', 'owner'] }
  );
  return nav.filter(item => !(isBooking && item.href === '/admin/reports'));
}

function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { isConnected } = useSocket()
  const { getAppName, getSetting } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showQR, setShowQR] = useState(false)
const qrRef = useRef(null);
const hideTimeoutRef = useRef(null);
  const [isFullScreen, setIsFullScreen] = useState(document.fullscreenElement !== null)
  const [branchStatus, setBranchStatus] = useState({ loading: true, suspended: false, branchName: '' })
  const [businessType, setBusinessType] = useState(null)
  const [branch, setBranch] = useState(null)
  const [profileError, setProfileError] = useState(false)

  useEffect(() => {
    let current = true
    const refresh = () => authAPI.getProfile()
      .then(({ data }) => {
        if (!current) return
        if (!data.branch) throw new Error('No business assigned')
        if (!['restaurant', 'ecommerce', 'appointments', 'hotel', 'office'].includes(data.branch.business_type)) throw new Error('Invalid business type')
        setProfileError(false)
        setBranch(data.branch)
        setBranchStatus({
          loading: false,
          suspended: data.branch ? data.branch.is_active === false || data.branch.is_active === 0 : false,
          branchName: data.branch?.name || ''
        })
        setBusinessType(data.branch.business_type)
      })
      .catch(() => { if (current) { setProfileError(true); setBranchStatus({ loading: false, suspended: false, branchName: '' }) } })
    refresh()
    window.addEventListener('focus', refresh)
    return () => { current = false; window.removeEventListener('focus', refresh) }
  }, [user?.id, location.pathname])

  const navigation = getNavigation(businessType)
  const filteredNavigation = navigation.filter(item =>
    item.roles.includes(user?.role)
  )

    const websitePath = `/?branch=${branch?.id || ''}`
    const qrUrl = `${window.location.origin}${websitePath}`
    const element = document.documentElement


useEffect(() => {
  const savedMode = localStorage.getItem("fullscreenMode");

  if (savedMode === "true") {
    element.requestFullscreen?.();
  }

  const onChange = () => updateFullscreenState();
  document.addEventListener("fullscreenchange", onChange);

  return () => {
    document.removeEventListener("fullscreenchange", onChange);
  };
}, [isFullScreen]);
    

const updateFullscreenState = () => {
  const active = document.fullscreenElement !== null;
  setIsFullScreen(active);
  localStorage.setItem("fullscreenMode", active ? "true" : "false");
};



const printQR = () => {
  const canvas = qrRef.current?.querySelector("canvas");

  if (!canvas) {
    alert("QR Code not found!");
    return;
  }



  const imgData = canvas.toDataURL("image/png");

  const printWindow = window.open("", "PRINT", "height=600,width=600");

  printWindow.document.write(`
    <html>
    <head>
      <title>Print QR</title>
      <style>
        body { text-align: center; font-family: sans-serif; padding-top: 20px; }
        img { width: 260px; margin-top: 20px; }
        h3 { margin-top: 10px; }
      </style>
    </head>
    <body>
      <h3>Visit our website</h3>
      <img src="${imgData}" />
    </body>
    </html>
  `);

  printWindow.document.close();

  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }, 400);
};

// When mouse enters → show instantly + cancel hiding
const handleMouseEnter = () => {
  if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
  setShowQR(true);
};

// When mouse leaves → wait 1s → then hide
const handleMouseLeave = () => {
  hideTimeoutRef.current = setTimeout(() => {
    setShowQR(false);
  }, 1000);
};


  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

 const goFullscreen = () => {
    if (element.requestFullscreen) element.requestFullscreen()
    setIsFullScreen(true)
  }

  const exitFullscreen = () => {
    document.exitFullscreen()
    setIsFullScreen(false)
  }

  if (profileError) return <div className="p-12 text-center"><h1 className="text-xl font-semibold">Unable to load your business</h1><p className="my-4">Check your connection and business assignment, then try again.</p><button className="btn-primary" onClick={() => window.location.reload()}>Try again</button></div>
  if (branchStatus.loading) return <div className="p-12 text-center">Loading your workspace…</div>
  if (!branchStatus.suspended) {
    const requested = location.pathname.replace(/\/$/, '')
    const allowed = filteredNavigation.some(item => item.href === requested)
    if (!allowed) return <Navigate to={filteredNavigation[0]?.href || '/admin/login'} replace />
  }
  if (!branchStatus.loading && branchStatus.suspended && user?.role !== 'owner') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-red-100">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {branchStatus.branchName || 'This store'} is suspended
          </h1>
          <p className="text-gray-500 mb-6">
            Access has been paused by the platform owner. Your storefront is offline,
            and new orders can't be taken until this is resolved. Contact the platform owner to reactivate.
          </p>
          <button
            onClick={logout}
            className="w-full py-2.5 rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-800"
          >
            Sign out
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white border-r border-gray-200">
          <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200">
            <div><h1 className="text-lg font-semibold text-gray-900">{branch?.name} Admin</h1><p className="text-xs text-gray-500">{businessType === 'ecommerce' ? 'Ecommerce' : businessType === 'restaurant' ? 'Restaurant' : 'Appointments & Reservations'}</p></div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="sr-only">Close sidebar</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <nav className="flex-1 px-4 py-4 space-y-1">
            {filteredNavigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </a>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex h-16 items-center px-4 border-b border-gray-200">
            <div><h1 className="text-lg font-semibold text-gray-900">{branch?.name} Admin</h1><p className="text-xs text-gray-500">{businessType === 'ecommerce' ? 'Ecommerce' : businessType === 'restaurant' ? 'Restaurant' : 'Appointments & Reservations'}</p></div>
          </div>
          <nav className="flex-1 px-4 py-4 space-y-1">
            {filteredNavigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
             <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                  isActive
                    ? "bg-blue-100 text-blue-700 border border-blue-200"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>

              )
            })}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Open sidebar</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>

            <div className="flex items-center space-x-4">
              {/* Connection status */}
              <div className="flex items-center text-sm">
                {isConnected ? (
                  <>
                    <WifiIcon className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-green-600">Connected</span>
                  </>
                ) : (
                  <>
                    <WifiIcon className="h-4 w-4 text-red-500 mr-1" />
                    <span className="text-red-600">Disconnected</span>
                  </>
                )}
              </div>
              <div className="flex items-center text-sm">
                {isFullScreen ? (
                  <>
                    <ArrowsPointingInIcon onClick={() => {
  if (!document.fullscreenElement) {
    element.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
}}
 className="h-5 w-5 mr-1 cursor-pointer" />
                  </>
                ) : (
                  <>
                    <ArrowsPointingOutIcon  onClick={() => {
  if (!document.fullscreenElement) {
    element.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
}}
 className="h-5 w-5  mr-1 cursor-pointer" />
                  </>
                )}
              </div>


 <div
  className="relative"
  onMouseEnter={handleMouseEnter}
  onMouseLeave={handleMouseLeave}
>
  <button
    onClick={() => window.open(websitePath, '_blank', 'noopener,noreferrer')}
    className="text-gray-700 hover:text-blue-600 flex items-center space-x-1"
  >
    <span className="text-sm">View website</span>
    <DevicePhoneMobileIcon className="h-5 w-5" />
  </button>

  {/* Tooltip */}
  <div
    className={`
      absolute top-10 right-0 w-72 bg-white rounded-xl shadow-xl border
      z-50 p-4 text-center transition-all duration-500
      ${showQR
        ? "opacity-100 scale-100 blur-0"
        : "opacity-0 scale-95 blur-sm pointer-events-none"}
    `}
  >
    <p className="text-sm font-semibold text-gray-700 mb-2">
      Scan to visit your website
    </p>

    <div ref={qrRef} className="flex justify-center mb-3">
      <QRCodeCanvas
        id="qrCanvas"
        value={qrUrl}
        size={160}
        includeMargin={true}
      />
    </div>

    <button
      onClick={printQR}
      className="w-full py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
    >
      Print QR 🖨️
    </button>
  </div>
</div>


            

              {/* User menu */}
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  {user?.fullName || user?.username}
                </span>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {user?.role}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-gray-600"
                  title="Logout"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <AdminBusinessContext.Provider value={{ branch, businessType }}><Outlet /></AdminBusinessContext.Provider>
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
