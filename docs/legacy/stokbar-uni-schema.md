# STOKBAR_UNI - Legacy Sema Dokumu (referans 71 WMS tablosu)

> Kaynak: TEKINOKTAY\SQLEXPRESS / STOKBAR_UNI - 2026-06-20 05:40
> PK=birincil anahtar, N=nullable. Tip = SQL Server gercek tipi.

## TBLSBALAN  (9 kolon, 4 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| TXTKOD | nvarchar(20) | N |  |  |
| LNGDISTKOD | int | N |  |  |
| LNGDEPOKOD | int | N |  |  |
| TXTTANIMI | nvarchar(50) | N |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |

## TBLSBDEPO  (9 kolon, 2 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| TXTKOD | nvarchar(20) | N |  |  |
| LNGDISTKOD | int | N |  |  |
| TXTTANIMI | nvarchar(50) | N |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| LNGTEDARIKCIMUSTERI | int | N |  |  |

## TBLSBBARKODTIPI  (9 kolon, 1 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| TXTKOD | nvarchar(5) |  |  |  |
| TXTSCRIPT | ntext |  |  |  |
| LNGDISTKOD | int | N |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| BYTURETIMBARKOD | tinyint | N |  |  |

## TBLSBBELGEBASLIK  (29 kolon, 677 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| TXTKOD | nvarchar(20) |  |  |  |
| LNGDISTKOD | int | N |  |  |
| LNGOPERASYONTIPKOD | int |  |  |  |
| LNGCARIKOD | int | N |  |  |
| BYTBELGEDURUM | tinyint | N |  |  |
| TXTSIPARISNO | nvarchar(256) | N |  |  |
| TXTIRSALIYENO | nvarchar(20) | N |  |  |
| TXTREFBELGENO | nvarchar(256) | N |  |  |
| LNGREFBELGENO | int | N |  |  |
| TXTGRUPNO | nvarchar(20) | N |  |  |
| TRHSEVKIYATTARIHI | datetimeoffset | N |  |  |
| TRHONAYTARIHI | datetimeoffset | N |  |  |
| BYTPARAMBOLUNMUS | tinyint | N |  |  |
| TXTPLAKANO | nvarchar(20) | N |  |  |
| TXTNAKLIYEFIRMA | nvarchar(50) | N |  |  |
| BYTTIRSIRANO | tinyint | N |  |  |
| TXTACIKLAMA | nvarchar(256) | N |  |  |
| BYTARSIV | tinyint |  |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| BYTONAYDURUMU | tinyint | N |  |  |
| LNGBOLUNENBELGENO | int | N |  |  |
| BYTONAYASAMA | tinyint |  |  | ((0)) |
| TXTUSTPALETNO | nvarchar(20) | N |  |  |
| LNGOPERASYONNEDENKOD | int | N |  |  |
| TXTSEFERNO | nvarchar(20) | N |  |  |

## TBLSBBELGEBASLIKEKSAHA  (9 kolon, 0 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGEKSAHAKODU | int |  | PK |  |
| TXTEKSAHAACIKLAMA | nvarchar(300) | N |  |  |
| BYTARSIV | tinyint |  |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| TXTSONISLEMHOST | nvarchar(50) | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| LNGBAGLANTIKOD | int |  | PK |  |

## TBLSBBELGEDETAY  (33 kolon, 2180 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| LNGBASLIKKOD | int |  |  |  |
| LNGDETAYKOD | int |  |  |  |
| LNGMALZEMEKOD | int |  |  |  |
| DBLISLEMMIKTARI | decimal(28,8) |  |  |  |
| LNGISLEMOLCUBIRIMKOD | int |  |  |  |
| DBLANAMIKTAR | decimal(28,8) |  |  |  |
| LNGANAOLCUBIRIMKOD | int |  |  |  |
| DBLTOPLANANMIKTAR | decimal(28,8) | N |  |  |
| DBLNETAGIRLIK | decimal(28,8) | N |  |  |
| LNGAGIRLIKOLCUBIRIMKOD | int | N |  |  |
| TXTKAYNAKBATCHNO | nvarchar(50) | N |  |  |
| TXTHEDEFBATCHNO | nvarchar(50) | N |  |  |
| TXTSERINO | nvarchar(50) | N |  |  |
| LNGKAYNAKLOKASYONKOD | int | N |  |  |
| LNGHEDEFLOKASYONKOD | int | N |  |  |
| LNGKAYNAKSTATU | int | N |  |  |
| LNGHEDEFSTATU | int | N |  |  |
| TXTPALETNO | nvarchar(20) | N |  |  |
| LNGMUADILBAGLANTI | int | N |  |  |
| LNGANAURUNKOD | int | N |  |  |
| TXTPO | nvarchar(50) | N |  |  |
| TXTPOLINE | nvarchar(50) | N |  |  |
| BYTARSIV | tinyint |  | PK |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| TXTREFBELGEDETAYNO | nvarchar(50) | N |  |  |
| BYTPARAMBOLUNEMEZ | tinyint |  |  |  |
| DBLHAZIRLANANMIKTAR | decimal(28,8) | N |  | ((0)) |
| LNGANADETAYKOD | int | N |  |  |
| TRHTESLIMTARIHI | datetime | N |  |  |

## TBLSBBELGEDETAYEKSAHA  (9 kolon, 0 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGEKSAHAKODU | int |  | PK |  |
| TXTEKSAHAACIKLAMA | nvarchar(240) | N |  |  |
| BYTARSIV | tinyint |  |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| TXTSONISLEMHOST | nvarchar(50) | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| LNGBAGLANTIKOD | int |  | PK |  |

## TBLSBBELGEDURUM  (8 kolon, 5 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| TXTKOD | nvarchar(10) |  |  |  |
| TXTTANIMI | nvarchar(50) | N |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| BYTRENK | tinyint |  |  | ((0)) |

## TBLSBBELGEKAPSAM  (29 kolon, 2121 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| LNGBASLIKKOD | int |  |  |  |
| LNGDETAYKOD | int |  |  |  |
| LNGKAPSAMKOD | int |  |  |  |
| DBLMIKTAR | decimal(28,8) |  |  |  |
| LNGOLCUBIRIMKOD | int |  |  |  |
| DBLNETAGIRLIK | decimal(28,8) | N |  |  |
| LNGAGIRLIKOLCUBIRIMKOD | int | N |  |  |
| TXTPALETNO | nvarchar(20) | N |  |  |
| TXTBATCHNO | nvarchar(50) | N |  |  |
| TXTSERINO | nvarchar(50) | N |  |  |
| TXTPO | nvarchar(50) | N |  |  |
| TXTPOLINE | nvarchar(50) | N |  |  |
| LNGKAMYON | int | N |  |  |
| TRHSONKULLANMATARIHI | date | N |  |  |
| TRHURETIMTARIHI | date | N |  |  |
| LNGOPERASYONNEDENKOD | int | N |  |  |
| BYTARSIV | tinyint |  | PK |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| LNGCARIKOD | int | N |  |  |
| LNGKAYNAKLOKASYONKOD | int | N |  |  |
| LNGHEDEFLOKASYONKOD | int | N |  |  |
| LNGKAYNAKSTATU | int | N |  |  |
| LNGHEDEFSTATU | int | N |  |  |
| LNGREZERVEBELGEKOD | int | N |  |  |
| LNGREZERVEBELGETIPKOD | int | N |  |  |

