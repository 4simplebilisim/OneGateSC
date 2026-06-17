import { prisma } from './prisma.js'
import { completeDocument, MovementError } from './movement.js'

export class QualityError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'QualityError'
  }
}

/**
 * Muayene sonucu: PASSED → AVAILABLE, FAILED → BLOCKED statüsüne taşır.
 * Statü değişimi gerekiyorsa INTERNAL belge (aynı lokasyon, kaynak→hedef statü) + completeDocument.
 * Stok kaynak statüde yetersizse MovementError (409). Tek mantıksal akış.
 */
export async function decideInspection(id: number, pass: boolean, userId: number, now: Date) {
  const insp = await prisma.tBLQUALITYINSPECTION.findUniqueOrThrow({ where: { id } })
  if (insp.result !== 'PENDING') throw new QualityError(`Muayene zaten sonuçlandı (${insp.result})`)

  const targetCode = pass ? 'AVAILABLE' : 'BLOCKED'
  const target = await prisma.tBLSTATUS.findFirst({ where: { companyId: insp.companyId, code: targetCode } })
  if (!target) throw new QualityError(`Hedef statü tanımlı değil: ${targetCode}`)

  if (target.id !== insp.statusId) {
    const op = await prisma.tBLOPERATIONTYPE.findFirst({
      where: { companyId: insp.companyId, direction: 'INTERNAL' },
      orderBy: { code: 'asc' },
    })
    if (!op) throw new QualityError('INTERNAL operasyon tipi (TR) tanımlı değil')
    const location = await prisma.tBLLOCATION.findUniqueOrThrow({ where: { id: insp.locationId } })

    const doc = await prisma.tBLDOCUMENT.create({
      data: {
        companyId: insp.companyId,
        documentNo: `QC-${insp.inspectionNo}-${now.getTime()}`,
        operationTypeId: op.id,
        warehouseId: location.warehouseId,
        createdById: userId,
        status: 'CONFIRMED',
        note: `Kalite muayene ${insp.inspectionNo}: ${pass ? 'PASSED' : 'FAILED'}`,
        lines: {
          create: [
            {
              lineNo: 1,
              productId: insp.productId,
              unitId: insp.unitId,
              quantity: insp.quantity,
              sourceLocationId: insp.locationId,
              sourceStatusId: insp.statusId,
              targetLocationId: insp.locationId,
              targetStatusId: target.id,
              batchNo: insp.batchNo,
              serialNo: insp.serialNo,
              palletId: insp.palletId,
            },
          ],
        },
      },
    })
    try {
      await completeDocument(doc.id) // INTERNAL → kaynak statü −, hedef statü +
    } catch (err) {
      if (err instanceof MovementError) throw new QualityError(err.message)
      throw err
    }
  }

  return prisma.tBLQUALITYINSPECTION.update({
    where: { id },
    data: { result: pass ? 'PASSED' : 'FAILED', inspectedById: userId, inspectedAt: now },
  })
}
