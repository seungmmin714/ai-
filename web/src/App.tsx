import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginScreen from './screens/auth/LoginScreen'
import SignUpScreen from './screens/auth/SignUpScreen'
import RecipientHome from './screens/home/RecipientHome'
import VolunteerHome from './screens/home/VolunteerHome'

function AppRoutes() {
  const { user, profile, loading } = useAuth()
  const [authView, setAuthView] = useState<'login' | 'signup'>('login')

  if (loading) {
    return <div className="flex min-h-dvh items-center justify-center text-ink-soft">불러오는 중...</div>
  }

  if (!user || !profile) {
    return authView === 'login' ? (
      <LoginScreen onSwitchToSignUp={() => setAuthView('signup')} />
    ) : (
      <SignUpScreen onSwitchToLogin={() => setAuthView('login')} />
    )
  }

  return profile.role === 'recipient' ? <RecipientHome /> : <VolunteerHome />
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App
