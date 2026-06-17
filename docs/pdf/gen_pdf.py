# -*- coding: utf-8 -*-
"""OneGate WMS — Genel Çerçeve PDF üretici (markalı, veri modeli + akış + fazlar)."""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer,
                                Table, TableStyle, PageBreak, KeepTogether)
from reportlab.graphics.shapes import Drawing, Rect, String, Line, Polygon
from reportlab.graphics import renderPDF

# --- Türkçe font (Windows Arial) ---
FONTS = r"C:\Windows\Fonts"
pdfmetrics.registerFont(TTFont("Sans", os.path.join(FONTS, "arial.ttf")))
pdfmetrics.registerFont(TTFont("Sans-B", os.path.join(FONTS, "arialbd.ttf")))
pdfmetrics.registerFont(TTFont("Sans-I", os.path.join(FONTS, "ariali.ttf")))

# --- Marka renkleri ---
TEAL = colors.HexColor("#44d4e3"); BLUE = colors.HexColor("#4e86ff"); PURPLE = colors.HexColor("#9b5cf6")
NAVY = colors.HexColor("#0f2238"); NAVY2 = colors.HexColor("#0a1626")
INK = colors.HexColor("#1b2138"); MUTE = colors.HexColor("#5f6b80")
LIGHT = colors.HexColor("#eef3fb"); GREEN = colors.HexColor("#3b6d11"); GREENBG = colors.HexColor("#eaf3de")
AMBER = colors.HexColor("#ba7517"); GRAYBG = colors.HexColor("#f1efe8")

PAGE_W, PAGE_H = A4
MX = 16 * mm
CW = PAGE_W - 2 * MX

styles = getSampleStyleSheet()
def S(name, **kw):
    base = dict(fontName="Sans", textColor=INK, fontSize=9.5, leading=13)
    base.update(kw); return ParagraphStyle(name, **base)
H1 = S("H1", fontName="Sans-B", fontSize=17, textColor=NAVY, leading=21, spaceBefore=10, spaceAfter=6)
H2 = S("H2", fontName="Sans-B", fontSize=12.5, textColor=BLUE, leading=16, spaceBefore=8, spaceAfter=3)
BODY = S("BODY", fontSize=9.5, leading=13.5, spaceAfter=3)
SMALL = S("SMALL", fontSize=8.3, leading=11, textColor=MUTE)
TH = S("TH", fontName="Sans-B", fontSize=8.6, textColor=colors.white, leading=11)
TD = S("TD", fontSize=8.6, leading=11)
TDB = S("TDB", fontName="Sans-B", fontSize=8.6, leading=11)

story = []
def para(t, st=BODY): story.append(Paragraph(t, st))
def gap(h=5): story.append(Spacer(1, h))

def htable(header, rows, widths, header_bg=BLUE, zebra=True, align=None):
    data = [[Paragraph(h, TH) for h in header]] + [[Paragraph(str(c), TD) for c in r] for r in rows]
    t = Table(data, colWidths=widths, repeatRows=1)
    sty = [("BACKGROUND",(0,0),(-1,0),header_bg), ("TOPPADDING",(0,0),(-1,-1),3),
           ("BOTTOMPADDING",(0,0),(-1,-1),3), ("LEFTPADDING",(0,0),(-1,-1),5),
           ("RIGHTPADDING",(0,0),(-1,-1),5), ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
           ("LINEBELOW",(0,0),(-1,0),0.6,header_bg), ("GRID",(0,0),(-1,-1),0.25,colors.HexColor("#d8dee8"))]
    if zebra:
        for i in range(1, len(data)):
            if i % 2 == 0: sty.append(("BACKGROUND",(0,i),(-1,i),colors.HexColor("#f7f9fc")))
    if align:
        for col,a in align.items(): sty.append(("ALIGN",(col,1),(col,-1),a))
    t.setStyle(TableStyle(sty)); return t

