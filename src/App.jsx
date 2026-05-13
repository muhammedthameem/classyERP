import React, { useState, useEffect } from 'react'
import LoginScreen from './components/LoginScreen'
import Dashboard from './components/Dashboard'
import { db } from './firebase'
import { doc, onSnapshot, getDoc } from 'firebase/firestore'

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

  // REAL-TIME SYNC FROM FIREBASE
  useEffect(() => {
    const docsToSync = ['users', 'clients', 'orders', 'inventory', 'sales', 'activities', 'config']
    const unsubscribes = docsToSync.map(docId => {
      return onSnapshot(doc(db, "erpData", docId), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data()
          if (docId === 'users' && data.list) setUsers(data.list)
          if (docId === 'clients' && data.list) setClients(data.list)
          if (docId === 'orders' && data.list) setOrders(data.list)
          if (docId === 'inventory' && data.list) setInventory(data.list)
          if (docId === 'sales' && data.list) setSales(data.list)
          if (docId === 'activities' && data.list) setActivities(data.list)
          if (docId === 'config') {
            if (data.designations) setDesignations(data.designations)
            if (data.orderTypes) setOrderTypes(data.orderTypes)
            if (data.productTypes) setProductTypes(data.productTypes)
            if (data.inventoryUnits) setInventoryUnits(data.inventoryUnits)
          }
        }
        // Fallback for old "main" document if it exists (Migration support)
        if (docId === 'users') {
          getDoc(doc(db, "erpData", "main")).then(mainSnap => {
            if (mainSnap.exists()) {
              const mainData = mainSnap.data()
              // If the new docs are empty but main has data, use main
              if (!docSnap.exists()) {
                if (mainData.users) setUsers(mainData.users)
                // ... other fields will be handled by their respective onSnapshots or a one-time migration
              }
            }
            setCloudLoaded(true)
          })
        }
      }, (error) => {
        console.log(`Firebase Sync Error (${docId}):`, error)
        setCloudLoaded(true)
      })
    })
    return () => unsubscribes.forEach(unsub => unsub())
  }, [])

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
        />
      )}
    </main>
  )
}

export default App;
