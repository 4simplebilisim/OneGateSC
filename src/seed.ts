import bcrypt from 'bcryptjs'
import { prisma } from './lib/prisma.js'

async function main() {
  // --- Company (tenant) ---
  const company = await prisma.tBLCOMPANY.upsert({
    where: { code: 'ONEGATE' },
    update: {},
    create: { code: 'ONEGATE', name: 'OneGate Demo Firma' },
  })
  const companyId = company.id

  // --- Roles (global, tenant-bağımsız) ---
  const roles = [
    { code: 'ADMIN', name: 'Administrator', description: 'Tam yetki' },
    { code: 'OPERATOR', name: 'Operator', description: 'Operasyon kullanıcısı' },
    { code: 'VIEWER', name: 'Viewer', description: 'Salt okunur erişim' },
  ]
  for (const role of roles) {
    await prisma.tBLROLE.upsert({ where: { code: role.code }, update: {}, create: role })
  }

  // --- Units ---
  const units: { code: string; name: string; type: 'COUNT' | 'WEIGHT' | 'VOLUME' }[] = [
    { code: 'PCS', name: 'Adet', type: 'COUNT' },
    { code: 'KG', name: 'Kilogram', type: 'WEIGHT' },
    { code: 'BOX', name: 'Koli', type: 'COUNT' },
    { code: 'PLT', name: 'Palet', type: 'COUNT' },
    { code: 'LT', name: 'Litre', type: 'VOLUME' },
  ]
  for (const u of units) {
    await prisma.tBLUNIT.upsert({
      where: { companyId_code: { companyId, code: u.code } },
      update: {},
      create: { companyId, ...u },
    })
  }
  const pcs = await prisma.tBLUNIT.findUniqueOrThrow({ where: { companyId_code: { companyId, code: 'PCS' } } })
  const box = await prisma.tBLUNIT.findUniqueOrThrow({ where: { companyId_code: { companyId, code: 'BOX' } } })

  // --- Tesis (facility) — statüler TEK tesise bağlı olduğundan statülerden ÖNCE oluşturulmalı ---
  const facility = await prisma.tBLFACILITY.upsert({
    where: { companyId_code: { companyId, code: 'TESIS-1' } },
    update: {},
    create: { companyId, code: 'TESIS-1', name: 'Merkez Tesis' },
  })

  // --- Statuses (stok statüsü, tablo-driven) — her statü tek tesise (facility) aittir ---
  const statuses = [
    { code: 'AVAILABLE', name: 'Kullanılabilir' },
    { code: 'QUARANTINE', name: 'Karantina' },
    { code: 'BLOCKED', name: 'Bloke' },
    { code: 'DAMAGED', name: 'Hasarlı' },
  ]
  for (const s of statuses) {
    await prisma.tBLSTATUS.upsert({
      where: { companyId_facilityId_code: { companyId, facilityId: facility.id, code: s.code } },
      update: {},
      create: { companyId, facilityId: facility.id, ...s },
    })
  }
  const available = await prisma.tBLSTATUS.findFirstOrThrow({
    where: { companyId, facilityId: facility.id, code: 'AVAILABLE' },
  })

  // --- Belge durumları (legacy TBLSBBELGEDURUM) — yaşam döngüsü + renk ---
  const docStatuses = [
    { code: 'BKL', name: 'Bekliyor', color: '#9ca3af' },
    { code: 'TPL', name: 'Toplanıyor', color: '#ca8a04' },
    { code: 'OBK', name: 'Onay Bekliyor', color: '#84cc16' },
    { code: 'ONY', name: 'Onaylandı', color: '#16a34a' },
    { code: 'IPT', name: 'İptal', color: '#ef4444' },
  ]
  for (const s of docStatuses) {
    await prisma.tBLDOCUMENTSTATUS.upsert({
      where: { companyId_code: { companyId, code: s.code } },
      update: {},
      create: { companyId, ...s },
    })
  }

  // --- Operation types (hareket yönü) ---
  const operationTypes: { code: string; name: string; direction: 'INBOUND' | 'OUTBOUND' | 'INTERNAL' }[] = [
    { code: 'GR', name: 'Mal Kabul', direction: 'INBOUND' },
    { code: 'GI', name: 'Mal Çıkış / Sevk', direction: 'OUTBOUND' },
    { code: 'TR', name: 'Transfer', direction: 'INTERNAL' },
  ]
  for (const ot of operationTypes) {
    await prisma.tBLOPERATIONTYPE.upsert({
      where: { companyId_code: { companyId, code: ot.code } },
      update: {},
      create: { companyId, ...ot },
    })
  }

  // --- Admin user ---
  const adminRole = await prisma.tBLROLE.findUniqueOrThrow({ where: { code: 'ADMIN' } })
  const passwordHash = await bcrypt.hash('admin123', 10)
  const admin = await prisma.tBLUSER.upsert({
    where: { username: 'admin' },
    update: { companyId, isSuperAdmin: true },
    create: {
      companyId,
      username: 'admin',
      email: 'admin@onegate.local',
      passwordHash,
      fullName: 'System Administrator',
      isSuperAdmin: true,
      userRoles: { create: { roleId: adminRole.id, companyId } },
    },
  })

  // Normal firma kullanıcısı (super-admin değil — kendi firmasına kilitli)
  const operatorRole = await prisma.tBLROLE.findUniqueOrThrow({ where: { code: 'OPERATOR' } })
  const operator = await prisma.tBLUSER.upsert({
    where: { username: 'operator' },
    update: { companyId, isSuperAdmin: false },
    create: {
      companyId,
      username: 'operator',
      email: 'operator@onegate.local',
      passwordHash: await bcrypt.hash('operator123', 10),
      fullName: 'Depo Operatörü',
      isSuperAdmin: false,
      userRoles: { create: { roleId: operatorRole.id, companyId } },
    },
  })

  // Salt-okunur kullanıcı (VIEWER — yazma yetkisi yok)
  const viewerRole = await prisma.tBLROLE.findUniqueOrThrow({ where: { code: 'VIEWER' } })
  await prisma.tBLUSER.upsert({
    where: { username: 'viewer' },
    update: { companyId, isSuperAdmin: false },
    create: {
      companyId,
      username: 'viewer',
      email: 'viewer@onegate.local',
      passwordHash: await bcrypt.hash('viewer123', 10),
      fullName: 'Salt Okunur Kullanıcı',
      isSuperAdmin: false,
      userRoles: { create: { roleId: viewerRole.id, companyId } },
    },
  })

  // --- Business partners (cari) ---
  const partners: { code: string; name: string; type: 'CUSTOMER' | 'SUPPLIER' }[] = [
    { code: 'CUST001', name: 'Demo Müşteri A.Ş.', type: 'CUSTOMER' },
    { code: 'SUPP001', name: 'Demo Tedarikçi Ltd.', type: 'SUPPLIER' },
  ]
  for (const p of partners) {
    await prisma.tBLBUSINESSPARTNER.upsert({
      where: { companyId_code: { companyId, code: p.code } },
      update: {},
      create: { companyId, ...p },
    })
  }

  // --- Warehouse ---
  const warehouse = await prisma.tBLWAREHOUSE.upsert({
    where: { companyId_code: { companyId, code: 'WH01' } },
    update: {},
    create: { companyId, code: 'WH01', name: 'Ana Depo' },
  })

  // --- Area ---
  const area = await prisma.tBLAREA.upsert({
    where: { companyId_code: { companyId, code: 'A01' } },
    update: {},
    create: { companyId, warehouseId: warehouse.id, code: 'A01', name: 'Raf Alanı' },
  })

  // --- Locations (ağaç: RECEIVING + raf R01 -> R01-01) ---
  const receiving = await prisma.tBLLOCATION.upsert({
    where: { companyId_warehouseId_code: { companyId, warehouseId: warehouse.id, code: 'RCV' } },
    update: {},
    create: { companyId, warehouseId: warehouse.id, code: 'RCV', name: 'Mal Kabul', type: 'RECEIVING', isRamp: true },
  })
  const shelfParent = await prisma.tBLLOCATION.upsert({
    where: { companyId_warehouseId_code: { companyId, warehouseId: warehouse.id, code: 'R01' } },
    update: {},
    create: { companyId, warehouseId: warehouse.id, areaId: area.id, code: 'R01', name: 'Raf 01', type: 'SHELF' },
  })
  const shelfChild = await prisma.tBLLOCATION.upsert({
    where: { companyId_warehouseId_code: { companyId, warehouseId: warehouse.id, code: 'R01-01' } },
    update: {},
    create: {
      companyId,
      warehouseId: warehouse.id,
      areaId: area.id,
      parentId: shelfParent.id,
      code: 'R01-01',
      name: 'Raf 01 - Göz 01',
      type: 'SHELF',
      barcode: '8690000000011',
    },
  })

  // --- Pallet type + pallet ---
  const palletType = await prisma.tBLPALLETTYPE.upsert({
    where: { companyId_code: { companyId, code: 'EUR' } },
    update: {},
    create: { companyId, code: 'EUR', name: 'Euro Palet', kind: 'EURO' },
  })
  const pallet = await prisma.tBLPALLET.upsert({
    where: { companyId_palletNo: { companyId, palletNo: 'P0001' } },
    update: {},
    create: { companyId, palletNo: 'P0001', palletTypeId: palletType.id, baseUnitId: pcs.id },
  })

  // --- Product + product units (PCS base, BOX x12) ---
  const group = await prisma.tBLPRODUCTGROUP.upsert({
    where: { companyId_code: { companyId, code: 'GRP01' } },
    update: {},
    create: { companyId, code: 'GRP01', name: 'Genel' },
  })
  const product = await prisma.tBLPRODUCT.upsert({
    where: { companyId_code: { companyId, code: 'PRD001' } },
    update: { productGroupId: group.id },
    create: {
      companyId,
      code: 'PRD001',
      name: 'Demo Ürün 1',
      shortName: 'Demo 1',
      barcode: '8690000000028',
      unitId: pcs.id,
      type: 'FINISHED',
      productGroupId: group.id,
    },
  })
  await prisma.tBLPRODUCTUNIT.upsert({
    where: { productId_unitId: { productId: product.id, unitId: pcs.id } },
    update: {},
    create: { companyId, productId: product.id, unitId: pcs.id, isBaseUnit: true, multiplier: 1, divisor: 1, batchTracking: true },
  })
  await prisma.tBLPRODUCTUNIT.upsert({
    where: { productId_unitId: { productId: product.id, unitId: box.id } },
    update: {},
    create: { companyId, productId: product.id, unitId: box.id, multiplier: 12, divisor: 1, isSalesUnit: true },
  })

  // --- Stock (örnek: 100 PCS @ R01-01, AVAILABLE, palet P0001) ---
  const existingStock = await prisma.tBLSTOCK.findFirst({
    where: {
      companyId,
      locationId: shelfChild.id,
      productId: product.id,
      statusId: available.id,
      palletId: pallet.id,
      batchNo: 'B-2026-001',
    },
  })
  if (!existingStock) {
    await prisma.tBLSTOCK.create({
      data: {
        companyId,
        locationId: shelfChild.id,
        productId: product.id,
        statusId: available.id,
        palletId: pallet.id,
        unitId: pcs.id,
        batchNo: 'B-2026-001',
        mainQty: 100,
        reservedQty: 0,
        expiryDate: new Date('2027-06-08'),
      },
    })
  }

  // --- Vehicle (logistics) ---
  await prisma.tBLVEHICLE.upsert({
    where: { companyId_plateNo: { companyId, plateNo: '34ABC123' } },
    update: {},
    create: { companyId, plateNo: '34ABC123', name: 'Dağıtım Kamyonu 1', type: 'TRUCK', capacityKg: 5000 },
  })

  // --- Inventory rule (MRP) — PRD001 @ WH01: reorderPoint 150 > eldeki 100 ⇒ MRP reorder önerir ---
  await prisma.tBLINVENTORYRULE.upsert({
    where: { companyId_productId_warehouseId: { companyId, productId: product.id, warehouseId: warehouse.id } },
    update: {},
    create: { companyId, productId: product.id, warehouseId: warehouse.id, minQty: 50, maxQty: 200, reorderPoint: 150 },
  })

  // --- WMS tanım tabloları (sayaç, neden, lokasyon/operasyon grubu) ---
  const grSeq = await prisma.tBLSEQUENCE.upsert({
    where: { companyId_code: { companyId, code: 'GR' } },
    update: {},
    create: { companyId, code: 'GR', name: 'Mal Kabul Numarası', prefix: 'GR-', padLength: 6 },
  })
  // GR operasyon tipini sayaca bağla → belge no otomatik
  await prisma.tBLOPERATIONTYPE.update({
    where: { companyId_code: { companyId, code: 'GR' } },
    data: { sequenceId: grSeq.id },
  })
  for (const r of [{ code: 'DMG', name: 'Hasarlı' }, { code: 'CNT', name: 'Sayım Farkı' }, { code: 'EXP', name: 'SKT Doldu' }]) {
    await prisma.tBLREASON.upsert({ where: { companyId_code: { companyId, code: r.code } }, update: {}, create: { companyId, ...r } })
  }
  await prisma.tBLLOCATIONGROUP.upsert({
    where: { companyId_code: { companyId, code: 'FAST' } },
    update: {},
    create: { companyId, code: 'FAST', name: 'Hızlı Erişim Rafları' },
  })
  const opGroupIn = await prisma.tBLOPERATIONGROUP.upsert({
    where: { companyId_code: { companyId, code: 'IN' } },
    update: {},
    create: { companyId, code: 'IN', name: 'Giriş İşlemleri' },
  })

  // Palet sayacı + EUR palet tipine bağla (palet no otomatik)
  const pltSeq = await prisma.tBLSEQUENCE.upsert({
    where: { companyId_code: { companyId, code: 'PLT' } },
    update: {},
    create: { companyId, code: 'PLT', name: 'Palet Numarası', prefix: 'P', padLength: 5 },
  })
  await prisma.tBLPALLETTYPE.update({ where: { companyId_code: { companyId, code: 'EUR' } }, data: { sequenceId: pltSeq.id } })

  // İş emri sayacı (WO)
  await prisma.tBLSEQUENCE.upsert({
    where: { companyId_code: { companyId, code: 'WO' } },
    update: {},
    create: { companyId, code: 'WO', name: 'İş Emri Numarası', prefix: 'WO-', padLength: 6 },
  })

  // Koşul/yönlendirme tipleri + örnek directed-putaway kuralı (PRD001 → R01-01)
  await prisma.tBLENTRYCONDITIONTYPE.upsert({ where: { companyId_code: { companyId, code: 'IN-STD' } }, update: {}, create: { companyId, code: 'IN-STD', name: 'Standart Giriş' } })
  await prisma.tBLEXITCONDITIONTYPE.upsert({ where: { companyId_code: { companyId, code: 'OUT-STD' } }, update: {}, create: { companyId, code: 'OUT-STD', name: 'Standart Çıkış' } })
  const routingType = await prisma.tBLROUTINGTYPE.upsert({ where: { companyId_code: { companyId, code: 'STD' } }, update: {}, create: { companyId, code: 'STD', name: 'Standart Yönlendirme' } })
  const existsRule = await prisma.tBLROUTINGRULE.findFirst({ where: { companyId, materialLinkType: 'PRODUCT', materialLinkCode: product.id, locationLinkType: 'LOCATION', locationLinkCode: shelfChild.id } })
  if (!existsRule) {
    await prisma.tBLROUTINGRULE.create({
      data: { companyId, routingTypeId: routingType.id, materialLinkType: 'PRODUCT', materialLinkCode: product.id, locationLinkType: 'LOCATION', locationLinkCode: shelfChild.id, priority: 1 },
    })
  }

  // R01-01 lokasyonunu FAST grubuna ata (M-N örnek)
  const fastGroup = await prisma.tBLLOCATIONGROUP.findUniqueOrThrow({ where: { companyId_code: { companyId, code: 'FAST' } } })
  await prisma.tBLLOCATIONGROUPLINK.upsert({
    where: { locationId_locationGroupId: { locationId: shelfChild.id, locationGroupId: fastGroup.id } },
    update: {},
    create: { companyId, locationId: shelfChild.id, locationGroupId: fastGroup.id },
  })

  // ── Demo tanım kırılımları: tesis · bölge · cari grup · zincir · ürün-birim+barkod ──
  // tesis yukarıda (statülerden önce) oluşturuldu — depoyu o tesise bağla
  await prisma.tBLWAREHOUSE.update({ where: { companyId_code: { companyId, code: 'WH01' } }, data: { facilityId: facility.id } })

  const region = await prisma.tBLREGION.upsert({ where: { companyId_code: { companyId, code: 'MARMARA' } }, update: {}, create: { companyId, code: 'MARMARA', name: 'Marmara Bölgesi' } })
  const pgroup = await prisma.tBLPARTNERGROUP.upsert({ where: { companyId_code: { companyId, code: 'PERAKENDE' } }, update: {}, create: { companyId, code: 'PERAKENDE', name: 'Perakende Zinciri' } })
  await prisma.tBLBUSINESSPARTNER.update({ where: { companyId_code: { companyId, code: 'CUST001' } }, data: { regionId: region.id, partnerGroupId: pgroup.id } })
  const custParent = await prisma.tBLBUSINESSPARTNER.findUniqueOrThrow({ where: { companyId_code: { companyId, code: 'CUST001' } } })
  // zincir müşteri: alt şube
  await prisma.tBLBUSINESSPARTNER.upsert({
    where: { companyId_code: { companyId, code: 'CUST001-SB1' } },
    update: {},
    create: { companyId, code: 'CUST001-SB1', name: 'CUST001 — Kadıköy Şubesi', type: 'CUSTOMER', regionId: region.id, partnerGroupId: pgroup.id, parentId: custParent.id },
  })

  // Ürün ölçü birimi: PRD001 → PCS (baz) + KOLI (12'li) barkodları + çoklu barkod
  await prisma.tBLPRODUCTUNIT.update({ where: { productId_unitId: { productId: product.id, unitId: pcs.id } }, data: { barcode: '8690000000005' } })
  const koliUnit = await prisma.tBLPRODUCTUNIT.update({ where: { productId_unitId: { productId: product.id, unitId: box.id } }, data: { barcode: '8690000000012', batchTracking: true } })
  for (const bc of ['8690000000012', '8690000000029']) {
    const exists = await prisma.tBLPRODUCTUNITBARCODE.findFirst({ where: { productUnitId: koliUnit.id, barcode: bc } })
    if (!exists) await prisma.tBLPRODUCTUNITBARCODE.create({ data: { companyId, productUnitId: koliUnit.id, barcode: bc } })
  }

  // ── Operasyon konfig dünyası: ek statüler + GR statü geçişi + op-palet ──
  await prisma.tBLSTATUS.upsert({ where: { companyId_facilityId_code: { companyId, facilityId: facility.id, code: 'QUARANTINE' } }, update: {}, create: { companyId, facilityId: facility.id, code: 'QUARANTINE', name: 'Karantina' } })
  await prisma.tBLSTATUS.upsert({ where: { companyId_facilityId_code: { companyId, facilityId: facility.id, code: 'REJECTED' } }, update: {}, create: { companyId, facilityId: facility.id, code: 'REJECTED', name: 'Red' } })
  const grOp = await prisma.tBLOPERATIONTYPE.findUniqueOrThrow({ where: { companyId_code: { companyId, code: 'GR' } } })
  // GR (mal kabul) → hedef statü AVAILABLE (mal kabulde statü buradan türetilir)
  const exGrSt = await prisma.tBLOPERATIONTYPESTATUS.findFirst({ where: { companyId, operationTypeId: grOp.id, targetStatusId: available.id } })
  if (!exGrSt) await prisma.tBLOPERATIONTYPESTATUS.create({ data: { companyId, operationTypeId: grOp.id, targetStatusId: available.id, sortOrder: 1 } })
  // GR → palet tipi EUR (op-palet örneği)
  const eurPallet = await prisma.tBLPALLETTYPE.findFirst({ where: { companyId, code: 'EUR' } })
  if (eurPallet) {
    const exGrPt = await prisma.tBLOPERATIONTYPEPALLETTYPE.findFirst({ where: { companyId, operationTypeId: grOp.id, palletTypeId: eurPallet.id } })
    if (!exGrPt) await prisma.tBLOPERATIONTYPEPALLETTYPE.create({ data: { companyId, operationTypeId: grOp.id, palletTypeId: eurPallet.id } })
  }

  // ── Sayım operasyonu + parametre ekranları demo verisi (legacy StokBar; ekranlar boş kalmasın) ──
  const sayimOp = await prisma.tBLOPERATIONTYPE.upsert({
    where: { companyId_code: { companyId, code: 'SAYIM' } }, update: {},
    create: { companyId, code: 'SAYIM', name: 'Sayım', direction: 'COUNT', affectsStock: false },
  })
  const sayimGiris = await prisma.tBLOPERATIONTYPE.upsert({
    where: { companyId_code: { companyId, code: 'SAYIM-GIRIS' } }, update: {},
    create: { companyId, code: 'SAYIM-GIRIS', name: 'Sayım - Giriş', direction: 'INBOUND', affectsStock: true },
  })
  const sayimCikis = await prisma.tBLOPERATIONTYPE.upsert({
    where: { companyId_code: { companyId, code: 'SAYIM-CIKIS' } }, update: {},
    create: { companyId, code: 'SAYIM-CIKIS', name: 'Sayım - Çıkış', direction: 'OUTBOUND', affectsStock: true },
  })
  // Sayım Parametresi (Kör Sayım + eşitleme/parçalı palet/tekrar-sayma) — legacy TBLSBSAYIMPARAMETRE
  if (!(await prisma.tBLCOUNTPARAMETER.findFirst({ where: { companyId, operationTypeId: sayimOp.id } })))
    await prisma.tBLCOUNTPARAMETER.create({ data: { companyId, operationTypeId: sayimOp.id, countType: 1, entryOperationTypeId: sayimGiris.id, exitOperationTypeId: sayimCikis.id, equalize: true, partialPallet: true, dontRecountPallet: true } })
  // Sayım Kriter
  if (!(await prisma.tBLCOUNTCRITERIA.findFirst({ where: { companyId, operationTypeId: sayimOp.id, fieldCode: 'LOKASYON' } })))
    await prisma.tBLCOUNTCRITERIA.create({ data: { companyId, operationTypeId: sayimOp.id, fieldCode: 'LOKASYON', required: true } })

  // Parametre ekranları (cari/operasyon-bazlı opsiyonel config) — birer demo kayıt (findFirst-create idempotent)
  if (!(await prisma.tBLPARAMETER.findFirst({ where: { companyId, code: 'DEPO_KODU' } })))
    await prisma.tBLPARAMETER.create({ data: { companyId, code: 'DEPO_KODU', name: 'Varsayılan Depo', value: 'WH01' } })
  if (!(await prisma.tBLSTOCKCONTROLPARAMETER.findFirst({ where: { companyId } })))
    await prisma.tBLSTOCKCONTROLPARAMETER.create({ data: { companyId, distributionType: 1, customerPriority: 1, shipmentPriority: 1, askUser: true } })
  if (!(await prisma.tBLDOCUMENTPLANNINGPARAMETER.findFirst({ where: { companyId } })))
    await prisma.tBLDOCUMENTPLANNINGPARAMETER.create({ data: { companyId, partCount: 1, updateMainQty: true, locationAssign: true } })
  if (!(await prisma.tBLPICKORDERPARAMETER.findFirst({ where: { companyId } })))
    await prisma.tBLPICKORDERPARAMETER.create({ data: { companyId } })
  if (!(await prisma.tBLWORKORDERGENERALPARAMETER.findFirst({ where: { companyId } })))
    await prisma.tBLWORKORDERGENERALPARAMETER.create({ data: { companyId, alarmDuration: 30, alarmUnit: 1, askEntryLocation: true } })
  if (!(await prisma.tBLRACKFEEDPARAMETER.findFirst({ where: { companyId } })))
    await prisma.tBLRACKFEEDPARAMETER.create({ data: { companyId, capacityPercent: 80, onStockEmpty: true } })

  console.log('✔ Seed completed')
  console.log(`  WMS tanım: sequence GR, 3 reason, 1 location-group, 1 operation-group`)
  console.log(`  company: ${company.code} (id=${companyId})`)
  console.log(`  admin user: ${admin.username} / admin123 (super-admin)`)
  console.log(`  company user: ${operator.username} / operator123 (companyId=${companyId})`)
  console.log(`  roles: ${roles.map((r) => r.code).join(', ')}`)
  console.log(`  units: ${units.map((u) => u.code).join(', ')}`)
  console.log(`  statuses: ${statuses.map((s) => s.code).join(', ')}`)
  console.log(`  operationTypes: ${operationTypes.map((o) => o.code).join(', ')}`)
  console.log(`  partners: ${partners.map((p) => p.code).join(', ')}`)
  console.log(`  warehouse: ${warehouse.code}, area: ${area.code}`)
  console.log(`  locations: ${receiving.code}, ${shelfParent.code} > ${shelfChild.code}`)
  console.log(`  product: ${product.code} (+2 unit), pallet: ${pallet.palletNo}`)
  console.log(`  stock: 100 ${pcs.code} @ ${shelfChild.code} [${available.code}]`)
  console.log(`  inventoryRule: ${product.code} @ ${warehouse.code} (min 50 / max 200 / reorder 150)`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err)
    await prisma.$disconnect()
    process.exit(1)
  })
