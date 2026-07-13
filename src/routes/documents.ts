import type { FastifyInstance } from 'fastify'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId } from '../lib/company.js'
import { completeDocument, reverseDocument, splitDocument, collectionShortfall, uncontrolledScanGate, referenceGate, MovementError } from '../lib/movement.js'
import { docStatusId, DOC_STATUS, refreshDocStatus, missingDocStatuses } from '../lib/documentStatus.js'
import { nextSequence } from '../lib/sequence.js'
import { suggestPutawayLocations } from '../lib/routing.js'
import { assertUserAuthorized, AuthorizationError, userGroupIds, allowedOperationTypeIds } from '../lib/userAuth.js'
import { codeMap, resolveCode, str } from '../lib/importer.js'
import { reserveForDocument, releaseForDocument, reservationSummary, ReservationError } from '../lib/reservation.js'

const lineSchema = z.object({
  productId: z.number().int().positive(),
  unitId: z.number().int().positive(),
  quantity: z.number().positive(),
  referenceQty: z.number().nonnegative().optional(), // beklenen/referans miktar (tolerans kontrolü)
  sourceLocationId: z.number().int().positive().optional(),
  sourceStatusId: z.number().int().positive().optional(),
  targetLocationId: z.number().int().positive().optional(),
  targetStatusId: z.number().int().positive().optional(),
  palletId: z.number().int().positive().optional(),
  batchNo: z.string().max(100).optional(),
  serialNo: z.string().max(100).optional(),
  customerId: z.number().int().positive().optional(), // consignment — müşteri-sahipli stok
  poNo: z.string().max(50).optional(), // PO-bazlı izlenebilirlik
  poLine: z.string().max(50).optional(),
  note: z.string().max(255).optional(),
})

const createSchema = z.object({
  documentNo: z.string().min(1).max(40).optional(), // verilmezse operasyon tipinin sayacından üretilir
  operationTypeId: z.number().int().positive(),
  warehouseId: z.number().int().positive().optional(), // belge tesise (operationType.facilityId) bağlı; depo opsiyonel
  partnerId: z.number().int().positive().optional(),
  reasonId: z.number().int().positive().optional(),
  documentDate: z.string().optional(),
  note: z.string().max(500).optional(),
  // Kontrollü op: satırlar zorunlu (içerik plandan belli). Kontrolsüz: BOŞ açılır, okutmayla dolar (handler'da doğrulanır).
  lines: z.array(lineSchema).optional(),
})

const lineInclude = {
  product: { select: { id: true, code: true, name: true } },
  unit: { select: { id: true, code: true } },
  sourceLocation: { select: { id: true, code: true } },
  targetLocation: { select: { id: true, code: true } },
  sourceStatus: { select: { id: true, code: true } },
  targetStatus: { select: { id: true, code: true } },
} as const

