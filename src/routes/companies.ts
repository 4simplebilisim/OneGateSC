import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { getCompanyId } from '../lib/company.js'

// Firma listesi (kullanıcı formundaki "Firma" alanı için). Super-admin tümünü, normal admin yalnız kendi firmasını görür.
export async function companyRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [app.authenticate] }, async (request) => {
    const user = request.user as { isSuperAdmin?: boolean }
    const select = { id: true, code: true, name: true, isActive: true } as const
    if (user.isSuperAdmin) return prisma.tBLCOMPANY.findMany({ orderBy: { code: 'asc' }, select })
    return prisma.tBLCOMPANY.findMany({ where: { id: getCompanyId(request) }, orderBy: { code: 'asc' }, select })
  })
}
