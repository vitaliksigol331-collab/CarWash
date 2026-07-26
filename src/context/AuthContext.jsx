import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null) // { id, store_id, email, stores: { name } }
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null)
      return
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, store_id, stores ( id, name )')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Не вдалось завантажити профіль:', error.message)
      setProfile(null)
    } else {
      setProfile(data)
    }
  }, [])

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      setSession(session)
      if (session?.user) {
        loadProfile(session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [loadProfile])

  const signUp = async ({ email, password, storeName }) => {
    setAuthError(null)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { store_name: storeName },
      },
    })
    if (error) {
      setAuthError(error.message)
      return { error }
    }
    // Тригер на боці Supabase (див. supabase/schema.sql) автоматично створить
    // запис у "stores" та "profiles" одразу після реєстрації користувача.
    return { data }
  }

  const signIn = async ({ email, password }) => {
    setAuthError(null)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setAuthError(error.message)
      return { error }
    }
    return { data }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    storeId: profile?.store_id ?? null,
    storeName: profile?.stores?.name ?? '',
    loading,
    authError,
    signUp,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth має використовуватись всередині <AuthProvider>')
  return ctx
}
