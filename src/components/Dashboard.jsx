import React, { useState, useEffect, useRef, Suspense, lazy } from 'react'
import { Bell, ChevronDown, ChevronRight, ChevronsLeft, ChevronsRight, Crown, Gem, LayoutDashboard, LogOut, Menu, Moon, Package, Palette, Search, Settings, ShieldCheck, ShoppingBag, Sparkles, Sun, TrendingUp, UsersRound, BarChart3 } from 'lucide-react'
import { formatDateTimeDDMMYY, boutiqueThemes, appearanceTokens, navItems, stats, orders, products, staffActivities } from '../utils/constants'
const CreateUserPage = lazy(() => import('../pages/Users/CreateUser'))
const ViewUsersPage = lazy(() => import('../pages/Users/ViewUsers'))
const AddClientsPage = lazy(() => import('../pages/Clients/AddClients'))
const ViewClientsPage = lazy(() => import('../pages/Clients/ViewClients'))
const ClientDetailPage = lazy(() => import('../pages/Clients/ClientDetail'))
const AddOrderPage = lazy(() => import('../pages/Orders/AddOrder'))
const ViewOrdersPage = lazy(() => import('../pages/Orders/ViewOrders'))
const CreateInventoryPage = lazy(() => import('../pages/Inventory/CreateInventory'))
const ViewInventoryPage = lazy(() => import('../pages/Inventory/ViewInventory'))
const InventoryDetailPage = lazy(() => import('../pages/Inventory/InventoryDetail'))
const CreateSalesPage = lazy(() => import('../pages/Sales/CreateSales'))
const ViewSalesPage = lazy(() => import('../pages/Sales/ViewSales'))
const ReportsPage = lazy(() => import('../pages/Reports/Reports'))
import AccountDetailsModal from './AccountDetailsModal'

import { db } from '../firebase'

import {
  doc,
  setDoc,
  getDoc,
  onSnapshot
} from 'firebase/firestore'

