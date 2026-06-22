# STOKBAR_UNI - Cekirdek Tablolar (mimari) - tam kolon dokumu
> 2026-06-20 07:20 - belge trio + stok + palet + URUN/MUSTERI master

## TBLSBBELGEBASLIK (29 kolon)

| Kolon | Tip | Null | PK |
|---|---|---|---|
| LNGKOD | int |  | PK |
| TXTKOD | nvarchar(20) |  |  |
| LNGDISTKOD | int | N |  |
| LNGOPERASYONTIPKOD | int |  |  |
| LNGCARIKOD | int | N |  |
| BYTBELGEDURUM | tinyint | N |  |
| TXTSIPARISNO | nvarchar(256) | N |  |
| TXTIRSALIYENO | nvarchar(20) | N |  |
| TXTREFBELGENO | nvarchar(256) | N |  |
| LNGREFBELGENO | int | N |  |
| TXTGRUPNO | nvarchar(20) | N |  |
| TRHSEVKIYATTARIHI | datetimeoffset | N |  |
| TRHONAYTARIHI | datetimeoffset | N |  |
| BYTPARAMBOLUNMUS | tinyint | N |  |
| TXTPLAKANO | nvarchar(20) | N |  |
| TXTNAKLIYEFIRMA | nvarchar(50) | N |  |
| BYTTIRSIRANO | tinyint | N |  |
| TXTACIKLAMA | nvarchar(256) | N |  |
| BYTARSIV | tinyint |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |
| LNGILKKULLANICIKOD | int | N |  |
| LNGSONKULLANICIKOD | int | N |  |
| BYTONAYDURUMU | tinyint | N |  |
| LNGBOLUNENBELGENO | int | N |  |
| BYTONAYASAMA | tinyint |  |  |
| TXTUSTPALETNO | nvarchar(20) | N |  |
| LNGOPERASYONNEDENKOD | int | N |  |
| TXTSEFERNO | nvarchar(20) | N |  |

## TBLSBBELGEKAPSAM (29 kolon)

| Kolon | Tip | Null | PK |
|---|---|---|---|
| LNGKOD | int |  | PK |
| LNGBASLIKKOD | int |  |  |
| LNGDETAYKOD | int |  |  |
| LNGKAPSAMKOD | int |  |  |
| DBLMIKTAR | decimal(28,8) |  |  |
| LNGOLCUBIRIMKOD | int |  |  |
| DBLNETAGIRLIK | decimal(28,8) | N |  |
| LNGAGIRLIKOLCUBIRIMKOD | int | N |  |
| TXTPALETNO | nvarchar(20) | N |  |
| TXTBATCHNO | nvarchar(50) | N |  |
| TXTSERINO | nvarchar(50) | N |  |
| TXTPO | nvarchar(50) | N |  |
| TXTPOLINE | nvarchar(50) | N |  |
| LNGKAMYON | int | N |  |
| TRHSONKULLANMATARIHI | date | N |  |
| TRHURETIMTARIHI | date | N |  |
| LNGOPERASYONNEDENKOD | int | N |  |
| BYTARSIV | tinyint |  | PK |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |
| LNGILKKULLANICIKOD | int | N |  |
| LNGSONKULLANICIKOD | int | N |  |
| LNGCARIKOD | int | N |  |
| LNGKAYNAKLOKASYONKOD | int | N |  |
| LNGHEDEFLOKASYONKOD | int | N |  |
| LNGKAYNAKSTATU | int | N |  |
| LNGHEDEFSTATU | int | N |  |
| LNGREZERVEBELGEKOD | int | N |  |
| LNGREZERVEBELGETIPKOD | int | N |  |

## TBLSBBELGEDETAY (33 kolon)

