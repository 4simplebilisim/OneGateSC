// 4proc'un ZORUNLU (nullable olmayan) alanlarını çıkarır → view'larda NULL var mı diye SQL üretir.
import { readFileSync, writeFileSync } from 'node:fs'
const SRC = 'E:/4proc/4proc-next/prisma/schema.prisma'
const SP = 'C:/Users/a_tek/AppData/Local/Temp/claude/E--onegate/5f429b0b-6f07-46b9-9365-cc5411b247a7/scratchpad'
const WANT = ['Company', 'Organization', 'User', 'Role', 'UserRole', 'Screen', 'UserPermission',
  'Unit', 'Currency', 'PaymentTerm', 'Incoterm', 'Supplier', 'SupplierType',
  'Material', 'MaterialType', 'MaterialGroup', 'WareHouse', 'GRLocation', 'NumberSequence']
const text = readFileSync(SRC, 'utf8')
const models = Object.fromEntries([...text.matchAll(/^model\s+(\w+)\s+\{([\s\S]*?)^\}/gm)].map((m) => [m[1], m[2]]))
const modelNames = new Set(Object.keys(models))
const checks = []
for (const name of WANT) {
  const body = models[name]
  const table = (body.match(/@@map\("([^"]+)"\)/) ?? [, name])[1]
  for (const raw of body.split('\n')) {
    const t = raw.trim()
    if (!t || t.startsWith('//') || t.startsWith('@@')) continue
    const m = t.match(/^(\w+)\s+(\w+)(\[\])?(\?)?/)
    if (!m || modelNames.has(m[2]) || m[3]) continue
    if (m[4]) continue // nullable — sorun değil
    if (t.includes('@default(')) continue // varsayılanı var, Prisma NULL beklemez ama yine de kontrol edelim
    const col = (t.match(/@map\("([^"]+)"\)/) ?? [, m[1]])[1]
    checks.push([table, col])
  }
}
const sql = checks.map(([t, c]) =>
  `SELECT '${t}.${c}' AS alan, count(*) AS bos FROM procurement."${t}" WHERE "${c}" IS NULL HAVING count(*) > 0`).join('\nUNION ALL\n') + ' ORDER BY 1;'
writeFileSync(`${SP}/nn-check.sql`, sql + '\n')
console.log(`kontrol edilecek zorunlu alan: ${checks.length}`)
