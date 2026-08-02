import 'dotenv/config'

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

export const env = {
  databaseUrl: required('DATABASE_URL'),
  port: Number(process.env.PORT ?? 3000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  jwtSecret: process.env.JWT_SECRET ?? 'onegate-dev-secret-change-in-production',
  // Ürünler arası oturum devri (SSO) — 4Proc ile PAYLAŞILAN sır; yalnız sunucu ortamında tanımlı
  ssoSecret: process.env.SSO_SECRET ?? 'onegate-dev-sso-secret-change-in-production',
}
