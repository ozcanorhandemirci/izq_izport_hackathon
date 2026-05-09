# İZPORT — Proje Raporu

> **İzmir Liman Operasyonları Kurumsal Yönetim Paneli**
> İzmir Büyükşehir Belediyesi · Liman Emisyon ve Operasyon Zekâsı Platformu

---

## 1. Yönetici Özeti

İZPORT, **İzmir körfezindeki 21 limanın** karadan güç orkestrasyonunu, hava kalitesi izlemesini ve operasyonel uyumluluğunu tek bir kurumsal panelden yöneten bir gerçek-zamanlı operasyon zekâsı platformudur.

Platform; gerçek bir liman otoritesinin günlük iş akışını modelleyen **6 farklı işlevsel sayfa** (Gösterge Paneli, Gemiler, Emisyonlar, Karadan Güç, Uyarı ve Öneriler, Raporlar) ve bunları besleyen **canlı simülasyon motoru, kural-tabanlı uyarı motoru ve hash-zincirli denetim kaydı (audit log)** ile teslim edilmiştir.

| Metrik | Değer |
|---|---|
| Toplam dosya | **32** (1 HTML + 4 CSS + 27 JS modülü) |
| Toplam kod satırı | **~16.161 satır** |
| Sayfa modülü | **6** (her biri 1.300–2.300 satır) |
| Liman katalogu | **21 liman** (4 büyük + 17 endüstriyel) |
| Bilingual i18n anahtarı | **600+** (Türkçe + İngilizce, tam parite) |
| Tema | Açık + koyu (CSS değişkenleri ile atomik geçiş) |
| Bağımlılık | **Sadece** Chart.js + jsPDF + html2canvas + DejaVu Sans (CDN) |
| Framework | **Yok** — saf vanilya HTML5/CSS3/ES6 modülleri |
| Veri kalıcılığı | localStorage (manuel kayıtlar, tercihler, audit log) |

---

## 2. Proje Künyesi

| Özellik | Değer |
|---|---|
| Proje adı | İZPORT |
| Alt başlık | İzmir Liman Operasyonları Kurumsal Yönetim Paneli |
| Marka rengi | İzmir mavisi `#009DC4` (İBB kurumsal kimlik tonunda) |
| Kurumsal kimlik | İzmir Büyükşehir Belediyesi · Liman Operasyonları |
| Hedef coğrafya | İzmir Körfezi (38.40–38.50°N, 27.05–27.20°E) |
| Geliştirme dili | JavaScript (ES6+ modüller) |
| Tarayıcı API'leri | Proxy, Pub/Sub, Intl, localStorage, fetch, Canvas |
| Çalıştırma | HTTP server gerekir (ES modules `file://` üzerinde çalışmaz) |

---

## 3. Mimari Genel Bakış

### 3.1 Klasör yapısı

```
izq_hackathon_project/
├── index.html                       # Tek giriş noktası — early bootstrap script
├── css/
│   ├── main.css                     # Tasarım tokenları + tema değişkenleri
│   ├── layout.css                   # App shell grid + bento + page-root
│   ├── components.css               # Shared bileşenler (modal, form, table, …)
│   └── pages.css                    # Sayfalar arası ortak yardımcı sınıflar
└── js/
    ├── main.js                      # Bootstrap (hydrate → mount → router)
    ├── router.js                    # Hash-tabanlı SPA router
    ├── i18n.js                      # TR/EN sözlük + registerStrings API
    │
    ├── store/
    │   ├── state.js                 # Proxy + Pub/Sub merkezi state store
    │   └── persistence.js           # localStorage hydration + auto-save
    │
    ├── engine/
    │   ├── simulation.js            # Mock veri motoru (3.5sn tick)
    │   ├── alertEngine.js           # 5 kural ailesi → uyarı + öneri üretici
    │   └── logger.js                # Hash-zincirli audit logger
    │
    ├── utils/
    │   ├── format.js                # Locale-aware sayı/tarih/süre formatlayıcı
    │   ├── charts.js                # Tema-farkındalı Chart.js fabrikaları
    │   ├── modal.js                 # Modal + form builder (validation)
    │   ├── validate.js              # Form validatörleri
    │   └── pdf.js                   # jsPDF + html2canvas + DejaVu Sans
    │
    ├── components/
    │   ├── sidebar.js               # Sol nav + hesap yöneticisi
    │   ├── topbar.js                # Hava/AQI/sim/tema/dil/audit/sıfırla
    │   ├── kpiWidget.js             # Dashboard KPI sparkline kartları
    │   ├── operationsMatrix.js      # Dashboard vessel tablosu
    │   ├── shorePowerGrid.js        # Dashboard kompakt rıhtım izgarası
    │   ├── aiCopilot.js             # Sağ AI asistan drawer'ı
    │   └── auditDrawer.js           # Sağ denetim kaydı drawer'ı
    │
    └── pages/
        ├── registry.js              # Route → modül haritası
        ├── dashboard.js             # Bileşenleri bento'da bir araya getirir
        ├── vessels.js                # Filo yönetimi (1.348 satır)
        ├── emissions.js              # Hava kalitesi analitiği (1.728 satır)
        ├── shore.js                  # Karadan güç + 21 liman (2.322 satır)
        ├── alerts.js                 # Uyarı + öneri akışı (2.027 satır)
        └── reports.js                # PDF rapor builder (1.952 satır)
```

### 3.2 Çekirdek mimari prensipler

1. **Tek-yönlü veri akışı** — Bileşenler `store.subscribe(slice, cb)` ile dinler, mutasyonu yalnızca `store.dispatch('action', payload)` üzerinden yaparlar. Direkt mutasyon yok.

2. **Proxy + Pub/Sub merkezi state** — Tüm veriler tek bir nesne ağacında (`vessels`, `emissions`, `shore_power`, `alerts`, `accounts`, `audit_log`, …); Proxy `set` trap'i slice yazmalarını dinleyici kümelerine yayınlar.

