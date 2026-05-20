import { Link, Outlet } from 'react-router-dom'
import { AccountMenu } from '@/components/AccountMenu'
import { ThemeToggle } from '@/components/ThemeToggle'

export function AppShell() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <Link to="/" className="group">
            <h1 className="text-lg font-semibold tracking-tight">
              Aliter<span className="text-[#74ACDF] group-hover:text-[#9BC3E6]">acion</span><span className="text-[#F6B40E] group-hover:text-[#F9C846]">es</span> <span className="text-[#74ACDF] group-hover:text-[#9BC3E6]">Nacion</span>al<span className="text-[#F6B40E] group-hover:text-[#F9C846]">es</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Letras nuestras</p>
          </Link>
          <div className="flex items-center gap-3">
            <AccountMenu />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 py-4 dark:border-slate-800">
        <div className="mx-auto max-w-5xl px-6 text-center text-xs text-slate-500 dark:text-slate-400">
          A brillar mi amor.
        </div>
      </footer>
    </div>
  )
}
