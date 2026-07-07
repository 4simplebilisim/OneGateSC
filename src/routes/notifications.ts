import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { getCompanyId } from '../lib/company.js'
import { userGroupIds } from '../lib/userAuth.js'

// Kullanıcıya özel canlı bildirimler — depoya iş üreten olaylar. Kalıcı bildirim tablosu YOK:
// gerçek-zamanlı türetilir (her istek anlık hesaplar). Zil ikonu + ilk giriş popup'ı bunu tüketir.
type Severity = 'info' | 'warning' | 'success'
interface NotificationItem { type: string; severity: Severity; title: string; detail: string; link: string; count: number }

const OVERDUE_DAYS = 2 // açık belge bu günden eskiyse "gecikmiş" sayılır

export async function notificationRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [app.authenticate] }, async (request) => {
    const companyId = getCompanyId(request)
    const userId = Number(request.user.sub)
    const groupIds = await userGroupIds(userId)

    // (1) Bana/gruplarıma atanmış açık belgeler (TBLDOCUMENTASSIGNMENT → açık durum)
    const assigns = await prisma.tBLDOCUMENTASSIGNMENT.findMany({
      where: { companyId, isActive: true, OR: [{ userId }, ...(groupIds.length ? [{ userGroupId: { in: groupIds } }] : [])] },
      select: { documentId: true },
    })
    const assignedDocIds = [...new Set(assigns.map((a) => a.documentId))]
    const assignedOpen = assignedDocIds.length
      ? await prisma.tBLDOCUMENT.count({ where: { companyId, id: { in: assignedDocIds }, status: { in: ['DRAFT', 'CONFIRMED'] } } })
      : 0

    const overdueBefore = new Date(Date.now() - OVERDUE_DAYS * 86400_000)
    const [assignedWO, overdueDocs, pendingCounts] = await Promise.all([
      // (2) Bana atanmış açık iş emirleri
      prisma.tBLWORKORDER.count({ where: { companyId, assignedToUserId: userId, status: { in: ['PLANNED', 'IN_PROGRESS'] } } }),
      // (3) Gecikmiş açık belgeler (firma geneli — depo sağlığı uyarısı)
      prisma.tBLDOCUMENT.count({ where: { companyId, status: { in: ['DRAFT', 'CONFIRMED'] }, documentDate: { lt: overdueBefore } } }),
      // (4) İşlem bekleyen sayımlar (oluşturulmuş/sayımda)
      prisma.tBLSTOCKCOUNT.count({ where: { companyId, status: { in: ['DRAFT', 'COUNTING'] } } }),
    ])

    const items: NotificationItem[] = []
    if (assignedOpen) items.push({ type: 'assigned-docs', severity: 'info', title: 'Size atanmış belgeler', detail: `${assignedOpen} açık belge size/grubunuza atanmış`, link: '/documents?assignedFor=me', count: assignedOpen })
    if (assignedWO) items.push({ type: 'assigned-wo', severity: 'info', title: 'Size atanmış iş emirleri', detail: `${assignedWO} iş emri size atanmış`, link: '/work-orders', count: assignedWO })
    if (overdueDocs) items.push({ type: 'overdue-docs', severity: 'warning', title: 'Gecikmiş belgeler', detail: `${overdueDocs} belge ${OVERDUE_DAYS} günden uzun süredir açık`, link: '/documents', count: overdueDocs })
    if (pendingCounts) items.push({ type: 'pending-counts', severity: 'info', title: 'Bekleyen sayımlar', detail: `${pendingCounts} sayım işlem bekliyor`, link: '/stock-counts', count: pendingCounts })

    const total = items.reduce((s, i) => s + i.count, 0)
    return { items, total }
  })
}
