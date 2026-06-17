import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { env } from './env.js'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

// Prisma 7: the runtime client uses the Rust-free engine and requires a
// driver adapter. node-postgres ignores the ?schema=wms param; multiSchema
// routing is handled by Prisma via @@schema-qualified identifiers.
const adapter = new PrismaPg({ connectionString: env.databaseUrl })

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter, log: ['warn', 'error'] })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
