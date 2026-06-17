---
title: "Prisma 7 runtime client driver adapter zorunlu (@prisma/adapter-pg)"
type: decision
status: accepted
date: 2026-06-08
topics: [prisma, runtime, schema]
tags: [decision/accepted, db, prisma7]
aliases: [driver-adapter, adapter-pg, prisma7-client]
related_runs: [[runs/2026-06-08T15-17-34-wms1]]
---

# 0002 — Prisma 7 Driver Adapter

## Bağlam
Smoke test `new PrismaClient()` construct ederken patladı:
`PrismaClientConstructorValidationError: Using engine type "client" requires either "adapter" or "accelerateUrl"`.
CLI (migrate/validate) kendi engine'iyle çalıştığı için yeşil görünüyordu — bug yalnızca **runtime**'da, yani gerçek server'da ortaya çıkıyordu. Server DB'ye hiç bağlanamıyordu.

## Karar
Prisma 7 runtime client Rust-free engine kullanıyor ve **driver adapter zorunlu**. `@prisma/adapter-pg` + `pg` kuruldu, `src/lib/prisma.ts` adapter ile bağlandı:

```ts
const adapter = new PrismaPg({ connectionString: env.databaseUrl })
export const prisma = new PrismaClient({ adapter, log: ['warn', 'error'] })
```

## Gerekçe
- `accelerateUrl` (Prisma Accelerate) yerine self-host pg adapter — on-prem hedefiyle uyumlu.
- node-postgres `?schema=wms` query param'ını yok sayar; multiSchema routing'i Prisma `@@schema`-qualified identifier'larla yapar, search_path'e bağlı değil.
- generator `prisma-client-js` kaldı; driverAdapters Prisma 7'de GA, previewFeatures flag'i gerekmez.

## Sonuç
Smoke 16/16 geçti, `health.db === up`. Tek PrismaClient construct noktası `lib/prisma.ts`; seed/routes/smoke hepsi buradan import ediyor.

## Risk / Sonraki
Prod'da connection pool boyutu pg adapter üzerinden ayarlanmalı (şu an default). Graceful shutdown `prisma.$disconnect()` server.ts'te mevcut.
