# -*- coding: utf-8 -*-
"""OneGate WMS — Sistem Dokümantasyonu PDF (markalı, güncel: 2026-06-20).
Marka stili docs/pdf/gen_pdf.py'den; içerik docs/SISTEM-HARITASI + VERI-MODELI + ISLEYIS +
legacy analiz + MIMARI-YOL-HARITASI özetlerinden türetilmiştir."""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer,
                                Table, TableStyle, PageBreak)
from reportlab.platypus.doctemplate import NextPageTemplate
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

FONTS = r"C:\Windows\Fonts"
pdfmetrics.registerFont(TTFont("Sans", os.path.join(FONTS, "arial.ttf")))
pdfmetrics.registerFont(TTFont("Sans-B", os.path.join(FONTS, "arialbd.ttf")))
pdfmetrics.registerFont(TTFont("Sans-I", os.path.join(FONTS, "ariali.ttf")))

TEAL = colors.HexColor("#44d4e3"); BLUE = colors.HexColor("#4e86ff"); PURPLE = colors.HexColor("#9b5cf6")
NAVY = colors.HexColor("#0f2238"); NAVY2 = colors.HexColor("#0a1626")
INK = colors.HexColor("#1b2138"); MUTE = colors.HexColor("#5f6b80")
LIGHT = colors.HexColor("#eef3fb"); GREEN = colors.HexColor("#3b6d11"); AMBER = colors.HexColor("#ba7517")

PAGE_W, PAGE_H = A4
MX = 16 * mm
CW = PAGE_W - 2 * MX

def S(name, **kw):
    base = dict(fontName="Sans", textColor=INK, fontSize=9.5, leading=13)
    base.update(kw); return ParagraphStyle(name, **base)
H1 = S("H1", fontName="Sans-B", fontSize=17, textColor=NAVY, leading=21, spaceBefore=10, spaceAfter=6)
H2 = S("H2", fontName="Sans-B", fontSize=12.5, textColor=BLUE, leading=16, spaceBefore=8, spaceAfter=3)
BODY = S("BODY", fontSize=9.5, leading=13.5, spaceAfter=3)
TH = S("TH", fontName="Sans-B", fontSize=8.6, textColor=colors.white, leading=11)
TD = S("TD", fontSize=8.6, leading=11)

story = []
def para(t, st=BODY): story.append(Paragraph(t, st))
def gap(h=5): story.append(Spacer(1, h))

def htable(header, rows, widths, header_bg=BLUE, align=None):
    data = [[Paragraph(h, TH) for h in header]] + [[Paragraph(str(c), TD) for c in r] for r in rows]
    t = Table(data, colWidths=widths, repeatRows=1)
    sty = [("BACKGROUND",(0,0),(-1,0),header_bg), ("TOPPADDING",(0,0),(-1,-1),3),
           ("BOTTOMPADDING",(0,0),(-1,-1),3), ("LEFTPADDING",(0,0),(-1,-1),5),
           ("RIGHTPADDING",(0,0),(-1,-1),5), ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
           ("GRID",(0,0),(-1,-1),0.25,colors.HexColor("#d8dee8"))]
    for i in range(1, len(data)):
        if i % 2 == 0: sty.append(("BACKGROUND",(0,i),(-1,i),colors.HexColor("#f7f9fc")))
    if align:
        for col,a in align.items(): sty.append(("ALIGN",(col,1),(col,-1),a))
    t.setStyle(TableStyle(sty)); return t

