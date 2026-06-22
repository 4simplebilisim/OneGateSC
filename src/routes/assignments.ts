import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { simpleCrud, type Delegate } from './documentTypes.js'

// İş Atama — belge ↔ kullanıcı eşleştirme. Terminalde kullanıcıya atanmış belgeler bu tablodan listelenir.
const assignment = z.object({
  documentId: z.number().int().positive(),
  userId: z.number().int().positive(),
  note: z.string().max(200).optional(),
  isActive: z.boolean().optional(),
})

export const documentAssignmentRoutes = simpleCrud(prisma.tBLDOCUMENTASSIGNMENT as unknown as Delegate, assignment, assignment.partial(), 'Atama bulunamadı')