| Kolon | Tip | Null | PK |
|---|---|---|---|
| LNGKOD | int |  | PK |
| LNGBASLIKKOD | int |  |  |
| LNGDETAYKOD | int |  |  |
| LNGMALZEMEKOD | int |  |  |
| DBLISLEMMIKTARI | decimal(28,8) |  |  |
| LNGISLEMOLCUBIRIMKOD | int |  |  |
| DBLANAMIKTAR | decimal(28,8) |  |  |
| LNGANAOLCUBIRIMKOD | int |  |  |
| DBLTOPLANANMIKTAR | decimal(28,8) | N |  |
| DBLNETAGIRLIK | decimal(28,8) | N |  |
| LNGAGIRLIKOLCUBIRIMKOD | int | N |  |
| TXTKAYNAKBATCHNO | nvarchar(50) | N |  |
| TXTHEDEFBATCHNO | nvarchar(50) | N |  |
| TXTSERINO | nvarchar(50) | N |  |
| LNGKAYNAKLOKASYONKOD | int | N |  |
| LNGHEDEFLOKASYONKOD | int | N |  |
| LNGKAYNAKSTATU | int | N |  |
| LNGHEDEFSTATU | int | N |  |
| TXTPALETNO | nvarchar(20) | N |  |
| LNGMUADILBAGLANTI | int | N |  |
| LNGANAURUNKOD | int | N |  |
| TXTPO | nvarchar(50) | N |  |
| TXTPOLINE | nvarchar(50) | N |  |
| BYTARSIV | tinyint |  | PK |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |
| LNGILKKULLANICIKOD | int | N |  |
| LNGSONKULLANICIKOD | int | N |  |
| TXTREFBELGEDETAYNO | nvarchar(50) | N |  |
| BYTPARAMBOLUNEMEZ | tinyint |  |  |
| DBLHAZIRLANANMIKTAR | decimal(28,8) | N |  |
| LNGANADETAYKOD | int | N |  |
| TRHTESLIMTARIHI | datetime | N |  |

## TBLSBSTOKDURUM (23 kolon)

| Kolon | Tip | Null | PK |
|---|---|---|---|
| LNGKOD | int |  | PK |
| LNGLOKASYONKOD | int |  |  |
| LNGMALZEMEKOD | int |  |  |
| LNGSTATUKOD | int |  |  |
| TXTBATCHNO | nvarchar(50) | N |  |
| TXTSERINO | nvarchar(50) | N |  |
| TXTPO | nvarchar(50) | N |  |
| TXTPOLINE | nvarchar(50) | N |  |
| LNGPALETID | int | N |  |
| LNGMUSTERIKOD | int | N |  |
| DBLANAMIKTAR | decimal(28,8) | N |  |
| DBLREZERVEMIKTAR | decimal(28,8) | N |  |
| LNGANAOLCUBIRIMI | int | N |  |
| DBLNETAGIRLIK | decimal(28,8) | N |  |
| DBLBRUTAGIRLIK | decimal(28,8) | N |  |
| LNGAGIRLIKOLCUBIRIMI | int | N |  |
| TRHSONKULLANMATARIHI | date | N |  |
| TRHURETIMTARIHI | date | N |  |
| LNGREZERVEBELGEKOD | int | N |  |
| LNGREZERVEBELGETIPKOD | int | N |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |
| DBLBRUTAGRLIK | decimal(28,8) | N |  |

## TBLSBPALET (18 kolon)

| Kolon | Tip | Null | PK |
|---|---|---|---|
| LNGKOD | int |  | PK |
| BYTAKTIF | tinyint |  |  |
| TXTPALETNO | nvarchar(20) |  |  |
| LNGPALETTIPIKOD | int |  |  |
| LNGREZERVEBELGETIPKOD | int | N |  |
| LNGURETIMREFERANSKOD | int | N |  |
| LNGUSTPALETKOD | int | N |  |
| DBLORJINALMIKTAR | decimal(28,8) | N |  |
| LNGANAOLCUBIRIMI | int | N |  |
| LNGANAPALETKOD | int | N |  |
| BYTARSIV | tinyint |  | PK |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |
| LNGILKKULLANICIKOD | int | N |  |
| LNGSONKULLANICIKOD | int | N |  |
| TRHURETIMTARIHI | date | N |  |
| TRHSONKULLANMATARIHI | date | N |  |
| TXTBEACONID | nvarchar(100) | N |  |

