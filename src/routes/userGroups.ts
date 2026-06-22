import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { simpleCrud, type Delegate } from './documentTypes.js'

// Kullanıcı grubu CRUD (companyId-scope). Gruba verilen yetkiler üyelerine miras geçer (userAuthorizations + userAuth.ts union).
const schema = z.object({
  code: z.string().min(1).max(40),
  name: z.string().min(1).max(100),
  isActive: z.boolean().optional(),
})

export const userGroupRoutes = simpleCrud(prisma.tBLUSERGROUP as unknown as Delegate, schema, schema.partial(), 'Kullanıcı grubu bulunamadı')
