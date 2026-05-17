import { useState, type FormEvent } from 'react'
import { LogIn, LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export function AccountMenu() {
  const { user, isEditor, isSuperadmin, loading, signIn, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [pendingEmail, setPendingEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  if (loading) {
    return <span className="text-xs text-slate-500 dark:text-slate-400">Cargando…</span>
  }

  async function onSignIn(e: FormEvent) {
    e.preventDefault()
    const trimmed = pendingEmail.trim()
    if (!trimmed) return
    setSubmitting(true)
    setMessage(null)
    try {
      await signIn(trimmed)
      setMessage('Te enviamos un enlace por mail.')
      setPendingEmail('')
      setOpen(false)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No pudimos enviar el enlace.')
    } finally {
      setSubmitting(false)
    }
  }

  async function onSignOut() {
    try {
      await signOut()
      setMessage('Sesión cerrada.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No pudimos cerrar sesión.')
    }
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        {open ? (
          <form onSubmit={onSignIn} className="flex items-center gap-2">
            <input
              type="email"
              autoFocus
              required
              placeholder="tu@email.com"
              value={pendingEmail}
              onChange={(e) => setPendingEmail(e.target.value)}
              className="w-44 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm shadow-sm focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
            >
              {submitting ? 'Enviando…' : 'Enviar'}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setPendingEmail('')
              }}
              className="rounded-md px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <LogIn className="size-4" />
            Ingresar
          </button>
        )}
        {message && (
          <span className="text-xs text-slate-500 dark:text-slate-400">{message}</span>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-xs text-slate-500 dark:text-slate-400 sm:inline" title={user.email ?? ''}>
        {user.email}
        {isSuperadmin ? (
          <span className="ml-2 rounded bg-rose-100 px-1.5 py-0.5 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200">superadmin</span>
        ) : isEditor ? (
          <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">editor</span>
        ) : null}
      </span>
      <button
        type="button"
        onClick={onSignOut}
        className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <LogOut className="size-4" />
        <span className="hidden sm:inline">Salir</span>
      </button>
    </div>
  )
}
