import { HashRouter, Routes, Route } from 'react-router-dom'
import { Home } from './pages/Home'
import { GoalForm } from './pages/GoalForm'
import { GoalDetail } from './pages/GoalDetail'
import { useDarkMode } from './hooks/useDarkMode'

export default function App() {
  const [dark, toggleDark] = useDarkMode()

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home dark={dark} toggleDark={toggleDark} />} />
        <Route path="/new" element={<GoalForm />} />
        <Route path="/edit/:id" element={<GoalForm />} />
        <Route path="/goal/:id" element={<GoalDetail />} />
      </Routes>
    </HashRouter>
  )
}
