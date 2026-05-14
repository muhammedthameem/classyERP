import React, { useState, useEffect } from 'react'
import LoginScreen from './components/LoginScreen'
import Dashboard from './components/Dashboard'
import PublicReceipt from './components/PublicReceipt'
import supabase from './supabase'

function App() {
  // SHARED STATES
  const [users, setUsers] = useState(() => JSON.parse(localStorage.getItem('erp_users') || '[]'))
  const [designations, setDesignations] = useState(() => JSON.parse(localStorage.getItem('erp_designations') || '[]'))
  const [clients, setClients] = useState(() => JSON.parse(localStorage.getItem('clients') || '[]'))
  const [orders, setOrders] = useState(() => JSON.parse(localStorage.getItem('orders') || '[]'))
  const [inventory, setInventory] = useState(() => JSON.parse(localStorage.getItem('inventory') || '[]'))
  const [sales, setSales] = useState(() => JSON.parse(localStorage.getItem('sales') || '[]'))
  const [activities, setActivities] = useState(() => JSON.parse(localStorage.getItem('activities') || '[]'))
  const [orderTypes, setOrderTypes] = useState(() => JSON.parse(localStorage.getItem('orderTypes') || '["Customisation", "Stitching"]'))
  const [productTypes, setProductTypes] = useState(() => JSON.parse(localStorage.getItem('productTypes') || '[]'))
  const [inventoryUnits, setInventoryUnits] = useState(() => JSON.parse(localStorage.getItem('inventoryUnits') || '["nos", "mtr", "kg", "yd", "set"]'))
  const [cloudLoaded, setCloudLoaded] = useState(false)
  const [syncError, setSyncError] = useState(null)

  // REAL-TIME SYNC FROM SUPABASE
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [u, c, o, s, i, a, cfg] = await Promise.all([
          supabase.from('users').select('*'),
          supabase.from('clients').select('*'),
          supabase.from('orders').select('*'),
          supabase.from('sales').select('*'),
          supabase.from('inventory').select('*'),
          supabase.from('activities').select('*').order('timestamp', { ascending: false }).limit(100),
          supabase.from('config').select('*')
        ]);

        if (u.data) setUsers(u.data);
        if (c.data) setClients(c.data);
        if (o.data) setOrders(o.data);
        if (s.data) setSales(s.data);
        if (i.data) setInventory(i.data);
        if (a.data) setActivities(a.data);
        
        if (cfg.data) {
          cfg.data.forEach(item => {
            if (item.id === 'designations') setDesignations(item.data);
            if (item.id === 'orderTypes') setOrderTypes(item.data);
            if (item.id === 'productTypes') setProductTypes(item.data);
            if (item.id === 'inventoryUnits') setInventoryUnits(item.data);
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
    const channels = [
      supabase.channel('users').on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload) => {
        fetchData(); // Refresh on change for simplicity
      }).subscribe(),
      supabase.channel('clients').on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => fetchData()).subscribe(),
      supabase.channel('orders').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchData()).subscribe(),
      supabase.channel('sales').on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => fetchData()).subscribe(),
      supabase.channel('inventory').on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () => fetchData()).subscribe(),
      supabase.channel('config').on('postgres_changes', { event: '*', schema: 'public', table: 'config' }, () => fetchData()).subscribe()
    ];

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, []);

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

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const sessionStr = localStorage.getItem('erp_session')
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr)
        if (Date.now() - session.timestamp < 86400000) return true
        localStorage.removeItem('erp_session')
      } catch (e) { }
    }
    return false
  })

  const [user, setUser] = useState(() => {
    const sessionStr = localStorage.getItem('erp_session')
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr)
        if (Date.now() - session.timestamp < 86400000) return session.user
      } catch (e) { }
    }
    return null
  })

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser)
    setIsLoggedIn(true)
    localStorage.setItem('erp_session', JSON.stringify({
      user: loggedInUser,
      timestamp: Date.now()
    }))
  }

  const handleLogout = () => {
    setUser(null)
    setIsLoggedIn(false)
    localStorage.removeItem('erp_session')
  }

  const billId = new URLSearchParams(window.location.search).get('bill')

  if (billId) {
    return <PublicReceipt billId={billId} />
  }

  return (
    <main className="min-h-screen bg-[#f7f2ec] text-stone-900">
      {!isLoggedIn ? (
        <LoginScreen onLogin={handleLogin} users={users} />
      ) : (
        <Dashboard
          onLogout={handleLogout}
          user={user}
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
          cloudLoaded={cloudLoaded}
          syncError={syncError}
          // Direct Save Functions for Supabase
          saveSale={async (s) => {
            const { error } = await supabase.from('sales').upsert([s]);
            if (error) alert("Save Failed: " + error.message);
          }}
          saveOrder={async (o) => {
            const { error } = await supabase.from('orders').upsert([o]);
            if (error) alert("Save Failed: " + error.message);
          }}
          saveClient={async (c) => {
            const { error } = await supabase.from('clients').upsert([c]);
            if (error) alert("Save Failed: " + error.message);
          }}
          saveUser={async (u) => {
            const { error } = await supabase.from('users').upsert([u]);
            if (error) alert("Save Failed: " + error.message);
          }}
        />
      )}
    </main>
  )
}

export default App;