# ---------- KAPAK ----------
def cover(canv, doc):
    canv.saveState()
    canv.setFillColor(NAVY2); canv.rect(0, PAGE_H-95*mm, PAGE_W, 95*mm, fill=1, stroke=0)
    # gradient şerit
    n=120; x0=0; w=PAGE_W/n
    for i in range(n):
        t=i/(n-1)
        if t<0.5:
            r=0x44+(0x4e-0x44)*(t*2); g=0xd4+(0x86-0xd4)*(t*2); b=0xe3+(0xff-0xe3)*(t*2)
        else:
            tt=(t-0.5)*2; r=0x4e+(0x9b-0x4e)*tt; g=0x86+(0x5c-0x86)*tt; b=0xff+(0xf6-0xff)*tt
        canv.setFillColorRGB(r/255,g/255,b/255); canv.rect(x0+i*w, PAGE_H-100*mm, w+1, 5*mm, fill=1, stroke=0)
    # logo kare
    canv.setFillColor(BLUE); canv.roundRect(MX, PAGE_H-55*mm, 16*mm, 16*mm, 4*mm, fill=1, stroke=0)
    canv.setFillColor(colors.white); canv.setFont("Sans-B", 16); canv.drawCentredString(MX+8*mm, PAGE_H-48*mm, "OG")
    canv.setFillColor(colors.white); canv.setFont("Sans-B", 30)
    canv.drawString(MX+20*mm, PAGE_H-48*mm, "OneGate WMS")
    canv.setFillColor(colors.HexColor("#9fb6d4")); canv.setFont("Sans", 12)
    canv.drawString(MX+20*mm, PAGE_H-55*mm, "Warehouse Management & Procurement Platform")
    canv.setFillColor(colors.white); canv.setFont("Sans-B", 15)
    canv.drawString(MX, PAGE_H-78*mm, "Genel Çerçeve & Hazır Durum Dokümanı")
    canv.setFillColor(colors.HexColor("#9fb6d4")); canv.setFont("Sans", 10)
    canv.drawString(MX, PAGE_H-85*mm, "Legacy SB / PAN8RAMA WMS (459 tablo) → temiz yeniden tasarım · 2026-06-11")
    # metrik kutuları
    mets=[("57","Domain tablo",TEAL),("146","API endpoint",BLUE),("38","UI ekran",PURPLE),
          ("10","Davranış kuralı",GREEN),("~%88","WMS olgunluk",AMBER)]
    bw=(CW-4*4*mm)/5
    for i,(v,l,c) in enumerate(mets):
        x=MX+i*(bw+4*mm); y=PAGE_H-128*mm
        canv.setFillColor(colors.white); canv.setStrokeColor(colors.HexColor("#dde4ee")); canv.setLineWidth(0.8)
        canv.roundRect(x, y, bw, 22*mm, 3*mm, fill=1, stroke=1)
        canv.setFillColor(c); canv.rect(x, y, bw, 2.2*mm, fill=1, stroke=0)
        canv.setFillColor(INK); canv.setFont("Sans-B", 17); canv.drawCentredString(x+bw/2, y+12*mm, v)
        canv.setFillColor(MUTE); canv.setFont("Sans", 7.6); canv.drawCentredString(x+bw/2, y+5.5*mm, l)
    canv.setFillColor(MUTE); canv.setFont("Sans", 8)
    canv.drawCentredString(PAGE_W/2, 14*mm, "OneGate · 4Simple · Gizli — yalnızca proje ekibi için")
    canv.restoreState()

def later(canv, doc):
    canv.saveState()
    canv.setFillColor(NAVY); canv.rect(0, PAGE_H-12*mm, PAGE_W, 12*mm, fill=1, stroke=0)
    canv.setFillColor(colors.white); canv.setFont("Sans-B", 9); canv.drawString(MX, PAGE_H-8*mm, "OneGate WMS")
    canv.setFillColor(TEAL); canv.setFont("Sans", 8); canv.drawString(MX+26*mm, PAGE_H-8*mm, "Genel Çerçeve")
    canv.setFillColor(MUTE); canv.setFont("Sans", 8)
    canv.drawRightString(PAGE_W-MX, 10*mm, f"Sayfa {doc.page}")
    canv.setStrokeColor(colors.HexColor("#dde4ee")); canv.setLineWidth(0.5); canv.line(MX,14*mm,PAGE_W-MX,14*mm)
    canv.restoreState()