function Dashboard({ 
  onLogout, user, 
  users, setUsers,
  designations, setDesignations,
  clients, setClients,
  orders, setOrders,
  inventory, setInventory,
  sales, setSales,
  activities, setActivities,
  orderTypes, setOrderTypes,
  productTypes, setProductTypes,
  inventoryUnits, setInventoryUnits,
  cloudLoaded
}) {
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [showAccountPanel, setShowAccountPanel] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [appearance, setAppearance] = useState('light')
  const [themeName, setThemeName] = useState('champagne')
  const [showThemeDropdown, setShowThemeDropdown] = useState(false)
  const [globalToast, setGlobalToast] = useState(null)
  const [showAllNotifications, setShowAllNotifications] = useState(false)
  const [notificationsPage, setNotificationsPage] = useState(1)
  const notificationsPerPage = 10

  const showGlobalToast = (title, message) => {
    setGlobalToast({ title, message })
    setTimeout(() => setGlobalToast(null), 4000)

    const newActivity = {
      id: Date.now(),
      title,
      description: message,
      timestamp: new Date().toISOString(),
      actor: user?.name || 'Admin'
    }
    setActivities(prev => {
      const updated = [newActivity, ...prev].slice(0, 500)
      return updated
    })
  }
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false)
  const [expandedSubmenu, setExpandedSubmenu] = useState(null)
  const [globalSearch, setGlobalSearch] = useState('')
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false)
  const searchRef = useRef(null)

  const [highlightOrderId, setHighlightOrderId] = useState(null)
  const [highlightSaleId, setHighlightSaleId] = useState(null)
  const [highlightInventoryId, setHighlightInventoryId] = useState(null)
  const [highlightClientId, setHighlightClientId] = useState(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsGlobalSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const [currentPage, setCurrentPage] = useState(() => localStorage.getItem('erp_current_page') || 'overview')

  // LOCAL PERSISTENCE FALLBACKS
  useEffect(() => { localStorage.setItem('erp_users', JSON.stringify(users)) }, [users])
  useEffect(() => { localStorage.setItem('erp_designations', JSON.stringify(designations)) }, [designations])
  useEffect(() => { localStorage.setItem('activities', JSON.stringify(activities)) }, [activities])
  useEffect(() => { localStorage.setItem('clients', JSON.stringify(clients)) }, [clients])
  useEffect(() => { localStorage.setItem('orders', JSON.stringify(orders)) }, [orders])
  useEffect(() => { localStorage.setItem('inventory', JSON.stringify(inventory)) }, [inventory])
  useEffect(() => { localStorage.setItem('sales', JSON.stringify(sales)) }, [sales])
  useEffect(() => { localStorage.setItem('orderTypes', JSON.stringify(orderTypes)) }, [orderTypes])
  useEffect(() => { localStorage.setItem('productTypes', JSON.stringify(productTypes)) }, [productTypes])
  useEffect(() => { localStorage.setItem('inventoryUnits', JSON.stringify(inventoryUnits)) }, [inventoryUnits])

  // SAVE TO FIREBASE
  useEffect(() => {
    if (!cloudLoaded) return

    const saveCloudData = async () => {
      try {
        await setDoc(doc(db, "erpData", "main"), {
          users,
          designations,
          clients,
          orders,
          inventory,
          sales,
          activities,
          orderTypes,
          productTypes,
          inventoryUnits
        }, { merge: true })
        console.log("Cloud Sync Success")
      } catch (error) {
        console.error("Cloud Save Error:", error)
        if (showGlobalToast) {
          showGlobalToast('Sync Error', `Could not save to cloud: ${error.message}`);
        }
      }
    }

    // Debounce or just save on every relevant state change
    const timeout = setTimeout(saveCloudData, 1000)
    return () => clearTimeout(timeout)
  }, [users, designations, clients, orders, inventory, sales, activities, orderTypes, productTypes, inventoryUnits])

  const activeSidebarPage = currentPage === 'client-detail' ? 'view-clients' : (currentPage === 'inventory-detail' ? 'view-inventory' : currentPage)

  useEffect(() => {
    localStorage.setItem('erp_current_page', currentPage)

    // Auto-expand submenu if current page belongs to it
    navItems.forEach(item => {
      if (item.hasSubmenu && item.submenu.some(sub => sub.id === activeSidebarPage)) {
        setExpandedSubmenu(item.label)
      }
    })
  }, [currentPage, activeSidebarPage])

  const [selectedClient, setSelectedClient] = useState(null)
  const [clientDetailMode, setClientDetailMode] = useState('view')
  const [selectedInventoryItem, setSelectedInventoryItem] = useState(null)
  const [inventoryDetailMode, setInventoryDetailMode] = useState('view')
  const sidebarWidth = isSidebarCollapsed ? 'lg:pl-24' : 'lg:pl-72'
  const transitionClass = 'transition-all duration-300 ease-in-out'
  const palette = boutiqueThemes[themeName]
  const tokens = appearanceTokens[appearance]
  const themeStyle = {
    '--app-bg': tokens.appBg,
    '--page-bg': tokens.pageBg,
    '--surface': tokens.surface,
    '--surface-strong': tokens.surfaceStrong,
    '--text': tokens.text,
    '--muted': tokens.muted,
    '--border': tokens.border,
    '--border-glow': tokens.borderGlow,
    '--soft': tokens.soft,
    '--sidebar': tokens.sidebar,
    '--sidebar-text': tokens.sidebarText,
    '--shadow': tokens.shadow,
    '--accent': palette.accent,
    '--accent-soft': palette.accentSoft,
    '--jewel': palette.jewel,
    '--gold': palette.gold,
    '--hero': palette.hero,
  }

  const loggedInUserInList = users.find(u => u.id === user?.id)
  const currentUserName = loggedInUserInList ? loggedInUserInList.name : (user?.name || 'User')
  const currentUserEmail = loggedInUserInList ? loggedInUserInList.email : (user?.email || 'admin@classy.com')

  // Live Data Calculations
  const allOrders = orders
  const allClients = clients
  const allInventory = inventory
  const allSales = sales

  const liveStats = [
    { label: 'Total Revenue', value: `₹${allSales.reduce((acc, s) => acc + (parseFloat(s.totalAmount) || 0), 0).toLocaleString()}`, note: 'Real-time sales', icon: TrendingUp, adminOnly: true },
    { label: 'Active Orders', value: allOrders.filter(o => o.status !== 'Closed' && o.status !== 'Sold').length, note: 'In production', icon: ShoppingBag },
    { label: 'Studio Clients', value: allClients.length, note: 'Registered profiles', icon: UsersRound },
    { label: 'Stock Items', value: allInventory.length, note: 'Inventory items', icon: Package },
  ].filter(s => !s.adminOnly || user?.role === 'Admin')

  const liveRecentOrders = [...allOrders].sort((a, b) => new Date(b.orderDate || 0) - new Date(a.orderDate || 0)).slice(0, 5)
  const liveRecentProducts = [...allInventory].reverse().slice(0, 3)
  const liveActivities = activities.slice(0, 4)

  // Global Search Logic
  const searchResults = React.useMemo(() => {
    if (!globalSearch.trim()) return { clients: [], orders: [], inventory: [], sales: [] }
    const q = globalSearch.toLowerCase()
    const isAdmin = user?.role === 'Admin'

    return {
      clients: allClients.filter(c => c.name?.toLowerCase().includes(q) || c.phone?.includes(q)).slice(0, 4),
      orders: allOrders.filter(o => o.clientName?.toLowerCase().includes(q) || o.product?.toLowerCase().includes(q) || o.id?.toString().includes(q)).slice(0, 4),
      inventory: isAdmin ? allInventory.filter(p => p.productName?.toLowerCase().includes(q) || p.productId?.toLowerCase().includes(q)).slice(0, 4) : [],
      sales: isAdmin ? allSales.filter(s => s.saleId?.toLowerCase().includes(q) || s.client?.name?.toLowerCase().includes(q)).slice(0, 4) : []
    }
  }, [globalSearch, allClients, allOrders, allInventory, allSales, user?.role])
  const hasSearchResults = Object.values(searchResults).some(arr => arr.length > 0)

  return (
    <section className="min-h-screen bg-[var(--app-bg)] text-[var(--text)] transition-colors duration-500" style={themeStyle}>
      {/* Mobile sidebar overlay */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-[90] bg-black/60 lg:hidden backdrop-blur-md transition-opacity duration-300"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-[100] border-r border-[var(--border)] text-[var(--text)] shadow-[15px_0_80px_rgba(0,0,0,0.15)] ${transitionClass} lg:flex lg:flex-col ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          } ${isSidebarCollapsed ? 'lg:w-24' : 'lg:w-72'} w-72 bg-[var(--surface-strong)] overflow-hidden`}
      >
        <div className="flex h-20 items-center justify-between border-b border-[var(--border)] px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 place-items-center rounded-xl bg-white p-1 shadow-sm">
              <img src="/logo-black.png" alt="CB" className="h-full w-full object-contain" />
            </div>
            {(!isSidebarCollapsed || isMobileSidebarOpen) && (
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.28em] text-[var(--accent)] font-semibold">
                  Boutique
                </p>
                <h2 className="truncate text-lg font-semibold text-[var(--text)]">Classy ERP</h2>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] text-[var(--muted)] transition hover:text-[var(--accent)] lg:hidden"
              onClick={() => setIsMobileSidebarOpen(false)}
              title="Close sidebar"
              type="button"
            >
              <ChevronsLeft size={18} />
            </button>
            <button
              className="hidden grid h-9 w-9 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] text-[var(--muted)] transition hover:text-[var(--accent)] lg:grid"
              onClick={() => setIsSidebarCollapsed((value) => !value)}
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              type="button"
            >
              {isSidebarCollapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto space-y-2 px-4 py-6">
          {navItems.filter(item => {
            if (['users', 'inventory', 'reports'].includes(item.id) && user?.role !== 'Admin') return false;
            return true;
          }).map(({ label, icon: Icon, hasSubmenu, submenu, id }, index) => (
            <div key={label}>
              <button
                className={`group flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm transition ${activeSidebarPage === id || (hasSubmenu && submenu.some(s => s.id === activeSidebarPage))
                  ? 'bg-[var(--accent-soft)] font-semibold text-[var(--accent)] shadow-sm'
                  : 'text-[var(--muted)] hover:bg-[var(--soft)] hover:text-[var(--text)]'
                  }`}
                onClick={() => {
                  if (hasSubmenu) {
                    setExpandedSubmenu(expandedSubmenu === label ? null : label)
                  } else {
                    setCurrentPage(id)
                  }
                }}
                title={isSidebarCollapsed ? label : undefined}
                type="button"
              >
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors ${activeSidebarPage === id || (hasSubmenu && submenu.some(s => s.id === activeSidebarPage)) ? 'bg-[var(--surface-strong)] shadow-sm text-[var(--accent)]' : 'bg-transparent group-hover:bg-[var(--surface-strong)] text-[var(--muted)] group-hover:text-[var(--text)]'}`}>
                  <Icon size={18} />
                </span>
                {!isSidebarCollapsed && (
                  <>
                    <span className="flex-1">{label}</span>
                    {hasSubmenu && (
                      <ChevronDown
                        size={16}
                        className={`transition-transform ${expandedSubmenu === label ? 'rotate-180' : ''}`}
                      />
                    )}
                  </>
                )}
              </button>
              {hasSubmenu && !isSidebarCollapsed && (
                <div
                  className={`ml-12 mt-1 space-y-1 overflow-hidden transition-all duration-300 ease-in-out ${expandedSubmenu === label ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}
                >
                  {submenu.map((subItem) => (
                    <button
                      className={`flex w-full items-center gap-3 rounded-lg px-4 py-2 text-left text-sm transition hover:bg-[var(--soft)] hover:text-[var(--text)] ${activeSidebarPage === subItem.id ? 'text-[var(--accent)] font-semibold' : 'text-[var(--muted)]'
                        }`}
                      key={subItem.label}
                      onClick={() => setCurrentPage(subItem.id)}
                      type="button"
                    >
                      {subItem.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>


      </aside>

      <div className={`min-w-0 bg-[var(--page-bg)] ${transitionClass} ${sidebarWidth}`}>
        <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--surface)] px-5 py-3 shadow-sm backdrop-blur-xl lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                className="grid h-11 w-11 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] shadow-sm transition hover:bg-[var(--soft)] lg:hidden"
                onClick={() => setIsMobileSidebarOpen(true)}
                type="button"
              >
                <Menu size={20} className="text-[var(--text)]" />
              </button>
              <div className="hidden sm:block">
                <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--accent)] lg:text-sm">
                  <Sparkles size={14} /> Designer dashboard
                </p>
                <h1 className="text-lg font-semibold lg:text-3xl">{currentUserName || 'Admin'}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative hidden md:block" ref={searchRef}>
                <label className="flex h-11 items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 text-sm text-[var(--muted)] shadow-sm">
                  <Search size={17} />
                  <input
                    className="w-64 bg-transparent outline-none placeholder:text-stone-400"
                    placeholder="Search anything..."
                    type="search"
                    value={globalSearch}
                    onChange={(e) => {
                      setGlobalSearch(e.target.value)
                      setIsGlobalSearchOpen(true)
                    }}
                    onFocus={() => setIsGlobalSearchOpen(true)}
                  />
                </label>

                {isGlobalSearchOpen && globalSearch.trim() && (
                  <div className="absolute right-0 top-full mt-3 w-[450px] overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface-strong)] shadow-2xl backdrop-blur-xl">
                    <div className="max-h-[70vh] overflow-y-auto p-2">
                      {!hasSearchResults ? (
                        <div className="p-8 text-center">
                          <Search size={32} className="mx-auto mb-3 opacity-20" />
                          <p className="text-sm font-medium text-[var(--muted)]">No results found for "{globalSearch}"</p>
                        </div>
                      ) : (
                        <div className="space-y-4 p-2">
                          {searchResults.clients.length > 0 && (
                            <div>
                              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-[var(--accent)]">Clients</p>
                              {searchResults.clients.map(c => (
                                <button
                                  key={c.id}
                                  className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-[var(--soft)]"
                                  onClick={() => {
                                    setHighlightClientId(c.id)
                                    setCurrentPage('view-clients')
                                    setIsGlobalSearchOpen(false)
                                    setGlobalSearch('')
                                  }}
                                >
                                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]"><UsersRound size={16} /></div>
                                  <div>
                                    <p className="text-sm font-bold">{c.name}</p>
                                    <p className="text-[10px] text-[var(--muted)]">{c.phone}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}

                          {searchResults.orders.length > 0 && (
                            <div>
                              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-[var(--accent)]">Orders</p>
                              {searchResults.orders.map(o => (
                                <button
                                  key={o.id}
                                  className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-[var(--soft)]"
                                  onClick={() => {
                                    setHighlightOrderId(o.id)
                                    setCurrentPage('view-orders')
                                    setIsGlobalSearchOpen(false)
                                    setGlobalSearch('')
                                  }}
                                >
                                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--jewel)] text-white"><ShoppingBag size={16} /></div>
                                  <div>
                                    <p className="text-sm font-bold">{o.product} for {o.clientName}</p>
                                    <p className="text-[10px] text-[var(--muted)]">Order #{o.id} • {o.status}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}

                          {searchResults.inventory.length > 0 && (
                            <div>
                              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-[var(--accent)]">Inventory</p>
                              {searchResults.inventory.map(p => (
                                <button
                                  key={p.id}
                                  className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-[var(--soft)]"
                                  onClick={() => {
                                    setHighlightInventoryId(p.id)
                                    setCurrentPage('view-inventory')
                                    setIsGlobalSearchOpen(false)
                                    setGlobalSearch('')
                                  }}
                                >
                                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-stone-100 text-stone-600"><Package size={16} /></div>
                                  <div>
                                    <p className="text-sm font-bold">{p.productName}</p>
                                    <p className="text-[10px] text-[var(--muted)]">ID: {p.productId} • Stock: {p.quantity} {p.unit}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}

                          {searchResults.sales.length > 0 && (
                            <div>
                              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-[var(--accent)]">Sales Transactions</p>
                              {searchResults.sales.map(s => (
                                <button
                                  key={s.id}
                                  className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-[var(--soft)]"
                                  onClick={() => {
                                    setHighlightSaleId(s.saleId)
                                    setCurrentPage('view-sales')
                                    setIsGlobalSearchOpen(false)
                                    setGlobalSearch('')
                                  }}
                                >
                                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-green-50 text-green-600"><TrendingUp size={16} /></div>
                                  <div>
                                    <p className="text-sm font-bold">{s.saleId} - {s.client?.name}</p>
                                    <p className="text-[10px] text-[var(--muted)]">Total: ₹{s.total} • {new Date(s.timestamp).toLocaleDateString()}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="border-t border-[var(--border)] bg-[var(--soft)] px-4 py-2 text-[9px] font-bold text-[var(--muted)] uppercase">
                      Tip: Search by name, phone, order ID or product name
                    </div>
                  </div>
                )}
              </div>
              <div className="relative">
                <button
                  className="grid h-11 w-11 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] text-[var(--muted)] shadow-sm transition hover:text-[var(--accent)]"
                  onClick={() => setShowAlertsDropdown((value) => !value)}
                  type="button"
                >
                  <Bell size={18} />
                  {activities.length > 0 && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[var(--accent)] shadow" />}
                </button>
                {showAlertsDropdown && (
                  <div className="absolute right-0 mt-3 w-80 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] shadow-2xl shadow-black/10">
                    <div className="bg-[var(--soft)] px-4 py-3 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-semibold">Activity Notifications</p>
                        <p className="text-xs text-[var(--muted)]">{activities.length} recent events</p>
                      </div>
                      {activities.length > 0 && (
                        <button
                          className="text-xs font-semibold text-[var(--accent)] hover:underline"
                          onClick={() => {
                            setActivities([])
                            localStorage.setItem('activities', '[]')
                          }}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {activities.length > 0 ? activities.slice(0, 5).map(activity => (
                        <div key={activity.id} className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-[var(--soft)] border-b border-[var(--border)] last:border-0">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] mt-1">
                            <Bell size={14} />
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[var(--text)]">{activity.title}</p>
                            <p className="text-xs text-[var(--muted)] mt-0.5 break-words">{activity.description}</p>
                            <div className="mt-1.5 flex items-center justify-between gap-2">
                              <p className="text-[10px] text-[var(--muted)] font-medium">{formatDateTimeDDMMYY(activity.timestamp)}</p>
                              <p className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[9px] font-bold text-[var(--accent)]">
                                {activity.actor}
                              </p>
                            </div>
                          </div>
                        </div>
                      )) : (
                        <div className="px-4 py-8 text-center text-sm text-[var(--muted)]">No recent activity</div>
                      )}
                    </div>
                    {activities.length > 5 && (
                      <button
                        className="flex w-full items-center justify-center gap-2 border-t border-[var(--border)] px-4 py-3 text-sm font-semibold text-[var(--accent)] transition hover:bg-[var(--soft)]"
                        type="button"
                        onClick={() => {
                          setShowAlertsDropdown(false)
                          setShowAllNotifications(true)
                        }}
                      >
                        View all notifications
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  className="flex h-11 items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-2 pr-3 text-left shadow-sm transition hover:border-[var(--accent)]"
                  onClick={() => setShowAccountMenu((value) => !value)}
                  type="button"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-white p-0.5 shadow-sm">
                    <img src="/logo-black.png" alt="AD" className="h-full w-full object-contain" />
                  </span>
                  <span className="hidden leading-tight sm:block">
                    <span className="block text-sm font-semibold truncate max-w-[100px]">{currentUserName}</span>
                    <span className="block text-xs text-[var(--muted)]">{user?.email || 'admin@classy.com'}</span>
                  </span>
                  <ChevronDown size={16} className="text-[var(--muted)]" />
                </button>

                {showAccountMenu && (
                  <div className="absolute right-0 mt-3 w-72 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] shadow-2xl shadow-black/10">
                    <div className="bg-[var(--soft)] px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span className="grid h-11 w-11 place-items-center rounded-lg bg-[var(--accent)] font-black text-white">
                          AD
                        </span>
                        <div>
                          <p className="text-sm font-semibold truncate">{currentUserName}</p>
                          <p className="text-xs text-[var(--muted)]">{user?.email || 'admin@classy.com'}</p>
                        </div>
                      </div>
                    </div>
                    <button
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--soft)]"
                      onClick={() => {
                        setShowAccountMenu(false)
                        setShowAccountPanel(true)
                      }}
                      type="button"
                    >
                      <Settings size={17} /> Account Details
                    </button>
                    <button
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-[var(--accent)] transition hover:bg-[var(--soft)]"
                      onClick={onLogout}
                      type="button"
                    >
                      <LogOut size={17} /> Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 bg-[var(--background)] relative">
          {globalToast && (
            <div className="fixed right-6 top-6 z-[100] flex items-center gap-3 rounded-2xl border border-[var(--accent)] bg-[var(--surface-strong)] px-6 py-4 shadow-2xl shadow-black/20">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--accent)] text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">{globalToast.title}</p>
                <p className="text-xs text-[var(--muted)]">{globalToast.message}</p>
              </div>
            </div>
          )}
          <div className="space-y-6 p-5 lg:p-8 pb-28 lg:pb-8">
            {currentPage === 'overview' && (
              <>
                <section className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--jewel)] text-white shadow-[var(--shadow)]">
                  <div className="grid gap-6 bg-[var(--hero)] p-6 md:grid-cols-[1fr_320px] lg:p-8">
                    <div>
                      <p className="flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-[#f8e6dc]">
                        <Palette size={16} /> Spring bridal collection is live
                      </p>
                      <h2 className="mt-5 max-w-2xl text-4xl font-semibold leading-tight lg:text-5xl">
                        Boutique operations with fittings, fabrics, and client moments in one view.
                      </h2>
                      <div className="mt-6 flex flex-wrap gap-3">
                        {['42 priority orders', '18 fittings today', '96% delivery score'].map((item) => (
                          <span className="rounded-xl border border-white/10 bg-white/12 px-4 py-2 text-sm font-semibold backdrop-blur" key={item}>
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                    {user?.role === 'Admin' && (
                      <div className="rounded-2xl border border-white/15 bg-white/12 p-5 backdrop-blur">
                        <p className="flex items-center gap-2 text-sm text-[#f8e6dc]">
                          <TrendingUp size={16} /> Revenue pulse
                        </p>
                        <p className="mt-3 text-5xl font-semibold">₹{allSales.reduce((acc, s) => acc + (parseFloat(s.totalAmount) || 0), 0).toLocaleString()}</p>
                        <div className="mt-5 space-y-3">
                          {['Bridal wear', 'Luxury pret', 'Alterations'].map((item, index) => (
                            <div key={item}>
                              <div className="mb-1 flex justify-between text-xs text-[#f8e6dc]">
                                <span>{item}</span>
                                <span>{[78, 54, 38][index]}%</span>
                              </div>
                              <div className="h-2 rounded-full bg-white/15">
                                <div className="h-2 rounded-full bg-[#f4ded2]" style={{ width: `${[78, 54, 38][index]}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {!cloudLoaded ? (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      { label: 'Revenue', icon: TrendingUp },
                      { label: 'Orders', icon: ShoppingBag },
                      { label: 'Clients', icon: UsersRound },
                      { label: 'Inventory', icon: Package }
                    ].map((item, i) => (
                      <div key={i} className="relative overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm opacity-60">
                        <div className="mb-5 flex items-center justify-between">
                          <div className="h-11 w-11 animate-pulse rounded-xl bg-[var(--soft)] flex items-center justify-center text-[var(--muted)]">
                            <item.icon size={20} />
                          </div>
                          <div className="h-6 w-12 animate-pulse rounded-full bg-[var(--soft)]" />
                        </div>
                        <div className="h-4 w-20 animate-pulse rounded bg-[var(--soft)] mb-3" />
                        <div className="h-8 w-32 animate-pulse rounded bg-[var(--soft)]" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {liveStats.map((stat) => {
                      const Icon = stat.icon
                      return (
                        <article key={stat.label} className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] backdrop-blur transition hover:-translate-y-0.5">
                          <div className="mb-5 flex items-center justify-between">
                            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                              <Icon size={21} />
                            </span>
                            <span className="rounded-full bg-[var(--soft)] px-3 py-1 text-xs font-semibold text-[var(--jewel)]">
                              Live
                            </span>
                          </div>
                          <p className="text-sm text-[var(--muted)]">{stat.label}</p>
                          <h3 className="mt-3 text-3xl font-semibold">{stat.value}</h3>
                          <p className="mt-2 text-sm font-medium text-[var(--jewel)]">{stat.note}</p>
                        </article>
                      )
                    })}
                  </section>
                )}

                <section className={`grid gap-6 ${user?.role === 'Admin' ? 'xl:grid-cols-[1.45fr_0.8fr]' : 'grid-cols-1'}`}>
                  <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] backdrop-blur">
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-semibold">Live boutique orders</h2>
                        <p className="text-sm text-[var(--muted)]">Production queue for this week</p>
                      </div>
                      <button
                        className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-semibold hover:bg-[var(--soft)] transition"
                        type="button"
                        onClick={() => setCurrentPage('view-orders')}
                      >
                        View all
                      </button>
                    </div>
                    <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
                      {liveRecentOrders.map((o) => (
                        <div className="grid gap-3 border-b border-[var(--border)] px-4 py-4 last:border-b-0 md:grid-cols-[1fr_1fr_150px_90px]" key={o.id}>
                          <span className="font-semibold">{o.clientName}</span>
                          <span className="text-[var(--muted)]">{o.product}</span>
                          <span className="w-fit rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">{o.status}</span>
                          <span className="font-semibold md:text-right">{o.price}</span>
                        </div>
                      ))}
                      {liveRecentOrders.length === 0 && (
                        <p className="p-8 text-center text-sm text-[var(--muted)]">No active orders found.</p>
                      )}
                    </div>
                  </div>

                  {user?.role === 'Admin' && (
                    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--jewel)] p-5 text-white shadow-[var(--shadow)]">
                      <h2 className="flex items-center gap-2 text-xl font-semibold">
                        <ShieldCheck size={20} /> Team pulse
                      </h2>
                      <p className="mt-1 text-sm text-[#cce0da]">Staff activities today</p>
                      <div className="mt-5 space-y-3">
                        {liveActivities.map((act) => (
                          <div className="rounded-md bg-white/10 p-4" key={act.id}>
                            <p className="text-sm text-[#cce0da]">{new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            <p className="font-semibold">{act.title}</p>
                            <p className="text-sm text-[#dfeee9]">{act.actor || 'System'}</p>
                          </div>
                        ))}
                        {liveActivities.length === 0 && (
                          <p className="p-4 text-center text-sm text-[#cce0da] italic">No recent activity.</p>
                        )}
                      </div>
                    </div>
                  )}
                </section>

                <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                  {user?.role === 'Admin' && (
                    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] backdrop-blur">
                      <h2 className="flex items-center gap-2 text-xl font-semibold">
                        <Package size={20} /> Featured inventory
                      </h2>
                      <div className="mt-5 space-y-4">
                        {liveRecentProducts.map((p, index) => (
                          <div className="flex items-center gap-4" key={p.productId}>
                            <div className={`h-16 w-16 rounded-md ${['bg-[#c76f5a]', 'bg-[#f0d8c8]', 'bg-[#1f6f63]'][index % 3]}`} />
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold">{p.productName}</p>
                              <p className="text-sm text-[var(--muted)]">Stock: {p.quantity} {p.unit}</p>
                            </div>
                            <span className="rounded-full bg-[var(--soft)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                              {p.category}
                            </span>
                          </div>
                        ))}
                        {liveRecentProducts.length === 0 && (
                          <p className="p-8 text-center text-sm text-[var(--muted)] italic">Inventory is empty.</p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] backdrop-blur">
                    <h2 className="flex items-center gap-2 text-xl font-semibold">
                      <ShieldCheck size={20} /> Client elegance score
                    </h2>
                    <p className="mt-1 text-sm text-[var(--muted)]">Retention, repeat orders, and consultation quality</p>
                    <div className="mt-6 grid gap-4 sm:grid-cols-3">
                      {['Retention 92%', 'Repeat orders 68%', 'On-time delivery 96%'].map((item) => (
                        <div className="rounded-2xl bg-[var(--soft)] p-4" key={item}>
                          <p className="text-2xl font-semibold">{item.split(' ').at(-1)}</p>
                          <p className="mt-1 text-sm text-[var(--muted)]">{item.replace(item.split(' ').at(-1), '')}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </>
            )}
            <Suspense fallback={
              <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
                <div className="relative h-16 w-16">
                  <div className="absolute inset-0 rounded-full border-4 border-[var(--accent-soft)]"></div>
                  <div className="absolute inset-0 animate-spin rounded-full border-4 border-[var(--accent)] border-t-transparent"></div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold uppercase tracking-widest text-[var(--accent)]"></p>
                </div>
              </div>
            }>
                {currentPage === 'add-order' && <AddOrderPage themeStyle={themeStyle} setCurrentPage={setCurrentPage} showGlobalToast={showGlobalToast} orders={orders} setOrders={setOrders} clients={clients} inventory={inventory} setInventory={setInventory} orderTypes={orderTypes} setOrderTypes={setOrderTypes} />}
              {currentPage === 'view-orders' && <ViewOrdersPage themeStyle={themeStyle} setCurrentPage={setCurrentPage} showGlobalToast={showGlobalToast} currentUser={user} highlightOrderId={highlightOrderId} setHighlightOrderId={setHighlightOrderId} orders={orders} setOrders={setOrders} inventory={inventory} setInventory={setInventory} />}
              {currentPage === 'add-clients' && <AddClientsPage themeStyle={themeStyle} setCurrentPage={setCurrentPage} showGlobalToast={showGlobalToast} currentUser={user} clients={clients} setClients={setClients} />}
              {currentPage === 'view-clients' && <ViewClientsPage themeStyle={themeStyle} setCurrentPage={setCurrentPage} setSelectedClient={setSelectedClient} setClientDetailMode={setClientDetailMode} showGlobalToast={showGlobalToast} currentUser={user} highlightClientId={highlightClientId} setHighlightClientId={setHighlightClientId} clients={clients} setClients={setClients} />}
              {currentPage === 'client-detail' && <ClientDetailPage themeStyle={themeStyle} client={selectedClient} setCurrentPage={setCurrentPage} setSelectedClient={setSelectedClient} initialMode={clientDetailMode} setClientDetailMode={setClientDetailMode} showGlobalToast={showGlobalToast} currentUser={user} clients={clients} setClients={setClients} />}
                {currentPage === 'create-inventory' && <CreateInventoryPage themeStyle={themeStyle} setCurrentPage={setCurrentPage} showGlobalToast={showGlobalToast} inventory={inventory} setInventory={setInventory} productTypes={productTypes} setProductTypes={setProductTypes} inventoryUnits={inventoryUnits} setInventoryUnits={setInventoryUnits} />}
              {currentPage === 'view-inventory' && <ViewInventoryPage themeStyle={themeStyle} setCurrentPage={setCurrentPage} showGlobalToast={showGlobalToast} setSelectedInventoryItem={setSelectedInventoryItem} setInventoryDetailMode={setInventoryDetailMode} highlightInventoryId={highlightInventoryId} setHighlightInventoryId={setHighlightInventoryId} inventory={inventory} setInventory={setInventory} />}
              {currentPage === 'inventory-detail' && <InventoryDetailPage themeStyle={themeStyle} item={selectedInventoryItem} setCurrentPage={setCurrentPage} setSelectedInventoryItem={setSelectedInventoryItem} initialMode={inventoryDetailMode} setInventoryDetailMode={setInventoryDetailMode} showGlobalToast={showGlobalToast} currentUser={user} inventory={inventory} setInventory={setInventory} />}
              {currentPage === 'create-sales' && <CreateSalesPage themeStyle={themeStyle} setCurrentPage={setCurrentPage} showGlobalToast={showGlobalToast} currentUser={user} sales={sales} setSales={setSales} clients={clients} setClients={setClients} orders={orders} setOrders={setOrders} inventory={inventory} setInventory={setInventory} />}
              {currentPage === 'view-sales' && <ViewSalesPage themeStyle={themeStyle} setCurrentPage={setCurrentPage} showGlobalToast={showGlobalToast} currentUser={user} highlightSaleId={highlightSaleId} setHighlightSaleId={setHighlightSaleId} sales={sales} setSales={setSales} inventory={inventory} setInventory={setInventory} orders={orders} setOrders={setOrders} />}
              {currentPage === 'reports' && <ReportsPage themeStyle={themeStyle} showGlobalToast={showGlobalToast} currentUser={user} sales={sales} orders={orders} clients={clients} inventory={inventory} />}
              {currentPage === 'create-user' && <CreateUserPage themeStyle={themeStyle} setCurrentPage={setCurrentPage} showGlobalToast={showGlobalToast} users={users} setUsers={setUsers} designations={designations} setDesignations={setDesignations} currentUser={user} />}
              {currentPage === 'view-users' && <ViewUsersPage themeStyle={themeStyle} setCurrentPage={setCurrentPage} showGlobalToast={showGlobalToast} users={users} setUsers={setUsers} designations={designations} setDesignations={setDesignations} currentUser={user} />}
            </Suspense>
          </div>
        </div>
      </div>

      {showAccountPanel && (
        <AccountDetailsModal
          fullUser={loggedInUserInList}
          onClose={() => setShowAccountPanel(false)}
          onChanged={onLogout}
          onLogout={onLogout}
          themeStyle={themeStyle}
        />
      )}

      {showAllNotifications && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/50 px-4 backdrop-blur-sm" style={themeStyle}>
          <div className="w-full max-w-2xl overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface-strong)] shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-[var(--border)] p-6 pb-5">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-[var(--text)]">
                <Bell size={20} className="text-[var(--accent)]" /> All Notifications
              </h2>
              <div className="flex items-center gap-4">
                {activities.length > 0 && (
                  <button
                    className="text-sm font-semibold text-red-500 hover:text-red-600 transition"
                    onClick={() => {
                      setActivities([])
                      localStorage.setItem('activities', '[]')
                      setNotificationsPage(1)
                    }}
                  >
                    Clear All
                  </button>
                )}
                <button
                  className="rounded-full p-2 text-[var(--muted)] transition hover:bg-[var(--soft)] hover:text-[var(--text)]"
                  onClick={() => setShowAllNotifications(false)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {activities.length > 0 ? (
                activities.slice((notificationsPage - 1) * notificationsPerPage, notificationsPage * notificationsPerPage).map(activity => (
                  <div key={activity.id} className="flex items-start gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition hover:bg-[var(--soft)]">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] mt-0.5">
                      <Bell size={18} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                        <p className="text-base font-semibold text-[var(--text)]">{activity.title}</p>
                        <span className="rounded-md bg-[var(--soft)] px-2 py-1 text-xs font-semibold text-[var(--muted)]">By {activity.actor}</span>
                      </div>
                      <p className="text-sm text-[var(--text)] opacity-90">{activity.description}</p>
                      <p className="mt-2 text-xs font-medium text-[var(--muted)] opacity-75">{formatDateTimeDDMMYY(activity.timestamp)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center">
                  <Bell size={48} className="mx-auto text-[var(--muted)] opacity-30 mb-4" />
                  <p className="text-[var(--muted)] font-medium">No activity recorded yet.</p>
                </div>
              )}
            </div>

            {activities.length > notificationsPerPage && (
              <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--surface)] p-4">
                <p className="text-sm text-[var(--muted)]">
                  Showing {((notificationsPage - 1) * notificationsPerPage) + 1} to {Math.min(notificationsPage * notificationsPerPage, activities.length)} of {activities.length}
                </p>
                <div className="flex gap-2">
                  <button
                    className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-semibold transition hover:bg-[var(--soft)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--text)]"
                    onClick={() => setNotificationsPage(p => Math.max(1, p - 1))}
                    disabled={notificationsPage === 1}
                  >
                    Previous
                  </button>
                  <button
                    className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-semibold transition hover:bg-[var(--soft)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--text)]"
                    onClick={() => setNotificationsPage(p => Math.min(Math.ceil(activities.length / notificationsPerPage), p + 1))}
                    disabled={notificationsPage === Math.ceil(activities.length / notificationsPerPage)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fixed Theme Button */}
      <button
        className="fixed right-0 top-1/2 z-[90] -translate-y-1/2 flex h-14 w-12 items-center justify-center rounded-l-2xl border border-r-0 border-[var(--border)] bg-[var(--surface-strong)] shadow-[var(--shadow)] transition-all hover:w-14 hover:bg-[var(--soft)]"
        onClick={() => setShowThemeDropdown(true)}
      >
        <Palette size={20} className="text-[var(--accent)]" />
      </button>

      {/* Slide-out Theme Panel */}
      <div className={`fixed inset-0 z-[100] transition-opacity duration-300 ${showThemeDropdown ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]" onClick={() => setShowThemeDropdown(false)} />
        <div className={`absolute right-0 top-0 bottom-0 w-80 border-l border-[var(--border)] bg-[var(--surface-strong)] shadow-[var(--shadow)] transition-transform duration-300 ${showThemeDropdown ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--text)]">
              <Palette size={20} className="text-[var(--accent)]" /> Theme Settings
            </h2>
            <button onClick={() => setShowThemeDropdown(false)} className="rounded-xl p-2 text-[var(--muted)] transition hover:bg-[var(--soft)] hover:text-[var(--text)]">
              <ChevronRight size={20} />
            </button>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Appearance</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-semibold transition-all ${appearance === 'light' ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--accent)]'}`}
                  onClick={() => setAppearance('light')}
                >
                  <Sun size={16} /> Light
                </button>
                <button
                  className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-semibold transition-all ${appearance === 'dark' ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--accent)]'}`}
                  onClick={() => setAppearance('dark')}
                >
                  <Moon size={16} /> Dark
                </button>
              </div>
            </div>
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Color Palette</p>
              <div className="space-y-3">
                {Object.entries(boutiqueThemes).map(([key, theme]) => (
                  <button
                    className={`flex w-full items-center justify-between rounded-xl border p-4 transition-all ${themeName === key ? 'border-[var(--accent)] bg-[var(--soft)] shadow-sm' : 'border-[var(--border)] bg-transparent hover:border-[var(--accent)]'}`}
                    key={key}
                    onClick={() => setThemeName(key)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="h-5 w-5 rounded-full shadow-sm" style={{ backgroundColor: theme.accent }} />
                      <span className={`font-semibold ${themeName === key ? 'text-[var(--accent)]' : 'text-[var(--text)]'}`}>{theme.name}</span>
                    </div>
                    {themeName === key && <Crown size={16} className="text-[var(--accent)]" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-[80] border-t border-[var(--border)] bg-[var(--surface-strong)]/80 p-2 pb-6 backdrop-blur-xl shadow-[0_-10px_40px_rgba(0,0,0,0.08)] lg:hidden">
        <div className="flex items-center justify-around">
          {[
            { id: 'overview', icon: LayoutDashboard, label: 'Home' },
            { id: 'view-clients', icon: UsersRound, label: 'Clients' },
            { id: 'view-orders', icon: ShoppingBag, label: 'Orders' },
            { id: 'view-sales', icon: TrendingUp, label: 'Sales' },
            { id: 'view-inventory', icon: Package, label: 'Stock', adminOnly: true },
            { id: 'reports', icon: BarChart3, label: 'Reports', adminOnly: true },
          ].filter(item => !item.adminOnly || user?.role === 'Admin').map((item) => {
            const isActive = activeSidebarPage === item.id;
            return (
              <button
                key={item.id}
                className={`flex flex-col items-center gap-1 p-2 transition-all ${isActive ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`}
                onClick={() => setCurrentPage(item.id)}
              >
                <item.icon size={isActive ? 22 : 20} />
                <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
                {isActive && <span className="h-1 w-1 rounded-full bg-[var(--accent)]" />}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  )
}

export default Dashboard;
