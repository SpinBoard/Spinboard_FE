'use client'

import { useAtomValue, useSetAtom } from 'jotai'
import { useRouter } from 'next/navigation'
import { userAtom } from '@/atom/user'
import { routes } from '@/app/_utils/routes'
import { LogoIcon } from '@/components/ui/logo-icon'
import { Button } from '@/components/ui/button'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { LogOut, ShieldCheck } from 'lucide-react'

function AdminChrome({ children }: { children: React.ReactNode }) {
  const user = useAtomValue(userAtom)
  const setUser = useSetAtom(userAtom)
  const router = useRouter()

  const handleLogout = () => {
    setUser(null)
    router.push(routes.HOME)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xl font-bold text-white font-fredoka">
            <LogoIcon />
            Pazzell
            <span className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 border border-primary/30 rounded-full px-2 py-0.5">
              <ShieldCheck className="h-3 w-3" />
              Admin
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-white/70 text-sm">{user?.email}</span>
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedUserTypes={['admin']}>
      <AdminChrome>{children}</AdminChrome>
    </ProtectedRoute>
  )
}