# ---------- AKIŞ ŞEMASI (Drawing) ----------
def flow_diagram():
    d = Drawing(CW, 168)
    flows = [
      ("1 · Mal Kabul", ["Belge","Yönlendirme\nönerisi","Statü\n(QC/op)","Onayla","Tamamla","Stok girer"], TEAL),
      ("2 · Sevk", ["Satış sip.","Allocate\n(FEFO)","Toplama\nemri","Topla","Sevk","Fatura"], BLUE),
      ("3 · İş Emri", ["Planla","Ata","Başla","Raporla","Tamamla\n→ stok"], PURPLE),
    ]
    bw=72; bh=26; gapx=14; top=128
    for ri,(title,steps,c) in enumerate(flows):
        y = top - ri*46
        d.add(String(0, y+30, title, fontName="Sans-B", fontSize=9, fillColor=NAVY))
        for si,s in enumerate(steps):
            x = si*(bw+gapx)
            d.add(Rect(x, y, bw, bh, rx=4, ry=4, fillColor=colors.Color(c.red,c.green,c.blue,0.13), strokeColor=c, strokeWidth=1))
            lines=s.split("\n")
            for li,ln in enumerate(lines):
                yy = y+bh/2+ (4 if len(lines)==1 else (9-li*9))
                d.add(String(x+bw/2, yy-3, ln, fontName="Sans", fontSize=7, fillColor=INK, textAnchor="middle"))
            if si < len(steps)-1:
                ax=x+bw+2; ay=y+bh/2
                d.add(Line(ax, ay, ax+gapx-4, ay, strokeColor=MUTE, strokeWidth=1))
                d.add(Polygon([ax+gapx-4,ay, ax+gapx-7,ay+2.5, ax+gapx-7,ay-2.5], fillColor=MUTE, strokeColor=MUTE))
    return d

# ---------- FAZ TIMELINE (Drawing) ----------
def phase_diagram():
    phases = [
      ("Faz 0–2","WMS çekirdek · Stok & hareket motoru · Satış/satınalma/lojistik/finans · RBAC","done"),
      ("Faz 3","İş emri · Toplama emri · Yönlendirme (directed putaway)","done"),
      ("Faz 4","UI: React+Refine · marka · Pano · çok-satırlı oluşturma","done"),
      ("Faz 5","Demo tanımlar: Tesis · ürün-birim-barkod · cari zinciri · lokasyon kapasite · toplu lokasyon · barkod parse","done"),
      ("Faz 6","Operasyon Tipi zengin konfig (30+ alan) + op↔statü/lokasyon/neden/palet linkleri","done"),
      ("Faz 7","Konfig → gerçek davranış (10 kural enforce) · lot/seri zorlaması · DB kalıcılık","done"),
      ("Faz 8","SIRADAKİ: Demo son prova · kalan flag'ler (ters-belge, batch atama)","next"),
      ("Faz 9","İLERİDE: Ayrı satınalma DB'sinin birleştirilmesi","future"),
      ("Faz 10","EN SON: AI modülü","future"),
    ]
    rowh=30; d = Drawing(CW, len(phases)*rowh+6)
    lx=10
    d.add(Line(lx, 6, lx, len(phases)*rowh, strokeColor=colors.HexColor("#cfd8e6"), strokeWidth=2))
    for i,(t,desc,st) in enumerate(phases):
        y = (len(phases)-1-i)*rowh + 10
        col = GREEN if st=="done" else (BLUE if st=="next" else MUTE)
        bg = GREENBG if st=="done" else (LIGHT if st=="next" else GRAYBG)
        d.add(Rect(lx-4, y, 8, 8, rx=4, ry=4, fillColor=col, strokeColor=colors.white, strokeWidth=1))
        d.add(Rect(lx+12, y-6, 64, 20, rx=3, ry=3, fillColor=bg, strokeColor=col, strokeWidth=0.7))
        d.add(String(lx+44, y+0.5, t, fontName="Sans-B", fontSize=8.5, fillColor=col, textAnchor="middle"))
        d.add(String(lx+84, y+3.5, desc, fontName="Sans", fontSize=8.2, fillColor=INK))
    return d

