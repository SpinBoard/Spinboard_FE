'use client'

import { useEffect } from 'react'
import { useAtomValue } from 'jotai'
import { useRouter } from 'next/navigation'
import { userAtom } from '@/atom/user'
import { routes } from '@/app/_utils/routes'
import { AppShell } from '@/components/shell/app-shell'

export default function BrandLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = useAtomValue(userAtom)
  const router = useRouter()

  useEffect(() => {
    if (!user || user.userType === 'brand') return
    // A viewer lands on the billboard, not /user/dashboard (DECISIONS.md
    // #6 parks that route — "the board is the viewer's home"); an admin
    // who somehow lands on a /brand/* page goes back to their own home.
    router.push(user.userType === 'admin' ? routes.ADMIN.CAMPAIGNS : routes.WATCH)
  }, [user, router])

  return <AppShell route="brands">{children}</AppShell>
}
