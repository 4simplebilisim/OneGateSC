// OneGate E2E koşucusu — tests/e2e/*.mjs (NN- önekli) dosyaları sırayla çalıştırır,
// her birinin default run() → {name,P,F,fails} sonucunu toplar, özet + exit kodu verir.
import { readdirSync } from 'fs'
import { pathToFileURL } from 'url'
import path from 'path'

const dir = path.join(process.cwd(), 'tests', 'e2e')
const files = readdirSync(dir).filter((f) => f.endsWith('.mjs') && !f.startsWith('_')).sort()

console.log(`OneGate E2E — ${files.length} test dosyası\n`)
const results = []
for (const f of files) {
  console.log(`▶ ${f}`)
  try {
    const mod = await import(pathToFileURL(path.join(dir, f)).href)
    if (typeof mod.default === 'function') results.push(await mod.default())
    else console.log('  (default run() yok — atlandı)')
  } catch (e) {
    console.log('  ✗ ÇÖKTÜ: ' + (e?.message ?? e))
    results.push({ name: f, P: 0, F: 1, fails: ['ÇÖKTÜ: ' + (e?.message ?? e)] })
  }
}

const P = results.reduce((a, r) => a + r.P, 0)
const F = results.reduce((a, r) => a + r.F, 0)
console.log('\n══════════ ÖZET ══════════')
for (const r of results) console.log(`  ${r.F ? '✗' : '✓'} ${r.name}: ${r.P}/${r.P + r.F}`)
console.log(`\nTOPLAM: ${P} geçti / ${F} kaldı`)
if (F) { console.log('\nKALANLAR:'); results.forEach((r) => r.fails.forEach((x) => console.log(`  ✗ [${r.name}] ${x}`))) }
process.exit(F ? 1 : 0)