# ================= İÇERİK =================
story.append(Spacer(1, 150*mm))  # kapak alanı
story.append(PageBreak())

para("1. Yönetici Özeti", H1)
para("OneGate, eski <b>StokBar / PAN8RAMA</b> WMS'inin Excel tablo dökümünden (459 tablo) türetilmiş; "
     "<b>modern, modüler, çok-kiracılı (multi-tenant)</b> bir Depo Yönetim + Satınalma/Satış platformudur. "
     "Backend Fastify 5 + Prisma 7 (PostgreSQL, 5 şema), frontend React 19 + Refine 5 + Ant Design 6. "
     "Çekirdek hedefler tamamlandı: tesisten lokasyona tanımlar, mal kabulden sevke akışlar, operasyon tipi "
     "konfigürasyonu ve <b>konfigürasyonun gerçek davranışa bağlanması</b>. Legacy'ye birebir sadık kalındı; "
     "icat edilen yapılar (ör. Tesis seviyesi) işaretlendi.")
gap(4)
para("Mimari & Teknoloji", H2)
story.append(htable(["Katman","Teknoloji"],
    [["API","Fastify 5 · @fastify/jwt · cors · static · Swagger (/docs)"],
     ["ORM / DB","Prisma 7.8 + adapter-pg · PostgreSQL 16 · 5 şema (wms·procurement·sales·logistics·finance)"],
     ["Auth","JWT · RBAC (ADMIN/OPERATOR/VIEWER + super-admin) · multi-tenant"],
     ["UI","React 19 · Refine 5 · Ant Design 6 · Vite 8"],
     ["Test","smoke (her endpoint) + ~25 E2E paketi · typecheck + migrate + seed döngüsü"]],
    [32*mm, CW-32*mm]))

story.append(PageBreak())
para("2. Veri Modeli (57 Domain Tablo)", H1)
para("WMS şeması (47 tablo) — domain alt-gruplarına göre:", H2)
wms = [
 ["Tenant / Lokasyon","Firma · Tesis · Depo · Alan · Lokasyon(ağaç) · Lokasyon Grup + M-N link · Lokasyon Kapasite"],
 ["Ürün","Ürün · Ürün Grup · Alt-Grup · Birim · Ürün Ölçü Birimi(çevrim/boyut/ağırlık/parti-seri) · Çoklu Barkod"],
 ["Cari","Cari(müşteri/tedarikçi) · Cari Grup · Bölge · Zincir(üst cari self-ref)"],
 ["Stok & Hareket","Stok(lot/seri/palet/FEFO/rezerve) · Belge + Satır(kaynak→hedef) · Palet · Palet Tipi · Statü · Sayaç"],
 ["Operasyon","Operasyon Tipi(zengin konfig 30+ alan) · Operasyon Grup · Neden · Op↔Statü/Lokasyon/Neden/Palet(4 link)"],
 ["İş Emri / Görev","İş Emri + Satır (planla→ata→başla→raporla→tamamla + stok köprüsü)"],
 ["Yönlendirme","Yönlendirme Tipi · Yönlendirme Kuralı (ürün/grup→lokasyon/grup, directed putaway)"],
 ["Koşul / Genel","Giriş/Çıkış Koşul Tipi · Etiket Tipi · Barkod Tipi(parse) · Parametre"],
 ["Diğer","Sayım(stocktake) · Kalite Muayene · Inventory Kuralı(MRP) · Kullanıcı · Rol · Kullanıcı-Rol"],
]
story.append(htable(["Alt-grup","Tablolar"], wms, [34*mm, CW-34*mm], header_bg=TEAL))
gap(5)
para("Diğer şemalar (10 tablo):", H2)
story.append(htable(["Şema","Tablolar"],
    [["procurement (2)","Satınalma Sipariş + Satır"],
     ["sales (3)","Satış Sipariş + Satır + Allocation (FEFO rezervasyon)"],
     ["logistics (3)","Araç + Sevkiyat + Durak"],
     ["finance (2)","Fatura + Satır"]],
    [34*mm, CW-34*mm], header_bg=PURPLE))