## TBLURUN (131 kolon)

| Kolon | Tip | Null | PK |
|---|---|---|---|
| LNGKOD | int |  | PK |
| TXTKOD | varchar(50) | N |  |
| TXTAD | nvarchar(120) |  |  |
| TXTKISAAD | nvarchar(25) | N |  |
| TXTURUNGRUPKOD | varchar(10) |  |  |
| TXTURUNEKGRUPKOD | varchar(20) | N |  |
| LNGHIYERARSI1 | int |  |  |
| LNGHIYERARSI2 | int | N |  |
| TXTURETICIKODU | varchar(2000) | N |  |
| TXTBIRIM1 | nvarchar(4) |  |  |
| TXTBARKOD1 | varchar(17) | N |  |
| TXTBIRIM2 | varchar(10) |  |  |
| TXTBARKOD2 | varchar(17) | N |  |
| DBLCEVRIM2 | decimal(28,8) | N |  |
| TXTBIRIM3 | varchar(10) |  |  |
| TXTBARKOD3 | varchar(17) | N |  |
| DBLCEVRIM3 | decimal(28,8) | N |  |
| DBLKDVORAN | decimal(28,8) | N |  |
| BYTURUNTIP | tinyint | N |  |
| BYTDURUM | tinyint | N |  |
| DBLAGIRLIK | decimal(28,8) | N |  |
| DBLHACIM | decimal(28,8) | N |  |
| BYTEMANET | tinyint | N |  |
| BYTHESAPKAPATMA | tinyint | N |  |
| BYTRAKIP | tinyint | N |  |
| BYTKAPAK | tinyint | N |  |
| BYTKAPAKKRITERTIPI | tinyint | N |  |
| TXTKAPAKKRITERI | varchar(20) | N |  |
| LNGHHCSIRA | int | N |  |
| BYTAGIRLIK | tinyint | N |  |
| DBLLITRE | decimal(28,8) | N |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |
| TXTSONISLEMHOST | varchar(50) | N |  |
| BYTURUNBIRIM | tinyint | N |  |
| TXTBIRIM4 | varchar(10) |  |  |
| TXTBARKOD4 | varchar(17) | N |  |
| DBLCEVRIM4 | decimal(28,8) | N |  |
| TXTBIRIM5 | varchar(10) |  |  |
| TXTBARKOD5 | varchar(17) | N |  |
| DBLCEVRIM5 | decimal(28,8) | N |  |
| BYTUYGULAMAYERI | tinyint |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |
| LNGILKKULLANICIKOD | int | N |  |
| LNGSONKULLANICIKOD | int | N |  |
| LNGDISTKOD | int | N |  |
| TXTREFERANS | nvarchar(100) | N |  |
| LNGEN | decimal(28,8) | N |  |
| LNGBOY | decimal(28,8) | N |  |
| LNGYUKSEKLIK | decimal(28,8) | N |  |
| TXTGTIP | nvarchar(30) | N |  |
| LNGKDVORANALIS | decimal(28,8) | N |  |
| LNGALKOLORANI | decimal(28,8) | N |  |
| BYTSERITAKIPVARMI | tinyint |  |  |
| BYTKOMISYONUYGULA | tinyint |  |  |
| BYTKDVHESAPLAMA | tinyint |  |  |
| BYTOTVOIV | tinyint |  |  |
| LNGRAFOMRUSURESI | smallint | N |  |
| BYTRAFOMRUBIRIM | tinyint | N |  |
| TXTOZELKOD | varchar(24) | N |  |
| LNGMERKEZKOD | int | N |  |
| TXTURUNACIKLAMA | nvarchar(120) | N |  |
| LNGDETAYTIPI | int | N |  |
| LNGURUNTIPI | int | N |  |
| TXTDENETCI | nvarchar(4) | N |  |
| BYTISKPROMUAF | tinyint |  |  |
| BYTTEVKIFATUYGULANSIN | tinyint | N |  |
| DBLMAXAGIRLIK1 | decimal(28,8) | N |  |
| DBLMAXAGIRLIK2 | decimal(28,8) | N |  |
| DBLMAXAGIRLIK3 | decimal(28,8) | N |  |
| DBLMAXAGIRLIK4 | decimal(28,8) | N |  |
| BYTRFCHECKAKTARIM | tinyint | N |  |
| IMGFOTO1 | image | N |  |
| IMGFOTO2 | image | N |  |
| BYTTUTARDANMIKTARHESAPLA | tinyint | N |  |
| BYTVERSIPARISI | tinyint | N |  |
| BINDOCUMENT | varbinary | N |  |
| TXTDOCUMENTTITLE | varchar(255) | N |  |
| IMGFOTO3 | image | N |  |
| IMGFOTO4 | image | N |  |
| BYTONAY | tinyint |  |  |
| LNGISAKISKOD | int | N |  |
| BYTSERICHECKDIGIT | tinyint | N |  |
| BYTSERITAKIPTIP | tinyint |  |  |
| BYTRAFOMRU | tinyint | N |  |
| LNGRAFOMRUDEGER | int | N |  |
| TXTVIDEOPATH | nvarchar(max) | N |  |
| BYTSOZLESMELIURUN | tinyint |  |  |
| DBLMINAGIRLIK | decimal(28,8) | N |  |
| DBLMAXAGIRLIK | decimal(28,8) | N |  |
| DBLMAXISKORAN | decimal(28,8) | N |  |
| DBLMAXISKTUTAR | decimal(28,8) | N |  |
| TXTKOD2 | nvarchar(100) | N |  |
| LNGSERIKARAKTERSAYISI | int | N |  |
| BYTPARAKART | tinyint |  |  |
| BYTALISSIPPALETBIRIM | tinyint | N |  |
| BYTALISSIPSIRABIRIM | tinyint | N |  |
| DBLALISSIPPALETMIKTAR | decimal(28,8) | N |  |
| DBLALISSIPSIRAMIKTAR | decimal(28,8) | N |  |
| BYTSATSIPKONTROLBRM | tinyint | N |  |
| BYTGARANTI | tinyint |  |  |
| LNGGARANTISUREDEGER | int | N |  |
| BYTGARANTISURE | tinyint | N |  |
| BYTMOTORTAKIPYAPILSIN | tinyint |  |  |
| TRHSONISLEMTARIHIVERSIPARISI | datetimeoffset | N |  |
| BYTKURULUMMONTAJGEREKLI | tinyint | N |  |
| BYTVERSIPARISISTOKKONTROLTIPI | tinyint |  |  |
| BYTDIKDURMA | tinyint | N |  |
| BYTISTIFLENEMEZ | tinyint | N |  |
| BYTHAVUZDANBARKODTAKIBIYAPILACAK | tinyint | N |  |
| BYTOPSIYON | tinyint | N |  |
| LNGOPSIYONGRUPKOD | int | N |  |
| LNGMINALISSIPMIKTAR | int | N |  |
| DBLMOTORCALISMASAAT | decimal(28,8) | N |  |
| DBLKILOMETRE | decimal(28,8) | N |  |
| BYTMINALISSIPBIRIM | tinyint | N |  |
| BYTFARKLITEDARIKCI | tinyint | N |  |
| BYTYUKLEMEONDEGERI | tinyint | N |  |
| BYTSATISMIKKATLARIUYGULANSIN | tinyint | N |  |
| DBLMINSATISMIKTARI | decimal(28,8) | N |  |
| TXTULKEKODU | nvarchar(2) | N |  |
| BYTEOTVTIP | tinyint | N |  |
| DBLKOLIICIADET | decimal(28,8) | N |  |
| BYTDETAYTAKIBIYAPILSIN | tinyint | N |  |
| BYTGARANTIUZATMA | tinyint | N |  |
| LNGGARANTIUZATMASURESIAY | int | N |  |
| DBLEKAGIRLIK | decimal(28,8) | N |  |
| BYTEKAGIRLIKBIRIM | tinyint | N |  |
| BYTSUBEGERIODEMEYAPILACAKMI | tinyint | N |  |
| TXTRESIMPATH | nvarchar(max) | N |  |
| BYTVERSIPARISIURUN | tinyint |  |  |
| TXTURUNEKACIKLAMA | nvarchar(max) | N |  |

