---
title: "Operasyon tipi: sekmeli tek-ekran editör (Tanım+Statü+Lokasyon+Neden+Palet)"
type: run
status: completed
date: 2026-06-12
run_id: 2026-06-12T10-45-00-op-tabbed-editor
manager: Tech Lead
crew: [[crew/frontend-engineer]]
topics: [ui, ux, operasyon, sekme, tab, baglanti, menu]
tags: [run/completed, ui, frontend]
related_runs: [[runs/2026-06-12T10-20-00-ui-op-menu]]
---

# Run — Operasyon tipi sekmeli editör

## Yapılan (kullanıcı: "ayrı menü gerek yok; operasyon tanımı yaparken tablı tek ekran")
- **Ayrı menü kaldırıldı** — op↔statü/lokasyon/neden/palet artık `resources.ts`'te değil.
- **OperationTypeForm → Tabs**: **Tanım** (config 5 bölüm + sticky kaydet) | **Statü** | **Lokasyon** | **Neden** | **Palet Tipi**.
- **LinkTab** bileşeni (her bağlantı sekmesi): `?operationTypeId` ile o operasyonun kayıtlarını listeler, **inline form**la ekler (anında POST), satırdan **siler** (DELETE), ref id'lerini **etikete çözümler**.
- **Akış**: yeni kayıtta sadece Tanım aktif (uyarı: "önce tanımı kaydet"); **Kaydet ve Devam Et** → edit moduna geçer → 4 sekme açılır (binding'ler operationTypeId gerektirir).

## Doğrulama
- web tsc ✅ · web build ✅ · **canlı DOM** ✅: create'te 5 sekme (yalnız Tanım açık + uyarı); edit'te hepsi açık; Palet Tipi bağla → listede "EUR — Euro Palet" (ref çözümlü); UI'dan sil → 0 satır; "Operasyon Bağlantıları" menüsü yok.

## Karar
- Bağlantılar master-detay sekme olarak tek ekranda; create→save→edit akışı.

## Not
- Backend op-link route'ları (operationLinks.ts) duruyor — sekmeler kullanıyor. resources.ts'ten yalnız menü kaydı silindi.

## Sonraki
- Gerçek barkod (Code128) · belge satırından etiket bas · StokBar parite
