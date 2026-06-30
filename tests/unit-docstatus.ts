// computeDocStatus + evalCriteria saf fonksiyon birim testi — DB'siz. Çalıştır: npx tsx tests/unit-docstatus.ts
import { computeDocStatus, evalCriteria, type DocFacts, type StatusCriterion } from '../src/lib/documentStatus.js'

let pass = 0
let fail = 0
const base: DocFacts = { cancelled: false, completed: false, confirmed: false, controlCollection: false, collectedSum: 0, shortLines: 0 }
const t = (name: string, f: Partial<DocFacts>, expected: string) => {
  const got = computeDocStatus({ ...base, ...f })
  if (got === expected) { pass++; console.log(`  ✓ ${name} → ${got}`) }
  else { fail++; console.log(`  ✗ ${name} → beklenen ${expected}, gelen ${got}`) }
}

console.log('computeDocStatus — kapı öncelikleri:')
t('iptal her şeyi yener', { cancelled: true, completed: true, confirmed: true, collectedSum: 5 }, 'IPT')
t('tamamlandı = onaylandı', { completed: true, confirmed: true, collectedSum: 5 }, 'ONY')
t('onaya gönderildi (kapı)', { confirmed: true, collectedSum: 0 }, 'OBK')

console.log('\ncomputeDocStatus — DRAFT kontrollü türetim (StokBar SSP_SBKONTROLLUBELGEDURUM):')
t('hiç toplanmadı → BKL', { controlCollection: true, collectedSum: 0 }, 'BKL')
t('kısmi (eksik var) → TPL', { controlCollection: true, collectedSum: 5, shortLines: 2 }, 'TPL')
t('tam (eksik yok) → OBK', { controlCollection: true, collectedSum: 10, shortLines: 0 }, 'OBK')

console.log('\ncomputeDocStatus — DRAFT kontrolsüz türetim (SSP_SBKONTROLSUZBELGEDURUM):')
t('kontrolsüz, hiç toplanmadı → BKL', { controlCollection: false, collectedSum: 0 }, 'BKL')
t('kontrolsüz, toplanmış → TPL', { controlCollection: false, collectedSum: 5, shortLines: 3 }, 'TPL')

console.log('\nevalCriteria — veri-güdümlü kriter (Faz 2):')
const ec = (name: string, f: Partial<DocFacts>, crit: StatusCriterion[], expected: number | null) => {
  const got = evalCriteria({ ...base, ...f }, crit)
  if (got === expected) { pass++; console.log(`  ✓ ${name} → ${got}`) }
  else { fail++; console.log(`  ✗ ${name} → beklenen ${expected}, gelen ${got}`) }
}
ec('boş kriter → null (yerleşiğe düş)', { collectedSum: 5 }, [], null)
ec('eşleşen koşul → hedef id', { collectedSum: 0 }, [{ condition: 'NONE_COLLECTED', targetStatusId: 111, priority: 10 }], 111)
ec('eşleşme yok → null', { completed: false }, [{ condition: 'COMPLETED', targetStatusId: 111, priority: 10 }], null)
ec('öncelik: düşük priority önce', { collectedSum: 5, shortLines: 2 }, [
  { condition: 'ANY_COLLECTED', targetStatusId: 200, priority: 20 },
  { condition: 'PARTIAL', targetStatusId: 300, priority: 10 },
], 300)
ec('TAM_TOPLANDI eşleşir (eksik yok)', { collectedSum: 10, shortLines: 0 }, [{ condition: 'FULLY_COLLECTED', targetStatusId: 400, priority: 5 }], 400)
// 🔴 Regression: toplama koşulu COMPLETED/CONFIRMED belgede EŞLEŞMEMELİ (kapı baskın) — #10 bug'ı
ec('COMPLETED + NONE_COLLECTED → eşleşmez (null)', { completed: true, collectedSum: 0 }, [{ condition: 'NONE_COLLECTED', targetStatusId: 3, priority: 1 }], null)
ec('CONFIRMED + NONE_COLLECTED → eşleşmez (null)', { confirmed: true, collectedSum: 0 }, [{ condition: 'NONE_COLLECTED', targetStatusId: 3, priority: 1 }], null)
ec('COMPLETED + COMPLETED kriteri → eşleşir (gate override)', { completed: true }, [{ condition: 'COMPLETED', targetStatusId: 7, priority: 1 }], 7)

console.log(`\nSonuç: ${pass} geçti, ${fail} kaldı`)
if (fail > 0) process.exit(1)
