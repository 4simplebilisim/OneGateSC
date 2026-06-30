import { buildApp } from './app.js'
import { env } from './lib/env.js'
import { prisma } from './lib/prisma.js'

const app = await buildApp()

const close = async (signal: string) => {
  app.log.info(`Received ${signal}, shutting down...`)
  await app.close()
  await prisma.$disconnect()
  process.exit(0)
}

process.on('SIGINT', () => void close('SIGINT'))
process.on('SIGTERM', () => void close('SIGTERM'))

// Dayanıklılık: tek bir işlenmeyen async hata (ör. arka plan görevinde reddedilen promise) tüm API'yi
// düşürmesin — logla ve ayakta kal. Çoğu dev-sırası "API düştü" durumunun nedeni budur.
process.on('unhandledRejection', (reason) => {
  app.log.error({ err: reason }, 'İşlenmeyen promise reddi — API ayakta tutuluyor (kök neden loglandı)')
})
// uncaughtException gerçek/ciddi bir hatadır — loglayıp normal şekilde çök (sessizce yutma).
process.on('uncaughtException', (err) => {
  app.log.fatal({ err }, 'Yakalanmayan istisna — API sonlanıyor (kök neden yukarıda)')
  process.exit(1)
})

try {
  await app.listen({ port: env.port, host: '0.0.0.0' })
  app.log.info(`OneGate API listening on http://localhost:${env.port}`)
} catch (err) {
  app.log.error(err)
  await prisma.$disconnect()
  process.exit(1)
}