story.append(PageBreak())
para("3. Modüller — Olgunluk", H1)
mods=[["WMS Çekirdek","%98","Tesis→Depo→Alan→Lokasyon(ağaç) · seviye-bazlı toplu lokasyon üretme"],
 ["Stok","%92","lot/batch/seri/palet · FEFO · rezerve · stok kartı"],
 ["Hareket Motoru","%95","Belge kaynak→hedef · giriş/çıkış/transfer · tamamla→stok · ters kayıt"],
 ["Operasyon Tipi (kalp)","%90","5 bölümlü zengin konfig — 30+ alan (davranış flag'leri)"],
 ["İş Emri / Görev","%85","planla→ata→başla→raporla→tamamla + stok köprüsü"],
 ["Toplama Emri","%85","satıştan yönlendirilmiş pick (lokasyon/parti dolu)"],
 ["Yönlendirme","%80","ürün/grup→lokasyon/grup kuralı · mal kabulde öneri"],
 ["Lokasyon Kapasite","%80","lokasyon/grup×malzeme kapasite + enforce"],
 ["Sayım / Kalite","%65","snapshot→düzelt · muayene→statü geçişi"],
 ["Inventory / MRP","%70","min/max·reorder→taslak satınalma"],
 ["Procurement","%70","sipariş→onay→mal kabul · finans"],
 ["Sales","%88","sipariş→onay→allocate(FEFO)→toplama→sevk · finans"],
 ["Logistics","%80","araç·sevkiyat·durak"],
 ["Finance","%65","fatura→kesim→tahsilat · vade analizi"],
 ["Auth / RBAC","%75","JWT·rol·super-admin·kullanıcı CRUD"],
 ["UI (Refine)","%75","38 ekran · CRUD · detay/aksiyon · çok-satırlı · Pano"]]
story.append(htable(["Modül","%","Kapsam"], mods, [40*mm, 14*mm, CW-54*mm], align={1:"CENTER"}))

story.append(PageBreak())
para("4. Konfigürasyon → Gerçek Davranış (10 Kural Enforce)", H1)
para("Operasyon tipi ve tanımlar artık akışı <b>gerçekten</b> yönetir. Mantık: takip/kural kapalıysa serbest, açıksa zorunlu (geriye uyumlu).", BODY)
beh=[["1","reasonRequired","Op'ta açıksa belge neden'siz tamamlanamaz (409)"],
 ["2","passiveProductUse","Kapalıysa pasif ürün hareket edemez (409)"],
 ["3","op↔statü geçişi","Geçiş tanımlıysa satır statüsü uygun olmalı (giriş hedef/çıkış kaynak/transfer ikisi)"],
 ["4","lokasyon kapasite","Hedefe girişte limit aşımı: ERROR→409, WARNING→izin"],
 ["5","seri = 1 adet","Seri takipli ürün hareketinde miktar 1 zorunlu"],
 ["6","seri tekrar engeli","Girişte aynı seri varsa engel; sameUseSerial=true istisna"],
 ["7","lot/parti zorunlu","Parti takipli ürün-birimde parti no zorunlu"],
 ["8","qualityControl","Mal kabulde hedef statü otomatik KARANTİNA"],
 ["9","sameUsePallet","Kullanımdaki palete girişte engel; açıksa konsolidasyon"],
 ["10","op↔neden / op↔palet tipi","Op'a bağlı liste varsa belge nedeni / palet tipi uygun olmalı"]]
