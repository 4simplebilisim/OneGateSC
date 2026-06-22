import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { simpleCrud, type Delegate } from './documentTypes.js'

const pInt = z.number().int().positive()

// ── Master'lar (menüde) ──
// Müşteri Ek Grup (legacy TBLMUSTERIEKGRUP)
const extraGroup = z.object({ code: z.string().min(1).max(10), name: z.string().min(1).max(60), colorCode: z.string().max(100).optional(), reference: z.string().max(200).optional(), isActive: z.boolean().optional() })
export const partnerExtraGroupRoutes = simpleCrud(prisma.tBLPARTNEREXTRAGROUP as unknown as Delegate, extraGroup, extraGroup.partial(), 'Ek grup bulunamadı')

// Müşteri Ek Saha tanımı (ek saha slotları)
const fieldDef = z.object({ code: z.string().min(1).max(20), label: z.string().min(1).max(100), isActive: z.boolean().optional() })
export const partnerExtraFieldDefRoutes = simpleCrud(prisma.tBLPARTNEREXTRAFIELDDEF as unknown as Delegate, fieldDef, fieldDef.partial(), 'Ek saha tanımı bulunamadı')

// ── Cari kartı sekmeleri (partnerId ile owner-filtre) ──
// Gruplar: cari ↔ ek grup (legacy TBLSBMUSTERIEKGRUPBAGLANTI)
const groupLink = z.object({ partnerId: pInt, extraGroupId: pInt, sortOrder: z.number().int().optional() })
export const partnerExtraGroupLinkRoutes = simpleCrud(prisma.tBLPARTNEREXTRAGROUPLINK as unknown as Delegate, groupLink, groupLink.partial(), 'Bağlantı bulunamadı', 'partnerId')

// Ek Sahalar: cari ek saha değeri (legacy TBLMUSTERIEKSAHA)
const extraField = z.object({ partnerId: pInt, fieldDefId: pInt, value: z.string().max(400).optional() })
export const partnerExtraFieldRoutes = simpleCrud(prisma.tBLPARTNEREXTRAFIELD as unknown as Delegate, extraField, extraField.partial(), 'Ek saha bulunamadı', 'partnerId')

// Kabul Zamanı (legacy TBLSBMUSTERIKABULZAMAN)
const acceptanceTime = z.object({ partnerId: pInt, day: z.coerce.number().int().min(1).max(7), minTime: z.string().max(10).optional(), maxTime: z.string().max(10).optional() })
export const partnerAcceptanceTimeRoutes = simpleCrud(prisma.tBLPARTNERACCEPTANCETIME as unknown as Delegate, acceptanceTime, acceptanceTime.partial(), 'Kabul zamanı bulunamadı', 'partnerId')

// Optimizasyon (legacy TBLSBMUSTERIOPTIMIZASYONPARAMETRE) — cari başına 1
const optimization = z.object({ partnerId: pInt, unloadPersonnelTime: z.number().int().optional(), unloadPersonnelCost: z.number().optional(), vehicleSize: z.string().max(20).optional(), serviceTime: z.number().int().optional() })
export const partnerOptimizationRoutes = simpleCrud(prisma.tBLPARTNEROPTIMIZATION as unknown as Delegate, optimization, optimization.partial(), 'Optimizasyon bulunamadı', 'partnerId')