## TBLSBBELGEKAPSAMEKSAHA  (9 kolon, 0 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGEKSAHAKODU | int |  | PK |  |
| TXTEKSAHAACIKLAMA | nvarchar(100) | N |  |  |
| BYTARSIV | tinyint |  |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| TXTSONISLEMHOST | nvarchar(50) | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| LNGBAGLANTIKOD | int |  | PK |  |

## TBLSBBELGEONAYTIPI  (8 kolon, 18 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| LNGOPERASYONTIPKOD | int |  |  |  |
| BYTONAYTIPI | tinyint |  |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| BYTKONTROLTOPLAMA | tinyint | N |  |  |

## TBLSBBELGEPARAMETRE  (8 kolon, 0 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| LNGBELGETIPKOD | int |  |  |  |
| TXTDEGER | nvarchar(30) | N |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| BYTPARAMETRE | tinyint |  |  |  |

## TBLSBBIRIM  (8 kolon, 10 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| TXTKOD | nvarchar(50) | N |  |  |
| BYTBIRIMTIP | tinyint | N |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| TXTREFERANSKODU | nvarchar(25) | N |  |  |

## TBLSBCIKISKOSULPARAMETRE  (22 kolon, 0 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| BYTAKTIF | int |  |  |  |
| LNGCIKISKOSULTIPI | int |  |  |  |
| BYTCARIBAGLANTITIPI | tinyint | N |  |  |
| LNGCARIBAGLANTIKODU | int | N |  |  |
| BYTMALZEMEBAGLANTITIPI | tinyint | N |  |  |
| LNGMALZEMEBAGLANTIKODU | int | N |  |  |
| BYTKONTROLTIPI | tinyint |  |  |  |
| LNGKONTROLSAHASI | int |  |  |  |
| LNGTOLERANS | int | N |  |  |
| LNGYUZDEDEGER | int | N |  |  |
| BYTMESAJTIPI | tinyint |  |  |  |
| LNGSIRA | int |  |  |  |
| BYTKOSULKIRMA | tinyint |  |  |  |
| TXTSSP | ntext | N |  |  |
| BYTREZERVASYONFIFOYUEZSIN | tinyint | N |  |  |
| BYTONERILISTESIUYGULA | tinyint | N |  |  |
| TXTKONTROLTIPIACIKLAMA | nvarchar(50) | N |  |  |
| LNGDISTKOD | int |  |  |  |
| TXTONERISSP | nvarchar(100) | N |  |  |
| BYTHARIC | tinyint | N |  |  |
| LNGGUNSAYI | int | N |  |  |

## TBLSBCIKISKOSULTIPI  (8 kolon, 0 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| TXTKOD | nvarchar(10) |  |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| TXTACIKLAMA | nvarchar(50) | N |  |  |
| LNGDISTKOD | int |  |  |  |

## TBLSBEKRANRAPORBAGLANTI  (8 kolon, 1 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| TXTEKRANBUTONKOD | nvarchar(20) |  |  |  |
| TXTRAPORKOD | nvarchar(10) |  |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| LNGDISTKOD | int | N |  |  |

## TBLSBDEETIKETTIPI  (17 kolon, 5 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| TXTKOD | nvarchar(25) |  |  |  |
| LNGMENUGRUPKOD | int | N |  |  |
| TXTEKRANBASLIK | nvarchar(100) | N |  |  |
| BYTGOSTERIMTIP | tinyint |  |  |  |
| BYTRAPORTIP | tinyint |  |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| TXTETIKETADI | nvarchar(100) | N |  |  |
| LNGKOLON1SAYI | int | N |  |  |
| LNGKOLON2SAYI | int | N |  |  |
| LNGKOLON3SAYI | int | N |  |  |
| LNGKOLON1UZUNLUK | int | N |  |  |
| LNGKOLON2UZUNLUK | int | N |  |  |
| TXTSIFRE | nvarchar(50) | N |  |  |

## TBLSBDEEKRANBAGLANTI  (9 kolon, 0 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| TXTEKRANBUTTONKOD | nvarchar(30) | N |  |  |
| LNGETIKETTIPKOD | int |  |  |  |
| BYTKRITEREKRANIACILMASIN | tinyint |  |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| LNGPPCMENUKOD | int | N |  |  |

## TBLSBDEEKRANITEMBAGLANTI  (9 kolon, 0 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| TXTEKRANBUTTONKOD | nvarchar(30) | N |  |  |
| LNGSAHAKOD | int |  |  |  |
| LNGITEMKOD | int |  |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| LNGPPCMENUKOD | int | N |  |  |

## TBLSBDEEKRANSAHABAGLANTI  (7 kolon, 0 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| TXTEKRANBUTTONKOD | nvarchar(30) | N |  |  |
| TXTSAHAKOD | nvarchar(30) |  |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |

## TBLSBDEETIKETTIPIBUTTON  (16 kolon, 6 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| LNGETIKETTIPKOD | int |  |  |  |
| TXTBUTTONISIM | nvarchar(10) |  |  |  |
| BYTISLEV | tinyint |  |  |  |
| LNGSORGUKOD | int | N |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| LNGKONTROLSORGUKOD | int | N |  |  |
| BYTITEMCHANGETEKRAR | tinyint | N |  |  |
| LNGYAZMAPORT | int | N |  |  |
| LNGENTEGRASYONADRESKOD | int | N |  |  |
| TXTWEBMETOD | nvarchar(200) | N |  |  |
| BYTKONTROLSORGUTIP | tinyint | N |  | ((0)) |
| BYTEKRANKAPATILMASIN | tinyint | N |  |  |

## TBLSBDEETIKETTIPIITEM  (51 kolon, 44 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| LNGETIKETTIPKOD | int |  |  |  |
| TXTBASLIK | nvarchar(25) |  |  |  |
| BYTTIP | tinyint |  |  |  |
| TXTDIZAYNISIM | nvarchar(25) |  |  |  |
| TXTPAGESECTION | nvarchar(15) | N |  |  |
| LNGGORUNUMSIRA | int |  |  |  |
| BYTZORUNLU | tinyint |  |  |  |
| BYTDEGISTIRILEMEZ | tinyint |  |  |  |
| BYTGORUNUR | tinyint |  |  |  |
| BYTTEMIZLENSIN | tinyint |  |  |  |
| LNGGENISLIK | int | N |  |  |
| LNGMAXUZUNLUK | int | N |  |  |
| DBLNUMDEFAULTDEGER | decimal(18,8) | N |  |  |
| TXTCHARDEFAULTDEGER | nvarchar(25) | N |  |  |
| BYTDATETIMEFORMAT | tinyint |  |  |  |
| LNGREHBERKOD | int | N |  |  |
| BYTREHBERACIKLAMAGORUNSUN | tinyint | N |  |  |
| TXTCOMBOSORGU | ntext | N |  |  |
| BYTCHANGE | tinyint |  |  |  |
| TXTCHANGEID | nvarchar(15) | N |  |  |
| TXTCHANGESORGU | ntext | N |  |  |
| BYTAUTOLOAD | tinyint |  |  |  |
| TXTAUTOLOADID | nvarchar(25) | N |  |  |
| TXTAUTOLOADFIELDNAME | nvarchar(15) | N |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| BYTDIZAYNTIP | tinyint |  |  |  |
| BYTDATEDEFAULTBIRIM | tinyint | N |  |  |
| LNGDATEDEFAULTDEGER | int | N |  |  |
| LNGSAYACKOD | int | N |  |  |
| LNGPRINTSORGU | int | N |  |  |
| TXTGORUNUMISIM | nvarchar(30) |  |  |  |
| BYTENTERDADISABLEOLSUN | tinyint |  |  |  |
| LNGOKUMAPORT | int | N |  |  |
| LNGYAZMAPORT | int | N |  |  |
| BYTSIFRE | tinyint |  |  |  |
| BYTREHBERETESISKRITERIGECILSIN | tinyint |  |  | ((0)) |
| BYTBARCODEPARSE | tinyint |  |  | ((0)) |
| BYTCHANGEDISABLE | tinyint | N |  |  |
| TXTCHANGEDISABLEID | varchar(15) | N |  |  |
| TXTDISABLEID | nvarchar(15) | N |  |  |
| TXTDISABLEDEGER | nvarchar(100) | N |  |  |
| TXTAUTOPICTUREPATH | nvarchar(max) | N |  |  |
| TXTAUTOPICTURENAME | nvarchar(max) | N |  |  |
| TXTCHKDEGER | nvarchar(50) | N |  |  |
| TXTCHKNOTDEGER | nvarchar(50) | N |  |  |
| BYTRENK | tinyint | N |  |  |
| BYTBOLD | tinyint | N |  |  |

