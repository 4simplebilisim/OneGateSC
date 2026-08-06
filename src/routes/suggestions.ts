import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { getCompanyId } from '../lib/company.js'
import { suggestPutawayLocations } from '../lib/routing.js'
import { loadPickOrderParameter, resolvePickPlan, pickGranularityLabel } from '../lib/pickOrder.js'
import { rotationOrderBy, type Rotation } from '../lib/rotation.js'

// Öneri Listesi — SALT GÖSTERİM (belge oluşturmaz):
// var olan BİR belge seçilir → o belgenin satır ürünleri için "nereye girilecek"(Giriş) / "nereden alınacak"(Çıkış) önerisi bilgi amaçlı listelenir.
export async function suggestionListRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const companyId = getCompanyId(request)
    const q = request.query as { documentId?: string }
    const documentId = Number(q.documentId)
    if (!Number.isInteger(documentId) || documentId <= 0) return reply.code(400).send({ error: 'documentId gerekli' })

    const doc = await prisma.tBLDOCUMENT.findFirst({
      where: { id: documentId, companyId },
      include: {
        operationType: { select: { code: true, name: true, direction: true, stockRotation: true } },
        lines: {
          orderBy: { lineNo: 'asc' },
          include: {
            product: { select: { code: true, name: true } },
            unit: { select: { code: true } },
            sourceLocation: { select: { code: true } },
            targetLocation: { select: { code: true } },
          },
        },
      },
    })
    if (!doc) return reply.code(404).send({ error: 'Belge bulunamadı' })
    const direction = doc.operationType.direction
    // Çıkış stok rotasyonu operasyondan gelir (FEFO=SKT / FIFO=üretim / NONE=giriş sırası)
    const rotation = (doc.operationType.stockRotation ?? 'NONE') as Rotation

    // Toplama sırası parametresi bir kez çözülür (satır başına sorgu yapılmasın)
    const pickParam = direction === 'OUTBOUND' ? await loadPickOrderParameter(companyId, doc.partnerId) : null

    const rows = []
    for (const line of doc.lines) {
      if (direction === 'OUTBOUND') {
        // Çıkış: nereden alınacak — operasyon rotasyonuna göre sıralı uygun stok (öneri = kaynak lokasyon).
        // Rezerv kuralı (legacy BYTREZERVASYONFIFOYUEZSIN): BU BELGEYE rezerve satırlar rotasyonu EZER (öne gelir);
        // başkasına/blokaja rezerveli kısım kullanılamaz — tamamı rezerveli yabancı satır hiç önerilmez.
        const stocks = await prisma.tBLSTOCK.findMany({
          where: { companyId, productId: line.productId, mainQty: { gt: 0 } },
          include: { location: { select: { code: true } } }, orderBy: rotationOrderBy(rotation),
        })
        const usable = stocks
          .map((x) => {
            const own = x.reservedDocumentId === doc.id
            const avail = own ? Number(x.mainQty) : Number(x.mainQty) - Number(x.reservedQty)
            return { x, own, avail }
          })
          .filter((s) => s.avail > 0)
          .sort((a, b) => Number(b.own) - Number(a.own)) // stable: kendi rezervi öne, gerisi rotasyon sırasında
        const available = usable.reduce((s, u) => s + u.avail, 0)
        // MUADİL (TBLPRODUCTSUBSTITUTE): stok satırı karşılamıyorsa muadil ürünün
        // eldeki miktarı öneri olarak gösterilir. Tanım yoksa kolon boş kalır.
        let muadilBilgi = ''
        if (available < Number(line.quantity)) {
          const muadiller = await prisma.tBLPRODUCTSUBSTITUTE.findMany({
            where: { companyId, productId: line.productId },
            include: { substitute: { select: { id: true, code: true } } },
          })
          const secenekler: string[] = []
          for (const mu of muadiller) {
            const ms = await prisma.tBLSTOCK.aggregate({
              where: { companyId, productId: mu.substituteProductId, mainQty: { gt: 0 } },
              _sum: { mainQty: true, reservedQty: true },
            })
            const serbest = Number(ms._sum.mainQty ?? 0) - Number(ms._sum.reservedQty ?? 0)
            if (serbest > 0) secenekler.push(`${mu.substitute.code} (${serbest})`)
          }
          muadilBilgi = secenekler.join(' · ')
        }
        // TOPLAMA KIRILIMI (TBLPICKORDERPARAMETER): tam palet / tam koli / parçalı
        // ve o kırılımı hangi operasyonun karşılayacağı. Parametre yoksa kolon boş kalır.
        const plan = await resolvePickPlan(companyId, { productId: line.productId, quantity: line.quantity, partnerId: doc.partnerId }, pickParam)
        rows.push({
          malzeme: line.product.code, aciklama: line.product.name ?? '',
          kaynakLokasyon: usable[0] ? `${usable[0].x.location.code}${usable[0].own ? ' (rezerve)' : ''}` : '— (stok yok)',
          hedefLokasyon: line.targetLocation?.code ?? 'Sevkiyat',
          stokMiktari: String(available), birim: line.unit.code, miktar: line.quantity.toString(),
          toplamaKirilimi: plan ? pickGranularityLabel(plan.granularity) : '',
          toplamaOperasyonu: plan?.operationCode ?? '',
          muadil: muadilBilgi,
        })
      } else {
        // Giriş/Transfer: nereye girilecek — yönlendirme kuralından önerilen hedef (öneri = hedef lokasyon)
        const sugg = await suggestPutawayLocations(companyId, line.productId, { operationTypeId: doc.operationTypeId, facilityId: null })
        const hedef = sugg[0]
        const stok = hedef
          ? await prisma.tBLSTOCK.aggregate({ where: { companyId, productId: line.productId, locationId: hedef.id, mainQty: { gt: 0 } }, _sum: { mainQty: true } })
          : null
        rows.push({
          malzeme: line.product.code, aciklama: line.product.name ?? '',
          kaynakLokasyon: line.sourceLocation?.code ?? '—',
          hedefLokasyon: hedef?.code ?? '— (kural yok)',
          stokMiktari: stok?._sum.mainQty?.toString() ?? '0', birim: line.unit.code, miktar: line.quantity.toString(),
          toplamaKirilimi: '', toplamaOperasyonu: '', muadil: '',
        })
      }
    }
    return { documentNo: doc.documentNo, operationType: doc.operationType.code, direction, rotation, rows }
  })
}