3. **Module-scoped CSS injection** — Sayfalar kendi stillerini `<style data-page="…">` etiketi olarak `<head>`'e ekler. Sayfa modülleri arasında CSS sızıntısı yoktur.

4. **Hash-tabanlı SPA routing** — `#/vessels`, `#/shore` gibi route'lar dinamik `import()` ile sayfa modülünü yükler; mount/unmount yaşam döngüsü yönetilir.

5. **localStorage'da kalıcılık** — Manuel girilen veri (gemi, ölçüm, hesap, uyarı), kullanıcı tercihleri (tema, dil), denetim kaydı ve rapor yapılandırması her oturumda korunur.

6. **Tema-farkındalık** — Tüm renkler CSS değişkenlerinden okunur. Chart.js de `getComputedStyle` ile değişkenleri runtime'da çözer; tema değişince grafik renkleri otomatik adapte olur.

7. **i18n her şey** — Tüm UI metni anahtar tabanlıdır; `registerStrings({ tr, en })` ile sayfalar kendi sözlüğünü modül yüklenirken kaydeder. Dil değişikliği `'ui'` slice'ı tetikler, tüm bileşenler yeniden render edilir.

---

## 4. Sayfalar

### 4.1 Gösterge Paneli (Dashboard)

**Yol:** `#/dashboard` · **Modül:** `js/pages/dashboard.js`

Operasyon merkezi tek-bakışta. Bento-box CSS Grid yerleşimi:

| Bölüm | İçerik |
|---|---|
| **KPI şeridi** (4 hücre) | CO₂, NOₓ, SOₓ aggregate sparkline'lı kartlar + Karadan Güç önlenen CO₂ |
| **Operasyon Matrisi** | 4 eksenli filtreli tüm gemi tablosu — durum, fuel, severity, dispersion |
| **Karadan Güç Şebekesi** | Kompakt rıhtım grid'i, anlık toggle |

Her KPI kartında:
- Mevcut değer + birim + kademe (eşik karşılaştırması)
- 24 saatlik eğilim sparkline (Chart.js, gradient fill)
- Önceki tick'e göre %± delta
- Tema-farkındalı renkler (success/info/warning/critical)

### 4.2 Gemiler Sayfası

**Yol:** `#/vessels` · **Modül:** `js/pages/vessels.js` (1.348 satır)

Filonun tüm operasyonel görünümü.

**Bölümler:**

1. **5 KPI kartı** — Toplam, Yanaşan/Yükleyen, Yaklaşan (<12h ETA), Uyumluluk %, Ortalama hız (kn).

2. **4 eksenli filtre rayı** — multi-select chip kümeleri:
   - **Tip:** Konteyner / Tanker / Dökme Yük / Ro-Ro / LNG Tankeri
   - **Durum:** Yaklaşıyor / Yanaştı / Yükleme / Ayrılıyor / Demirde
   - **Yakıt:** HFO / MGO / VLSFO / LNG / Methanol
   - **Severity:** Kritik / Uyarı / Gözlem / Uyumlu
   - **Searchbox:** ad veya IMO numarasına canlı arama

3. **4-up analitik panel** (Chart.js):
   - Tip dağılımı (donut)
   - Yakıt karışımı (clean/dirty stacked bar)
   - Severity breakdown (renkli bar)
   - Hız histogramı (0-5/5-10/10-15/15-20+ kn buckets)

4. **Sıralanabilir vessel tablosu** — Vessel · Tip · Durum · ETA + bağıl zaman · Yakıt · Hız · CO₂/NOₓ/SOₓ mini-bar'lar · Severity · Aktif uyarı sayısı badge.

5. **Detay paneli** — bir gemi seçilince:
   - Profil bloğu (IMO, koordinat, ETA mutlak, dispersion)
   - Sentezlenmiş **24 saatlik emisyon trend grafiği**
   - O gemiye ait aktif uyarılar listesi (öneri ön-izlemesi)

6. **Manuel CRUD** — "Yeni gemi" butonu modal form açar (ad, IMO, tip, yakıt, durum, hız, ETA, dispersion, başlangıç emisyonları). IMO format validatörü, severity otomatik hesaplanır. Düzenle/Sil sadece manuel eklenenlerde.

### 4.3 Emisyonlar Sayfası

**Yol:** `#/emissions` · **Modül:** `js/pages/emissions.js` (1.728 satır)

Hava kalitesi izleme ve uyumluluk analitiği.

**Bölümler:**

1. **5 KPI sparkline'lı kart**
   - CO₂ aggregate + threshold ratio %
   - NOₓ aggregate + threshold
   - SOₓ aggregate + threshold
   - Aralıkta aşım sayısı (history > threshold)
   - Uyumluluk oranı % (≥95 yeşil, 80-95 sarı, <80 kırmızı)

2. **Çoklu kirletici zaman serisi** — tek line chart, 3 dataset (threshold-normalize ölçeklenmiş), her kirletici için yatay eşik çizgisi, range chip'leri (24h/7d/30d/Custom), pollutant chip toggle.

3. **Kaynak attribution doughnut** — anlık emisyonlar için: gemi-kaynaklı (vessel.emissions toplamı) + yardımcı motor + arka plan baseline.

4. **24 saat × kirletici heatmap** — özel `drawHeatmap` Canvas'ı ile yoğunluk haritası, ratio = value/threshold renk geçişi.

5. **Uyumluluk gauges** — her 3 kirletici için:
   - Yatay bar (current/threshold ratio)
   - Aşım sayısı, ortalama, maksimum

6. **6 saat doğrusal projeksiyon** — son 12 noktadan basit linear regression; eşik ihlali öngörülürse kesik dikey çizgi annotation.

7. **Top contributors** — gemi rankingi (CO₂ üretimine göre), top 10 + "tümünü göster". Her satırdan "Gemiler sayfasında aç" → `navigate('vessels', { id })`.