## TBLSBDEETIKETTIPISORGU  (10 kolon, 8 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| LNGETIKETTIPKOD | int |  |  |  |
| TXTKOD | nvarchar(10) |  |  |  |
| TXTSORGUBASLIK | ntext | N |  |  |
| TXTSORGUDETAY | ntext | N |  |  |
| TXTBAGLANTISAHA | nvarchar(100) | N |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |

## TBLSBEKSAHABAGLANTI  (9 kolon, 0 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| LNGKAYNAKEKSAHAKODU | int | N |  |  |
| LNGHEDEFEKSAHAKODU | int | N |  |  |
| LNGENTEGRASYONADRESKODU | int | N |  |  |
| TXTSAHAKODU | nvarchar(50) | N |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |

## TBLSBDEETIKETTIPIYETKI  (8 kolon, 38 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| LNGETIKETTIPKOD | int |  |  |  |
| BYTKULLANICIBAGLANTITIP | tinyint |  |  |  |
| LNGKULLANICIBAGLANTIKOD | int |  |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |

## TBLSBENTEKALANDONUSUM  (14 kolon, 0 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| LNGPARAMETREREFKOD | int |  |  |  |
| BYTBASLIKDETAY | tinyint |  |  |  |
| TXTALANADI | nvarchar(20) |  |  |  |
| TXTSBPALANADI | nvarchar(20) | N |  |  |
| TXTSBPONACIKLAMA | nvarchar(20) | N |  |  |
| BYTSBPEKALANTIPI | tinyint | N |  |  |
| TXTSBPEKALANKODU | nvarchar(20) | N |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| TXTSBPALANFORMAT | nvarchar(20) | N |  |  |
| TXTSBPSIRANO | nvarchar(50) | N |  |  |

## TBLSBENTEGRASYONSORGU  (9 kolon, 0 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| LNGPAKETKOD | int |  |  |  |
| BYTSORGUTIP | tinyint | N |  |  |
| TXTSORGU | ntext |  |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| TXTSIRALAMA | nvarchar(250) | N |  |  |

## TBLSBENTEGRASYONPAKET  (21 kolon, 0 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| TXTKOD | nvarchar(20) |  |  |  |
| BYTDBTIP | tinyint | N |  |  |
| TXTSUBE | nvarchar(10) | N |  |  |
| TXTSUNUCUADI | nvarchar(256) | N |  |  |
| TXTDBADI | nvarchar(50) | N |  |  |
| TXTDBADMINKULLANICI | nvarchar(20) | N |  |  |
| TXTDBADMINSIFRE | nvarchar(20) | N |  |  |
| TXTDBKULLANICI | nvarchar(20) | N |  |  |
| TXTDBSIFRE | nvarchar(20) | N |  |  |
| TXTKULLANICI | nvarchar(20) | N |  |  |
| TXTSIFRE | nvarchar(20) | N |  |  |
| BYTLOGLAMA | tinyint | N |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| BYTPAKETTIPI | tinyint |  |  |  |
| BYTLOGOVERSIYON | tinyint |  |  |  |
| TXTDONEM | nvarchar(2) | N |  |  |
| BYTCOKLUFIRMAAKTARIMI | tinyint |  |  |  |

## TBLSBENTEGRASYONADRES  (45 kolon, 9 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| LNGOPERASYONTIPKOD | int |  |  |  |
| LNGDISTKOD | int | N |  |  |
| TXTADRES | nvarchar(500) | N |  |  |
| TXTKULLANICI | nvarchar(50) | N |  |  |
| TXTSIFRE | nvarchar(50) | N |  |  |
| LNGPORT | int | N |  |  |
| TXTFIRMA | nvarchar(10) | N |  |  |
| TXTTANIMI | nvarchar(50) | N |  |  |
| BYTENTEGRASYON_SIRA | tinyint |  |  |  |
| BYTENTEGRASYONONAYDURUM | tinyint | N |  |  |
| TXTADRESISLENIYOR | nvarchar(500) | N |  |  |
| TXTADRESBASARILI | nvarchar(500) | N |  |  |
| TXTADRESHATALI | nvarchar(500) | N |  |  |
| BYTONLINE | tinyint | N |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| TXTDLLPATH | nvarchar(200) | N |  |  |
| LNGGOREVPLANKOD | int | N |  |  |
| BYTILKOKUTMAENTEGRASYONU | tinyint | N |  |  |
| BYTYARATMAENTEGRASYONU | tinyint | N |  |  |
| BYTONAYENTEGRASYONU | tinyint | N |  |  |
| LNGENTEGRASYONPAKETKOD | int | N |  |  |
| TXTFTPADRESI | nvarchar(500) | N |  |  |
| BYTPASSIVE | tinyint | N |  |  |
| BYTAUTHTLS | tinyint | N |  |  |
| BYTSSL | tinyint | N |  |  |
| TXTPROXYHOSTNAME | nvarchar(50) | N |  |  |
| TXTPROXYUSERNAME | nvarchar(50) | N |  |  |
| TXTPROXYPASSWORD | nvarchar(50) | N |  |  |
| LNGPROXYPORT | int | N |  |  |
| LNGPROXYMETHOD | int | N |  |  |
| BYTLOGLAMA | tinyint |  |  |  |
| BYTKAYDETMEENTEGRASYONU | tinyint |  |  | ((0)) |
| TXTBASLIKSSPNAME | nvarchar(50) | N |  |  |
| TXTDETAYSSPNAME | nvarchar(50) | N |  |  |
| BYTSERISORGULAMAENTEGRASYONU | tinyint |  |  |  |
| BYTREFERANSAAITBELGELERISIL | tinyint |  |  |  |
| LNGMERKEZSAATDILIMI | int | N |  |  |
| TXTADRES2 | nvarchar(500) | N |  | ('') |
| TXTNAMESPACE | varchar(255) | N |  |  |
| TXTCLASSNAME | varchar(255) | N |  |  |
| BYTNETSISAKTARIMIEXEILEYAPILSIN | tinyint | N |  |  |

## TBLSBENTEGRASYONPARAMETRE  (7 kolon, 0 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| LNGOPERASYONTIPKOD | int |  |  |  |
| BYTBELGEDUZENLEMETIPI | tinyint | N |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |

## TBLSBENTYAZMAPARAMETRE  (12 kolon, 0 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| LNGDISTKOD | int |  |  |  |
| TXTKOD | nvarchar(10) |  |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| BYTTOPLUISLEM | tinyint |  |  |  |
| BYTPALETBATCHAKTARIMI | tinyint |  |  |  |
| BYTSERIAKTARIMI | tinyint | N |  |  |
| LNGENTADRESKOD | int |  |  |  |
| BYTBATCHAKTARIMI | tinyint |  |  | ((0)) |

## TBLSBGRUP  (9 kolon, 4 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| TXTKOD | nvarchar(50) | N |  |  |
| TXTTANIMI | nvarchar(50) | N |  |  |
| BYTGRUPTIPI | tinyint |  |  |  |
| LNGDISTKOD | int | N |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |

## TBLSBGIRISKOSULPARAMETRE  (14 kolon, 0 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| BYTAKTIF | int |  |  |  |
| LNGDISTKOD | int |  |  |  |
| LNGGIRISKOSULTIPI | int |  |  |  |
| BYTCARIBAGLANTITIPI | tinyint | N |  |  |
| LNGCARIBAGLANTIKODU | int | N |  |  |
| BYTMALZEMEBAGLANTITIPI | tinyint | N |  |  |
| LNGMALZEMEBAGLANTIKODU | int | N |  |  |
| BYTMESAJTIPI | tinyint |  |  |  |
| LNGSIRA | int |  |  |  |
| BYTKOSULKIRMA | tinyint |  |  |  |
| TXTSSP | ntext | N |  |  |
| TXTKONTROLTIPIACIKLAMA | nvarchar(50) | N |  |  |
| BYTHARIC | tinyint | N |  |  |

## TBLSBGIRISKOSULTIPI  (8 kolon, 0 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| TXTKOD | nvarchar(10) |  |  |  |
| LNGDISTKOD | int |  |  |  |
| TXTACIKLAMA | nvarchar(50) | N |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |

## TBLSBGIRISKOSULTIPIOPERASYONTIPI  (8 kolon, 0 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| BYTAKTIF | int |  |  |  |
| LNGGIRISKOSULTIPI | int |  |  |  |
| LNGOPERASYONTIPKOD | int |  |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |

## TBLSBLOKASYON  (16 kolon, 576 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| LNGUSTKOD | int |  |  |  |
| TXTLOKASYONKOD | nvarchar(20) |  |  |  |
| LNGDISTKOD | int | N |  |  |
| LNGDEPOKOD | int | N |  |  |
| LNGALANKOD | int | N |  |  |
| TXTTANIMI | nvarchar(50) | N |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| BYTLOKASYONTIP | tinyint | N |  |  |
| TXTBARKOD | nvarchar(30) | N |  |  |
| BYTRAMPA | tinyint |  |  |  |
| BYTDURUM | tinyint |  |  |  |
| LNGONCELIK | int | N |  |  |

## TBLSBLOGBELGE  (24 kolon, 2543 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| LNGBELGEKOD | int |  |  |  |
| LNGDETAYKOD | int |  |  |  |
| BYTISLEM | tinyint |  |  |  |
| TXTBARKOD | nvarchar(150) | N |  |  |
| LNGDISTKOD | int | N |  |  |
| LNGURUNKOD | int |  |  |  |
| TXTBATCHNO | nvarchar(50) | N |  |  |
| TXTSERINO | nvarchar(50) | N |  |  |
| TXTPO | nvarchar(50) | N |  |  |
| TXTPOLINE | nvarchar(50) | N |  |  |
| TXTPALETNO | nvarchar(20) | N |  |  |
| DBLISLEMMIKTARI | decimal(28,8) |  |  |  |
| LNGISLEMBIRIMI | int |  |  |  |
| DBLANAMIKTAR | decimal(28,8) |  |  |  |
| LNGANABIRIM | int |  |  |  |
| LNGLOKASYONKOD | int |  |  |  |
| DBLNETAGIRLIK | decimal(28,8) | N |  |  |
| DBLBRUTAGIRLIK | decimal(28,8) | N |  |  |
| LNGAGIRLIKBIRIMI | int | N |  |  |
| TRHISLEMTARIHI | datetimeoffset | N |  |  |
| LNGKULLANICIKOD | int |  |  |  |
| BYTTIP | tinyint |  |  | ((0)) |
| LNGOPERASYONTIPKOD | int | N |  |  |

## TBLSBLOKASYONKAPASITE  (22 kolon, 2772 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| BYTLOKASYONBAGLANTITIPI | tinyint | N |  |  |
| LNGLOKASYONBAGLANTIKODU | int | N |  |  |
| BYTMALZEMEBAGLANTITIPI | tinyint | N |  |  |
| LNGMALZEMEBAGLANTIKODU | int | N |  |  |
| DBLMIKTAR | decimal(28,8) |  |  |  |
| LNGBIRIM | int | N |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| DBLPALETMIKTAR | decimal(28,8) | N |  |  |
| DBLTOLERANSMIKTAR | decimal(28,8) | N |  |  |
| LNGTOLERANSBIRIM | int | N |  |  |
| BYTMESAJTIPI | tinyint |  |  |  |
| DBLEN | decimal(28,8) | N |  |  |
| DBLBOY | decimal(28,8) | N |  |  |
| DBLYUKSEKLIK | decimal(28,8) | N |  |  |
| DBLYERLESTIRMEYUKSEKLIGI | decimal(28,8) | N |  |  |
| LNGBOYUTBIRIMKOD | int | N |  |  |
| DBLAGIRLIK | decimal(28,8) | N |  |  |
| LNGAGIRLIKBIRIMKOD | int | N |  |  |

## TBLSBLOKASYONGRUP  (9 kolon, 0 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| TXTKOD | nvarchar(8) |  |  |  |
| LNGDISTKOD | int | N |  |  |
| TXTTANIMI | nvarchar(50) | N |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| BYTISEMRIGRUBU | tinyint | N |  |  |

## TBLSBMUADILURUN  (7 kolon, 0 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| LNGANAURUNKOD | int |  |  |  |
| LNGMUADILURUNKOD | int |  |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |

## TBLSBOPERASYONBELGEBASLIK  (18 kolon, 692 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| TXTKOD | nvarchar(20) |  |  |  |
| LNGDISTKOD | int | N |  |  |
| LNGOPERASYONTIPKOD | int |  |  |  |
| TXTREFBELGENO | nvarchar(256) | N |  |  |
| LNGREFBELGENO | int | N |  |  |
| TRHBELGETARIHI | datetimeoffset | N |  |  |
| TXTIRSALIYENO | nvarchar(25) | N |  |  |
| TXTIINVOICENO | nvarchar(25) | N |  |  |
| LNGTAKIPKODU | int | N |  |  |
| BYTARSIV | tinyint | N |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| TXTBEYANNAMENO | nvarchar(25) | N |  |  |
| LNGIPTALBELGEKOD | int | N |  |  |
| TXTACIKLAMA | nvarchar(100) | N |  |  |

