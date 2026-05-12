import React, { useState } from 'react'
import LoginScreen from './components/LoginScreen'
import Dashboard from './components/Dashboard'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const sessionStr = localStorage.getItem('erp_session')
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr)
        if (Date.now() - session.timestamp < 86400000) {
          return true
        }
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
        if (Date.now() - session.timestamp < 86400000) {
          return session.user
        }
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
        <LoginScreen onLogin={handleLogin} />
      ) : (
        <Dashboard onLogout={handleLogout} user={user} />
      )}
    </main>
  )
}

export default App;