8. **Manuel ölçüm CRUD**
   - Form: timestamp · pollutant · value · unit · source (vessel/dock/measurement_station/other) · vessel_id (opsiyonel) · notes
   - Tablo: tüm manuel kayıtlar, sil

9. **Aktif emisyon uyarıları** — yatay scrollable şerit, `category === 'emissions'` alarmlar, "Uyarı sayfasında aç" CTA.

### 4.4 Karadan Güç Sayfası

**Yol:** `#/shore` · **Modül:** `js/pages/shore.js` (2.322 satır)

Sayfanın bel kemiği üç katmanlı liman yönetimi:

#### 4.4.1 Ana Liman Operasyonu (Top 4)

İzmir körfezinin en büyük 4 limanı — eskiki gibi zengin kart düzeninde:

| Liman | Kategori | Kapasite | Talep |
|---|---|---|---|
| İzmir Limanı | Genel | 16 MW | 9.5 MW |
| Aliağa | Endüstriyel | 14 MW | 8.2 MW |
| Çeşme | Cruise | 10 MW | 5.4 MW |
| Dikili | Genel | 9 MW | 4.2 MW |

Her kart: gemi/durum bilgisi, kw_used vs kw_capacity bar, oturum kümülatif kWh + kg CO₂, "engaged for" süre sayacı, karadan güç toggle butonu.

#### 4.4.2 Seçili Liman Detayı

Liman direktöründen seçildiğinde:
- **Sol:** Tam fonksiyonlu berthCard (toggle, kW bar, oturum)
- **Sağ:** 4 stat-card → Oturum kWh · Önlenen CO₂ (tCO₂) · Kapasite Kullanımı % · Talep Karşılama %
- **Alt:** Özet satır (kategori + kapasite + talep) + "Seçimi temizle"

#### 4.4.3 Liman Direktörü (17 Endüstriyel Terminal)

| # | Liman | Kategori |
|---|---|---|
| 1 | Petkim Limanı | Petrokimya |
| 2 | Tüpraş Limanı | Rafineri |
| 3 | Petrol Ofisi Limanı | Akaryakıt |
| 4 | Total Limanı | Akaryakıt |
| 5 | Alpet Limanı | Akaryakıt |
| 6 | Socar Terminal | Akaryakıt |
| 7 | Ege Gaz Limanı | Gaz |
| 8 | Milangaz Limanı | Gaz |
| 9 | Habaş Limanı | Gaz |
| 10 | Ege Gübre Limanı | Gübre |
| 11 | Ege Çelik Limanı | Çelik |
| 12 | IDÇ Limanı | Çelik |
| 13 | ETKİ Limanı | Genel |
| 14 | Batıliman Limanı | Genel |
| 15 | Nemport Limanı | Konteyner |
| 16 | TCDD İzmir Limanı | Genel |
| 17 | Çeşme Ulusoy Limanı | Cruise |

- **Kategori filtre chip'leri** — Tümü, Petrokimya, Rafineri, Akaryakıt, Gaz, Çelik, Gübre, Konteyner, Cruise, Genel, Endüstriyel (sadece veri içeren kategoriler render olur)
- **Searchbox** — liman adı canlı filtre
- **Compact kartlar** — auto-fill grid, her kartta:
  - Liman adı + kategori badge
  - Vessel + tip (dolu ise)
  - **İki katmanlı KW bar** — arkada brand-soft demand alanı, önde aktif kullanım fill (yeşil-mavi gradient karadan güç aktifse)
  - Durum: yeşil "Karadan güç aktif · X kW" / sarı "Yardımcı motor çalışıyor" / nötr "Boşta"

Kart tıklaması → seçili liman paneli o limanın verileriyle dolar, smooth scroll ile odaklanır.

#### 4.4.4 Diğer Bölümler

- **5 KPI kartı** — Bağlı, Şebeke yükü (MW), Bugün kWh, Bugün önlenen CO₂, Kapasite kullanımı %.
- **Kapasite stacked area chart** — rıhtım başına çekilen güç, son 24h.
- **Aktivasyon ısı haritası** — saatlik aktif/pasif matrisi (Canvas).
- **ROI paneli** — kümülatif önlenen CO₂ + 3 illüstratif eşdeğer (≈ ağaç, ≈ hane, ≈ otoyol km).
- **Akıllı öneriler** — `category === 'shore'` alarmları + dolu fakat karadan güç çekmeyen rıhtımlardan türetilen fırsat kartları, tek tıkla "Uygula".
- **Aktivasyon geçmişi tablosu** — engage/release olayları (modül-yerel), uygulanan öneriler.
- **Manuel berth CRUD** — yeni terminal ekleme.

### 4.5 Uyarı ve Öneriler Sayfası (Flagship)

**Yol:** `#/alerts` · **Modül:** `js/pages/alerts.js` (2.027 satır)

Kural-tabanlı tespit + eyleme dönüşür çözüm — projenin amiral sayfası.

**Bölümler:**

1. **4 KPI** — Açık · Kritik · Bugün çözülen · Ortalama çözüm süresi.

2. **Filtre rayı**
   - Durum (single-select): Açık · Çözülen · Yoksayılan · Ertelenmiş · Tümü
   - Severity (multi-select): Tüm severity tonları
   - Kategori (multi-select): Emisyon · Karadan Güç · Hava · Operasyon · Rapor
   - Searchbox: title + body + actor üzerinde

3. **24h trend chart** — kademe-stack bar (4 dataset: critical/warning/info/success) saat-bazlı.

4. **Kural motoru paneli** — radar chart ile aktif kural ailelerinin tetiklenme yoğunluğu, son tetikleme zamanı, açık alarm sayısı, motor aç/kapa toggle.

