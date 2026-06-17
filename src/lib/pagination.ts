import type { FastifyRequest } from 'fastify'

export interface PageParams {
  skip: number
  take: number
  page: number
  pageSize: number
}

/** ?page=&pageSize= okur (varsayılan 25, max 200). 1-tabanlı. */
export function parsePagination(request: FastifyRequest, defaultSize = 25, maxSize = 200): PageParams {
  const q = request.query as { page?: string; pageSize?: string }
  let page = Number(q.page)
  if (!Number.isInteger(page) || page < 1) page = 1
  let pageSize = Number(q.pageSize)
  if (!Number.isInteger(pageSize) || pageSize < 1) pageSize = defaultSize
  if (pageSize > maxSize) pageSize = maxSize
  return { skip: (page - 1) * pageSize, take: pageSize, page, pageSize }
}

/** Standart sayfalı yanıt zarfı. */
export function paginated<T>(data: T[], total: number, p: PageParams) {
  return { data, total, page: p.page, pageSize: p.pageSize, pageCount: Math.ceil(total / p.pageSize) }
}