## TBLSBOPERASYONBELGEDETAY  (33 kolon, 2202 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| LNGBASLIKKOD | int |  |  |  |
| LNGDETAYKOD | int |  |  |  |
| BYTGIRISCIKIS | tinyint |  |  |  |
| LNGURUNKOD | int |  |  |  |
| LNGLOKASYONKOD | int |  |  |  |
| TXTBATCHNO | nvarchar(50) | N |  |  |
| TXTSERINO | nvarchar(50) | N |  |  |
| TXTPO | nvarchar(50) | N |  |  |
| TXTPOLINE | nvarchar(50) | N |  |  |
| LNGSTATU | int | N |  |  |
| DBLANAMIKTAR | decimal(28,8) |  |  |  |
| LNGANAOLCUBIRIMKOD | int |  |  |  |
| DBLISLEMMIKTAR | decimal(28,8) |  |  |  |
| LNGISLEMOLCUBIRIMKOD | int |  |  |  |
| DBLNETAGIRLIK | decimal(28,8) | N |  |  |
| DBLBRUTAGIRLIK | decimal(28,8) | N |  |  |
| LNGAGIRLIKOLCUBIRIMKOD | int | N |  |  |
| LNGREFBELGEDETAYNO | int | N |  |  |
| LNGOPERASYONNEDENKOD | int | N |  |  |
| TXTPALETNO | nvarchar(20) | N |  |  |
| TRHSONKULLANMATARIHI | date | N |  |  |
| TRHURETIMTARIHI | date | N |  |  |
| LNGMUSTERIKOD | int | N |  |  |
| BYTARSIV | tinyint | N |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| LNGREZERVEBELGEKOD | int | N |  |  |
| LNGREZERVEBELGETIPKOD | int | N |  |  |
| DBLFIREMIKTARI | decimal(28,8) | N |  |  |
| LNGTEDARIKCIKOD | int | N |  | (NULL) |

## TBLSBOPERASYONGRUP  (8 kolon, 0 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| TXTKOD | nvarchar(8) |  |  |  |
| LNGDISTKOD | int | N |  |  |
| TXTTANIMI | nvarchar(50) | N |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |

## TBLSBOPERASYONTIPIDONUSUM  (13 kolon, 7 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| LNGOPERASYONTIPKOD | int |  |  |  |
| LNGSTATUKOD | int | N |  |  |
| TXTDONUSUMKOD | nvarchar(5) |  |  |  |
| BYTGIDEN | tinyint |  |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| BYTKAYNAKLOKASYONBAGLANTITIPI | tinyint | N |  |  |
| LNGKAYNAKLOKASYONBAGLANTIKODU | int | N |  |  |
| BYTHEDEFLOKASYONBAGLANTITIPI | tinyint | N |  |  |
| LNGHEDEFLOKASYONBAGLANTIKODU | int | N |  |  |

## TBLSBOPERASYONNEDEN  (9 kolon, 0 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| LNGDISTKOD | int | N |  |  |
| LNGOPERASYONTIPI | int |  |  |  |
| LNGNEDENKATEGORIKOD | int |  |  |  |
| LNGNEDENKOD | int |  |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |

## TBLSBOPERASYONTIPI  (74 kolon, 41 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| TXTKOD | nvarchar(5) |  |  |  |
| BYTBELGETIPI | tinyint |  |  |  |
| BYTKATEGORI | tinyint |  |  |  |
| LNGDISTKOD | int | N |  |  |
| LNGSAYACKOD | int | N |  |  |
| BYTPARAMENTEGRASYON | tinyint | N |  |  |
| LNGTERSOPERASYONKOD | int | N |  |  |
| BYTMAILGONDERILSIN | tinyint | N |  |  |
| TXTTANIMI | nvarchar(50) | N |  |  |
| BYTLOGLAMA | tinyint | N |  |  |
| BYTLOGKONTROL | tinyint | N |  |  |
| BYTLOGKONTROLUYARITIPI | tinyint | N |  |  |
| BYTGRUPLAMA | tinyint | N |  |  |
| LNGGRUPSAYACKOD | int | N |  |  |
| BYTKONTROLLU | tinyint |  |  |  |
| BYTNEDENGIRISZORUNLU | tinyint | N |  |  |
| BYTSEVKEDEMEMENEDENGIRISI | tinyint | N |  |  |
| BYTMUADILUYGULAMASI | tinyint | N |  |  |
| BYTMALBAZINDATOPLAMA | tinyint | N |  |  |
| BYTKASATIPIUYGULAMASI | tinyint | N |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| LNGKONTROLGRUPKOD | int | N |  |  |
| BYTKONTROLBELGETIPKOD | tinyint | N |  |  |
| BYTPALETBOZMA | tinyint | N |  |  |
| BYTTOPLUGONDERIM | tinyint | N |  |  |
| BYTBELGEGUNCELLEME | tinyint | N |  |  |
| BYTAYNIPALETKULLANILSIN | tinyint | N |  |  |
| BYTORJMIKGUNCELLENSIN | tinyint | N |  |  |
| BYTPARCALIKULLANIM | tinyint | N |  |  |
| BYTAYNISERIKULLANILSIN | tinyint | N |  |  |
| TXTREFERANSDETAYSSP | ntext | N |  |  |
| BYTBATCHATAMA | tinyint | N |  |  |
| BYTMALBAZINDAMIKTARDUZENLENSIN | tinyint | N |  |  |
| BYTPASIFURUNKULLANILSIN | tinyint |  |  | ((0)) |
| LNGOPERASYONSAYACKOD | int | N |  |  |
| BYTLOGLAMATIPI | tinyint |  |  |  |
| BYTBOLMEDEBELGEYARATILSIN | tinyint |  |  |  |
| LNGIPTALLOKASYONKOD | int | N |  |  |
| TXTONAYKONTROLSSPAD | nvarchar(50) | N |  |  |
| BYTLOGKONTROLPALETSIZ | tinyint |  |  |  |
| LNGLOGKONTROLGUNSAYISI | int | N |  |  |
| BYTONAYDAPALETYARATILSIN | tinyint |  |  |  |
| BYTOKUTMABAZINDABILGILENDIRME | tinyint | N |  |  |
| BYTOKUTMABAZINDABILGIMESAJIGOSTER | tinyint |  |  |  |
| BYTOKUTMABAZINDAEKSAHAKONTROLU | tinyint |  |  |  |
| BYTUSTPALETBOZULSUN | tinyint |  |  |  |
| BYTTRANSFERDEPALETTENCIKAR | tinyint | N |  | ((0)) |
| BYTAKTIFPASIF | tinyint |  |  | ((1)) |
| BYTOPERASYONKONTROLLERIYAPILMASIN | tinyint | N |  |  |
| BYTTRANSFERDEPALETIBOZ | tinyint | N |  | ((0)) |
| TXTREFERANSBASLIKSSP | nvarchar(50) | N |  |  |
| BYTBELGEDEREFERANSKONTROLUYAPILMASIN | tinyint |  |  |  |
| TXTKONTROLOPERASYON | nvarchar(100) | N |  |  |
| TXTOKUTMABAZINDASSPADI | nvarchar(100) | N |  |  |
| BYTISEMRINDEONAY | tinyint | N |  |  |
| LNGTOPLIPTALOPERASYONKOD | int | N |  |  |
| TXTONAYIPTALKONTROLSSPAD | nvarchar(50) | N |  |  |
| BYTNEDENGIRISIBASLIKTA | tinyint | N |  |  |
| BYTKLTKONTROLYAPILSIN | tinyint | N |  |  |
| BYTREZERVETRANSFEREDILSIN | tinyint | N |  |  |
| TXTBELGEBAGLANMAKONTROLSSPADI | nvarchar(100) | N |  |  |
| BYTBELGEDETAYLOKASYONUKAPSAMAKTARILSIN | tinyint | N |  |  |
| BYTREFERANSBELGEONAYIPTALEDILSIN | tinyint | N |  |  |
| TXTEKSAHAGETIRMESSPADI | nvarchar(100) | N |  |  |
| BYTONAYLIBELGEGUNCELLENSIN | tinyint | N |  |  |
| BYTONAYLISAYIMKONTROLU | tinyint | N |  |  |
| TXTBELGEBOLMEKONTROLSSPAD | nvarchar(50) | N |  |  |
| BYTTOPLANMAYANDETAYBELGEDEOLUSMASIN | tinyint |  |  | ((0)) |
| BYTONAYDABELGEBOL | tinyint | N |  |  |
| BYTPARCALIPALETBOZ | tinyint | N |  |  |