# ---------- KAPAK ----------
def cover(canv, doc):
    canv.saveState()
    canv.setFillColor(NAVY2); canv.rect(0, PAGE_H-95*mm, PAGE_W, 95*mm, fill=1, stroke=0)
    n=120
    for i in range(n):
        t=i/(n-1); w=PAGE_W/n
        if t<0.5:
            r=0x44+(0x4e-0x44)*(t*2); g=0xd4+(0x86-0xd4)*(t*2); b=0xe3+(0xff-0xe3)*(t*2)
        else:
            tt=(t-0.5)*2; r=0x4e+(0x9b-0x4e)*tt; g=0x86+(0x5c-0x86)*tt; b=0xff+(0xf6-0xff)*tt
        canv.setFillColorRGB(r/255,g/255,b/255); canv.rect(i*w, PAGE_H-100*mm, w+1, 5*mm, fill=1, stroke=0)
    canv.setFillColor(BLUE); canv.roundRect(MX, PAGE_H-55*mm, 16*mm, 16*mm, 4*mm, fill=1, stroke=0)
    canv.setFillColor(colors.white); canv.setFont("Sans-B", 16); canv.drawCentredString(MX+8*mm, PAGE_H-48*mm, "OG")
    canv.setFont("Sans-B", 30); canv.drawString(MX+20*mm, PAGE_H-48*mm, "OneGate WMS")
    canv.setFillColor(colors.HexColor("#9fb6d4")); canv.setFont("Sans", 12)
    canv.drawString(MX+20*mm, PAGE_H-55*mm, "Warehouse Management & Procurement Platform")
    canv.setFillColor(colors.white); canv.setFont("Sans-B", 15)
    canv.drawString(MX, PAGE_H-78*mm, "Sistem Dokümantasyonu")
    canv.setFillColor(colors.HexColor("#9fb6d4")); canv.setFont("Sans", 10)
    canv.drawString(MX, PAGE_H-85*mm, "Belge-merkezli WMS · Legacy StokBar / Panorama8 → modern yeniden tasarım · 2026-06-20")
    mets=[("133","Domain model",TEAL),("36","Enum",BLUE),("~128","API endpoint",PURPLE),
          ("5","DB şeması",GREEN),("30","UI sayfa",AMBER)]
    bw=(CW-4*4*mm)/5
    for i,(v,l,c) in enumerate(mets):
        x=MX+i*(bw+4*mm); y=PAGE_H-128*mm
        canv.setFillColor(colors.white); canv.setStrokeColor(colors.HexColor("#dde4ee")); canv.setLineWidth(0.8)
        canv.roundRect(x, y, bw, 22*mm, 3*mm, fill=1, stroke=1)
        canv.setFillColor(c); canv.rect(x, y, bw, 2.2*mm, fill=1, stroke=0)
        canv.setFillColor(INK); canv.setFont("Sans-B", 16); canv.drawCentredString(x+bw/2, y+12*mm, v)
        canv.setFillColor(MUTE); canv.setFont("Sans", 7.4); canv.drawCentredString(x+bw/2, y+5.5*mm, l)
    canv.setFillColor(MUTE); canv.setFont("Sans", 8)
    canv.drawCentredString(PAGE_W/2, 14*mm, "OneGate · 4Simple · Gizli — yalnızca proje ekibi için")
    canv.restoreState()

def later(canv, doc):
    canv.saveState()
    canv.setFillColor(NAVY); canv.rect(0, PAGE_H-12*mm, PAGE_W, 12*mm, fill=1, stroke=0)
    canv.setFillColor(colors.white); canv.setFont("Sans-B", 9); canv.drawString(MX, PAGE_H-8*mm, "OneGate WMS")
    canv.setFillColor(TEAL); canv.setFont("Sans", 8); canv.drawString(MX+26*mm, PAGE_H-8*mm, "Sistem Dokümantasyonu")
    canv.setFillColor(MUTE); canv.setFont("Sans", 8); canv.drawRightString(PAGE_W-MX, 10*mm, f"Sayfa {doc.page}")
    canv.setStrokeColor(colors.HexColor("#dde4ee")); canv.setLineWidth(0.5); canv.line(MX,14*mm,PAGE_W-MX,14*mm)
    canv.restoreState()

# ================= İÇERİK =================
story.append(Spacer(1, 150*mm)); story.append(PageBreak())

para("1. Yönetici Özeti", H1)
para("OneGate, eski <b>StokBar / Panorama8</b> WMS'inin (MSSQL/VB6) modern, çok-kiracılı yeniden tasarımıdır. "
     "<b>Belge-merkezli</b>: her stok hareketi bir <b>Belge</b> ile doğar; davranışın tamamı <b>Operasyon Tipi + "
     "scope (cari/malzeme/lokasyon)</b> konfigürasyonundan türer. Bu doküman güncel sistem haritası, veri modeli, "
     "legacy uyumu ve son eklenen mimari yetenekleri özetler. Ayrıntı: depodaki <font name='Sans-B'>docs/</font> markdown seti.")