export async function documentRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    const companyId = getCompanyId(request)
    const q = request.query as { warehouseId?: string; status?: string; operationTypeId?: string; direction?: string; openOnly?: string; facilityId?: string; partnerId?: string; documentNo?: string; dateFrom?: string; dateTo?: string; statusCodes?: string; assignedFor?: string }
    const statuses = ['DRAFT', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as const
    const directions = ['INBOUND', 'OUTBOUND', 'INTERNAL', 'COUNT'] as const
    const num = (v?: string) => (v ? Number(v) : undefined)
    // operationType alt-filtresi: yön (İşlem Tipi) + tesis (belge tesise bağlı)
    const opFilter = {
      ...(directions.includes(q.direction as (typeof directions)[number]) ? { direction: q.direction as (typeof directions)[number] } : {}),
      ...(q.facilityId ? { facilityId: Number(q.facilityId) } : {}),
    }
    // Belge tarihi aralığı (Gözlem) — gün sınırlarında UTC
    const dateFilter = {
      ...(q.dateFrom ? { gte: new Date(q.dateFrom.slice(0, 10) + 'T00:00:00.000Z') } : {}),
      ...(q.dateTo ? { lte: new Date(q.dateTo.slice(0, 10) + 'T23:59:59.999Z') } : {}),
    }
    // El terminali GÖRÜNÜRLÜK (assignedFor=me): op.applyAssignment açıksa yalnız bana/grubuma atanmış belgeler;
    // kapalıysa serbest. Ayrıca (varsa) yalnız operasyon-yetkim olan belgeler. Süper-admin/yetkisiz kullanıcı → kısıtsız.
    const andClauses: Prisma.TBLDOCUMENTWhereInput[] = []
    if (q.assignedFor === 'me') {
      const user = request.user as { sub?: number; isSuperAdmin?: boolean } | undefined
      const uid = user?.sub
      if (uid && !user?.isSuperAdmin) {
        const gids = await userGroupIds(uid)
        const assigns = await prisma.tBLDOCUMENTASSIGNMENT.findMany({
          where: { companyId, isActive: true, OR: [{ userId: uid }, ...(gids.length ? [{ userGroupId: { in: gids } }] : [])] },
          select: { documentId: true },
        })
        const assignedIds = [...new Set(assigns.map((a) => a.documentId))]
        // applyAssignment=false operasyonlar serbest; true olanlar YALNIZ atanmışsa
        andClauses.push({ OR: [{ operationType: { applyAssignment: false } }, { id: { in: assignedIds } }] })
        // operasyon yetkisi (kısıt varsa)
        const allowedOps = await allowedOperationTypeIds(uid, user?.isSuperAdmin)
        if (allowedOps) andClauses.push({ operationTypeId: { in: [...allowedOps] } })
      }
    }
    return prisma.tBLDOCUMENT.findMany({
      where: {
        companyId,
        warehouseId: num(q.warehouseId),
        operationTypeId: num(q.operationTypeId),
        partnerId: num(q.partnerId),
        ...(q.documentNo ? { documentNo: { contains: q.documentNo, mode: 'insensitive' as const } } : {}),
        ...(Object.keys(dateFilter).length ? { documentDate: dateFilter } : {}),
        status: q.openOnly === 'true'
          ? { in: ['DRAFT', 'CONFIRMED'] } // Açık Belgeler (toplanmamış/onaylanmamış)
          : statuses.includes(q.status as (typeof statuses)[number])
            ? (q.status as (typeof statuses)[number])
            : undefined,
        ...(Object.keys(opFilter).length ? { operationType: opFilter } : {}),
        // Gözlem durum toggle'ları (Belge Durumu kodları: BKL/TPL/OBK/ONY/IPT — virgülle)
        ...(q.statusCodes ? { documentStatus: { code: { in: q.statusCodes.split(',').map((s) => s.trim()).filter(Boolean) } } } : {}),
        ...(andClauses.length ? { AND: andClauses } : {}),
      },
      orderBy: { id: 'desc' },
      take: 2000,
      include: {
        operationType: { select: { code: true, name: true, direction: true } },
        documentStatus: { select: { code: true, name: true, color: true } },
        partner: { select: { code: true, name: true } },
        _count: { select: { lines: true } },
      },
    })
  })

  app.get('/:id', async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })

    const document = await prisma.tBLDOCUMENT.findUnique({
      where: { id },
      include: {
        operationType: true,
        documentStatus: { select: { code: true, name: true, color: true } },
        warehouse: { select: { id: true, code: true, name: true } },
        createdBy: { select: { id: true, username: true, fullName: true } },
        lines: { orderBy: { lineNo: 'asc' }, include: lineInclude },
      },
    })
    if (!document) return reply.code(404).send({ error: 'Document not found' })
    return document
  })

  // Belge durum geçiş geçmişi (Faz 3 audit) — kimden→kime, ne zaman, hangi olay, kim
  app.get('/:id/status-history', { preHandler: [app.authenticate] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const rows = await prisma.tBLDOCUMENTSTATUSHISTORY.findMany({ where: { documentId: id, companyId: getCompanyId(request) }, orderBy: { id: 'asc' } })
    const userIds = [...new Set(rows.map((r) => r.userId).filter((x): x is number => x != null))]
    const users = userIds.length ? await prisma.tBLUSER.findMany({ where: { id: { in: userIds } }, select: { id: true, username: true } }) : []
    const uname = new Map(users.map((u) => [u.id, u.username]))
    return rows.map((r) => ({ ...r, username: r.userId != null ? uname.get(r.userId) ?? null : null }))
  })

  // Excel içe aktarma: tek sayfa, "Belge No" ile GRUPLANIR (aynı no = tek belge). Başlık grubun ilk satırından.
  // Kodlar (operasyon/cari/depo/ürün/birim/lokasyon/statü) id'ye çözülür → grup başına GERÇEK POST /api/documents (app.inject)
  // ile oluşturulur → tüm kurallar (yetki, cross-tenant, controlMode, referans-kontrollü, sayaç, durum) OTOMATİK uygulanır.
  const importRowSchema = z.object({
    documentNo: z.any().optional(), operationCode: z.any().optional(), partnerCode: z.any().optional(), warehouseCode: z.any().optional(),
    productCode: z.any().optional(), quantity: z.any().optional(), unitCode: z.any().optional(),
    targetLocationCode: z.any().optional(), targetStatusCode: z.any().optional(), batchNo: z.any().optional(), serialNo: z.any().optional(), note: z.any().optional(),
  }).passthrough()
  app.post('/import', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const body = z.object({ rows: z.array(importRowSchema).min(1).max(5000) }).safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Geçersiz veri (rows dizisi gerekli, en fazla 5000)' })
    const companyId = getCompanyId(request)
    const [ops, partners, whs, products, units, locations, statuses] = await Promise.all([
      codeMap(prisma.tBLOPERATIONTYPE, companyId), codeMap(prisma.tBLBUSINESSPARTNER, companyId), codeMap(prisma.tBLWAREHOUSE, companyId),
      codeMap(prisma.tBLPRODUCT, companyId), codeMap(prisma.tBLUNIT, companyId), codeMap(prisma.tBLLOCATION, companyId), codeMap(prisma.tBLSTATUS, companyId),
    ])
    // Belge No'ya göre grupla (sıra korunur); Belge No boş satırlar atlanır (gruplama anahtarı)
    const groups = new Map<string, Record<string, unknown>[]>()
    let noDocNo = 0
    for (const r of body.data.rows) {
      const dn = str(r.documentNo)
      if (!dn) { noDocNo++; continue }
      if (!groups.has(dn)) groups.set(dn, [])
      groups.get(dn)!.push(r)
    }
    const errors: { row: string; error: string }[] = []
    if (noDocNo) errors.push({ row: '(boş)', error: `${noDocNo} satırda Belge No boş — atlandı (gruplama için zorunlu)` })
    const authHeader = request.headers.authorization ?? ''
    let created = 0
    for (const [docNo, rows] of groups) {
      try {
        const first = rows[0] as Record<string, unknown>
        const operationTypeId = resolveCode(ops, first.operationCode, 'Operasyon', true)
        const partnerId = resolveCode(partners, first.partnerCode, 'Cari')
        const warehouseId = resolveCode(whs, first.warehouseCode, 'Depo')
        const lines = rows.map((r, i) => {
          const qty = Number(str(r.quantity))
          if (!Number.isFinite(qty) || qty <= 0) throw new Error(`Miktar geçersiz (satır ${i + 1}): "${str(r.quantity)}"`)
          return {
            productId: resolveCode(products, r.productCode, `Ürün (satır ${i + 1})`, true),
            unitId: resolveCode(units, r.unitCode, `Birim (satır ${i + 1})`, true),
            quantity: qty,
            targetLocationId: resolveCode(locations, r.targetLocationCode, `Hedef Lokasyon (satır ${i + 1})`),
            targetStatusId: resolveCode(statuses, r.targetStatusCode, `Hedef Statü (satır ${i + 1})`),
            batchNo: str(r.batchNo) || undefined, serialNo: str(r.serialNo) || undefined, note: str(r.note) || undefined,
          }
        })
        const res = await app.inject({
          method: 'POST', url: '/api/documents',
          headers: { authorization: authHeader, 'x-company-id': String(companyId), 'content-type': 'application/json' },
          payload: { documentNo: docNo, operationTypeId, partnerId, warehouseId, lines },
        })
        if (res.statusCode === 201) created++
        else errors.push({ row: docNo, error: (res.json() as { error?: string })?.error ?? `Oluşturulamadı (${res.statusCode})` })
      } catch (e) {
        errors.push({ row: docNo, error: e instanceof Error ? e.message : 'Bilinmeyen hata' })
      }
    }
    return { created, total: groups.size, errors }
  })

  // Belge oluştur (DRAFT)
  app.post('/', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    }

    const companyId = getCompanyId(request)
    const { lines: rawLines, documentDate, documentNo: providedNo, ...header } = parsed.data
    const lines = rawLines ?? []

    // Operasyon tipini bir kez çek (yön + sayaç)
    const opType = await prisma.tBLOPERATIONTYPE.findFirst({
      where: { id: header.operationTypeId, companyId },
      include: { sequence: true },
    })
    if (!opType) return reply.code(400).send({ error: 'Geçersiz operasyon tipi' })

    // REFERANS KONTROLLÜ operasyonun belgesi ELLE AÇILAMAZ — bağlı çıkış onayıyla, tanımlara göre otomatik oluşur.
    if (opType.controlMode === 'REFERENCE_CONTROLLED') {
      return reply.code(400).send({ error: 'Referans kontrollü operasyonun belgesi elle açılamaz — referans (bağlı çıkış) onayıyla otomatik oluşur' })
    }

    // Belge durumu tanımları (BKL/TPL/OBK/ONY/IPT) eksikse belge AÇILAMAZ — durum türetme sessiz null bırakır, akış körleşir
    const missingSt = await missingDocStatuses(companyId)
    if (missingSt.length) {
      return reply.code(400).send({ error: `Belge durumu tanımları eksik: ${missingSt.join(', ')} — Uyarlamalar › Belge Durumları'ndan tanımlayın` })
    }
    // Kontrollü belge = içerik plandan belli (belge ekranı/Excel/entegrasyon) → satırlar zorunlu.
    // Kontrolsüz belge = BOŞ açılır, içerik el terminali okutmalarıyla dolar (satırsız oluşturma serbest).
    if (lines.length === 0 && opType.controlMode !== 'UNCONTROLLED') {
      return reply.code(400).send({ error: 'Kontrollü operasyonda belge içeriği (satırlar) zorunlu — kontrolsüz belge boş açılıp okutmayla dolar' })
    }

    // Cross-tenant koruması: header (depo/cari/neden) + satır referansları (ürün/birim/lokasyon/statü/palet)
    // bu firmaya ait olmalı — aksi halde A firması belgesi B'nin ürün/lokasyonunu referans edip stok yazabiliyordu.
    const refProduct = new Set<number>(), refUnit = new Set<number>(), refLoc = new Set<number>(), refStatus = new Set<number>(), refPallet = new Set<number>()
    for (const l of lines) {
      refProduct.add(l.productId); refUnit.add(l.unitId)
      if (l.sourceLocationId) refLoc.add(l.sourceLocationId)
      if (l.targetLocationId) refLoc.add(l.targetLocationId)
      if (l.sourceStatusId) refStatus.add(l.sourceStatusId)
      if (l.targetStatusId) refStatus.add(l.targetStatusId)
      if (l.palletId) refPallet.add(l.palletId)
    }
    const [whOk, prOk, unOk, locOk, stOk, palOk, partOk, rsnOk] = await Promise.all([
      header.warehouseId ? prisma.tBLWAREHOUSE.count({ where: { id: header.warehouseId, companyId } }) : 1,
      prisma.tBLPRODUCT.count({ where: { id: { in: [...refProduct] }, companyId } }),
      prisma.tBLUNIT.count({ where: { id: { in: [...refUnit] }, companyId } }),
      refLoc.size ? prisma.tBLLOCATION.count({ where: { id: { in: [...refLoc] }, companyId } }) : 0,
      refStatus.size ? prisma.tBLSTATUS.count({ where: { id: { in: [...refStatus] }, companyId } }) : 0,
      refPallet.size ? prisma.tBLPALLET.count({ where: { id: { in: [...refPallet] }, companyId } }) : 0,
      header.partnerId ? prisma.tBLBUSINESSPARTNER.count({ where: { id: header.partnerId, companyId } }) : 1,
      header.reasonId ? prisma.tBLREASON.count({ where: { id: header.reasonId, companyId } }) : 1,
    ])
    if (prOk !== refProduct.size || unOk !== refUnit.size || locOk !== refLoc.size || stOk !== refStatus.size || palOk !== refPallet.size ||
        (header.warehouseId && whOk !== 1) || (header.partnerId && partOk !== 1) || (header.reasonId && rsnOk !== 1)) {
      return reply.code(400).send({ error: 'Geçersiz referans — depo/ürün/birim/lokasyon/statü/palet/cari/neden bu firmaya ait değil' })
    }

    // Kullanıcı yetkisi: yalnız yetkili olduğu depo / operasyon tipi / tesis ile belge açabilir (super-admin bypass)
    try {
      await assertUserAuthorized(request, { warehouseId: header.warehouseId, facilityId: opType.facilityId, operationTypeId: header.operationTypeId })
    } catch (err) {
      if (err instanceof AuthorizationError) return reply.code(403).send({ error: err.message })
      throw err
    }

    // Tesis = operasyonun tesisi (operationType.facilityId, legacy LNGDISTKOD); depo verilmişse onun tesisine düş
    let facilityId = opType.facilityId ?? null
    if (facilityId == null && header.warehouseId) {
      const wh = await prisma.tBLWAREHOUSE.findFirst({ where: { id: header.warehouseId, companyId }, select: { facilityId: true } })
      facilityId = wh?.facilityId ?? null
    }
    // Ürün-tesis kısıtı: belgenin tesisi, satırdaki ürünün izinli tesisleri içinde olmalı (ürünün kaydı yoksa serbest)
    if (facilityId != null) {
      const productIds = [...new Set(lines.map((l) => l.productId))]
      const restrictions = await prisma.tBLPRODUCTFACILITY.findMany({ where: { companyId, productId: { in: productIds } }, select: { productId: true, facilityId: true } })
      const byProduct = new Map<number, Set<number>>()
      for (const r of restrictions) {
        if (!byProduct.has(r.productId)) byProduct.set(r.productId, new Set())
        byProduct.get(r.productId)!.add(r.facilityId)
      }
      for (const pid of productIds) {
        const allowed = byProduct.get(pid)
        if (allowed && allowed.size > 0 && !allowed.has(facilityId)) {
          return reply.code(400).send({ error: `Ürün (id ${pid}) bu tesiste kullanılamaz — ürün-tesis kısıtı` })
        }
      }
      // Müşteri-tesis kısıtı: belgenin cari'si bu deponun tesisinde işlem yapabilmeli (kayıt yoksa serbest)
      if (header.partnerId) {
        const partnerFacs = await prisma.tBLPARTNERFACILITY.findMany({ where: { companyId, partnerId: header.partnerId }, select: { facilityId: true } })
        if (partnerFacs.length > 0 && !partnerFacs.some((f) => f.facilityId === facilityId)) {
          return reply.code(400).send({ error: 'Müşteri bu tesiste işlem yapamaz — müşteri-tesis kısıtı' })
        }
      }
      // Statü-tesis kısıtı: satırlarda kullanılan her statü (kaynak/hedef) bu deponun tesisine AİT olmalı.
      // Statü TAM OLARAK tek tesise bağlı; deponun tesisiyle eşleşmiyorsa o depoda kullanılamaz.
      const statusIds = [...new Set(lines.flatMap((l) => [l.sourceStatusId, l.targetStatusId]).filter((x): x is number => !!x))]
      if (statusIds.length > 0) {
        const sts = await prisma.tBLSTATUS.findMany({ where: { companyId, id: { in: statusIds } }, select: { id: true, facilityId: true } })
        const byStatus = new Map(sts.map((s) => [s.id, s.facilityId]))
        for (const sid of statusIds) {
          if (byStatus.get(sid) !== facilityId) {
            return reply.code(400).send({ error: `Statü (id ${sid}) bu tesiste kullanılamaz — statü-tesis kısıtı` })
          }
        }
      }
    }

    // documentNo verilmezse operasyon tipinin sayacından otomatik üret
    let documentNo = providedNo
    if (!documentNo) {
      if (!opType.sequence) {
        return reply.code(400).send({ error: 'documentNo gerekli — bu operasyon tipinde sayaç tanımlı değil' })
      }
      documentNo = (await nextSequence(companyId, opType.sequence.code)).formatted
    }

    // Mal kabulde (INBOUND) hedef statü: kalite kontrol açıksa KARANTİNA, değilse op-statü geçişinden türetilir
    let inboundTargetStatusId: number | undefined
    if (opType.direction === 'INBOUND') {
      if (opType.qualityControl) {
        const q = await prisma.tBLSTATUS.findFirst({ where: { companyId, code: 'QUARANTINE', ...(facilityId ? { facilityId } : {}) } })
        inboundTargetStatusId = q?.id
      } else {
        const st = await prisma.tBLOPERATIONTYPESTATUS.findFirst({
          where: { companyId, operationTypeId: opType.id },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        })
        inboundTargetStatusId = st?.targetStatusId ?? undefined // targetStatusId nullable (Çıkış'ta boş) → null'u undefined'a indir
      }
    }

    // Directed putaway: INBOUND satırlarda hedef lokasyon verilmemişse yönlendirme önerisinden, hedef statü verilmemişse op-statü geçişinden doldur
    let autoRoutedLines = 0
    const processedLines = await Promise.all(
      lines.map(async (line) => {
        if (opType.direction !== 'INBOUND') return line
        let next = { ...line }
        if (!next.targetLocationId) {
          const suggestions = await suggestPutawayLocations(companyId, line.productId)
          if (suggestions.length > 0) {
            autoRoutedLines++
            next.targetLocationId = suggestions[0]!.id
          }
        }
        if (!next.targetStatusId && inboundTargetStatusId) next.targetStatusId = inboundTargetStatusId
        return next
      }),
    )

    try {
      const document = await prisma.tBLDOCUMENT.create({
        data: {
          ...header,
          documentNo,
          companyId,
          createdById: request.user.sub,
          documentStatusId: await docStatusId(companyId, DOC_STATUS.WAITING), // Bekliyor
          documentDate: documentDate ? new Date(documentDate) : undefined,
          lines: { create: processedLines.map((line, index) => ({ lineNo: index + 1, companyId, ...line })) },
        },
        include: { lines: { orderBy: { lineNo: 'asc' } }, documentStatus: true },
      })
      return reply.code(201).send({ ...document, autoRoutedLines })
    } catch (err) {
      const code = (err as { code?: string }).code
      if (code === 'P2002') return reply.code(409).send({ error: 'Document number already exists' })
      if (code === 'P2003') {
        return reply.code(400).send({ error: 'Invalid reference (operation type, warehouse, product, unit, location, status or pallet)' })
      }
      throw err
    }
  })

  // Bekliyor → Toplanıyor (okutma/toplama başladı)
  app.post('/:id/start-picking', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const doc = await prisma.tBLDOCUMENT.findUnique({ where: { id } })
    if (!doc) return reply.code(404).send({ error: 'Document not found' })
    if (doc.status !== 'DRAFT') return reply.code(409).send({ error: `Sadece bekleyen belge toplamaya alınabilir (mevcut: ${doc.status})` })
    return prisma.tBLDOCUMENT.update({
      where: { id },
      data: { documentStatusId: await docStatusId(doc.companyId, DOC_STATUS.PICKING) },
      include: { documentStatus: true },
    })
  })

  // DRAFT → CONFIRMED (Onaya Gönder → Onay Bekliyor)
  app.post('/:id/confirm', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const doc = await prisma.tBLDOCUMENT.findUnique({ where: { id } })
    if (!doc) return reply.code(404).send({ error: 'Document not found' })
    if (doc.status !== 'DRAFT') {
      return reply.code(409).send({ error: `Sadece DRAFT belge onaya gönderilebilir (mevcut: ${doc.status})` })
    }
    // Kontrollü op: her satır TAM toplanmadan onaya gönderilemez (eksikse tamamla ya da BÖL)
    const short = await collectionShortfall(prisma, id)
    if (short) return reply.code(409).send({ error: `Satır ${short.lineNo}: toplama eksik (${short.collected}/${short.quantity}) — onaya gönderilemez. Tamamlayın ya da belgeyi bölün (Böl).` })
    // Kontrolsüz op: belge okutmayla oluşur — hiç okutma yoksa onaya gönderilemez
    const scanErr = await uncontrolledScanGate(prisma, id)
    if (scanErr) return reply.code(409).send({ error: scanErr })
    // Referans kontrollü op: belge referanstan doğmuş olmalı
    const refErr = await referenceGate(prisma, id)
    if (refErr) return reply.code(409).send({ error: refErr })
    await prisma.tBLDOCUMENT.update({ where: { id }, data: { status: 'CONFIRMED' } })
    await refreshDocStatus(prisma, id, { source: 'confirm', userId: Number((request.user as { sub?: number | string })?.sub) || null }) // → OBK
    return prisma.tBLDOCUMENT.findUnique({ where: { id }, include: { documentStatus: true } })
  })

  // CONFIRMED → COMPLETED (+ stok'a işle)
  app.post('/:id/complete', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const doc = await prisma.tBLDOCUMENT.findUnique({ where: { id } })
    if (!doc) return reply.code(404).send({ error: 'Document not found' })
    const body = (request.body ?? {}) as { breakPassword?: string; breakReasonCode?: string }
    const userId = Number((request.user as { sub?: number | string })?.sub) || undefined
    try {
      const done = await completeDocument(id, { breakPassword: body.breakPassword, breakReasonCode: body.breakReasonCode, userId })
      await refreshDocStatus(prisma, id, { source: 'complete', userId: userId ?? null }) // → ONY
      const fresh = await prisma.tBLDOCUMENT.findUnique({ where: { id }, include: { documentStatus: true, lines: { orderBy: { lineNo: 'asc' } } } })
      // Referans Kontrollü: motor bağlı giriş belgesi ürettiyse yanıtla bildir (UI "referans belge doğdu" gösterebilsin)
      return fresh ? Object.assign(fresh, { referenceDocument: done.referenceDocument ?? null }) : done
    } catch (err) {
      if (err instanceof MovementError) return reply.code(409).send({ error: err.message })
      throw err
    }
  })

  // DRAFT/CONFIRMED → CANCELLED (stok'a işlenmemişse güvenli)
  app.post('/:id/cancel', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const doc = await prisma.tBLDOCUMENT.findUnique({ where: { id } })
    if (!doc) return reply.code(404).send({ error: 'Document not found' })
    if (doc.status === 'COMPLETED') {
      return reply.code(409).send({ error: 'Tamamlanmış belge iptal edilemez (stok ters kaydı gerekir)' })
    }
    if (doc.status === 'CANCELLED') return reply.code(409).send({ error: 'Belge zaten iptal edilmiş' })
    await prisma.tBLDOCUMENT.update({ where: { id }, data: { status: 'CANCELLED' } })
    await releaseForDocument(id, doc.companyId) // rezervasyonlu belgeyse stok rezervleri serbest kalır
    await refreshDocStatus(prisma, id, { source: 'cancel', userId: Number((request.user as { sub?: number | string })?.sub) || null }) // → IPT
    return prisma.tBLDOCUMENT.findUnique({ where: { id }, include: { documentStatus: true } })
  })

  // ── Rezervasyon (legacy LNGREZERVEBELGEKOD): belgeye stok ayır / serbest bırak / liste özeti ──
  app.post('/:id/reserve', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    try {
      return await reserveForDocument(id, getCompanyId(request))
    } catch (err) {
      if (err instanceof ReservationError) return reply.code(err.httpCode).send({ error: err.message })
      throw err
    }
  })

  app.post('/:id/release-reservation', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const doc = await prisma.tBLDOCUMENT.findFirst({ where: { id, companyId: getCompanyId(request) }, select: { id: true } })
    if (!doc) return reply.code(404).send({ error: 'Belge bulunamadı' })
    return releaseForDocument(id, getCompanyId(request))
  })

  // Rezervasyon ekranı rozeti: ?ids=1,2,3 → { docId: Σ rezerve }
  app.get('/reservations/summary', { preHandler: [app.authenticate] }, async (request) => {
    const ids = String((request.query as { ids?: string }).ids ?? '').split(',').map(Number).filter(Number.isInteger)
    return reservationSummary(getCompanyId(request), ids)
  })

  // COMPLETED → ters kayıt (stok geri al) → CANCELLED
  app.post('/:id/reverse', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const doc = await prisma.tBLDOCUMENT.findUnique({ where: { id } })
    if (!doc) return reply.code(404).send({ error: 'Document not found' })
    try {
      const rev = await reverseDocument(id) // stok geri + DRAFT
      await refreshDocStatus(prisma, id, { source: 'reverse', userId: Number((request.user as { sub?: number | string })?.sub) || null }) // → Bekliyor/Toplanıyor/Onay Bekliyor (toplama durumuna göre)
      return rev
    } catch (err) {
      if (err instanceof MovementError) return reply.code(409).send({ error: err.message })
      throw err
    }
  })

  // Böl — toplanan kısmı yeni belgeye ayır (eksik toplamada onaya gitmeden önce). Kalan orijinalde (Bekliyor) durur.
  app.post('/:id/split', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const doc = await prisma.tBLDOCUMENT.findFirst({ where: { id, companyId: getCompanyId(request) } })
    if (!doc) return reply.code(404).send({ error: 'Document not found' })
    try {
      const result = await splitDocument(id, Number((request.user as { sub?: number | string })?.sub) || undefined)
      return reply.code(201).send(result)
    } catch (err) {
      if (err instanceof MovementError) return reply.code(409).send({ error: err.message })
      throw err
    }
  })

  // Toplu İşlem — seçili belgelere yaşam-döngüsü aksiyonu topluca uygula (Gözlem + Toplu İşlem ekranları)
  // confirm=Onaya Gönder · complete=Onay(stok işle) · reverse=Onay İptal(ters kayıt) · cancel-picking=Toplama İptal · cancel=İptal/Sil
  app.post('/bulk-action', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = z.object({ ids: z.array(z.number().int().positive()).min(1).max(500), action: z.enum(['confirm', 'complete', 'reverse', 'cancel-picking', 'cancel']) }).safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const companyId = getCompanyId(request)
    const userId = Number((request.user as { sub?: number | string })?.sub) || undefined
    const { ids, action } = parsed.data
    let ok = 0
    const failed: { id: number; error: string }[] = []
    for (const id of ids) {
      const doc = await prisma.tBLDOCUMENT.findFirst({ where: { id, companyId } })
      if (!doc) { failed.push({ id, error: 'Bulunamadı' }); continue }
      try {
        if (action === 'confirm') {
          if (doc.status !== 'DRAFT') throw new MovementError(`DRAFT değil (${doc.status})`)
          // Tekil confirm ile aynı kapılar: kontrollü=tam toplama, kontrolsüz=en az bir okutma
          const short = await collectionShortfall(prisma, id)
          if (short) throw new MovementError(`Satır ${short.lineNo}: toplama eksik (${short.collected}/${short.quantity})`)
          const scanErr = await uncontrolledScanGate(prisma, id)
          if (scanErr) throw new MovementError(scanErr)
          const refErr = await referenceGate(prisma, id)
          if (refErr) throw new MovementError(refErr)
          await prisma.tBLDOCUMENT.update({ where: { id }, data: { status: 'CONFIRMED' } })
          await refreshDocStatus(prisma, id) // → OBK
        } else if (action === 'complete') {
          await completeDocument(id, { userId })
          await refreshDocStatus(prisma, id) // → ONY
        } else if (action === 'reverse') {
          if (doc.status !== 'COMPLETED') throw new MovementError(`Yalnız onaylı belgenin onayı iptal edilir (${doc.status})`)
          await reverseDocument(id) // stok geri + DRAFT
          await refreshDocStatus(prisma, id) // → toplama durumuna göre Bekliyor/Onay Bekliyor
        } else if (action === 'cancel-picking') {
          // Toplama İptal: okutmaları (kapsam) sil + collectedQty sıfırla → Bekliyor (yalnız iç-statü DRAFT belgede)
          if (doc.status !== 'DRAFT') throw new MovementError(`Toplama iptali yalnız bekleyen/toplanan belgede (${doc.status})`)
          const lines = await prisma.tBLDOCUMENTLINE.findMany({ where: { documentId: id }, select: { id: true } })
          if (lines.length) await prisma.tBLDOCUMENTLINESCOPE.deleteMany({ where: { documentLineId: { in: lines.map((l) => l.id) } } })
          await prisma.tBLDOCUMENTLINE.updateMany({ where: { documentId: id }, data: { collectedQty: 0 } })
          await refreshDocStatus(prisma, id) // → BKL
        } else {
          if (doc.status === 'COMPLETED' || doc.status === 'CANCELLED') throw new MovementError(`İptal edilemez (${doc.status})`)
          await prisma.tBLDOCUMENT.update({ where: { id }, data: { status: 'CANCELLED' } })
          await refreshDocStatus(prisma, id) // → IPT
        }
        ok++
      } catch (err) {
        failed.push({ id, error: err instanceof MovementError ? err.message : 'Hata' })
      }
    }
    return reply.send({ ok, failedCount: failed.length, failed })
  })

  // Belge Kopyala — kaynak belgenin başlık + satırlarını yeni DRAFT belgeye kopyalar (Belge ekranı: "belge kopyalamak")
  app.post('/:id/copy', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const companyId = getCompanyId(request)
    const sourceId = Number((request.params as { id: string }).id)
    if (!Number.isInteger(sourceId)) return reply.code(400).send({ error: 'Geçersiz id' })
    const body = z.object({ documentNo: z.string().min(1).max(40).optional() }).safeParse(request.body ?? {})
    if (!body.success) return reply.code(400).send({ error: 'Invalid body', details: body.error.flatten() })

    const source = await prisma.tBLDOCUMENT.findFirst({
      where: { id: sourceId, companyId },
      include: { operationType: { include: { sequence: true } }, lines: { orderBy: { lineNo: 'asc' } } },
    })
    if (!source) return reply.code(404).send({ error: 'Kaynak belge bulunamadı' })
    // Referans kontrollü belge kopyalanamaz — kopya referanssız (elle) belge doğururdu
    if (source.operationType.controlMode === 'REFERENCE_CONTROLLED') {
      return reply.code(400).send({ error: 'Referans kontrollü belge kopyalanamaz — referans (bağlı çıkış) onayıyla otomatik oluşur' })
    }
    // Belge durumu tanımları eksikse kopya da açılamaz (create ile aynı kapı)
    const missingSt = await missingDocStatuses(companyId)
    if (missingSt.length) {
      return reply.code(400).send({ error: `Belge durumu tanımları eksik: ${missingSt.join(', ')} — Uyarlamalar › Belge Durumları'ndan tanımlayın` })
    }

    let documentNo = body.data.documentNo
    if (!documentNo) {
      if (!source.operationType.sequence) return reply.code(400).send({ error: 'documentNo gerekli — operasyon tipinde sayaç yok' })
      documentNo = (await nextSequence(companyId, source.operationType.sequence.code)).formatted
    }

    try {
      const copy = await prisma.tBLDOCUMENT.create({
        data: {
          documentNo,
          operationTypeId: source.operationTypeId,
          warehouseId: source.warehouseId,
          partnerId: source.partnerId,
          reasonId: source.reasonId,
          note: source.note,
          companyId,
          createdById: request.user.sub,
          documentStatusId: await docStatusId(companyId, DOC_STATUS.WAITING),
          lines: {
            create: source.lines.map((l, i) => ({
              lineNo: i + 1,
              companyId,
              productId: l.productId, unitId: l.unitId, quantity: l.quantity, referenceQty: l.referenceQty,
              sourceLocationId: l.sourceLocationId, targetLocationId: l.targetLocationId,
              sourceStatusId: l.sourceStatusId, targetStatusId: l.targetStatusId,
              batchNo: l.batchNo, serialNo: l.serialNo, palletId: l.palletId, note: l.note,
              customerId: l.customerId, poNo: l.poNo, poLine: l.poLine,
            })),
          },
        },
        include: { lines: { orderBy: { lineNo: 'asc' } }, operationType: { select: { code: true, direction: true } } },
      })
      return reply.code(201).send({ ...copy, copiedFrom: source.documentNo })
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') return reply.code(409).send({ error: 'Bu belge numarası zaten var' })
      throw err
    }
  })
}
