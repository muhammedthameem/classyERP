import React, { useState, useEffect } from 'react'
import LoginScreen from './components/LoginScreen'
import Dashboard from './components/Dashboard'
import DeliveryAlertModal from './components/DeliveryAlertModal'
import PublicReceipt from './components/PublicReceipt'
import supabase from './supabase'

function App() {
  // SHARED STATES
  const [users, setUsers] = useState(() => { try { return JSON.parse(localStorage.getItem('erp_users') || '[]') } catch(e) { return [] } })
  const [designations, setDesignations] = useState(() => { try { return JSON.parse(localStorage.getItem('erp_designations') || '[]') } catch(e) { return [] } })
  const [clients, setClients] = useState(() => { try { return JSON.parse(localStorage.getItem('clients') || '[]') } catch(e) { return [] } })
  const [orders, setOrders] = useState(() => { try { return JSON.parse(localStorage.getItem('orders') || '[]') } catch(e) { return [] } })
  const [inventory, setInventory] = useState(() => { try { return JSON.parse(localStorage.getItem('inventory') || '[]') } catch(e) { return [] } })
  const [sales, setSales] = useState(() => { try { return JSON.parse(localStorage.getItem('sales') || '[]') } catch(e) { return [] } })
  const [activities, setActivities] = useState(() => { try { return JSON.parse(localStorage.getItem('activities') || '[]') } catch(e) { return [] } })
  const [orderTypes, setOrderTypes] = useState(() => { try { return JSON.parse(localStorage.getItem('orderTypes') || '["Customisation", "Stitching"]') } catch(e) { return ["Customisation", "Stitching"] } })
  const [productTypes, setProductTypes] = useState(() => { try { return JSON.parse(localStorage.getItem('productTypes') || '[]') } catch(e) { return [] } })
  const [inventoryUnits, setInventoryUnits] = useState(() => { try { return JSON.parse(localStorage.getItem('inventoryUnits') || '["nos", "mtr", "kg", "yd", "set"]') } catch(e) { return ["nos", "mtr", "kg", "yd", "set"] } })
  const [cloudLoaded, setCloudLoaded] = useState(false)
  const [syncError, setSyncError] = useState(null)

  // REAL-TIME SYNC FROM SUPABASE
  useEffect(() => {
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
        if (a.data) setActivities(a.data.map(item => item.data || item));
        
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
      supabase.channel('erp_users').on('postgres_changes', { event: '*', schema: 'public', table: 'erp_users' }, () => fetchData()).subscribe(),
      supabase.channel('erp_clients').on('postgres_changes', { event: '*', schema: 'public', table: 'erp_clients' }, () => fetchData()).subscribe(),
      supabase.channel('erp_orders').on('postgres_changes', { event: '*', schema: 'public', table: 'erp_orders' }, () => fetchData()).subscribe(),
      supabase.channel('erp_sales').on('postgres_changes', { event: '*', schema: 'public', table: 'erp_sales' }, () => fetchData()).subscribe(),
      supabase.channel('erp_inventory').on('postgres_changes', { event: '*', schema: 'public', table: 'erp_inventory' }, () => fetchData()).subscribe(),
      supabase.channel('erp_config').on('postgres_changes', { event: '*', schema: 'public', table: 'erp_config' }, () => fetchData()).subscribe()
    ];

    return () => {
      isMounted = false;
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

  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState(null)

  // 1. RECOVER SUPABASE SESSION
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsLoggedIn(true);
        // Fetch profile from erp_users to get Name/Role
        supabase.from('erp_users').select('*').eq('id', session.user.email).single().then(({ data }) => {
          if (data) {
            const profile = data.data || data;
            setUser({
              id: profile.id || profile.email,
              email: profile.email,
              name: profile.name,
              role: profile.designation || 'Staff'
            });
          } else {
            setUser({ id: session.user.id, email: session.user.email, name: session.user.email.split('@')[0], role: 'Admin' });
          }
        });
      }
    });

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
    // 1. Standard Search Params
    const searchParams = new URLSearchParams(window.location.search);
    id = searchParams.get('bill');

    // 2. Hash Params (Social apps sometimes move query params after the hash)
    if (!id) {
      const hash = window.location.hash;
      if (hash.includes('bill=')) {
        const hashSearchParams = new URLSearchParams(hash.substring(hash.indexOf('?') !== -1 ? hash.indexOf('?') + 1 : 1));
        id = hashSearchParams.get('bill');
      }
    }

    // 3. Regex Fallback
    if (!id) {
      const match = window.location.href.match(/[?&]bill=([^&#/]+)/);
      if (match && match[1]) id = decodeURIComponent(match[1]);
    }

    const finalId = id?.trim() || null;
    
    // 4. Persistence: If we found it, save it. If not, check if we had one.
    if (finalId) {
      localStorage.setItem('active_bill_id', finalId);
      return finalId;
    }
    return localStorage.getItem('active_bill_id');
  };

  const [activeBillId, setActiveBillId] = useState(getInitialBillId);

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

  if (activeBillId) {
    return <PublicReceipt billId={activeBillId} onClear={clearBill} />;
  }

  return (
    <main className="min-h-screen bg-[#f7f2ec] text-stone-900">
      {!isLoggedIn ? (
        <LoginScreen onLogin={handleLogin} users={users} />
      ) : (
        <>
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
            // Direct Save Functions for Supabase (FLEXIBLE SCHEMA & COMPRESSED)
            saveSale={async (s) => {
              const clean = (obj) => JSON.parse(JSON.stringify(obj, (k, v) => v === "" ? undefined : v));
              const { error } = await supabase.from('erp_sales').upsert([{ id: (s.id || s.saleId).toString(), data: clean(s) }]);
              if (error) alert("Save Failed: " + error.message);
            }}
            saveOrder={async (o) => {
              const clean = (obj) => JSON.parse(JSON.stringify(obj, (k, v) => v === "" ? undefined : v));
              const { error } = await supabase.from('erp_orders').upsert([{ id: (o.id || o.orderId).toString(), data: clean(o) }]);
              if (error) alert("Save Failed: " + error.message);
            }}
            saveClient={async (c) => {
              const clean = (obj) => JSON.parse(JSON.stringify(obj, (k, v) => v === "" ? undefined : v));
              const { error } = await supabase.from('erp_clients').upsert([{ id: (c.id || c.clientId || c.phone).toString(), data: clean(c) }]);
              if (error) alert("Save Failed: " + error.message);
            }}
            saveUser={async (u) => {
              const clean = (obj) => JSON.parse(JSON.stringify(obj, (k, v) => v === "" ? undefined : v));
              const { error } = await supabase.from('erp_users').upsert([{ id: u.email, data: clean(u) }]);
              if (error) alert("Save Failed: " + error.message);
            }}
            deleteClient={async (id) => {
              const { error } = await supabase.from('erp_clients').delete().eq('id', id.toString());
              if (error) alert("Delete Failed: " + error.message);
            }}
            deleteOrder={async (id) => {
              const { error } = await supabase.from('erp_orders').delete().eq('id', id.toString());
              if (error) alert("Delete Failed: " + error.message);
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
          <DeliveryAlertModal orders={orders} />
        </>
      )}
    </main>
  )
}

export default App;