## TBLSBOPERASYONTIPILOKASYON  (18 kolon, 2 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| LNGOPERASYONTIPKOD | int |  |  |  |
| LNGDISTKOD | int | N |  |  |
| BYTCARIBAGLANTITIPI | tinyint | N |  |  |
| LNGCARIBAGLANTIKODU | int | N |  |  |
| BYTMALZEMEBAGLANTITIPI | tinyint | N |  |  |
| LNGMALZEMEBAGLANTIKODU | int | N |  |  |
| BYTKAYNAKLOKASYONBAGLANTITIPI | tinyint | N |  |  |
| LNGKAYNAKLOKASYONBAGLANTIKODU | int | N |  |  |
| BYTHEDEFLOKASYONBAGLANTITIPI | tinyint | N |  |  |
| LNGHEDEFLOKASYONBAGLANTIKODU | int | N |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| BYTLOKASYONSABITKALSIN | tinyint | N |  |  |
| BYTKAYNAKALANSABITLENSIN | tinyint | N |  |  |
| BYTHEDEFALANSABITLENSIN | tinyint | N |  |  |

## TBLSBOPERASYONTIPIPALETTIPI  (8 kolon, 7 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| LNGOPERASYONTIPKOD | int |  |  |  |
| LNGPALETTIPKOD | int |  |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| LNGICPALETTIPKOD | int | N |  |  |

## TBLSBOPERASYONTIPIPALETSTATU  (0 kolon, 0 satir)
_DB'de bulunamadi._

## TBLSBOPERASYONTIPITOLERANS  (12 kolon, 0 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| LNGOPERASYONTIPKOD | int | N |  |  |
| LNGDISTKOD | int | N |  |  |
| BYTCARIBAGLANTITIPI | tinyint | N |  |  |
| LNGCARIBAGLANTIKODU | int | N |  |  |
| BYTMALZEMEBAGLANTITIPI | tinyint | N |  |  |
| LNGMALZEMEBAGLANTIKODU | int | N |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| BYTBOLMEDIKKATEALINSIN | tinyint | N |  |  |

## TBLSBPALET  (18 kolon, 11 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| BYTAKTIF | tinyint |  |  |  |
| TXTPALETNO | nvarchar(20) |  |  |  |
| LNGPALETTIPIKOD | int |  |  |  |
| LNGREZERVEBELGETIPKOD | int | N |  |  |
| LNGURETIMREFERANSKOD | int | N |  |  |
| LNGUSTPALETKOD | int | N |  |  |
| DBLORJINALMIKTAR | decimal(28,8) | N |  |  |
| LNGANAOLCUBIRIMI | int | N |  |  |
| LNGANAPALETKOD | int | N |  |  |
| BYTARSIV | tinyint |  | PK |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| TRHURETIMTARIHI | date | N |  |  |
| TRHSONKULLANMATARIHI | date | N |  |  |
| TXTBEACONID | nvarchar(100) | N |  |  |

## TBLSBPALETEKSAHA  (9 kolon, 0 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGEKSAHAKODU | int |  | PK |  |
| TXTEKSAHAACIKLAMA | nvarchar(40) | N |  |  |
| BYTARSIV | tinyint |  |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| TXTSONISLEMHOST | nvarchar(50) | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| LNGBAGLANTIKOD | int |  | PK |  |

## TBLSBPALETBILDIRIMBASLIK  (13 kolon, 0 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| TXTPALETNO | nvarchar(20) |  |  |  |
| LNGPALETTIPKOD | int |  |  |  |
| LNGLOKASYONKOD | int | N |  |  |
| TRHONAYTARIHI | datetime | N |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| TXTESKIPALETNO | nvarchar(20) | N |  |  |
| LNGSTATUKOD | int |  |  |  |
| TXTSEFERNO | nvarchar(20) | N |  |  |
| LNGCARIKOD | int | N |  |  |

## TBLSBPALETBILDIRIMDETAY  (28 kolon, 0 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| LNGBASLIKKOD | int |  |  |  |
| LNGDETAYKOD | int |  |  |  |
| LNGURUNKOD | int |  |  |  |
| DBLANAMIKTAR | decimal(28,8) | N |  |  |
| LNGANAOLCUBIRIMKOD | int |  |  |  |
| DBLISLEMMIKTAR | decimal(28,8) | N |  |  |
| LNGISLEMOLCUBIRIMKOD | int |  |  |  |
| DBLNETAGIRLIK | decimal(28,8) | N |  |  |
| DBLBRUTAGIRLIK | decimal(28,8) | N |  |  |
| LNGAGIRLIKOLCUBIRIMKOD | int | N |  |  |
| TXTBATCHNO | nvarchar(50) | N |  |  |
| TXTSERINO | nvarchar(50) | N |  |  |
| TXTPO | nvarchar(50) | N |  |  |
| TRHSONKULLANMATARIHI | date | N |  |  |
| TRHURETIMTARIHI | date | N |  |  |
| LNGSTATUKOD | int | N |  |  |
| LNGLOKASYONKOD | int | N |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| LNGPALETID | int | N |  |  |
| LNGREZERVEBELGEKOD | int | N |  |  |
| LNGREZERVEBELGETIPKOD | int | N |  |  |
| LNGSEVKIYATBELGEKOD | int | N |  |  |
| TXTPOLINE | nvarchar(50) | N |  |  |
| LNGCARIKOD | int | N |  |  |

## TBLSBPALETTIPI  (24 kolon, 2 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| TXTKOD | nvarchar(5) |  |  |  |
| LNGDISTKOD | int | N |  |  |
| LNGSAYACKOD | int |  |  |  |
| BYTLOGLAMA | tinyint | N |  |  |
| BYTLOGKONTROL | tinyint | N |  |  |
| BYTLOGKONTROLUYARITIPI | tinyint | N |  |  |
| BYTDUZENLEMEDEYENINOALSIN | tinyint | N |  |  |
| BYTPARCALIKULLANIM | tinyint | N |  |  |
| BYTBOLUNEMEZ | tinyint | N |  |  |
| BYTBATCHKONTROL | tinyint | N |  |  |
| TXTTANIMI | nvarchar(50) | N |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| BYTTIP | tinyint | N |  |  |
| BYTTEKURUNKONTROLU | tinyint | N |  |  |
| LNGPALETNOUZUNLUK | int | N |  |  |
| BYTUSTPALETBOZULSUN | tinyint |  |  |  |
| BYTTRANSFERDEPALETTENCIKAR | tinyint | N |  | ((0)) |
| BYTTRANSFERDEPALETIBOZ | tinyint | N |  | ((0)) |
| BYTTRANSFERTUMPALETKORU | tinyint | N |  |  |
| BYTPARCALIPALETBOZ | tinyint | N |  |  |

