import { createContext, useContext, useState, useEffect } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from '../firebase'

interface AuthState {
  user: User | null
  loading: boolean
}

export const AuthContext = createContext<AuthState>({ user: null, loading: true })

export function useAuthState(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, loading: true })

  useEffect(() => {
    return onAuthStateChanged(auth, user => {
      setState({ user, loading: false })
    })
  }, [])

  return state
}

export function useAuth(): AuthState {
  return useContext(AuthContext)
}