5. **Uyarı akışı** — sayfanın en önemli bölümü:
   - Severity-renkli sol şerit + ikon
   - Başlık + body (dinamik params interpolasyonu)
   - Meta: bağıl zaman, hits sayısı (dedup), hedef etiketi
   - **Gömülü öneri kartları** — alt panel olarak:
     - İkon + çevirilmiş etiket (`rec.engage_shore` vs.)
     - Tahmini etki: `~X kg CO₂/h`
     - **"Uygula" butonu** → store action dispatch (örn. shore power engage)
     - "Yoksay" butonu
   - Kart aksiyonları: Çöz (notla) · Yoksay · Ertele 15dk/1s · Hedefte aç (vessels/shore sayfasına navigate)

6. **Çözüm analitiği**
   - Most-applied recommendations (top 8 bar chart)
   - Resolution time histogram (5 bucket: <1m, 1-5m, 5-30m, 30m-1h, >1h) + median + p90

7. **Manuel uyarı oluşturma**
   - title · body · severity · category · target_kind (vessel/dock/aggregate/none) · target_id (dinamik, kind'a göre)
   - Recommendation multi-select (preset id'lerden: engage_shore, reroute_berth, reduce_idle, throttle_inbound, anchor_offshore, wait_for_wind, switch_fuel)
   - Push'lanan alarm `_manual: true` ile etiketlenir; `title_text`/`body_text` raw text olarak saklanır.

### 4.6 Raporlar Sayfası

**Yol:** `#/reports` · **Modül:** `js/pages/reports.js` (1.952 satır)

Kurumsal-grade PDF rapor builder.

**İki sütun layout:**

#### Sol panel — Builder
- **Şablon seçimi** — 6 ön-tanımlı şablon kartı:
  - Yönetici Özeti
  - Uyumluluk Denetimi
  - Operasyon Brifingi
  - Karadan Güç Geri Dönüşü
  - Uyarı Özeti
  - Özel
- **Tarih aralığı** — 24h / 7d / 30d / Özel (datetime-local from-to)
- **Bölüm seçici** — 10 toggle: Kapak · Yönetici Özeti · KPI · Gemiler · Emisyonlar · Karadan Güç · Uyarılar · Zaman Serisi · Uyumluluk · Ek
- **Kirletici filtresi** — CO₂ / NOₓ / SOₓ multi-select chip'leri
- **Severity filtresi** — Kritik/Uyarı/Gözlem
- **Kapak alanları** — başlık · hazırlayan · notlar (textarea)
- **Üret / Sıfırla** butonları + canlı durum çubuğu

#### Sağ panel — Canlı önizleme
A4 sayfa simülasyonu, sol paneldeki seçimleri anında yansıtır:
- Brand'lı kapak kartı + kümülatif tetikleme bullet özet
- KPI grid stat-card'ları
- Vessel mini-tablosu
- Gerçek Chart.js sparkline'ları (CO₂ time series, shore utilization, vb.)
- En son 5 alarm kartı
- Uyumluluk numerik tablosu
- Glossary

#### PDF üretim akışı

Hibrit yaklaşım — `js/utils/pdf.js`:

1. **Unicode font yükleme** — DejaVu Sans Regular + Bold TTF jsdelivr CDN'den fetch edilir, base64'e çevrilir, jsPDF'e `addFileToVFS` + `addFont` ile embed edilir. **Türkçe karakterler** (ş, ğ, ı, İ, ç, ö, ü) doğru render olur. Font cache'lenir, sonraki PDF'lerde anlık.

2. **Programatik üretim**:
   - `cover()` — gradient hero + başlık + meta tablosu
   - `heading()` / `subheading()` / `paragraph()` / `bullet()` — splitTextToSize ile satır kırma
   - `kpiGrid()` — dinamik font-size shrink, 2-satır label wrap
   - `table()` — multi-line cell wrapping, sayfa kesimi sırasında başlığı yeniden çizer

3. **Görsel snapshot'lar** — `pdf.snapshot(domEl)` html2canvas ile 2× DPR'da yakalar, A4 sınırlarına orantılı sığdırır.

4. **CSV export** — sadeleştirilmiş veri CSV olarak indirilir.

5. **Recent reports** — `portiq.recent_reports` localStorage'da meta saklanır (tam PDF blob'u değil), liste üzerinden tekrar config yüklenebilir.

---

## 5. Çapraz-Kesim Özellikler

### 5.1 AI Copilot — Operasyon Asistanı

**Modül:** `js/components/aiCopilot.js`

Sağ slide-in drawer, sağ-altta yeşil nabızlı yıldız FAB.

**Görsel kimlik:**
- Gradient mavi "AI v2" PRO badge
- Yeşil nabız atan "Çevrimiçi" presence dot
- Subtitle: "Çevrimiçi · GPT-5 destekli"
- Footer: 🔒 + "Uçtan uca şifreli · v2.4.1"

**Bağlam-farkındalı yanıt motoru** — gerçek LLM bağlanmadan canlı izlenimi veren deterministic pattern matcher:

| Tetikleyici sözcükler | Yanıt türü |
|---|---|
| co2, karbon | Anlık CO₂, threshold ratio %, son 24h aşım sayısı, top contributing vessel |
| nox, azot | Toplam NOₓ, eşiği aşan gemi listesi |
| sox, kükürt | Toplam SOₓ, scrubber ile öngörülen tasarruf |
| shore, karadan, rıhtım | Aktif rıhtım sayısı, şebeke yükü, fırsat listesi |
| alert, uyarı, kritik | Açık alarm sayısı (severity'ye göre), en son alarm başlığı |
| vessel, gemi, filo | Toplam gemi, durum dağılımı, uyumluluk %, kritik sayısı |
| weather, hava, rüzgar | Rüzgâr + sıcaklık + dağılım riski + tavsiye |
| summary, özet, durum | Liman geneli özet metrikleri |

Yanıtlar `**bold**` + `` `code` `` markdown destekler — metric değerleri vurgulanır.
- Yazma animasyonu doğal (600-1100 ms randomize)
- 4 hızlı öneri chip'i (CO₂ anomali, NOₓ aşım, karadan güç fırsatları, açık kritik uyarılar)
- Esc ile kapatma

### 5.2 Hesap Yönetimi

**Modül:** Sidebar footer + modal

Sidebar'ın altında **tıklanabilir aktif kullanıcı butonu** (avatar + ad + rol + chevron).

**Açılan modal:**
- **Aktif hesap hero kartı** — büyük renkli avatar, "Giriş yapan" etiketi, isim + rol + e-posta + nabızlı yeşil "Aktif" badge
- **Diğer hesaplar listesi** — 3 hardcoded profil:
  - Berk Aydın · 2. Kademe Veri Analisti
  - Ayşe Kara · Çevre Mühendisi
  - Mehmet Yıldız · Liman Müdürü
- Her satır: tıkla → bu hesaba geç (anlık geçiş + audit log kaydı), sağ kırmızı çöp ikonu → confirm → sil
- **"+ Yeni hesap ekle"** — modal form (ad, rol, e-posta), eklenen profil otomatik aktif yapılır, renkli avatar otomatik atanır (5 gradient renk rotasyonu)

**Kalıcılık:** `accounts` slice localStorage'da. Sidebar avatarı + footer ismi + audit log actor alanı aktif hesabı yansıtır.

### 5.3 Audit Log — Denetim Kaydı

**Modül:** `js/engine/logger.js` + `js/components/auditDrawer.js`

Kurumsal-grade salt-okunur etkinlik kaydı.

**Tampering tespiti — Hash zinciri:**
- Her kayıt FNV-1a 32-bit hash içerir: `hash = fnv1a(prev_hash + canonicalize(payload))`
- Bir kayıt değiştirilirse/silinirse/araya eklenirse zincirin geri kalanı eşleşmez
- `verifyChain()` her render'da çalıştırılır → drawer header'ında **yeşil "Bütünlük doğrulandı" / kırmızı "Bütünlük ihlali tespit edildi (kayıt #N)"** banner gösterir

**Tek mutasyon noktası:** `store.dispatch('appendLog', entry)` — silme/düzenleme aksiyonu mevcut değil. Cap 500.

**Otomatik logger'lar (subscribe-tabanlı):**
- Hesap geçişi / ekleme / silme
- Karadan güç engage/release (her berth ayrı kayıt)
- Manuel gemi ekle/sil/güncelle
- Manuel emisyon ölçümü ekle/sil
- Uyarı çöz / yoksay
- Tema / dil değişikliği
- Sistem boot

**Demo seed:** İlk açılışta audit_log boşsa, son 6 saata yayılmış 12 inandırıcı kayıt seed'lenir (sistem boot → sign-in → karadan güç → CO₂ ölçümü → alarm çözümü → gemi ekleme → tema değişim → vs.). Hash zinciri başlangıçtan itibaren doğru kurulur.

**Drawer UI:**
- Topbar'daki **saat/history ikonuyla** açılır (Esc ile kapanır)
- Header: gradient ikon + "Etkinlik Kaydı" + 🔒 "Salt-okunur · Hash zinciri ile doğrulanır"
- Bütünlük şeridi (yeşil/kırmızı)
- Toolbar: searchbox + 7 kategori chip'i (Tümü / Hesap / Operasyon / Veri / Uyarı / Rapor / Sistem)
- Liste: kategori-renkli sol şerit, actor avatarı (renk-tonu), aktör adı + aksiyon metni, kategori badge, bağıl zaman, 6-haneli hash
- Footer: kayıt sayısı + son hash + **CSV indir** butonu

### 5.4 Tema (Açık / Koyu Mod)

**Modül:** `css/main.css` token sistemi + topbar toggle

- `:root` ve `:root[data-theme="light"]` selektörleri ile token override
- Tüm yüzeyler/border'lar/text'ler değişkenden okur — sıfır hardcoded hex
- Chart.js renkleri runtime'da `getComputedStyle()` ile çözülür → tema değişince grafikler de adapte
- Light modda elevation shadow, dark modda glow tercih edilmiştir
- **FOUC yok:** `index.html` head'inde inline bootstrap script CSS yüklenmeden önce `data-theme` attribute'unu set eder
- Topbar'da güneş/ay ikon butonu

### 5.5 Çok Dil — TR / EN

**Modül:** `js/i18n.js`

- 600+ anahtar, TR + EN tam parite
- Ortak anahtarlar (brand, common, topbar, ops, status, type, dispersion, account, audit) merkezi sözlükte
- Sayfa-özel anahtarlar `registerStrings({ tr, en })` ile sayfa modülünden eklenir → çakışma sıfır
- `t(key, params)` interpolasyon: `{name}`, `{count}` gibi placeholder'lar
- `Intl.NumberFormat`, `toLocaleDateString` ile **lokal sayı/tarih formatı**
- `toLocaleUpperCase('tr-TR')` ile başlıklarda doğru Türkçe büyük harf
- Topbar'da `[ TR | EN ]` segmented control
- localStorage tercih saklama (`portiq.lang`)
- Dil değişikliği `'ui'` slice'ı tetikler — tüm bileşenler yeniden render olur, simülasyon kesintisiz devam eder

### 5.6 Simülasyon Motoru

**Modül:** `js/engine/simulation.js` (208 satır)

Mock veri seedleyici + canlı tick motoru.

**Seed:**
- 8 vessel — 12 isimden rastgele örnek (MSC Olivia, Maersk Stellar, İzmir Express, Anadolu Star, Karaburun Pioneer, …)
- 21 berth — `BERTH_DEFS` array'inden tier + category + kapasite + talep ile
- 48 noktalı emisyon geçmişi (gentle wave + noise = inandırıcı baseline)
- İzmir körfezi koordinatları (38.40-38.50°N, 27.05-27.20°E)

**Tick (her 3.5 sn):**
- Vessel emisyonları perturbasyon + severity yeniden hesaplanır
- Aggregate emissions = vessel.emissions toplamı + history kayar
- Hava: rüzgâr drift + bazen yön değişimi → dispersion_risk auto
- Shore power: aktif rıhtımların kw_used'i drift, total_kw + total_co2_saved_kg recompute
- Meta: tick_count++, last_tick

### 5.7 Alert Engine — Kural Motoru

**Modül:** `js/engine/alertEngine.js` (248 satır)

5 kural ailesi sürekli simülasyon tick'ini değerlendirir:

| Kural | Tetikleyici | Üretilen öneri |
|---|---|---|
| **Aggregate exceedance** | Liman geneli CO₂/NOₓ/SOₓ > threshold | throttle_inbound + engage_shore |
| **Aggregate elevated** | Liman geneli ratio ≥ 0.85 | engage_shore + reduce_idle |
| **Vessel CO₂** | Tek gemi CO₂ > 70 kg/h | switch_fuel + reduce_idle |
| **Shore opportunity** | Dolu rıhtım, karadan güç pasif | engage_shore (kw + co2 hesaplı) |
| **Dispersion risk** | weather=high + vessel docked/anchored | wait_for_wind + anchor_offshore |
| **ETA conflict** | Yaklaşan gemi <60dk + boş rıhtım yok | reroute_berth + anchor_offshore |

**Throttling:** 4.5 sn'de max 1 evaluate, signature-bazlı dedupe (aynı alarm tekrar tetiklenmez, hits++ olur).

**Auto-resolve:** Engine sönen koşulları otomatik resolve eder (örn. CO₂ threshold altına inerse) — drawer'da "Çözüldü · auto" işaretiyle görünür.

### 5.8 Persistence — Kalıcılık Katmanı

**Modül:** `js/store/persistence.js`

localStorage'a yazılan slice'lar:
- `ui` (tema, dil, audit drawer state)
- `manual_vessels`
- `manual_readings`
- `report_config`
- `recommendations` (uygulananlar)
- `settings`
- `accounts`
- `audit_log` (hash zinciri ile)

**Hidrasyon:** Boot'ta `hydrate()` her slice'ı okuyup store'a yazar; nesne shape'leri shallow-merge edilir (yeni alanlar eklendiğinde eski local kayıtlar bozulmaz).

**Auto-save:** `attach()` her persisted slice'a subscribe olur; her değişiklikte sessiz kayıt.

**Sıfırla:** Topbar'daki yenile ikonu → `confirm` modal → tüm `portiq.*` anahtarları silinir → reload.

### 5.9 PDF Altyapısı

**Modül:** `js/utils/pdf.js` (497 satır)

| Bileşen | Detay |
|---|---|
| Kütüphaneler | jsPDF 2.5.1 + html2canvas 1.4.1 (CDN, defer) |
| Font | DejaVu Sans Regular + Bold (jsdelivr CDN) |
| Türkçe desteği | Tam — ş/ğ/ı/İ/ç/ö/ü doğru |
| Sayfa boyutu | A4 portre (210×297 mm), 14mm margin |
| Sayfa header | Brand banner + başlık (sağ) + alt çizgi |
| Sayfa footer | Sayfa #, "İzmir Büyükşehir Belediyesi", tarih |
| Programatik öğeler | `cover`, `heading`, `subheading`, `paragraph`, `bullet`, `kpiGrid`, `table`, `divider`, `pageBreak` |
| Görsel öğe | `snapshot(domEl)` html2canvas ile 2× DPR yakalama |
| Tablo akıllılığı | Hücre içi multi-line wrap, dinamik satır yüksekliği, sayfa kesimi ile başlık yeniden çizimi |
| KPI grid akıllılığı | Label 2-satır wrap, value font-size dinamik shrink (14pt → 9pt) |
| Locale | `toLocaleUpperCase('tr-TR')` ile başlıklarda doğru büyük harf |

---

## 6. Tasarım Sistemi

### 6.1 Renk paleti

| Rol | Token | Değer |
|---|---|---|
| Marka — İzmir mavisi | `--brand-primary` | `#009DC4` |
| Marka — koyu | `--brand-primary-deep` | `#006B8C` |
| Marka — parlak | `--brand-primary-bright` | `#4FC3DD` |
| Başarı | `--status-success` | `#1D9E75` (dark) / `#0E7C5C` (light) |
| Uyarı | `--status-warning` | `#BA7517` (dark) / `#985E0F` (light) |
| Kritik | `--status-critical` | `#E24B4A` (dark) / `#C03534` (light) |
| Bilgi | `--status-info` | brand-primary'ye eşit |

### 6.2 Tipografi

- **Sans-serif:** Inter, SF Pro Display, system-ui
- **Mono:** JetBrains Mono, Fira Code, ui-monospace
- 11 boyut tokenı (10px → 48px)
- 4 ağırlık (regular/medium/semibold/bold)

### 6.3 Layout primitives

- **App shell** — `grid-template-areas: "sidebar topbar" "sidebar main"` 232px+1fr × 60px+1fr
- **Bento grid** — `repeat(4, 1fr)` KPI şeridi, `repeat(auto-fill, minmax(220px, 1fr))` rıhtım grid'i
- **Page-grid utilities** — `.page-grid-2/3/4` responsive sütun
- 4 breakpoint: 1280 / 1180 / 960 / 720 px

### 6.4 Etkileşim primitives

- **Modal** — overlay + scale-in animasyon + Esc kapatma + form builder
- **Form** — text/number/select/textarea/datetime/checkbox/email + canlı validasyon
- **Chip** — multi-select, range chip, filter chip varyantları
- **Button** — primary/ghost/success/danger/outline + sm/lg
- **Badge** — 4 ton (success/warning/critical/info) + neutral
- **Stat card** — KPI öğesi, ton + trend + meta line
- **Empty state** — ikon + başlık + body, dashed border

---

## 7. Veri Modeli (Store Slice'ları)

| Slice | İçerik | Kalıcı? |
|---|---|---|
| `vessels` | 8 canlı AIS gemi | Hayır (her boot reseed) |
| `manual_vessels` | Kullanıcı eklediği gemiler | **Evet** |
| `weather` | Rüzgâr, sıcaklık, dağılım riski | Hayır |
| `emissions` | CO₂/NOₓ/SOₓ × {current, history[48], threshold} | Hayır |
| `manual_readings` | Kullanıcı emisyon ölçümleri | **Evet** |
| `shore_power` | 21 dock + total_kw + total_co2_saved + history | Hayır |
| `alerts` | Açık + çözülmüş alarm feed | **Evet** |
| `recommendations` | Uygulanan öneriler logu | **Evet** |
| `copilot` | Drawer state + mesajlar + öneriler | Hayır |
| `meta` | tick_count, sim_status, started_at | Hayır |
| `ui` | language, theme, audit_open | **Evet** |
| `report_config` | Rapor builder seçimleri | **Evet** |
| `route` | { id, params } — router'dan | Hayır |
| `settings` | sim_paused, alert_engine_enabled | **Evet** |
| `accounts` | { active_id, list[] } | **Evet** |
| `audit_log` | Hash zincirli kayıtlar | **Evet** |

---

## 8. Güvenlik ve Bütünlük

### 8.1 Audit log tampering tespiti

- **FNV-1a 32-bit hash** her kayıtta + `prev_hash` referansı
- Canonicalized payload (JSON.stringify with sorted keys, hash/prev_hash hariç)
- `verifyChain()` chronological walk:
  ```
  prev = '00000000'
  for each entry (oldest first):
    expected = fnv1a(prev + canonicalize(entry))
    if entry.prev_hash != prev OR entry.hash != expected: BROKEN
    prev = entry.hash
  ```
- Drawer header'da yeşil/kırmızı banner + bozulan kayıt indeksi

### 8.2 Append-only enforcement

- `state.js` action listesinde `appendLog` dışında log mutasyonu yok
- `audit_log` slice'a hiçbir component direkt yazmaz; her zaman `store.dispatch('appendLog', …)` üzerinden
- Cap 500 kayıt — eski kayıtlar `slice(0, 500)` ile rolloff (zincir hâlâ tutarlı)

### 8.3 Kullanıcı verisi sınırı

- Tüm veri client-side (localStorage); sunucu-tarafı yok
- Topbar "Sıfırla" butonu kullanıcıya tüm veriyi temizleme imkânı sunar
- Storage anahtar prefix'i `portiq.*` — rebrand sırasında bile kullanıcı tercihleri korundu

---

## 9. Çalıştırma

```bash
cd /Users/ozcan/dev/izq_hackathon_project
python3 -m http.server 5173
# tarayıcı: http://localhost:5173
```

ES modules `file://` protokolünde çalışmaz, basit bir HTTP server gerekli (`python3 -m http.server`, `npx serve`, vs.).

**İlk açılışta:**
1. Inline bootstrap script tema + dil tercihini set eder → CSS değişkenleri doğru paint olur (FOUC yok)
2. localStorage hidrasyon → manuel veriler + audit log + tercihler yüklenir
3. Sidebar + topbar + copilot + audit drawer mount edilir
4. Simulation + alert engine + logger çalışmaya başlar
5. Chart.js yüklendikten sonra router default route'u (`#/dashboard`) mount eder

**Kullanıcı etkileşimleri:**
- Sidebar nav → URL hash güncellenir, route mount/unmount
- Topbar TR/EN, güneş/ay, audit history, sıfırla butonları
- Sağ-altta yeşil pingli AI Copilot FAB
- Sidebar footer → hesap yöneticisi modalı

---

## 10. Dosya Envanteri

### 10.1 Kök + CSS

| Dosya | Satır | Açıklama |
|---|---|---|
| `index.html` | ~50 | Tek giriş + early bootstrap |
| `css/main.css` | 211 | Token + tema + reset |
| `css/layout.css` | 196 | App shell + bento + page-root |
| `css/components.css` | 1.300+ | Shared bileşenler |
| `css/pages.css` | 119 | Sayfalar arası utility |

### 10.2 JavaScript

| Dosya | Satır | Açıklama |
|---|---|---|
| `js/main.js` | 73 | Bootstrap orkestratör |
| `js/router.js` | 86 | Hash-tabanlı SPA router |
| `js/i18n.js` | 600+ | TR/EN sözlük + registerStrings |
| `js/store/state.js` | 350+ | Proxy + Pub/Sub store + actions |
| `js/store/persistence.js` | 70 | localStorage adaptör |
| `js/engine/simulation.js` | 230+ | Mock veri motoru |
| `js/engine/alertEngine.js` | 248 | 5 kural ailesi |
| `js/engine/logger.js` | 285 | Hash-zincirli audit logger |
| `js/utils/format.js` | 111 | Locale-aware formatlayıcı |
| `js/utils/charts.js` | 272 | Tema-farkındalı Chart.js fabrika |
| `js/utils/modal.js` | 267 | Modal + form builder |
| `js/utils/validate.js` | 37 | Form validatörler |
| `js/utils/pdf.js` | 497 | jsPDF + html2canvas + Türkçe |
| `js/components/sidebar.js` | 230+ | Nav + hesap yöneticisi |
| `js/components/topbar.js` | 130+ | Pills + toggles + audit btn |
| `js/components/kpiWidget.js` | 208 | Dashboard KPI sparkline |
| `js/components/operationsMatrix.js` | 198 | Dashboard tablo |
| `js/components/shorePowerGrid.js` | 143 | Dashboard kompakt rıhtım |
| `js/components/aiCopilot.js` | 315 | Production AI asistan |
| `js/components/auditDrawer.js` | 230+ | Audit drawer + CSV |
| `js/pages/registry.js` | 48 | Route → modül map |
| `js/pages/dashboard.js` | 43 | Bento composer |
| `js/pages/vessels.js` | **1.348** | Filo yönetimi |
| `js/pages/emissions.js` | **1.728** | Hava kalitesi |
| `js/pages/shore.js` | **2.322** | Karadan güç + 21 liman |
| `js/pages/alerts.js` | **2.027** | Uyarı flagship |
| `js/pages/reports.js` | **1.952** | PDF builder |
| **Toplam** | **~16.161** | |

---

## 11. Sunum Konuşma Notları

> Aşağıdaki noktalar sunum sırasında her bölüm için anlatılabilecek özlü vurgu cümleleridir.

### 11.1 Açılış (30 sn)

> "İZPORT, İzmir körfezindeki **21 limanın** karadan güç orkestrasyonunu, hava kalitesi izlemesini ve uyumluluk denetimini tek bir kurumsal panelden yöneten bir gerçek-zamanlı operasyon zekâsı platformudur. Saf vanilya web teknolojileriyle, **hiçbir framework olmadan** geliştirildi — sıfır build adımı, tek bir HTTP server ile çalışır."

### 11.2 İzmir BŞB kurumsal kimlik (15 sn)

> "Marka kimliği İzmir mavisi `#009DC4` üzerine kurulu. Sidebar logosu **İZP** ile İzmir+Port'u tek yuvarlak nişanda birleştiriyor. Açık ve koyu mod arasında atomik geçiş — kontrol odası kullanımı için koyu varsayılan, yönetici brifingleri için açık alternatif."

### 11.3 Çok dilli (10 sn)

> "Tam **TR/EN paritesi**, 600+ çeviri anahtarı, lokal sayı ve tarih formatları. Türkçe büyük harf dahi `toLocaleUpperCase('tr-TR')` ile doğru — örneğin 'i' harfi 'İ' olarak çevriliyor."

### 11.4 6 sayfa turu (1.5 dk)

> "Gösterge Paneli operasyon merkezini tek bakışta sunar. Gemiler sayfasında 4 eksenli filtre + 4 analitik grafik + drill-down detay paneli vardır. Emisyonlar sayfası multi-pollutant zaman serisi, uyumluluk gauge, 6 saat doğrusal projeksiyon ve manuel ölçüm girişi sağlar. Karadan Güç sayfasında **21 İzmir limanı** üç katmanlı yapıda yönetilir — 4 büyük liman üstte, 17 endüstriyel terminal kategori filtreli direktöryde, seçilen limanın tam verileri ortada. Uyarı sayfası kural motorunun ürettiği alarmları **gömülü çözüm önerileriyle** sunar — tek tıkla 'Uygula' butonu store action dispatch eder. Raporlar sayfası 6 şablon, canlı önizleme ve **Türkçe karakter destekli PDF** üretimi sağlar."

### 11.5 Üç teknik fark (45 sn)

> "Birinci fark: **Bağlam-farkındalı AI asistan** — gerçek bir LLM bağlantısı olmadan canlı izlenimi veriyor. Kullanıcı 'co2 anomali' diye sorduğunda asistan store'dan gerçek metric çekiyor: 'CO₂ analizi — Şu anki toplam 47.2 t/h (limit 52). %91 seviyesinde. En yüksek katkı: MSC Olivia.'

> İkinci fark: **5 kural ailesi** ile çalışan otomatik uyarı motoru, her uyarıda en az 1-2 **uygulanabilir öneri** üretir. Operatör tek tıkla karadan gücü etkinleştirebiliyor, kural motoru sönen koşulları auto-resolve ediyor.

> Üçüncü fark: **Hash-zincirli audit log**. Her kayıt FNV-1a hash'i ve önceki kaydın hash'ini içerir. Kullanıcı F12 ile localStorage'da bir kaydı düzenlerse drawer header'ı anında 'Bütünlük ihlali tespit edildi · kayıt #N' uyarısı gösterir. Kurumsal denetim için tampering-evidence sağlar."

### 11.6 Kapanış (15 sn)

> "Tüm manuel veri girişleri ve tercihler localStorage'da kalıcı. Topbar'daki sıfırla butonuyla operatör veriyi temizleyebilir. **6 sayfa, 21 liman, 32 dosya, 16.000 satır kod** — gerçek bir kurumsal panel hissi veren, sıfır framework bağımlılığıyla çalışan bir referans uygulama."

---

## 12. Gelecek Genişletmeler

| Öncelik | Özellik | Etki |
|---|---|---|
| Yüksek | LLM endpoint bağlantısı | AI Copilot gerçek conversational hale gelir |
| Yüksek | AIS canlı veri akışı | Simülasyonu gerçek dünya verisiyle değiştir |
| Orta | Kullanıcı yetkilendirme + roller | Hesap yöneticisini gerçek auth'a bağla |
| Orta | Audit log sunucu replikasyonu | Hash zincirini sunucu-tarafına yansıt |
| Orta | Çoklu liman deployment | Sadece İzmir değil — tüm Türkiye limanları |
| Düşük | Mobil responsive iyileştirme | Tablet/mobil için drawer + nav iyileştirme |
| Düşük | Yazdırma stilleri | Sayfaları doğrudan tarayıcı print'inden çıktı al |
| Düşük | Webhook entegrasyonu | Slack/Teams/email alarm bildirimi |

---

## 13. Lisans ve Atıf

| Bileşen | Lisans |
|---|---|
| Proje kodu | Talep üzerine — İzmir BŞB lisansına bağlı |
| Chart.js | MIT |
| jsPDF | MIT |
| html2canvas | MIT |
| DejaVu Sans | Public domain (license fonts.dejavu) |
| Inter / JetBrains Mono | OFL — sistem fontu olarak kullanılıyor |

---

## 14. İletişim ve Destek

Proje sahibi: **İzmir Büyükşehir Belediyesi · Liman Operasyonları**
Geliştirme: **PORT.IQ İzmir takımı**
Demo URL: localhost:5173 (HTTP server gerektirir)

---

> **İZPORT — Türkiye'nin Ege Denizi'ndeki en büyük liman havzasının dijital kontrol odası.**
> *Aliağa'dan Çeşme'ye, 21 terminalde tek panel.*
