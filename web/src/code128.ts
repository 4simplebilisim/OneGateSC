// Bağımsız Code128 (B) kodlayıcı — taranabilir barkod. Harici kütüphane yok.
// Çıktı: modül genişlikleri dizisi (ilk eleman SİYAH çubuk, sonra dönüşümlü).

// Standart Code128 desen tablosu (değer 0..106 → modül genişlikleri). 106 = STOP (7 modül), diğerleri 6.
const PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
]
const START_B = 104
const STOP = 106

/** Code128-B modül genişlikleri (ilk eleman siyah çubuk). Yazdırılabilir ASCII (32..126) dışı karakter '?' olur. */
export function code128Modules(text: string): number[] {
  const chars = [...(text || '')].map((c) => {
    const code = c.charCodeAt(0)
    return code >= 32 && code <= 126 ? code : 63 // '?'
  })
  const values = [START_B, ...chars.map((c) => c - 32)]
  let sum = START_B
  chars.forEach((c, i) => { sum += (c - 32) * (i + 1) })
  values.push(sum % 103) // checksum
  values.push(STOP)
  const mods: number[] = []
  for (const v of values) for (const ch of PATTERNS[v]) mods.push(Number(ch))
  return mods
}

/** Code128 barkodu SVG string (yazdırma/PDF için). viewBox ile ölçeklenir. */
export function code128Svg(text: string, height = 40, color = '#000'): string {
  const mods = code128Modules(text)
  const total = mods.reduce((a, b) => a + b, 0)
  let x = 0
  let rects = ''
  mods.forEach((w, i) => {
    if (i % 2 === 0) rects += `<rect x="${x}" y="0" width="${w}" height="100" fill="${color}"/>`
    x += w
  })
  return `<svg viewBox="0 0 ${total} 100" preserveAspectRatio="none" width="100%" height="${height}" xmlns="http://www.w3.org/2000/svg">${rects}</svg>`
}