## TBLMUSTERI (184 kolon)

| Kolon | Tip | Null | PK |
|---|---|---|---|
| LNGKOD | int |  | PK |
| TXTKOD | varchar(50) | N |  |
| LNGDISTKOD | int | N |  |
| LNGERPKOD | int | N |  |
| TXTERPKOD | varchar(18) | N |  |
| TXTUNVAN | nvarchar(250) |  |  |
| TXTILGILIKISI | nvarchar(50) | N |  |
| TXTILGILIKISI2 | nvarchar(50) | N |  |
| TXTADRES1 | nvarchar(2200) | N |  |
| TXTADRES2 | nvarchar(500) | N |  |
| TXTSEHIR | nvarchar(50) | N |  |
| TXTILCE | nvarchar(50) | N |  |
| TXTPOSTAKOD | varchar(50) | N |  |
| TXTULKE | nvarchar(50) | N |  |
| TXTTELEFON | varchar(50) | N |  |
| TXTTELEFON2 | varchar(50) | N |  |
| TXTCEPTELNO | nvarchar(50) | N |  |
| TXTFAKS | nvarchar(50) | N |  |
| TXTVD | nvarchar(50) | N |  |
| TXTVN | nvarchar(50) | N |  |
| TXTTCKIMLIKNO | nvarchar(50) | N |  |
| TXTGRUPKOD | varchar(50) | N |  |
| TXTEKGRUPKOD | varchar(50) | N |  |
| DBLISKONTOORAN | decimal(28,8) | N |  |
| BYTVADEGUN | tinyint | N |  |
| CRRKREDILIMIT1 | decimal(28,8) | N |  |
| CRRKREDILIMIT2 | decimal(28,8) | N |  |
| DBLCARPAN1 | decimal(28,8) | N |  |
| DBLCARPAN2 | decimal(28,8) | N |  |
| BYTMERKEZEFATURALA | tinyint | N |  |
| BYTMUSTERISTOKKODU | tinyint | N |  |
| BYTDURUM | tinyint | N |  |
| TXTCADDE | nvarchar(500) | N |  |
| TXTSOKAK | nvarchar(500) | N |  |
| TXTRUHSATDAIRE | nvarchar(25) | N |  |
| TXTRUHSATNO | nvarchar(25) | N |  |
| TXTKAPINO | nvarchar(500) | N |  |
| TXTERPBOLGEKOD | varchar(10) | N |  |
| TXTKISAAD | nvarchar(30) | N |  |
| BYTMAXISKONTOKONT | tinyint | N |  |
| BYTFIYATYETKI | tinyint | N |  |
| BYTMAGAZASIPBIRLESTIR | tinyint | N |  |
| BYTMAGAZABASIM | tinyint | N |  |
| TXTEMAIL | nvarchar(512) | N |  |
| TXTWWW | nvarchar(50) | N |  |
| TXTBARKOD | varchar(16) | N |  |
| BYTRUT | tinyint |  |  |
| LNGBOLGEKOD | int | N |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |
| TXTSONISLEMHOST | varchar(50) | N |  |
| TXTMERKEZKOD | varchar(20) | N |  |
| BYTILKOD | tinyint | N |  |
| LNGILCEKOD | int | N |  |
| BYTKDVMUAF | tinyint | N |  |
| BYTTIP | tinyint |  |  |
| TXTOZELKOD | varchar(20) | N |  |
| TXTMAHALLE | nvarchar(250) | N |  |
| TXTDIGER | nvarchar(100) | N |  |
| BYTSEMTKOD | tinyint | N |  |
| TRHACILIS | datetimeoffset | N |  |
| TRHKAPANIS | datetimeoffset | N |  |
| BYTMERKEZILKOD | tinyint | N |  |
| LNGMERKEZILCEKOD | int | N |  |
| LNGMERKEZSEMTKOD | int | N |  |
| LNGYONETIMHIYERARSI1 | int | N |  |
| LNGYONETIMHIYERARSI2 | int | N |  |
| BYTUYGULAMAYERI | tinyint |  |  |
| BYTMERKEZDEN | tinyint | N |  |
| LNGDAGITIMSIRASI | int | N |  |
| LNGOZELURUNKOD | int | N |  |
| BYTCAKISMAKONTROLU | tinyint | N |  |
| DBLKOORDINATX | decimal(28,8) | N |  |
| DBLKOORDINATY | decimal(28,8) | N |  |
| LNGHARITAKOD | int | N |  |
| BYTCEKRISKORAN | tinyint | N |  |
| BYTSENETRISKORAN | tinyint | N |  |
| BYTONAY | tinyint |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |
| LNGILKKULLANICIKOD | int | N |  |
| LNGSONKULLANICIKOD | int | N |  |
| TXTREFERANS | nvarchar(100) | N |  |
| BYTODEMETIPI | tinyint |  |  |
| BYTCALISMATIP | tinyint |  |  |
| LNGISAKISKOD | int | N |  |
| LNGCEKVADEGUN | int | N |  |
| IMGFOTO1 | image | N |  |
| IMGFOTO2 | image | N |  |
| LNGVERGIDAIRESIKOD | int | N |  |
| LNGIPTALNEDEN | int | N |  |
| TXTPASAPORTNO | nvarchar(50) | N |  |
| TXTGRUPKIRILIMKOD | nvarchar(10) | N |  |
| BYTRFCHECKAKTARIM | tinyint | N |  |
| LNGSATISFATURAKOTA | int | N |  |
| BYTFATURAKAPATMA | tinyint | N |  |
| BYTVERSIPARISI | tinyint | N |  |
| TXTODEMETIP | nvarchar(40) |  |  |
| BYTEFATURA | tinyint | N |  |
| BYTIPTALONAY | tinyint |  |  |
| BYTGPSISLEMYAP | tinyint |  |  |
| BYTTESLIMATMUSTERISI | tinyint | N |  |
| LNGONCELIKSIRA | int | N |  |
| BYTPALETLI | tinyint | N |  |
| BYTGUNLUKSIFMUAF | tinyint | N |  |
| BYTYILLIKSIFMUAF | tinyint | N |  |
| BYTSTSIFMUAF | tinyint | N |  |
| BYTGONDERIMTIP | tinyint | N |  |
| LNGTESLIMATSEKLIKOD | int | N |  |
| BYTDOVIZTIP | tinyint | N |  |
| BYTILETISIMIZNI | tinyint | N |  |
| BYTKAYITIZNI | tinyint | N |  |
| BYTCINSIYET | tinyint | N |  |
| TXTMINSERVISZAMANI | nvarchar(10) | N |  |
| TXTMAXSERVISZAMANI | nvarchar(10) | N |  |
| TXTARACKISITLAMA | nvarchar(200) | N |  |
| BYTALISSIPYUKLEMEKONTROL | tinyint | N |  |
| BYTFIYATSIZIRSALIYEBASIM | tinyint | N |  |
| BYTYASALTAKIP | tinyint | N |  |
| BYTSIPARACYUKOLUSACAKBELGE | tinyint | N |  |
| BYTISEMRI | tinyint | N |  |
| LNGDTGUN | int | N |  |
| LNGDTAY | int | N |  |
| LNGDTYIL | int | N |  |
| TRHSONISLEMTARIHIVERSIPARISI | datetimeoffset | N |  |
| LNGGARANTISURE | int | N |  |
| BYTGARANTISURE | tinyint |  |  |
| LNGSAKLAMAADET | int | N |  |
| LNGSOKMETAKMAADET | int | N |  |
| LNGTEKILMUSTERIKOD | int | N |  |
| TXTONAYKOD | nvarchar(10) | N |  |
| BYTKAYITIZNIONAY | tinyint | N |  |
| BYTTEMELTICARI | tinyint | N |  |
| BYTGPSISLEMMUAF | tinyint | N |  |
| TXTSMSCUSTOMERID | nvarchar(50) | N |  |
| LNGDOVIZTIP | int | N |  |
| BYTEIRSALIYE | tinyint | N |  |
| BYTTEVKIFATUYGULANSIN | tinyint | N |  |
| BYTSIPARISYUKLEMETIPI | tinyint | N |  |
| UIDGUIDKOD | uniqueidentifier | N |  |
| LNGMAHALLEKOD | int | N |  |
| LNGCADDESKKOD | int | N |  |
| LNGKAPINOKOD | int | N |  |
| LNGPOSTAKOD | int | N |  |
| LNGMOBILHIZMETADEDI | int | N |  |
| TXTASILALICIUNVAN | nvarchar(250) | N |  |
| TXTASILALICIVERGINO | nvarchar(50) | N |  |
| TXTASILALICIADRES | nvarchar(250) | N |  |
| TRHZIYARETSAATI | datetimeoffset | N |  |
| TRHZIYARETSAATIBITIS | datetimeoffset | N |  |
| LNGZIYARETSURE | int | N |  |
| BYTHAFTAKOD | tinyint | N |  |
| BYTGUNKOD | tinyint | N |  |
| TXTTEKILKOD | varchar(30) | N |  |
| TXTASILALICIVERGIDAIRESI | nvarchar(50) | N |  |
| TXTASILSATICIUNVAN | nvarchar(250) | N |  |
| TXTASILSATICIVERGINO | nvarchar(50) | N |  |
| TXTASILSATICIADRES | nvarchar(250) | N |  |
| TXTASILSATICIVERGIDAIRESI | nvarchar(50) | N |  |
| TXTEIRSALIYEVARSAYILANPK | nvarchar(255) | N |  |
| TXTEFATURAVARSAYILANPK | nvarchar(255) | N |  |
| BYTMUSTSIPNOZORUNLU | tinyint | N |  |
| BYTCEKVADEKONTROLU | tinyint | N |  |
| BYTKAMU | tinyint | N |  |
| TXTEKVN | nvarchar(50) | N |  |
| TXTULUSALTICARIKOD | nvarchar(250) | N |  |
| TRHRUHSATGECERLILIK | date | N |  |
| BYTMUSTERIANLASMADURUMU | tinyint | N |  |
| BYTKOOPERATIFMUSTERISI | tinyint | N |  |
| BYTCRMONAYDURUMU | tinyint | N |  |
| TXTRETNEDEN | varchar(max) | N |  |
| LNGCPKULLANICIKOD | int | N |  |
| LNGILKOD | int | N |  |
| LNGMERKEZILKOD | int | N |  |
| BYTSEVKGUNU | tinyint | N |  |
| LNGISTISNAKOD | int | N |  |
| BYTKAMPANYALARDANHARICTUT | tinyint | N |  |
| BYTSEVKVEFATURAADRESAYNI | tinyint | N |  |
| TXTEKBILGI1 | nvarchar(100) | N |  |
| TXTEKBILGI2 | nvarchar(100) | N |  |
| TXTEKBILGI3 | nvarchar(100) | N |  |
| BYTVERSIPARISIMUSTERI | tinyint |  |  |
| BYTSATAMAMAGPSMUAF | tinyint | N |  |
| BYTTRAXGIRIS | tinyint | N |  |
| BYTTRAXZORUNLUFREKANSI | tinyint | N |  |
| BYTPOSMLIMITMUAF | tinyint | N |  |
