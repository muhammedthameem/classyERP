import React, { useState, useEffect } from 'react'
import LoginScreen from './components/LoginScreen'
import Dashboard from './components/Dashboard'
import PublicReceipt from './components/PublicReceipt'
import { db } from './firebase'
import { doc, onSnapshot, getDoc, collection, setDoc, writeBatch, query, orderBy, limit } from 'firebase/firestore'

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
    // 1. Sync Single Documents (Config, Users, Inventory, Activities)
    const singleDocs = ['users', 'inventory', 'activities', 'config']
    const unsubSingles = singleDocs.map(docId => {
      return onSnapshot(doc(db, "erpData", docId), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data()
          if (docId === 'users' && data.list) setUsers(data.list)
          if (docId === 'inventory' && data.list) setInventory(data.list)
          if (docId === 'activities' && data.list) setActivities(data.list)
          if (docId === 'config') {
            if (data.designations) setDesignations(data.designations)
            if (data.orderTypes) setOrderTypes(data.orderTypes)
            if (data.productTypes) setProductTypes(data.productTypes)
            if (data.inventoryUnits) setInventoryUnits(data.inventoryUnits)
          }
        }
      }, (error) => { })
    })

    // 2. Sync Collections (Orders, Sales, Clients)
    const collectionsToSync = ['orders', 'sales', 'clients']
    const unsubCollections = collectionsToSync.map(colId => {
      return onSnapshot(collection(db, colId), (querySnapshot) => {
        if (!querySnapshot.empty) {
          const list = []
          querySnapshot.forEach((doc) => {
            list.push(doc.data())
          })
          if (colId === 'orders') setOrders(list)
          if (colId === 'sales') setSales(list)
          if (colId === 'clients') setClients(list)
        }
        
        // Robust merge logic: Combine cloud collections with old "main" data
        getDoc(doc(db, "erpData", "main")).then(mainSnap => {
          if (mainSnap.exists()) {
            const mainData = mainSnap.data()
            if (colId === 'orders') {
              const oldList = mainData.orders || []
              // Filter out duplicates (prefer new collection over old main)
              const combined = [...list, ...oldList.filter(o => !list.some(no => no.id === o.id))]
              setOrders(combined)
            }
            if (colId === 'sales') {
              const oldList = mainData.sales || []
              const combined = [...list, ...oldList.filter(s => !list.some(ns => ns.id === s.id))]
              setSales(combined)
            }
            if (colId === 'clients') {
              const oldList = mainData.clients || []
              const combined = [...list, ...oldList.filter(c => !list.some(nc => nc.id === c.id))]
              setClients(combined)
            }
          } else {
            // No old data, just use the collection list
            if (colId === 'orders') setOrders(list)
            if (colId === 'sales') setSales(list)
            if (colId === 'clients') setClients(list)
          }
          setCloudLoaded(true)
        })
      }, (error) => {
        setCloudLoaded(true)
      })
    })

    return () => {
      unsubSingles.forEach(unsub => unsub())
      unsubCollections.forEach(unsub => unsub())
    }
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
        />
      )}
    </main>
  )
}

export default App;