story.append(htable(["#","Kural","Davranış"], beh, [9*mm, 40*mm, CW-49*mm], header_bg=GREEN, align={0:"CENTER"}))

story.append(PageBreak())
para("5. Uçtan Uca İş Akışları", H1)
para("Üç ana WMS akışı (renkli=çalışan adımlar, oklar = sıra):", BODY)
gap(8)
story.append(flow_diagram())
gap(6)
para("Ek akışlar:", H2)
para("• <b>Transfer:</b> TR belge → tamamla → ters kayıt (geri al)  &nbsp;&nbsp; "
     "• <b>Kurulum:</b> Tesis/depo/lokasyon(toplu üret) → ürün+birim+barkod → cari+zincir → operasyon tipi konfig", BODY)
gap(6)
para("Tanım Kırılımları", H2)
story.append(htable(["Alan","Kırılım"],
    [["Tenant","Firma → Tesis → Depo → Alan → Lokasyon (ağaç)"],
     ["Ürün","Ürün → Grup → Alt-Grup → Ölçü Birimi → Birim Barkodu → Çoklu Barkod"],
     ["Cari","Cari → Grup → Bölge → Zincir (üst/alt müşteri)"],
     ["Barkod","Müşteri/üretim barkodu parse kuralı (regex/ifade)"]],
    [26*mm, CW-26*mm], header_bg=TEAL))

story.append(PageBreak())
para("6. Yol Haritası — Fazlar", H1)
para("Durum: yeşil = tamamlandı · mavi = sıradaki · gri = ileride", BODY)
gap(2)
story.append(phase_diagram())
gap(8)
para("Bilinçli Kapsam Dışı", H2)
para("• Ayrı satınalma DB'sinin birleştirilmesi (kullanıcı: \"ileride\")  • reverseOperationTypeId → ters-belge üretme pattern'i  "
     "• batchAssignment / materialBasedCollection (niş flag'ler)  • Cari hesap defteri · muhasebe/GL · maliyet  • AI modülü (en sonda)", BODY)
gap(8)
para("Çalıştırma", H2)
run = ('1) DB: <font name="Sans-B">cd E:\\onegate &amp;&amp; docker compose up -d</font><br/>'
       '2) API (:3000): <font name="Sans-B">npm run dev</font>  — kontrat: http://localhost:3000/docs<br/>'
       '3) UI (:5173): <font name="Sans-B">cd web &amp;&amp; npm run dev</font><br/>'
       'Tarayıcı: http://localhost:5173 → admin / admin123 (super) · operator / operator123 · viewer / viewer123')
story.append(Table([[Paragraph(run, S("run", fontSize=9, leading=15))]], colWidths=[CW],
    style=TableStyle([("BACKGROUND",(0,0),(-1,-1),LIGHT),("BOX",(0,0),(-1,-1),0.6,BLUE),
                      ("LEFTPADDING",(0,0),(-1,-1),10),("RIGHTPADDING",(0,0),(-1,-1),10),
                      ("TOPPADDING",(0,0),(-1,-1),8),("BOTTOMPADDING",(0,0),(-1,-1),8)])))

# ---------- BUILD ----------
out = os.path.join(os.path.dirname(__file__), "OneGate-WMS-Genel-Cerceve.pdf")
doc = BaseDocTemplate(out, pagesize=A4, leftMargin=MX, rightMargin=MX, topMargin=18*mm, bottomMargin=18*mm,
                      title="OneGate WMS — Genel Çerçeve", author="OneGate / 4Simple")
frame = Frame(MX, 16*mm, CW, PAGE_H-34*mm, id="main")
doc.addPageTemplates([PageTemplate(id="cover", frames=[frame], onPage=cover),
                      PageTemplate(id="later", frames=[frame], onPage=later)])
def on_first(canv, d): pass
# kapak ilk sayfa, sonra later
from reportlab.platypus.doctemplate import NextPageTemplate
story2 = [NextPageTemplate("later")] + story
doc.build(story2)
print("PDF:", out)