gap(3)
para("Mimari & Teknoloji", H2)
story.append(htable(["Katman","Teknoloji"],
    [["API","Fastify 5 · @fastify/jwt · cors · static · Swagger (/docs)"],
     ["ORM / DB","Prisma 7.8 + @prisma/adapter-pg (zorunlu) · PostgreSQL 16 · 5 şema (wms·procurement·sales·logistics·finance)"],
     ["Auth","JWT · RBAC (ADMIN/OPERATOR/VIEWER + super-admin) · multi-tenant (companyId)"],
     ["UI","React 19 · Refine 5 · Ant Design 6 · Vite — metadata-driven (resources/formConfig/detailActions)"],
     ["Test","smoke (her endpoint + auth + RBAC) · typecheck + migrate + seed döngüsü"]],
    [30*mm, CW-30*mm]))

para("2. Çekirdek İşleyiş Modeli", H1)
para("Ana Veri → <b>Operasyon Tipi</b> (kurallar) → <b>Belge</b> (yaşam döngüsü) → <b>Stok</b>. "
     "Stok kimliği: <i>lokasyon × ürün × statü × batch × seri × palet × cari × PO</i>, mainQty + reservedQty. "
     "<b>Stok yalnız COMPLETE anında değişir.</b>", BODY)
gap(3)
para("Belge yaşam döngüsü", H2)
story.append(htable(["Enum (motor)","UI etiketi","Stok etkisi"],
    [["DRAFT","Bekliyor / Taslak","yok"],
     ["CONFIRMED","Onay Bekliyor","yok"],
     ["COMPLETED","Onaylandı","uygulanır (INBOUND +, OUTBOUND -, INTERNAL ±)"],
     ["CANCELLED","İptal","ters kayıt (reverse) ile geri alınır"]],
    [34*mm, 40*mm, CW-74*mm], header_bg=TEAL))
gap(3)
para("Yön → stok etkisi: <b>INBOUND</b> hedef +miktar · <b>OUTBOUND</b> kaynak -miktar · "
     "<b>INTERNAL</b> kaynak - / hedef + · <b>COUNT</b> sayım motoru (ayrı). "
     "Çevre kontrol katmanları: giriş/çıkış koşulları, yönlendirme (directed putaway), kapasite, tolerans, kalite.", BODY)

para("3. Sistem Haritası & Veri Modeli", H1)
para("Menü 3 katmanlı (SECTION → grup → kaynak): <b>Tanımlamalar</b> (ana veri) · <b>İşlemler</b> (operasyon) · "
     "<b>Uyarlamalar</b> (konfigürasyon) · <b>Raporlar</b>. Frontend metadata-driven: üç jenerik sayfa tüm CRUD'u sürer.", BODY)
gap(3)
para("Veri modeli — domain grupları (133 model, 36 enum)", H2)
story.append(htable(["Domain","Ana modeller"],
    [["Tenant / Yetki","Company · User · Role · UserRole"],
     ["Lokasyon","Facility → Warehouse → Area → Location(ağaç) · LocationGroup · LocationCapacity · Region"],
     ["Ürün","Product · ProductUnit (çevrim/batch-seri) · UnitBarcode · Group/SubGroup/Type · Substitute · InventoryRule(MRP)"],
     ["Cari","BusinessPartner(ağaç) · PartnerGroup · ExtraGroup/Field · AcceptanceTime · Optimization"],
     ["Stok (kalp)","Stock · Status · StockLedger (hareket defteri)"],
     ["Operasyon Tipi","OperationType (74→~33 bayrak) + junction: Status/Location/Reason/PalletType/Tolerance/Forbidden …"],
     ["Belge","Document · DocumentLine · DocumentLineScope (okutma/KAPSAM) · DocumentStatus"],
     ["Koşul / Yönlendirme","Entry/Exit Condition (param + kırma log) · Routing (type/rule/product-location)"],
     ["Sayım / Palet","StockCount · ControlCount · Pallet · PalletType · PalletHistory · PalletNotification"],
     ["Çevre modüller","Procurement · Sales(+Allocation) · Logistics(Vehicle/Shipment) · Finance(Invoice)"]],
    [34*mm, CW-34*mm], header_bg=PURPLE))

para("4. Legacy Uyum & Kilit Mimari Kararlar", H1)
para("Legacy StokBar (STOKBAR_UNI, 71 WMS tablosu) referans alındı; <b>klonlama değil, mantık uygulandı</b> "
     "(memory ilkesi). Kilit yapısal kararlar:", BODY)
