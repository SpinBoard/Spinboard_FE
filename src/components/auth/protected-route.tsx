'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAtomValue } from 'jotai/react'
import { userAtom } from '@/atom/user'
import { routes } from '@/app/_utils/routes'
import { UserData } from '@/types'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedUserTypes?: ('gamer' | 'brand')[]
  redirectTo?: string
}

export function ProtectedRoute({
  children,
  allowedUserTypes = ['gamer', 'brand'],
  redirectTo = routes.LOGIN
}: ProtectedRouteProps) {
  const router = useRouter()
  const user: UserData | null = useAtomValue(userAtom)
  // userAtom is backed by atomWithStorage, which reads localStorage
  // synchronously at module load — so on the client its initial value is
  // already the real (logged-in) user, while the server always renders with
  // user: null (no localStorage there). Rendering off `user` directly on the
  // first pass makes the client's hydration output diverge from the
  // server's, which React surfaces as a hydration-mismatch error and then
  // force-discards the server tree. Deferring to `mounted` keeps the first
  // client render identical to the server's (always the loader) and only
  // switches to the real auth check after hydration completes.
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    // If no user is logged in, redirect to login
    if (!user) {
      router.push(redirectTo)
      return
    }

    // If user type is not allowed, redirect appropriately
    if (!allowedUserTypes.includes(user.userType
      )) {
      if (user.userType === 'gamer') {
        router.push(routes.USER.DASHBOARD)
      } else if (user.userType === 'brand') {
        router.push(routes.BRAND.DASHBOARD)
      }
      return
    }
  }, [mounted, user, router, allowedUserTypes, redirectTo])

  // Show loading or nothing while checking auth
  if (!mounted || !user || !allowedUserTypes.includes(user.userType)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return <>{children}</>
}