'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { AppShell } from '@/components/shell/app-shell'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedUserTypes={['admin']}>
      <AppShell route="admin">{children}</AppShell>
    </ProtectedRoute>
  )
}