story.append(htable(["Konu","Legacy","OneGate kararı"],
    [["Belge modeli","BASLIK→KAPSAM→DETAY + ayrı OPERASYONBELGE","Tek Document+Line; KAPSAM = DocumentLineScope (yeni)"],
     ["Stok tablosu","Bölge-bazlı parçalı (TBLSTK ANADOLU/IZMIR…)","Tek birleşik TBLSTOCK (daha iyi desen) ✓"],
     ["Stok kimliği","STOKDURUM: + PO + cari","unique anahtara cari/PO eklendi (consignment) ✓"],
     ["Ürün birim/barkod","5 satır-içi slot (denormalize)","ProductUnit + UnitBarcode (normalize) ✓"],
     ["İş mantığı","SSP_SB* stored procedure (~245)","TypeScript src/lib/* (movement/counting/routing…)"],
     ["Master (URUN 131 / MUSTERI 184 kol)","ana ERP'de, id ile bağ","WMS-ilgili altküme içselleştirildi"]],
    [28*mm, 58*mm, CW-86*mm], header_bg=AMBER))

para("5. Son Eklenen Mimari Yetenekler", H1)
para("Çekirdek analiz sonrası onaylanan üç yetenek (backend + migration + uçtan uca doğrulama tamam):", BODY)
story.append(htable(["Yetenek","Kapsam","Durum"],
    [["Stok Hareket Defteri","TBLSTOCKLEDGER (legacy LOGBELGE) — append-only, complete/reverse/sayım yazar; stok kartı buradan","Tamam"],
     ["C · Raf-ömrü + catch-weight","Üründe shelfLife + min/max ağırlık (et/gıda)","Tamam"],
     ["B · Consignment / PO kimliği","Stok kimliğine cari+PO; farklı PO→ayrı satır, aynı PO→birleşir","Tamam"],
     ["A · KAPSAM / okutma katmanı","DocumentLineScope (1 satır→N okutma→N hareket) + collectedQty; posting & reverse scope-aware","Tamam (MVP)"]],
    [38*mm, CW-54*mm, 22*mm], header_bg=GREEN, align={2:"CENTER"}))
gap(3)
para("Kalan (UI / koordinasyon): A terminal okutma ekranı · belge satırında cari/PO girişi · catch-weight ağırlık yakalama. "
     "Bilinen boşluklar: maliyet/stok değerleme, cari hesap defteri.", S("sm", fontSize=8.4, leading=11, textColor=MUTE))

para("6. Doküman Seti (depo: docs/)", H1)
story.append(htable(["Dosya","İçerik"],
    [["CLAUDE.md","Kök bağlam — Claude Code giriş noktası"],
     ["SISTEM-HARITASI.md","Menü→sayfa→API→tablo atlası + işleyiş özeti (güncel tek kaynak)"],
     ["VERI-MODELI.md","Tablo alan-alan + legacy kolon eşlemesi + tutarsızlık notları"],
     ["ISLEYIS.md","Akış adım-adım: legacy SP ↔ OneGate karşılaştırması"],
     ["KONFIG-MOTORU.md","Operasyon tipi bayrakları × scope × koşul/yönlendirme"],
     ["MIMARI-YOL-HARITASI.md","3 yetenek (C/B/A) şema deltası + durum + koordinasyon"],
     ["legacy/*","StokBar şema dökümü · crosswalk · çekirdek tablo analizi · kanonik SP'ler"]],
    [42*mm, CW-42*mm]))

out = os.path.join(os.path.dirname(__file__), "OneGate-WMS-Dokumantasyon.pdf")
doc = BaseDocTemplate(out, pagesize=A4, leftMargin=MX, rightMargin=MX, topMargin=18*mm, bottomMargin=18*mm,
                      title="OneGate WMS — Sistem Dokümantasyonu", author="OneGate / 4Simple")
frame = Frame(MX, 16*mm, CW, PAGE_H-34*mm, id="main")
doc.addPageTemplates([PageTemplate(id="cover", frames=[frame], onPage=cover),
                      PageTemplate(id="later", frames=[frame], onPage=later)])
doc.build([NextPageTemplate("later")] + story)
print("PDF:", out)
