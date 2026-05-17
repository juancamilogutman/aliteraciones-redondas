import { useCallback, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { EditorRole } from '@/lib/database.types'

interface AuthState {
  user: User | null
  session: Session | null
  isEditor: boolean
  isSuperadmin: boolean
  role: EditorRole | null
  loading: boolean
}

const initial: AuthState = {
  user: null,
  session: null,
  isEditor: false,
  isSuperadmin: false,
  role: null,
  loading: true,
}

export function useAuth() {
  const [state, setState] = useState<AuthState>(initial)

  useEffect(() => {
    let cancelled = false

    async function deriveRole(userId: string | undefined): Promise<EditorRole | null> {
      if (!userId) return null
      const { data, error } = await supabase
        .from('editors')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle()
      if (error || !data) return null
      const role = (data as { role: EditorRole }).role
      return role === 'superadmin' ? 'superadmin' : 'admin'
    }

    async function apply(session: Session | null) {
      const user = session?.user ?? null
      const role = await deriveRole(user?.id)
      if (cancelled) return
      setState({
        user,
        session,
        isEditor: role !== null,
        isSuperadmin: role === 'superadmin',
        role,
        loading: false,
      })
    }

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      apply(data.session)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      apply(session)
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  return { ...state, signIn, signOut }
}