## TBLSBPALETTARIHCE  (16 kolon, 19936 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| LNGPALETKOD | int |  |  |  |
| BYTAKTIF | tinyint |  |  |  |
| LNGURETIMREFERANSKOD | int | N |  |  |
| LNGUSTPALETKOD | int | N |  |  |
| DBLORJINALMIKTAR | decimal(28,8) | N |  |  |
| LNGANAOLCUBIRIMI | int | N |  |  |
| LNGANAPALETKOD | int | N |  |  |
| BYTARSIV | tinyint |  |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| TRHURETIMTARIHI | date | N |  |  |
| TRHSONKULLANMATARIHI | date | N |  |  |
| TXTOPERASYONBELGEBASLIKKOD | nvarchar(20) | N |  |  |

## TBLSBPARAMETRE  (9 kolon, 8 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| TXTKOD | nvarchar(50) |  |  |  |
| TXTTANIMI | nvarchar(100) |  |  |  |
| TXTDEGERI | nvarchar(255) | N |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| LNGDISTKOD | int | N |  |  |

## TBLSBPBELGETANIM  (14 kolon, 0 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| LNGDISTKOD | int |  |  |  |
| TXTBELGETIPI | nvarchar(5) |  |  |  |
| TXTIPTALBELGETIPI | nvarchar(5) |  |  |  |
| BYTISLEMTIPI | tinyint |  |  |  |
| BYTGIRISDEPO | tinyint |  |  |  |
| BYTCIKISDEPO | tinyint |  |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| TXTSONISLEMHOST | varchar(50) |  |  |  |
| LNGMUSTERIKOD | int | N |  |  |
| BYTTARIH | tinyint |  |  |  |
| LNGSTKOD | int | N |  |  |
| LNGHAREKETKODU | int | N |  |  |
| BYTBELGEDOGRUDANSTOKBARDAOLUSSUN | tinyint | N |  |  |

## TBLSBPPCEKRAN  (7 kolon, 45 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| TXTKOD | nvarchar(10) |  |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| LNGKOD | int |  | PK |  |
| TXTACIKLAMA | nvarchar(50) | N |  |  |

## TBLSBPPCEKRANPARAMETRE  (39 kolon, 16 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| LNGEKRANKOD | int |  |  |  |
| LNGOPERASYONTIPKOD | int |  |  |  |
| LNGMENUKOD | int |  |  |  |
| BYTBATCHNOTAKIP | tinyint | N |  |  |
| BYTMIKTARDEGISTIRME | tinyint | N |  |  |
| BYTETIKETBASIMI | tinyint | N |  |  |
| BYTKATEGORI | tinyint | N |  |  |
| LNGURUNDETAYTIPI | int | N |  |  |
| BYTMESAJGOSTERILSIN | tinyint | N |  |  |
| BYTSERINOTAKIP | tinyint | N |  |  |
| BYTDETAYGUNCELLENSIN | tinyint | N |  |  |
| BYTMIKTARDEGBARKODUEZSIN | tinyint | N |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| BYTLOGKAPSAM | tinyint | N |  |  |
| LNGKAPSAMBIRIM | int | N |  |  |
| BYTELLESECIM | tinyint |  |  | ((0)) |
| BYTTOPLANANSATIRAKONUMLANSIN | tinyint | N |  |  |
| BYTONAYDAYENIBELGEACSIN | tinyint |  |  | ((0)) |
| LNGTOPLUSERIOKUTMASAYISI | int | N |  |  |
| BYTBARKODMIKTARGIRIS | tinyint |  |  | ((0)) |
| BYTEKSAHATEMIZLENMESIN | tinyint | N |  |  |
| BYTCOKLUSERIGIRISI | tinyint |  |  |  |
| BYTLOKASYONFILTRELENSIN | tinyint | N |  |  |
| BYTKAPSAMETIKETBASIMI | tinyint | N |  |  |
| BYTBARKODMIKTARIPALETICIMIKTARKULLANILSIN | tinyint |  |  | ((0)) |
| BYTMIKTARDEGISIRSEKAPSAMETIKETBAS | tinyint |  |  | ((0)) |
| BYTPALETICIEKRANBARKODMIKTARDIREKTOKUT | tinyint | N |  |  |
| BYTICPALETLERINTUMUSECILSIN | tinyint | N |  | ((0)) |
| BYTBARKODMIKTARGIRISISTIFLI | tinyint | N |  |  |
| BYTBELGETOPLAMADASEVKIYATMIKTARIATANSIN | tinyint | N |  |  |
| BYTURUNBIRIMBARKODILEOKUT | tinyint | N |  |  |
| BYTMALBAZINDATOPLAMABIRIMONERIOKUTMA | tinyint | N |  | ((0)) |
| BYTDETAYSAYIGOSTER | tinyint | N |  |  |
| BYTISLEMMIKTARSAYIGOSTER | tinyint | N |  |  |
| BYTURUNSAYISIGOSTER | tinyint | N |  |  |

## TBLSBPPCMENU  (12 kolon, 15 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| TXTKOD | nvarchar(10) |  |  |  |
| TXTTANIMI | nvarchar(50) | N |  |  |
| LNGEKRANKOD | int |  |  |  |
| LNGTABKOD | int |  |  |  |
| TXTSIMGEADI | nvarchar(25) | N |  |  |
| LNGDISTKOD | int | N |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| LNGMENUSIRA | int | N |  |  |

## TBLSBSAYAC  (14 kolon, 15 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| TXTKOD | nvarchar(5) |  |  |  |
| LNGDISTKOD | int | N |  |  |
| TXTTANIMI | nvarchar(50) | N |  |  |
| BYTOTOMATIK | tinyint | N |  |  |
| TXTONEK | nvarchar(10) | N |  |  |
| DBLSAYACBASLANGICNO | decimal(28,0) | N |  |  |
| DBLSAYACBITISNO | decimal(28,0) | N |  |  |
| DBLSAYACDEGERI | decimal(28,0) | N |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| TXTONEK2SSPADI | nvarchar(100) | N |  |  |

## TBLSBSAYIMBELGEBASLIK  (16 kolon, 0 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| TXTKOD | nvarchar(20) |  |  |  |
| BYTDURUM | tinyint |  |  |  |
| LNGOPERASYONTIPKOD | int |  |  |  |
| TRHBELGETARIHI | date | N |  |  |
| LNGLOKASYONKOD | int | N |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| BYTURUNBAGLANTITIPI | tinyint | N |  |  |
| BYTKULLANICIBAGLANTITIPI | tinyint | N |  |  |
| TRHONAYTARIHI | datetimeoffset | N |  |  |
| TXTSAYIMGRUPNO | nvarchar(20) | N |  |  |
| LNGDISTKOD | int |  |  |  |
| TXTREFBELGENO | nvarchar(50) | N |  |  |

## TBLSBSAYIMBELGEDETAY  (26 kolon, 0 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| LNGBASLIKKOD | int |  |  |  |
| LNGDETAYKOD | int |  |  |  |
| LNGLOKASYONKOD | int |  |  |  |
| LNGURUNKOD | int |  |  |  |
| LNGSTATUKOD | int | N |  |  |
| TXTBATCHNO | nvarchar(50) | N |  |  |
| TXTSERINO | nvarchar(50) | N |  |  |
| TXTPO | nvarchar(50) | N |  |  |
| TXTPOLINE | nvarchar(50) | N |  |  |
| TXTPALETNO | nvarchar(20) | N |  |  |
| DBLANAMIKTAR | decimal(28,8) | N |  |  |
| LNGANAOLCUBIRIMI | int | N |  |  |
| DBLISLEMMIKTARI | decimal(28,8) | N |  |  |
| LNGISLEMOLCUBIRIMI | int | N |  |  |
| DBLNETAGIRLIK | decimal(28,8) | N |  |  |
| DBLBRUTAGIRLIK | decimal(28,8) | N |  |  |
| LNGAGIRLIKOLCUBIRIMI | int | N |  |  |
| TRHSONKULLANMATARIHI | date | N |  |  |
| TRHURETIMTARIHI | date | N |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| DBLDEPOMIKTAR | decimal(28,8) | N |  |  |
| TXTUSTPALETNO | nvarchar(20) | N |  |  |

