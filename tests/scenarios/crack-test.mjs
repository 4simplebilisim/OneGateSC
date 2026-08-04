const B='http://127.0.0.1:3000', CO='2'
const mk=(tok)=>({authorization:'Bearer '+tok,'x-company-id':CO,'content-type':'application/json'})
const call=async(tok,m,u,body)=>{const r=await fetch(B+u,{method:m,headers:mk(tok),...(body!==undefined?{body:JSON.stringify(body)}:{})});let d;try{d=await r.json()}catch{d=null}return{status:r.status,d}}
const norm=d=>Array.isArray(d)?d:(d?.data??[])
const login=async(u,p)=>(await(await fetch(B+'/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:u,password:p})})).json()).token
let pass=0,fail=0; const ok=(c,l,x='')=>{c?(pass++,console.log('  OK ',l,x)):(fail++,console.log('  FAIL',l,x))}
const A=await login('admin','admin123')

const ops=norm((await call(A,'GET','/api/operation-types?pageSize=300')).d)
const opGir=ops.find(o=>o.code==='BLG-GIR'&&o.companyId===2)
const opGirK=ops.find(o=>o.code==='BLG-GIRK'&&o.companyId===2)
const opSt=ops.find(o=>o.code==='STA-DEG'&&o.companyId===2)
const opTr=ops.find(o=>o.code==='BLG-TR'&&o.companyId===2)
const opRez=ops.find(o=>o.code==='REZ-CIK'&&o.companyId===2)
const PROD=1, LOC1=1, S1=1
const locs=norm((await call(A,'GET','/api/locations?pageSize=200&companyId=2')).d)
const LOC2=locs.find(l=>l.id!==1)?.id
const UNIT=(norm((await call(A,'GET','/api/product-units?productId=1')).d).find(p=>p.isBaseUnit)).unitId
// geçişsiz taşıma op'u
let opMove=ops.find(o=>o.code==='TASIMA'&&o.companyId===2)
if(!opMove) opMove=(await call(A,'POST','/api/operation-types',{code:'TASIMA',name:'Toplu Tasima (gecissiz)',direction:'INTERNAL',controlMode:'CONTROLLED',facilityId:1,affectsStock:true,bulkAction:true})).d

const ts=Date.now().toString().slice(-5)
const mkLot=async(tag,qty)=>{ const g=(await call(A,'POST','/api/documents',{operationTypeId:opGir.id,documentNo:'CRG'+tag+ts})).d
  await call(A,'POST','/api/document-line-scopes',{documentId:g.id,productId:PROD,unitId:UNIT,quantity:qty,batchNo:'CR-'+tag+'-'+ts,targetLocationId:LOC1,targetStatusId:S1})
  await call(A,'POST',`/api/documents/${g.id}/confirm`,{}); await call(A,'POST',`/api/documents/${g.id}/complete`,{})
  const s=norm((await call(A,'GET',`/api/stock?batchNo=CR-${tag}-${ts}&pageSize=50`)).d)[0]; return s }
const L1=await mkLot('L1',10), L2a=await mkLot('2A',10), L2b=await mkLot('2B',10), L3=await mkLot('L3',10), L4=await mkLot('L4',10), L5=await mkLot('L5',10)
console.log('6 lot hazır @LOC1/S1 | LOC2 =',LOC2)
const qtyAt=async(tag,loc)=>{const s=norm((await call(A,'GET',`/api/stock?batchNo=CR-${tag}-${ts}&pageSize=50&includeZero=true`)).d).find(x=>x.locationId===loc); return s?Number(s.mainQty):0}

console.log('\n== G1: GİRDİ SINIRLARI ==')
ok((await call(A,'POST','/api/stock/bulk-action',{operationTypeId:opMove.id,stockIds:[]})).status===400,'boş stockIds → 400')
ok((await call(A,'POST','/api/stock/bulk-action',{operationTypeId:opMove.id,stockIds:Array.from({length:1001},(_,i)=>i+1)})).status===400,'1001 id → 400 (max 1000)')
ok((await call(A,'POST','/api/stock/bulk-action',{operationTypeId:opMove.id,stockIds:['1']})).status===400,'string id → 400')
ok((await call(A,'POST','/api/stock/bulk-action',{operationTypeId:opMove.id,stockIds:[L1.id],targetLocationId:0})).status===400,'targetLocationId=0 → 400')
const rNo=await call(A,'POST','/api/stock/bulk-action',{operationTypeId:opMove.id,stockIds:[99999999],targetLocationId:LOC2})
ok(rNo.status===400&&/bulunamadı/.test(rNo.d?.error??''),'olmayan stok id → 400')
ok((await call(A,'POST','/api/stock/bulk-action',{operationTypeId:81,stockIds:[L1.id]})).status===404,'BAŞKA FİRMANIN operasyonu → 404')
await call(A,'PATCH',`/api/operation-types/${opGirK.id}`,{bulkAction:true})
const rIn=await call(A,'POST','/api/stock/bulk-action',{operationTypeId:opGirK.id,stockIds:[L1.id]})
ok(rIn.status===400&&/Çıkış\/Transfer/.test(rIn.d?.error??''),'INBOUND op → 400 (yön kapısı)')
await call(A,'PATCH',`/api/operation-types/${opGirK.id}`,{bulkAction:false})
const noTok=await fetch(B+'/api/stock/bulk-action',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({operationTypeId:opMove.id,stockIds:[1]})})
ok(noTok.status===401,'token yok → 401')
const V=await login('viewer','viewer123')
ok(V ? (await call(V,'POST','/api/stock/bulk-action',{operationTypeId:opMove.id,stockIds:[L1.id]})).status===403 : true,'VIEWER rolü → 403 (requireWrite)')

console.log('\n== G2: KURAL SINIRLARI ==')
const rSame=await call(A,'POST','/api/stock/bulk-action',{operationTypeId:opMove.id,stockIds:[L1.id],targetLocationId:LOC1})
ok(rSame.status===400&&/kalmadı/.test(rSame.d?.error??''),'hedef=mevcut konum (geçişsiz) → hepsi atlandı 400')
const rDup=await call(A,'POST','/api/stock/bulk-action',{operationTypeId:opMove.id,stockIds:[L1.id,L1.id,L1.id],targetLocationId:LOC2})
ok(rDup.status===200&&rDup.d?.lineCount===1,'duplicate id → TEK satır işlendi (çift hareket yok)',JSON.stringify({lc:rDup.d?.lineCount,q:rDup.d?.totalQty}))
ok((await qtyAt('L1',LOC2))===10&&(await qtyAt('L1',LOC1))===0,'L1: 10 taşındı (10dan fazla değil)')
const rDbl=await call(A,'POST','/api/stock/bulk-action',{operationTypeId:opMove.id,stockIds:[L1.id],targetLocationId:LOC2})
ok(rDbl.status===400,'double-submit (aynı id tekrar) → 400 (kaynak 0)',(rDbl.d?.error??'').slice(0,50))

console.log('\n== G3: ATOMİKLİK (iyi + rezervli karışık) ==')
const RD=(await call(A,'POST','/api/documents',{operationTypeId:opRez.id,documentNo:'CRRD'+ts,lines:[{productId:PROD,unitId:UNIT,quantity:10,sourceLocationId:LOC1,sourceStatusId:S1,batchNo:'CR-2B-'+ts}]})).d
await call(A,'POST',`/api/documents/${RD.id}/reserve`,{})
const rMix=await call(A,'POST','/api/stock/bulk-action',{operationTypeId:opMove.id,stockIds:[L2a.id,L2b.id],targetLocationId:LOC2})
ok(rMix.status===409&&/Rezerve stok|rezervi/.test(rMix.d?.error??''),'karışık seçim → 409 (rezervli satır)',(rMix.d?.error??'').slice(0,80))
ok((await qtyAt('2A',LOC1))===10&&(await qtyAt('2A',LOC2))===0,'ATOMİK: iyi satır (2A) YERİNDE kaldı — kısmi işlem yok')
const cancelled=norm((await call(A,'GET','/api/documents?direction=INTERNAL&pageSize=20')).d).find(d=>d.documentNo?.startsWith('TOPLU-')&&d.status==='CANCELLED')
ok(!!cancelled,'başarısız TOPLU belgesi otomatik CANCELLED',cancelled?.documentNo)

console.log('\n== G4: REZERV TAŞIMA KOMBİNASYONU (bulk + reserveTransfer) ==')
const RD3=(await call(A,'POST','/api/documents',{operationTypeId:opRez.id,documentNo:'CRR3'+ts,lines:[{productId:PROD,unitId:UNIT,quantity:10,sourceLocationId:LOC1,sourceStatusId:S1,batchNo:'CR-L3-'+ts}]})).d
await call(A,'POST',`/api/documents/${RD3.id}/reserve`,{})
await call(A,'PATCH',`/api/operation-types/${opMove.id}`,{reserveTransfer:true})
const rRT=await call(A,'POST','/api/stock/bulk-action',{operationTypeId:opMove.id,stockIds:[L3.id],targetLocationId:LOC2})
ok(rRT.status===200,'reserveTransfer=true: rezervli stok bulk TAŞINDI',rRT.status!==200?JSON.stringify(rRT.d):'')
const l3t=norm((await call(A,'GET',`/api/stock?batchNo=CR-L3-${ts}&pageSize=50`)).d).find(x=>x.locationId===LOC2)
ok(l3t&&Number(l3t.reservedQty)===10&&l3t.reservedDocumentId===RD3.id,'rezerv HEDEFTE + sahibi korundu',JSON.stringify({rez:l3t?.reservedQty,doc:l3t?.reservedDocumentId}))
await call(A,'PATCH',`/api/operation-types/${opMove.id}`,{reserveTransfer:false})

console.log('\n== G5: AKTİF SAYIM KİLİDİ ==')
const cnt=(await call(A,'POST','/api/stock-counts',{countNo:'CRC'+ts,warehouseId:1,operationTypeId:27,locationId:LOC1})).d
const cline=cnt.lines?.[0]
if(cline) await call(A,'PATCH',`/api/stock-counts/${cnt.id}/lines/${cline.id}/count`,{countedQty:1}) // → COUNTING
const rCnt=await call(A,'POST','/api/stock/bulk-action',{operationTypeId:opMove.id,stockIds:[L4.id],targetLocationId:LOC2})
ok(rCnt.status===409&&/Aktif sayım/.test(rCnt.d?.error??''),'aktif sayım varken taşıma → 409 kilit',(rCnt.d?.error??'').slice(0,70))
await call(A,'POST',`/api/stock-counts/${cnt.id}/cancel`)
const rCnt2=await call(A,'POST','/api/stock/bulk-action',{operationTypeId:opMove.id,stockIds:[L4.id],targetLocationId:LOC2})
ok(rCnt2.status===200,'sayım iptal → taşıma serbest 200')

console.log('\n== G6: REVERSE TUTARLILIĞI ==')
const rMv=await call(A,'POST','/api/stock/bulk-action',{operationTypeId:opMove.id,stockIds:[L5.id],targetLocationId:LOC2})
ok(rMv.status===200,'L5 taşındı')
const rRev=await call(A,'POST',`/api/documents/${rMv.d?.documentId}/reverse`,{})
ok(rRev.status===200,'TOPLU belgesi reverse 200')
ok((await qtyAt('L5',LOC1))===10&&(await qtyAt('L5',LOC2))===0,'reverse: stok kaynağa döndü')

console.log('\n== G7: YETKİ ==')
const u=(await call(A,'POST','/api/users',{username:'cracktest',email:'crack@test.local',password:'Crack123!',fullName:'Crack Test',companyId:2,roles:['OPERATOR']})).d
const a1=(await call(A,'POST','/api/user-authorizations',{userId:u.id,scopeType:'OPERATION_TYPE',referenceId:opTr.id})).d // yalnız BLG-TR
const E=await login('cracktest','Crack123!')
const rAuth=await call(E,'POST','/api/stock/bulk-action',{operationTypeId:opMove.id,stockIds:[L1.id],targetLocationId:LOC2})
ok(rAuth.status===403,'op yetkisi olmayan kullanıcı → 403',rAuth.d?.error)
const a2=(await call(A,'POST','/api/user-authorizations',{userId:u.id,scopeType:'OPERATION_TYPE',referenceId:opMove.id})).d
const a3=(await call(A,'POST','/api/user-authorizations',{userId:u.id,scopeType:'WAREHOUSE',referenceId:2})).d // yalnız depo-2
const E2=await login('cracktest','Crack123!')
const rAuth2=await call(E2,'POST','/api/stock/bulk-action',{operationTypeId:opMove.id,stockIds:[L4.id],targetLocationId:LOC1})
ok(rAuth2.status===403,'hedef lokasyon deposuna yetkisi yok → 403',rAuth2.d?.error)

console.log('\n== TEMİZLİK ==')
for(const aid of [a1?.id,a2?.id,a3?.id].filter(Boolean)) await call(A,'DELETE',`/api/user-authorizations/${aid}`)
if(u?.id) await call(A,'DELETE',`/api/users/${u.id}`)
await call(A,'POST',`/api/documents/${RD.id}/cancel`,{}); await call(A,'POST',`/api/documents/${RD3.id}/cancel`,{})
console.log('  kullanıcı+yetkiler+rezerv belgeleri temizlendi (test lotları dev verisi)')
console.log(`\n════ ÇATLATMA: ${pass} geçti / ${fail} kaldı ════`)
