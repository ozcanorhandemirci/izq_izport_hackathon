<div align="center">

**🇹🇷 Türkçe** · [🇬🇧 English](./README.en.md)

# 🌊 İZPORT

### Liman Operasyon Zekâsı — Konsept Demo

![Status](https://img.shields.io/badge/Status-Concept_Demo-orange?style=flat-square)
![License](https://img.shields.io/badge/License-CC_BY--NC--ND_4.0-lightgrey?style=flat-square)
![Hackathon](https://img.shields.io/badge/Hackathon-Hackability_2026-blue?style=flat-square)
![Made with](https://img.shields.io/badge/Made_with-Vanilla_JS-yellow?style=flat-square)
![Backend](https://img.shields.io/badge/Backend-None-success?style=flat-square)
![Languages](https://img.shields.io/badge/UI-TR_%7C_EN-informational?style=flat-square)

**İzQ Hackability 2026 · Sürdürülebilirlik, Yapay Zeka ve Kodlama**

</div>

---

> ⚠️ **Konsept demo. Gerçek bir uygulama değildir. Lütfen aşağıdaki disclaimer'ı okumadan paylaşmayınız.**

---

## ⚠️ Önemli Uyarı / Disclaimer

Bu çalışma, **İzQ Girişimcilik Merkezi** tarafından düzenlenen **"Hackability — Sürdürülebilirlik, Yapay Zeka ve Kodlama"** yarışması kapsamında **9 Mayıs 2026** tarihinde **12 saatte** geliştirilmiş bir konsept fikir gösterimidir.

**Bu bir gerçek uygulama değildir.**

- **İzmir Büyükşehir Belediyesi**, **İZPORT Liman İşletmeciliği**, **İzmir Kalkınma Ajansı** ve adı geçen tüm şirketler (Petkim, Tüpraş, SOCAR, TCDD, Petrol Ofisi, Total, Alpet, Ege Gaz, Milangaz, Habaş, Ege Gübre, Ege Çelik, IDÇ, ETKİ, Batıliman, Nemport, Ulusoy) ile global armatörler (MSC, Maersk, Evergreen, CMA, COSCO, ONE, HMM, NYK) ile bu projenin **hiçbir resmi bağı, onayı veya sponsorluğu yoktur**.

- Bazı sektörel veriler **İzmir Kalkınma Ajansı'nın kamuya açık yayınlarından ilham almıştır**; tüm gemi adları, anlık emisyon değerleri, terminal kapasiteleri, çalışan profilleri ve uyarı senaryoları **tamamen kurgusal ve illustratiftir** — bu kuruluşların gerçek operasyonel performansını yansıtmaz.

- Adı geçen tüm marka, şirket ve kurum adları yalnızca **konsept gösterimi amacıyla** kullanılmıştır; ilgili haklar sahiplerine aittir.

**Takım:** Takım-6

---

## 📚 İçindekiler

- [📋 Hakkında](#-hakkında)
- [🎯 Konsept ve Vizyon](#-konsept-ve-vizyon)
- [✨ Öne Çıkanlar](#-öne-çıkanlar)
- [🛠️ Teknoloji](#️-teknoloji)
- [🚀 Hızlı Başlangıç](#-hızlı-başlangıç)
- [📄 Sayfalar](#-sayfalar)
- [📁 Proje Yapısı](#-proje-yapısı)
- [📊 Veri Modeli ve Atıf](#-veri-modeli-ve-atıf)
- [🏆 Yarışma Bağlamı](#-yarışma-bağlamı)
- [⚖️ Lisans](#️-lisans)
- [™️ Marka Uyarısı](#️-marka-uyarısı)
- [🙏 Teşekkürler](#-teşekkürler)
- [📧 İletişim](#-iletişim)

---

## 📋 Hakkında

İZPORT, İzmir liman operasyonları için kavramsal bir **emisyon ve operasyon zekâsı paneli**dir. Karadan güç orkestrasyonu, hava kalitesi izleme, kural-tabanlı uyarı motoru, hash-zincirli denetim kaydı ve PDF rapor üretimi gibi senaryoları gerçekçi bir UI ile sergiler. Tüm veriler kurgusaldır ve yerel bir simülasyon motoru tarafından üretilir.

---

## 🎯 Konsept ve Vizyon

İzmir körfezi gibi geniş bir liman havzasında operasyonel zekâ için tipik olarak şu donanım katmanı düşünülebilir:

- Liman rıhtımlarına yerleştirilmiş hava kalitesi sensörleri (PM2.5, NOₓ, SOₓ)
- Gemi AIS telemetri alıcıları
- Karadan güç (cold ironing) altyapı telemetrisi
- Meteoroloji istasyonları (rüzgâr, sıcaklık, nem)
- Operatör masaüstü iş istasyonları

Bu proje, böyle bir sistem kurulduğunda kullanıcının **nasıl bir panel ile karşılaşabileceğine dair bir UX kavramı**dır.

Gerçek bir uygulamada:

- Veri kaynakları (sensörler, AIS akışları vb.) gerçek olur
- Yazılım farklı dil, framework veya mimari ile yeniden yazılabilir
- Özellik kapsamı ve UX kararları ihtiyaca göre tamamen değişebilir

Bu repo'nun amacı hazır bir ürün, production altyapısı veya implementasyon önerisi sunmak değil — kavramın **UI/UX olarak nasıl görünebileceğini somutlaştırmak**tır. Tüm kararlar 12 saatlik bir yarışma kapsamında verilmiş ilk-yaklaşımlardır.

---

## ✨ Öne Çıkanlar

- **Gerçekçi liman operasyon paneli** — 21 liman, 12 gemi, 4 operatör profili, karadan güç şebekesi, kural motoru
- **Simülasyon motoru** — 3.5 saniye tick döngüsü; emisyonlar, hava ve gemi durumu canlı olarak güncellenir
- **Kural-tabanlı uyarı motoru** — 5 kural ailesi (aggregate exceedance, dispersion risk, ETA conflict, vb.), her uyarıda eyleme dönüşür öneriler
- **Hash-zincirli denetim kaydı** — FNV-1a hash ile tampering tespiti, salt-okunur etkinlik logu
- **AI Operasyon Asistanı** — bağlam-farkındalı deterministic yanıt motoru (canlı veri-bağlantılı asistan izlenimi, gerçek LLM kullanılmıyor)
- **Türkçe karakter destekli PDF rapor üretimi** — jsPDF + DejaVu Sans embed, 6 farklı şablon
- **Bilingual UI** — 600+ i18n anahtarı, TR/EN tam parite, lokal sayı ve tarih formatları
- **Açık ve koyu tema** — atomik geçiş, FOUC önlemli early bootstrap
- **localStorage kalıcılığı** — manuel girişler, tercihler, denetim kaydı oturumlar arası korunur
- **Responsive tasarım** — desktop birinci, mobil sunulabilir (4 breakpoint: 1280 / 1180 / 720 / 480 px)

---

## 🛠️ Teknoloji

| Katman | Seçim | Not |
|---|---|---|
| **Dil** | JavaScript (ES6+ modules) | Native module sistemi |
| **Framework** | Yok | Saf vanilya HTML5 + CSS3 + JS |
| **Stil** | CSS Custom Properties + Grid + Flex | Tema değişkenleri, sıfır preprocessor |
| **Grafik** | [Chart.js](https://www.chartjs.org/) 4.4.1 | Tema-farkındalı, runtime renk çözümü |
| **PDF** | [jsPDF](https://github.com/parallax/jsPDF) 2.5.1 + [html2canvas](https://html2canvas.hertzen.com/) 1.4.1 | Türkçe karakter desteği için DejaVu Sans embed |
| **Font** | Inter, JetBrains Mono, DejaVu Sans | System font + Google Fonts + jsdelivr CDN |
| **Backend** | **Yok** | Tamamen client-side, sıfır sunucu |
| **Build** | **Yok** | `python3 -m http.server` ile çalıştırılır |
| **Kalıcılık** | localStorage | Manuel veri, tercihler, denetim kaydı |

---

## 🚀 Hızlı Başlangıç

ES modules `file://` protokolünde çalışmaz; basit bir HTTP server gerekir.

```bash
# 1. Repo'yu klonla
git clone https://github.com/OzcanOrhanDemirci/IzQ_IzPort_Hackathon.git
cd IzQ_IzPort_Hackathon

# 2. Yerel HTTP server başlat (Python 3)
python3 -m http.server 5173

# 3. Tarayıcıdan aç
# http://localhost:5173
```

Alternatif sunucular: `npx serve`, `php -S localhost:5173`, vb.

İlk açılışta bir disclaimer pop-up'ı belirir. "Anladım" butonuna basarak devam edebilirsiniz. Pop-up her oturumda tekrar gösterilir.

---

## 📄 Sayfalar

Uygulama 6 ana sayfadan oluşur; hash-tabanlı bir SPA router ile yönetilir.

### 🟢 Gösterge Paneli (Dashboard)

**Yol:** `#/dashboard`

Operasyon merkezi tek-bakışta. Bento-box CSS Grid yerleşimi ile tüm önemli metrikleri ve gemilerin durumunu sunar.

**Bölümler:**

- KPI şeridi (4 hücre): CO₂, NOₓ, SOₓ aggregate sparkline kartları + Karadan güç önlenen CO₂
- Operasyon matrisi: 4 eksenli filtreli vessel tablosu (durum, fuel, severity, dispersion)
- Karadan güç şebekesi: kompakt rıhtım grid'i, anlık toggle

**UX vurguları:**

- Sparkline'lar 24 saatlik eğilimi gösterir, %± delta annotation
- Tema-farkındalı renkler (success/info/warning/critical tonları)
- Tek bakışta operasyon durumu

### 🟢 Gemiler (Vessels)

**Yol:** `#/vessels`

Filonun tüm operasyonel görünümü.

**Bölümler:**

- 5 KPI kartı (toplam, yanaşan, yaklaşan, uyumluluk %, ortalama hız)
- 4 eksenli filtre rayı (tip, durum, yakıt, severity) + canlı searchbox
- 4-up analitik panel: donut, stacked bar, severity breakdown, hız histogramı
- Sıralanabilir vessel tablosu (12 sütun: ad, tip, durum, ETA, yakıt, hız, CO₂/NOₓ/SOₓ mini-bar'lar, severity, uyarı badge)
- Detay paneli: profil bloğu + 24 saatlik emisyon trendi + aktif uyarılar
- Manuel gemi ekleme formu (IMO format validation, severity auto-calc)

**UX vurguları:**

- Multi-select filter chip'leri ile hızlı drill-down
- IMO numarasına veya gemi adına canlı arama
- Manuel eklenen gemilerde edit/sil; simülasyon gemilerinde sadece görüntüleme

### 🟢 Emisyonlar (Air Quality)

**Yol:** `#/emissions`

Hava kalitesi izleme ve uyumluluk analitiği.

**Bölümler:**

- 5 KPI sparkline kartı (CO₂, NOₓ, SOₓ threshold ratio'ları, aşım sayısı, uyumluluk oranı)
- Çoklu kirletici zaman serisi (3 dataset, threshold-normalize, yatay eşik çizgileri)
- Kaynak attribution doughnut (gemi-kaynaklı + yardımcı motor + baseline)
- 24 saat × kirletici heatmap (Canvas, ratio renk geçişi)
- Uyumluluk gauge'ları (3 kirletici için yatay bar)
- 6 saat doğrusal projeksiyon (linear regression, threshold ihlali annotation)
- Top contributors ranking (en yüksek emisyon üreten gemiler)
- Manuel ölçüm CRUD formu

**UX vurguları:**

- Aralık seçimi (24h / 7d / 30d / Özel)
- Kirletici chip toggle (CO₂, NOₓ, SOₓ multi-select)
- Detay seviyesinde renk-kodlama (success/warning/critical)

### 🟢 Karadan Güç (Shore Power)

**Yol:** `#/shore`

21 İzmir limanı üç katmanlı yapıda yönetilir.

**Bölümler:**

- 5 KPI kartı (bağlı dock sayısı, şebeke yükü MW, bugün kWh, önlenen CO₂, kapasite kullanımı %)
- Ana liman operasyonu (4 büyük liman): zengin kart düzeni, gemi/durum, kw_used vs kw_capacity bar, oturum kümülatif kWh + CO₂
- Seçili liman detayı: tam berthCard + 4 stat-card (oturum kWh, önlenen CO₂, kapasite kullanımı, talep karşılama)
- Liman direktörü: 17 endüstriyel terminal kategori filter'lı grid (Petrokimya, Rafineri, Akaryakıt, Gaz, Çelik, Gübre, Konteyner, Cruise)
- Kapasite stacked area chart (24 saatlik rıhtım başına çekilen güç)
- Aktivasyon ısı haritası (saatlik aktif/pasif matrisi)
- ROI paneli (önlenen CO₂ + illüstratif eşdeğerler: ağaç, hane, otoyol km)
- Akıllı öneriler (dolu fakat karadan güç çekmeyen rıhtımlardan fırsat tespiti)
- Aktivasyon geçmişi tablosu

**UX vurguları:**

- Liman direktörü'nde kategori filter chip'leri (sadece veri içeren kategoriler render olur)
- Tek tıkla karadan güç engage/release toggle
- Kart tıklaması smooth-scroll ile detay paneline odaklanır

### 🟢 Uyarı ve Öneriler (Alerts & Recommendations)

**Yol:** `#/alerts`

Kural-tabanlı tespit + eyleme dönüşür çözüm. Projenin amiral sayfası.

**Bölümler:**

- 4 KPI (açık, kritik, bugün çözülen, ortalama çözüm süresi)
- Filtre rayı (durum, severity, kategori multi-select + searchbox)
- 24h trend chart (severity-stacked bar)
- Kural motoru paneli (radar chart ile aktif kural ailelerinin tetiklenme yoğunluğu)
- Uyarı akışı: severity-renkli sol şerit, başlık + body, meta info, hit sayısı, gömülü öneri kartları
- Çözüm analitiği (most-applied recommendations, resolution time histogram + median + p90)
- Manuel uyarı oluşturma formu

**UX vurguları:**

- Her uyarıda gömülü "Uygula" butonu store action dispatch eder (örn. shore power engage)
- Sönen koşullar auto-resolve olur
- Snooze (15dk / 1s) ve hedefte aç (vessels/shore sayfasına navigate)

### 🟢 Raporlar (Reports)

**Yol:** `#/reports`

Kurumsal-grade PDF rapor builder.

**Bölümler:**

- Sol panel — Builder: 6 şablon (Yönetici Özeti, Uyumluluk Denetimi, Operasyon Brifingi, Karadan Güç ROI, Uyarı Özeti, Özel), tarih aralığı, 10 bölüm toggle, kirletici filtresi, severity filtresi, kapak alanları
- Sağ panel — Canlı önizleme: A4 sayfa simülasyonu, kapak + KPI grid + vessel mini-tablosu + Chart.js sparkline'ları + son alarmlar + uyumluluk tablosu
- PDF üretim akışı: DejaVu Sans Türkçe karakter desteği, programatik primitives (cover, heading, table, kpiGrid), html2canvas snapshot, sayfa kesimi yönetimi
- CSV export
- Recent reports listesi (localStorage'da meta)

**UX vurguları:**

- Sol panel seçimleri sağ panele anında yansır
- Türkçe karakterler (ş, ğ, ı, İ, ç, ö, ü) PDF'te doğru render olur
- Multi-line table cell wrapping, sayfa kesimi sırasında başlık yeniden çizilir

---

## 📁 Proje Yapısı

35 dosya · ~16.000 satır kod · sıfır build adımı.

```
IzQ_IzPort_Hackathon/
├── .gitignore                          # Git dışlama listesi
├── LICENSE                             # CC BY-NC-ND 4.0 lisans metni
├── README.md                           # Bu dosya (Türkçe)
├── README.en.md                        # İngilizce versiyon
├── İZPORT-PROJE-RAPORU.md              # Detaylı teknik rapor (TR)
├── index.html                          # Tek giriş noktası + early bootstrap
│
├── css/
│   ├── main.css                        # Design tokenları, tema değişkenleri, reset
│   ├── layout.css                      # App shell grid + responsive breakpoint'ler
│   ├── components.css                  # Shared bileşenler (modal, table, sidebar, vb.)
│   └── pages.css                       # Sayfalar arası ortak utility'ler
│
└── js/
    ├── main.js                         # Bootstrap orkestratör
    ├── router.js                       # Hash-tabanlı SPA router
    ├── i18n.js                         # TR/EN sözlük + registerStrings API
    │
    ├── store/
    │   ├── state.js                    # Proxy + Pub/Sub merkezi state store
    │   └── persistence.js              # localStorage hydration + auto-save
    │
    ├── engine/
    │   ├── simulation.js               # Mock veri motoru (3.5 sn tick)
    │   ├── alertEngine.js              # 5 kural ailesi → uyarı + öneri üretici
    │   └── logger.js                   # Hash-zincirli audit logger
    │
    ├── utils/
    │   ├── format.js                   # Locale-aware sayı/tarih/süre formatlayıcı
    │   ├── charts.js                   # Tema-farkındalı Chart.js fabrikaları
    │   ├── modal.js                    # Modal + form builder (validation ile)
    │   ├── validate.js                 # Form validatörleri
    │   └── pdf.js                      # jsPDF + html2canvas + DejaVu Sans
    │
    ├── components/
    │   ├── sidebar.js                  # Sol nav + hesap yöneticisi
    │   ├── topbar.js                   # Üst çubuk: pills + toggle'lar + denetim
    │   ├── kpiWidget.js                # Dashboard KPI sparkline kartları
    │   ├── operationsMatrix.js         # Dashboard vessel tablosu
    │   ├── shorePowerGrid.js           # Dashboard kompakt rıhtım izgarası
    │   ├── aiCopilot.js                # Sağ AI asistan drawer
    │   ├── auditDrawer.js              # Sağ denetim kaydı drawer
    │   └── disclaimer.js               # Açılış popup + alt footer band
    │
    └── pages/
        ├── registry.js                 # Route → modül haritası
        ├── dashboard.js                # Bento composer
        ├── vessels.js                  # Filo yönetimi
        ├── emissions.js                # Hava kalitesi
        ├── shore.js                    # Karadan güç + 21 liman
        ├── alerts.js                   # Uyarı flagship
        └── reports.js                  # PDF builder
```

---

## 📊 Veri Modeli ve Atıf

Tüm uygulama state'i 16 slice'a bölünmüştür; Proxy + Pub/Sub pattern ile yönetilir.

| Slice | İçerik | Kalıcı (localStorage) |
|---|---|---|
| `vessels` | 8 simülasyon gemisi | Hayır (her boot reseed) |
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

### Veri Kaynağı

Bazı sektörel veriler (liman sayısı, terminal kategorileri vb.) **İzmir Kalkınma Ajansı (İZKA)** kamuya açık yayınlarından ilham almıştır. Anlık operasyonel veriler ise tamamen `js/engine/simulation.js` tarafından deterministik olarak üretilir.

---

## 🏆 Yarışma Bağlamı

| | |
|---|---|
| **Yarışma** | Hackability — Sürdürülebilirlik, Yapay Zeka ve Kodlama |
| **Tarih** | 9 Mayıs 2026 |
| **Süre** | 12 saat |
| **Düzenleyen** | İzQ Girişimcilik Merkezi |
| **Takım** | Takım-6 |

---

## ⚖️ Lisans

Bu proje **[Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International (CC BY-NC-ND 4.0)](https://creativecommons.org/licenses/by-nc-nd/4.0/)** lisansı altındadır.

**Kısa özet:**

- ✅ **Görüntüleyebilirsiniz** — kaynak kodu okuyabilirsiniz
- ✅ **Klonlayıp yerelde çalıştırabilirsiniz** — kişisel/eğitsel değerlendirme için
- ✅ **Atıf vererek olduğu gibi paylaşabilirsiniz**
- ❌ **Ticari kullanım yapamazsınız** — satış, monetize, müşteri demosu, ticari ürün entegrasyonu
- ❌ **Değiştiremezsiniz veya türev eser oluşturamazsınız** — kod parçaları başka projelerde kullanılamaz
- ❌ **Atıfı veya disclaimer'ı kaldıramazsınız**

Tam lisans metni için: **[LICENSE](./LICENSE)** dosyasına bakın.

3rd-party kütüphaneler (Chart.js, jsPDF, html2canvas, DejaVu Sans) kendi orijinal lisanslarını korur.

---

## ™️ Marka Uyarısı

Bu projede adı geçen tüm marka, şirket, kurum ve gemi adları (örnek: İZPORT, İBB, İZKA, Petkim, Tüpraş, SOCAR, TCDD, Petrol Ofisi, Total, Alpet, Ege Gaz, Milangaz, Habaş, Ege Gübre, Ege Çelik, IDÇ, ETKİ, Batıliman, Nemport, Ulusoy, MSC, Maersk, Evergreen, CMA, COSCO, ONE, HMM, NYK) yalnızca konsept gösterimi amacıyla kullanılmıştır. **İlgili tüm marka ve haklar sahiplerine aittir.** Bu proje, bahsi geçen hiçbir kuruluş tarafından onaylanmamış, sponsor olunmamış ya da bağlı değildir.

---

## 🙏 Teşekkürler

- **[İzQ Girişimcilik Merkezi](https://izqgirisimcilik.com/)** — Hackability 2026 yarışmasını düzenlediği için
- **[İzmir Kalkınma Ajansı (İZKA)](https://www.izka.org.tr/)** — İlham veren kamuya açık sektör yayınları için
- **[Chart.js](https://www.chartjs.org/)** — Tüm grafik ve sparkline'lar
- **[jsPDF](https://github.com/parallax/jsPDF)** + **[html2canvas](https://html2canvas.hertzen.com/)** — PDF üretim altyapısı
- **[DejaVu Sans](https://dejavu-fonts.github.io/)** — Türkçe karakter desteği için font

---

## 📧 İletişim

**Geliştirici:** Özcan Orhan Demirci
**GitHub:** [@OzcanOrhanDemirci](https://github.com/OzcanOrhanDemirci)

Sorularınız veya geri bildirimleriniz için GitHub Issues üzerinden iletişime geçebilirsiniz.

---

<div align="center">

**Made for İzQ Hackability 2026 · 9 May 2026 · Team-6**

[🇬🇧 Read in English](./README.en.md)

</div>