## TBLSBSAYIMFARK  (28 kolon, 1 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| LNGURUNKOD | int |  |  |  |
| TXTPALETNO | nvarchar(20) | N |  |  |
| TXTBATCHNO | nvarchar(50) | N |  |  |
| TXTSERINO | nvarchar(50) | N |  |  |
| TXTPO | nvarchar(50) | N |  |  |
| TXTPOLINE | nvarchar(50) | N |  |  |
| LNGLOKASYONKOD | int |  |  |  |
| LNGSTATU | int | N |  |  |
| DBLSAYILANMIKTAR | decimal(28,8) | N |  |  |
| DBLDEPOMIKTAR | decimal(28,8) | N |  |  |
| LNGOLCUBIRIMI | int | N |  |  |
| DBLFARK | decimal(28,8) | N |  |  |
| DBLSAYILANAGIRLIK | decimal(28,8) | N |  |  |
| DBLDEPOAGIRLIK | decimal(28,8) | N |  |  |
| LNGAGIRLIKOLCUBIRIMI | int | N |  |  |
| DBLAGIRLIKFARK | decimal(28,8) | N |  |  |
| BYTDURUM | tinyint | N |  |  |
| BYTGIRISCIKIS | tinyint | N |  |  |
| TRHSONKULLANMATARIHI | date | N |  |  |
| TRHURETIMTARIHI | date | N |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| TXTSAYIMGRUPNO | nvarchar(20) | N |  |  |
| LNGREZERVEBELGEKOD | int | N |  |  |
| LNGREZERVEMUSTERIKOD | int | N |  |  |

## TBLSBSAYIMPARAMETRE  (25 kolon, 1 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| LNGOPERASYONTIPKOD | int |  |  |  |
| BYTSAYIMTIP | tinyint |  |  |  |
| LNGGIRISOPERASYONTIPKOD | int | N |  |  |
| LNGCIKISOPERASYONTIPKOD | int | N |  |  |
| LNGTRANSFEROPERASYONTIPKOD | int | N |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |
| BYTESITLENSIN | tinyint | N |  |  |
| BYTAGIRLIKFARKIALINSIN | tinyint | N |  |  |
| LNGBELGEDETAYSAYISI | int | N |  |  |
| BYTPALETMIKTARIPARCALIGIRILSIN | tinyint |  |  |  |
| BYTISTIFLENSIN | tinyint | N |  |  |
| BYTPARCALIPALET | tinyint |  |  | ((0)) |
| BYTPARCALIUYARI | tinyint |  |  | ((1)) |
| BYTAKTIFSAYIMDASTOKHAREKETI | tinyint |  |  | ((0)) |
| BYTICPALETLERGOSTERILMESIN | tinyint | N |  |  |
| BYTKARMAPALETGOSTERILMESIN | tinyint | N |  |  |
| BYTPALETICISAYIKONTROLU | tinyint | N |  |  |
| BYTPALETICISTOKGOSTERILMESIN | tinyint |  |  | ((0)) |
| BYTSAYIMGUNSAYISI | tinyint | N |  |  |
| BYTPALETTEKRARSAYILMASIN | tinyint | N |  |  |
| BYTOKUTMADALOKASYONSORULSUN | tinyint | N |  |  |

## TBLSBSTATU  (8 kolon, 2 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| LNGDISTKOD | int | N |  |  |
| TXTKOD | nvarchar(10) | N |  |  |
| TXTTANIMI | nvarchar(50) | N |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |

## TBLSBURUNOLCUBIRIM  (22 kolon, 725 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| LNGURUNKOD | int |  |  |  |
| LNGBIRIMKOD | int |  |  |  |
| BYTANAOLCUBIRIMI | tinyint |  |  |  |
| DBLCARPAN | decimal(28,8) |  |  |  |
| DBLBOLEN | decimal(28,8) |  |  |  |
| DBLEN | decimal(28,8) | N |  |  |
| DBLBOY | decimal(28,8) | N |  |  |
| DBLYUKSEKLIK | decimal(28,8) | N |  |  |
| LNGBOYUTOLCUBIRIMI | int | N |  |  |
| DBLALAN | decimal(28,8) | N |  |  |
| LNGALANOLCUBIRIMI | int | N |  |  |
| DBLHACIM | decimal(28,8) | N |  |  |
| LNGHACIMOLCUBIRIMI | int | N |  |  |
| DBLNETAGIRLIK | decimal(28,8) | N |  |  |
| DBLBRUTAGIRLIK | decimal(28,8) | N |  |  |
| LNGAGIRLIKOLCUBIRIMI | int | N |  |  |
| BYTBATCHIZLEME | tinyint | N |  |  |
| BYTSERIIZLEME | tinyint | N |  |  |
| DBLMINPALETMIKTARI | decimal(28,8) | N |  |  |
| DBLMAXPALETMIKTARI | decimal(28,8) | N |  |  |
| BYTSATISBIRIMI | tinyint | N |  |  |

## TBLSBURUNBIRIMBARKOD  (4 kolon, 6 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| LNGURUNBIRIMKOD | int |  |  |  |
| TXTBARKOD | nvarchar(50) |  |  |  |
| TXTETIKETADRESI | nvarchar(50) | N |  |  |

## TBLSBYONLENDIRMETIPI  (7 kolon, 4 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| TXTKOD | nvarchar(10) |  |  |  |
| TXTACIKLAMA | nvarchar(50) | N |  |  |
| TRHILKISLEMTARIHI | datetimeoffset | N |  |  |
| TRHSONISLEMTARIHI | datetimeoffset | N |  |  |
| LNGILKKULLANICIKOD | int | N |  |  |
| LNGSONKULLANICIKOD | int | N |  |  |

## TBLSBYONLENDIRMEPARAMETRE  (16 kolon, 4 satir)

| Kolon | Tip | Null | PK | Default |
|---|---|---|---|---|
| LNGKOD | int |  | PK |  |
| BYTAKTIF | int |  |  |  |
| LNGYONLENDIRMETIPKOD | int |  |  |  |
| BYTCARIBAGLANTITIPI | tinyint | N |  |  |
| LNGCARIBAGLANTIKODU | int | N |  |  |
| BYTMALZEMEBAGLANTITIPI | tinyint | N |  |  |
| LNGMALZEMEBAGLANTIKODU | int | N |  |  |
| BYTYONLENDIRMETIPI | tinyint |  |  |  |
| LNGKONTROLSAHASI | int |  |  |  |
| BYTMESAJTIPI | tinyint |  |  |  |
| LNGSIRA | int |  |  |  |
| BYTKOSULKIRMA | tinyint |  |  |  |
| TXTSSP | ntext | N |  |  |
| BYTYONLENDIRMELISTESIUYGULA | tinyint | N |  |  |
| TXTKONTROLTIPIACIKLAMA | nvarchar(50) | N |  |  |
| BYTARTANSIRALAMA | tinyint | N |  |  |

