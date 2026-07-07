import React, { useState, useEffect } from 'react'
import LoginScreen from './components/LoginScreen'
import Dashboard from './components/Dashboard'
import DeliveryAlertModal from './components/DeliveryAlertModal'
import PublicReceipt from './components/PublicReceipt'
import ClassyAI from './components/ClassyAI'
import { boutiqueThemes, appearanceTokens } from './utils/constants'
import supabase from './supabase'
import IOSInstallPrompt from './components/IOSInstallPrompt';
import PwaUpdateModal from './components/PwaUpdateModal';
import PushPermissionModal from './components/PushPermissionModal';

function App() {
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  // SHARED STATES
  const [users, setUsers] = useState(() => { try { return JSON.parse(localStorage.getItem('erp_users') || '[]') } catch (e) { return [] } })
  const [designations, setDesignations] = useState(() => { try { return JSON.parse(localStorage.getItem('erp_designations') || '[]') } catch (e) { return [] } })
  const [clients, setClients] = useState(() => { try { return JSON.parse(localStorage.getItem('clients') || '[]') } catch (e) { return [] } })
  const [orders, setOrders] = useState(() => { try { return JSON.parse(localStorage.getItem('orders') || '[]') } catch (e) { return [] } })
  const [inventory, setInventory] = useState(() => { try { return JSON.parse(localStorage.getItem('inventory') || '[]') } catch (e) { return [] } })
  const [sales, setSales] = useState(() => { try { return JSON.parse(localStorage.getItem('sales') || '[]') } catch (e) { return [] } })
  const [activities, setActivities] = useState(() => { try { return JSON.parse(localStorage.getItem('activities') || '[]') } catch (e) { return [] } })
  const [orderTypes, setOrderTypes] = useState(() => { try { return JSON.parse(localStorage.getItem('orderTypes') || '["Customisation", "Stitching"]') } catch (e) { return ["Customisation", "Stitching"] } })
  const [productTypes, setProductTypes] = useState(() => { try { return JSON.parse(localStorage.getItem('productTypes') || '[]') } catch (e) { return [] } })
  const [inventoryUnits, setInventoryUnits] = useState(() => { try { return JSON.parse(localStorage.getItem('inventoryUnits') || '["nos", "mtr", "kg", "yd", "set"]') } catch (e) { return ["nos", "mtr", "kg", "yd", "set"] } })
  const [orderLimits, setOrderLimits] = useState(() => { try { return JSON.parse(localStorage.getItem('orderLimits') || '{}') } catch (e) { return {} } })
  const [incomeCategories, setIncomeCategories] = useState(() => { try { return JSON.parse(localStorage.getItem('incomeCategories') || '["Sales", "Service", "Commission", "Other"]') } catch (e) { return ["Sales", "Service", "Commission", "Other"] } })
  const [expenseCategories, setExpenseCategories] = useState(() => { try { return JSON.parse(localStorage.getItem('expenseCategories') || '["Rent", "Salaries", "Materials & Fabric", "Utilities", "Marketing", "Maintenance", "Other", "Staff Salary", "Overtime Payment"]') } catch (e) { return ["Rent", "Salaries", "Materials & Fabric", "Utilities", "Marketing", "Maintenance", "Other", "Staff Salary", "Overtime Payment"] } })
  const [staffList, setStaffList] = useState(() => { try { return JSON.parse(localStorage.getItem('staffList') || '[]') } catch (e) { return [] } })
  const [cloudLoaded, setCloudLoaded] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState(null)
  const [syncError, setSyncError] = useState(null)

  // REAL-TIME SYNC FROM SUPABASE
  useEffect(() => {
    if (!isLoggedIn) return;
    let isMounted = true;
    const fetchData = async () => {
      try {
        const [u, c, o, s, i, a, cfg] = await Promise.all([
          supabase.from('erp_users').select('*'),
          supabase.from('erp_clients').select('*'),
          supabase.from('erp_orders').select('*'),
          supabase.from('erp_sales').select('*'),
          supabase.from('erp_inventory').select('*'),
          supabase.from('erp_activities').select('*').order('id', { ascending: false }).limit(100),
          supabase.from('erp_config').select('*')
        ]);

        if (!isMounted) return;

        if (u.data) setUsers(u.data.map(item => item.data || item));
        if (c.data) setClients(c.data.map(item => item.data || item));
        if (o.data) setOrders(o.data.map(item => item.data || item));
        if (s.data) setSales(s.data.map(item => item.data || item));
        if (i.data) setInventory(i.data.map(item => item.data || item));
        if (a.data) {
          const fetchedActivities = a.data.map(item => item.data || item);
          
          const idsToDelete = [];
          const now = new Date();
          const oneDayAgo = new Date(now.getTime() - (1 * 24 * 60 * 60 * 1000));
          
          fetchedActivities.forEach((act, index) => {
             const isOld = new Date(act.timestamp) < oneDayAgo;
             const isBeyond10 = index >= 10;
             if (isOld && isBeyond10) {
                 idsToDelete.push(act.id);
             }
          });
          
          if (idsToDelete.length > 0) {
             supabase.from('erp_activities').delete().in('id', idsToDelete.map(String)).then(() => {});
          }

          const activeActivities = fetchedActivities.filter(act => !idsToDelete.includes(act.id));
          setActivities(activeActivities);
        }

        if (cfg.data) {
          cfg.data.forEach(item => {
            if (item.id === 'designations') setDesignations(item.data);
            if (item.id === 'orderTypes') setOrderTypes(item.data);
            if (item.id === 'productTypes') setProductTypes(item.data);
            if (item.id === 'inventoryUnits') setInventoryUnits(item.data);
            if (item.id === 'orderLimits') setOrderLimits(item.data);
            if (item.id === 'incomeCategories') setIncomeCategories(item.data);
            if (item.id === 'expenseCategories') setExpenseCategories(item.data);
            if (item.id === 'staffList') setStaffList(item.data);
          });
        }
        setCloudLoaded(true);
      } catch (err) {
        console.error("Supabase Load Error:", err);
        setSyncError("Failed to load cloud data");
        setCloudLoaded(true);
      }
    };

    fetchData();

    // Set up Realtime Subscriptions
    const handlePayload = (payload, setState) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        const newData = payload.new.data || payload.new;
        if (!newData.id) newData.id = payload.new.id;
        setState(prev => {
           const existing = prev.findIndex(item => {
             const itemId = item.id || item.clientId || item.productId || item.saleId || item.email;
             return itemId && itemId.toString() === payload.new.id.toString();
           });
           if (existing >= 0) {
             const next = [...prev];
             next[existing] = newData;
             return next;
           }
           return [...prev, newData];
        });
      } else if (payload.eventType === 'DELETE') {
        setState(prev => prev.filter(item => {
           const itemId = item.id || item.clientId || item.productId || item.saleId || item.email;
           return itemId && itemId.toString() !== payload.old.id.toString();
        }));
      }
    };

    const channels = [
      supabase.channel('erp_users').on('postgres_changes', { event: '*', schema: 'public', table: 'erp_users' }, (p) => handlePayload(p, setUsers)).subscribe(),
      supabase.channel('erp_clients').on('postgres_changes', { event: '*', schema: 'public', table: 'erp_clients' }, (p) => handlePayload(p, setClients)).subscribe(),
      supabase.channel('erp_orders').on('postgres_changes', { event: '*', schema: 'public', table: 'erp_orders' }, (p) => handlePayload(p, setOrders)).subscribe(),
      supabase.channel('erp_sales').on('postgres_changes', { event: '*', schema: 'public', table: 'erp_sales' }, (p) => handlePayload(p, setSales)).subscribe(),
      supabase.channel('erp_inventory').on('postgres_changes', { event: '*', schema: 'public', table: 'erp_inventory' }, (p) => handlePayload(p, setInventory)).subscribe(),
      supabase.channel('erp_config').on('postgres_changes', { event: '*', schema: 'public', table: 'erp_config' }, () => fetchData()).subscribe()
    ];

    return () => {
      isMounted = false;
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [isLoggedIn]);

  // LOCAL PERSISTENCE
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
  useEffect(() => { localStorage.setItem('orderLimits', JSON.stringify(orderLimits)) }, [orderLimits])
  useEffect(() => { localStorage.setItem('incomeCategories', JSON.stringify(incomeCategories)) }, [incomeCategories])
  useEffect(() => { localStorage.setItem('expenseCategories', JSON.stringify(expenseCategories)) }, [expenseCategories])
  useEffect(() => { localStorage.setItem('staffList', JSON.stringify(staffList)) }, [staffList])


  // 1. RECOVER SUPABASE SESSION
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // Fetch profile from erp_users to get Name/Role
          const { data: profileData, error: profileError } = await supabase
            .from('erp_users')
            .select('*')
            .eq('id', session.user.email)
            .single();

          if (profileError && (profileError.code === 'PGRST301' || profileError.message?.toLowerCase().includes('jwt'))) {
            console.warn("Session token appears invalid/expired. Attempting manual refresh...");
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError || !refreshData.session) {
              console.error("Session refresh failed, signing out.");
              await supabase.auth.signOut();
              setUser(null);
              setIsLoggedIn(false);
              setIsAuthLoading(false);
              return;
            }
            // If refresh succeeded, it will trigger onAuthStateChange which will handle the rest.
            return;
          }

          if (profileData) {
            const profile = profileData.data || profileData;
            setUser({
              id: profile.id || profile.email,
              email: profile.email,
              name: profile.name,
              role: profile.designation || 'Staff'
            });
          } else {
            setUser({ 
              id: session.user.id, 
              email: session.user.email, 
              name: session.user.email.split('@')[0], 
              role: 'Admin' 
            });
          }
          setIsLoggedIn(true);
        }
      } catch (err) {
        console.error("Auth Init Error:", err);
      } finally {
        // Ensure preloader stays for at least 1.5 seconds for branding
        setTimeout(() => {
          setIsAuthLoading(false);
        }, 1500);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser)
    setIsLoggedIn(true)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null)
    setIsLoggedIn(false)
    localStorage.removeItem('erp_session')
  }

  // 0. DETECT DIGITAL RECEIPT MODE (Synchronous to avoid mobile race conditions)
  const getInitialBillId = () => {
    if (typeof window === 'undefined') return null;

    let id = null;

    // 1. Path-based: /bill/SALE-xxxx  ← Most reliable on iOS Safari & WhatsApp
    //    iOS never strips URL path segments unlike query params
    const pathMatch = window.location.pathname.match(/\/bill\/([^/?#]+)/);
    if (pathMatch && pathMatch[1]) id = decodeURIComponent(pathMatch[1]);

    // 2. Standard Search Params: ?bill=SALE-xxxx
    if (!id) {
      const searchParams = new URLSearchParams(window.location.search);
      id = searchParams.get('bill');
    }

    // 3. Hash Params (some social apps move query params into hash)
    if (!id) {
      const hash = window.location.hash;
      if (hash.includes('bill=')) {
        const hashSearchParams = new URLSearchParams(hash.substring(hash.indexOf('?') !== -1 ? hash.indexOf('?') + 1 : 1));
        id = hashSearchParams.get('bill');
      }
    }

    // 4. Regex Fallback across entire href
    if (!id) {
      const match = window.location.href.match(/[?&/]bill[=/]([^&?#/]+)/);
      if (match && match[1]) id = decodeURIComponent(match[1]);
    }

    return id?.trim() || null;
  };

  const getInitialPayslipId = () => {
    if (typeof window === 'undefined') return null;
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get('payslip');
  };

  const [activeBillId, setActiveBillId] = useState(getInitialBillId);
  const [activePayslipId] = useState(getInitialPayslipId);
  const [currentPage, setCurrentPage] = useState(() => localStorage.getItem('erp_current_page') || 'overview');
  const [appearance, setAppearance] = useState(() => localStorage.getItem('erp_appearance') || 'light')
  const [themeName, setThemeName] = useState(() => localStorage.getItem('erp_theme_name') || 'champagne')

  useEffect(() => {
    localStorage.setItem('erp_appearance', appearance);
  }, [appearance]);

  useEffect(() => {
    localStorage.setItem('erp_theme_name', themeName);
  }, [themeName]);
  const [selectedClient, setSelectedClient] = useState(() => {
    try {
      const saved = localStorage.getItem('erp_selected_client');
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  })
  const [clientDetailMode, setClientDetailMode] = useState(() => localStorage.getItem('erp_client_mode') || 'view')

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

  useEffect(() => {
    localStorage.setItem('erp_current_page', currentPage);
  }, [currentPage]);

  useEffect(() => {
    if (selectedClient) localStorage.setItem('erp_selected_client', JSON.stringify(selectedClient));
    else localStorage.removeItem('erp_selected_client');
  }, [selectedClient]);

  useEffect(() => {
    localStorage.setItem('erp_client_mode', clientDetailMode);
  }, [clientDetailMode]);

  // Sync state if URL changes (e.g. back/forward buttons)
  useEffect(() => {
    const handlePopState = () => {
      const bId = getInitialBillId();
      if (bId !== activeBillId) setActiveBillId(bId);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeBillId]);

  const clearBill = () => {
    localStorage.removeItem('active_bill_id');
    setActiveBillId(null);
  };

  if (activePayslipId) {
    const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(activePayslipId);
    window.location.href = publicUrl;
    return <div style={{ display: 'grid', height: '100vh', placeItems: 'center', fontFamily: 'sans-serif', background: '#f8f9fa' }}><h3 style={{ color: '#333' }}>Loading Payslip Document...</h3></div>;
  }

  if (activeBillId) {
    return <PublicReceipt billId={activeBillId} onClear={clearBill} />;
  }

  return (
    <div style={themeStyle}>
      <main className="min-h-screen bg-[var(--app-bg)] text-[var(--text)] transition-colors duration-300">
        {!isLoggedIn ? (
          <LoginScreen onLogin={handleLogin} users={users} />
        ) : (
          <>
            <Dashboard
              isAuthLoading={isAuthLoading}
              onLogout={handleLogout}
              user={user}
              themeStyle={themeStyle}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              appearance={appearance} setAppearance={setAppearance}
              themeName={themeName} setThemeName={setThemeName}
              orderLimits={orderLimits} setOrderLimits={setOrderLimits}
              users={users} setUsers={setUsers}
              designations={designations} setDesignations={setDesignations}
              clients={clients} setClients={setClients}
              orders={orders} setOrders={setOrders}
              inventory={inventory} setInventory={setInventory}
              sales={sales} setSales={setSales}
              activities={activities} setActivities={setActivities}
              orderTypes={orderTypes} setOrderTypes={setOrderTypes}
              productTypes={productTypes} setProductTypes={setProductTypes}
              inventoryUnits={inventoryUnits} setInventoryUnits={setInventoryUnits}
              incomeCategories={incomeCategories} setIncomeCategories={setIncomeCategories}
              expenseCategories={expenseCategories} setExpenseCategories={setExpenseCategories}
              staffList={staffList} setStaffList={setStaffList}
              cloudLoaded={cloudLoaded}
              syncError={syncError}
              selectedClient={selectedClient}
              setSelectedClient={setSelectedClient}
              clientDetailMode={clientDetailMode}
              setClientDetailMode={setClientDetailMode}
              // Direct Save Functions for Supabase (FLEXIBLE SCHEMA & COMPRESSED)
              saveInventory={async (inv) => {
                const clean = (obj) => JSON.parse(JSON.stringify(obj, (k, v) => v === "" ? undefined : v));
                const { error } = await supabase.from('erp_inventory').upsert([{ id: (inv.id || inv.productId).toString(), data: clean(inv) }]);
                if (error) console.error("Save Failed: ", error.message);
              }}
              saveSale={async (s) => {
                const clean = (obj) => JSON.parse(JSON.stringify(obj, (k, v) => v === "" ? undefined : v));
                const { error } = await supabase.from('erp_sales').upsert([{ id: (s.id || s.saleId).toString(), data: clean(s) }]);
                if (error) console.error("Save Failed: ", error.message);
              }}
              saveOrder={async (o) => {
                const clean = (obj) => JSON.parse(JSON.stringify(obj, (k, v) => v === "" ? undefined : v));
                const { error } = await supabase.from('erp_orders').upsert([{ id: (o.id || o.orderId).toString(), data: clean(o) }]);
                if (error) console.error("Save Failed: ", error.message);
              }}
              saveClient={async (c) => {
                const clean = (obj) => JSON.parse(JSON.stringify(obj, (k, v) => v === "" ? undefined : v));
                const { error } = await supabase.from('erp_clients').upsert([{ id: (c.id || c.clientId || c.phone).toString(), data: clean(c) }]);
                if (error) console.error("Save Failed: ", error.message);
              }}
              saveUser={async (u) => {
                const clean = (obj) => JSON.parse(JSON.stringify(obj, (k, v) => v === "" ? undefined : v));
                const { error } = await supabase.from('erp_users').upsert([{ id: u.email, data: clean(u) }]);
                if (error) console.error("Save Failed: ", error.message);
              }}
              deleteClient={async (id) => {
                if (!id) return;
                const { error } = await supabase.from('erp_clients').delete().eq('id', id.toString());
                if (error) {
                  // Fallback for numeric IDs if needed
                  await supabase.from('erp_clients').delete().eq('id', id);
                }
              }}
              deleteOrder={async (id) => {
                if (!id) return;
                const { error } = await supabase.from('erp_orders').delete().eq('id', id.toString());
                if (error) {
                  await supabase.from('erp_orders').delete().eq('id', id);
                }
              }}
              saveConfig={async (id, data) => {
                const { error } = await supabase.from('erp_config').upsert([{ id, data }]);
                if (error) console.error("Config Save Failed:", error);
              }}
              saveActivity={async (act) => {
                const clean = (obj) => JSON.parse(JSON.stringify(obj, (k, v) => v === "" ? undefined : v));
                const { error } = await supabase.from('erp_activities').upsert([{ id: act.id.toString(), data: clean(act) }]);
                if (error) console.error("Activity Save Failed:", error);
              }}
            />
            {/* Classy AI Digital Manager - Only for Admin/Owner */}
            {(user?.role === 'Admin' || user?.role === 'Owner') && (
              <ClassyAI
                user={user}
                isAdmin={user?.role === 'Admin' || user?.role === 'Owner'}
                clients={clients}
                setClients={setClients}
                saveClient={async (c) => {
                  const clean = (obj) => JSON.parse(JSON.stringify(obj, (k, v) => v === "" ? undefined : v));
                  await supabase.from('erp_clients').upsert([{ id: (c.id || c.clientId || c.phone).toString(), data: clean(c) }]);
                }}
                orders={orders}
                setOrders={setOrders}
                saveOrder={async (o) => {
                  const clean = (obj) => JSON.parse(JSON.stringify(obj, (k, v) => v === "" ? undefined : v));
                  await supabase.from('erp_orders').upsert([{ id: (o.id || o.orderId).toString(), data: clean(o) }]);
                }}
                setCurrentPage={setCurrentPage}
                selectedClient={selectedClient}
                setSelectedClient={setSelectedClient}
                clientDetailMode={clientDetailMode}
                setClientDetailMode={setClientDetailMode}
                deleteClient={async (id) => {
                  if (!id) return;
                  await supabase.from('erp_clients').delete().eq('id', id.toString());
                  await supabase.from('erp_clients').delete().eq('id', id);
                }}
                deleteOrder={async (id) => {
                  if (!id) return;
                  await supabase.from('erp_orders').delete().eq('id', id.toString());
                  await supabase.from('erp_orders').delete().eq('id', id);
                }}
                activities={activities}
                inventory={inventory}
                setInventory={setInventory}
                saveInventory={async (inv) => {
                  const clean = (obj) => JSON.parse(JSON.stringify(obj, (k, v) => v === "" ? undefined : v));
                  await supabase.from('erp_inventory').upsert([{ id: inv.id.toString(), data: clean(inv) }]);
                }}
                users={users}
                sales={sales}
                orderLimits={orderLimits}
                setOrderLimits={setOrderLimits}
                saveConfig={async (id, data) => {
                  await supabase.from('erp_config').upsert([{ id, data }]);
                }}
                saveActivity={async (act) => {
                  const clean = (obj) => JSON.parse(JSON.stringify(obj, (k, v) => v === "" ? undefined : v));
                  await supabase.from('erp_activities').upsert([{ id: act.id.toString(), data: clean(act) }]);
                }}
              />
            )}
            <DeliveryAlertModal orders={orders} />
          </>
        )}
        <IOSInstallPrompt />
        <PwaUpdateModal />
      </main>
    </div>
  )
}

export default App;
