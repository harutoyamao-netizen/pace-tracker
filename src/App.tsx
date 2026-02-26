import { HashRouter, Routes, Route } from 'react-router-dom'
import { Home } from './pages/Home'
import { GoalForm } from './pages/GoalForm'
import { GoalDetail } from './pages/GoalDetail'
import { useDarkMode } from './hooks/useDarkMode'
import { AuthContext, useAuthState } from './hooks/useAuth'
import { AuthGate } from './components/AuthGate'

export default function App() {
  const [dark, toggleDark] = useDarkMode()
  const authState = useAuthState()

  return (
    <AuthContext.Provider value={authState}>
      <AuthGate>
        <HashRouter>
          <Routes>
            <Route path="/" element={<Home dark={dark} toggleDark={toggleDark} />} />
            <Route path="/new" element={<GoalForm />} />
            <Route path="/edit/:id" element={<GoalForm />} />
            <Route path="/goal/:id" element={<GoalDetail />} />
          </Routes>
        </HashRouter>
      </AuthGate>
    </AuthContext.Provider>
  )
}
