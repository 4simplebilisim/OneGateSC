import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getCompanyId } from '../lib/company.js'
import { nextSequence } from '../lib/sequence.js'

const createSchema = z.object({
  palletNo: z.string().max(40).optional(), // verilmezse palet tipinin sayacından üretilir
  palletTypeId: z.number().int().positive(),
  parentPalletId: z.number().int().positive().optional(),
  baseUnitId: z.number().int().positive().optional(),
  originalQty: z.number().nonnegative().optional(),
  productionDate: z.string().optional(),
  expiryDate: z.string().optional(),
  beaconId: z.string().max(200).optional(),
  isActive: z.boolean().optional(),
})

const num = (v?: string) => (v ? Number(v) : undefined)

export async function palletRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    const q = request.query as { palletTypeId?: string }
    return prisma.tBLPALLET.findMany({
      where: { companyId: getCompanyId(request), palletTypeId: num(q.palletTypeId) },
      orderBy: { id: 'desc' },
      include: { palletType: { select: { code: true } } },
    })
  })

  app.get('/:id', async (request, reply) => {
    const id = Number((request.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Invalid id' })
    const pallet = await prisma.tBLPALLET.findUnique({ where: { id }, include: { palletType: true, childPallets: true } })
    if (!pallet) return reply.code(404).send({ error: 'Pallet not found' })
    return pallet
  })

  app.post('/', { preHandler: [app.authenticate, app.requireWrite] }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() })
    const companyId = getCompanyId(request)
    const { palletNo: providedNo, productionDate, expiryDate, ...rest } = parsed.data

    // palletNo verilmezse: palet tipinin ÖNEKİ (code) + sayaç değeri (palletNoLength'e göre sıfır dolgulu)
    let palletNo = providedNo
    if (!palletNo) {
      const palletType = await prisma.tBLPALLETTYPE.findFirst({
        where: { id: rest.palletTypeId, companyId },
        include: { sequence: true },
      })
      if (!palletType?.sequence) {
        return reply.code(400).send({ error: 'palletNo gerekli — bu palet tipinde sayaç tanımlı değil' })
      }
      const seq = await nextSequence(companyId, palletType.sequence.code)
      const len = palletType.palletNoLength ?? 0
      const num = len > 0 ? String(seq.value).padStart(len, '0') : String(seq.value)
      palletNo = `${palletType.code}${num}` // öne­k + sıralı no
    }

    try {
      const pallet = await prisma.tBLPALLET.create({
        data: {
          ...rest,
          palletNo,
          companyId,
          productionDate: productionDate ? new Date(productionDate) : undefined,
          expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        },
        include: { palletType: { select: { code: true } } },
      })
      return reply.code(201).send(pallet)
    } catch (err) {
      const code = (err as { code?: string }).code
      if (code === 'P2002') return reply.code(409).send({ error: 'Palet no zaten var' })
      if (code === 'P2003') return reply.code(400).send({ error: 'Geçersiz palet tipi / birim / üst palet' })
      throw err
    }
  })
}
