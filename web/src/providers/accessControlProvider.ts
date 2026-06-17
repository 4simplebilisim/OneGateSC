import type { AccessControlProvider } from '@refinedev/core'

const WRITE_ACTIONS = ['create', 'edit', 'delete', 'clone']

export const accessControlProvider: AccessControlProvider = {
  can: async ({ action }) => {
    const raw = localStorage.getItem('og_user')
    const user = raw ? JSON.parse(raw) : {}
    if (user?.isSuperAdmin) return { can: true }
    const roles: string[] = user?.roles ?? []
    if (WRITE_ACTIONS.includes(action)) {
      return { can: roles.includes('ADMIN') || roles.includes('OPERATOR'), reason: 'Yazma yetkisi yok' }
    }
    return { can: true }
  },
}
