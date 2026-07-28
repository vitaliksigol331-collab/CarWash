import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'

function Gate() {
  const { session, loading } = useAuth()
  const [authView, setAuthView] = useState('login') // 'login' | 'register'

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-ink-950">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <img src="/logo.svg" alt="" className="w-8 h-8 animate-pulse" />
          <span className="text-sm">Завантаження...</span>
        </div>
      </div>
    )
  }

  if (!session) {
    return authView === 'login' ? (
      <Login onSwitchToRegister={() => setAuthView('register')} />
    ) : (
      <Register onSwitchToLogin={() => setAuthView('login')} />
    )
  }

  return <Dashboard />
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
