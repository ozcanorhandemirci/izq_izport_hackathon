# İZPORT — Hackability 2026 Konsept Demosu

> ⚠️ **Konsept demo. Gerçek bir uygulama değildir. Lütfen aşağıdaki uyarıyı okumadan paylaşmayınız.**

---

## ⚠️ Önemli Uyarı / Disclaimer (Türkçe)

Bu çalışma, **İzQ Girişimcilik Merkezi** tarafından düzenlenen **"Hackability — Sürdürülebilirlik, Yapay Zeka ve Kodlama"** yarışması kapsamında **9 Mayıs 2026** tarihinde **12 saatte** geliştirilmiş bir konsept fikir gösterimidir.

**Bu bir gerçek uygulama değildir.**

- **İzmir Büyükşehir Belediyesi**, **İZPORT Liman İşletmeciliği**, **İzmir Kalkınma Ajansı** ve adı geçen tüm şirketler (Petkim, Tüpraş, SOCAR, TCDD, Petrol Ofisi, Total, Alpet, Ege Gaz, Milangaz, Habaş, Ege Gübre, Ege Çelik, IDÇ, ETKİ, Batıliman, Nemport, Ulusoy) ile global armatörler (MSC, Maersk, Evergreen, CMA, COSCO, ONE, HMM, NYK) ile bu projenin **hiçbir resmi bağı, onayı veya sponsorluğu yoktur**.

- Bazı sektörel veriler **İzmir Kalkınma Ajansı'nın kamuya açık yayınlarından ilham almıştır**; tüm gemi adları, anlık emisyon değerleri, terminal kapasiteleri, çalışan profilleri ve uyarı senaryoları **tamamen kurgusal ve illustratiftir** — bu kuruluşların gerçek operasyonel performansını yansıtmaz.

- Adı geçen tüm marka, şirket ve kurum adları yalnızca **konsept gösterimi amacıyla** kullanılmıştır; ilgili haklar sahiplerine aittir.

**Takım:** Takım-6

---

## Yarışma Bağlamı

| | |
|---|---|
| **Yarışma** | Hackability — Sürdürülebilirlik, Yapay Zeka ve Kodlama |
| **Tarih** | 9 Mayıs 2026 |
| **Süre** | 12 saat |
| **Düzenleyen** | İzQ Girişimcilik Merkezi |
| **Takım** | Takım-6 |

## Proje Hakkında

İzmir liman operasyonları için kavramsal bir **emisyon ve operasyon zekâsı paneli**dir. Karadan güç orkestrasyonu, hava kalitesi izleme, kural-tabanlı uyarı motoru, hash-zincirli denetim kaydı ve PDF rapor üretimi gibi senaryoları gerçekçi bir UI ile sergiler.

**Tüm veriler kurgusaldır.** Hiçbir gerçek operasyonel veri, gerçek emisyon ölçümü veya gerçek gemi telemetrisi içermez.

## 6 Sayfa

| Sayfa | İçerik |
|---|---|
| **Gösterge Paneli** | KPI şeridi + operasyon matrisi + karadan güç şebekesi |
| **Gemiler** | 4 eksenli filtre + 4 analitik grafik + detay paneli (manuel CRUD) |
| **Emisyonlar** | Çoklu kirletici zaman serisi, uyumluluk gauge, 6 saat doğrusal projeksiyon |
| **Karadan Güç** | 21 liman üç katmanlı yapıda — 4 büyük + 17 endüstriyel terminal |
| **Uyarı ve Öneriler** | Kural motoru + gömülü uygulanabilir çözüm önerileri |
| **Raporlar** | 6 şablon, canlı önizleme, Türkçe karakter destekli PDF üretimi |

## Teknoloji

- **Saf vanilya JavaScript** (ES6+ modules, sıfır framework)
- **Chart.js, jsPDF, html2canvas** (public CDN üzerinden)
- **DejaVu Sans** Türkçe karakter desteği için
- **Hiçbir backend, API veya sunucu yok** — tamamen client-side
- **localStorage** kalıcı tercihler ve manuel girişler için

## Çalıştırma

ES modules `file://` protokolünde çalışmaz; basit bir HTTP server gerekir:

```bash
python3 -m http.server 5173
```

Sonra tarayıcıdan: `http://localhost:5173`

Alternatif: `npx serve`, `php -S localhost:5173` vb.

## Veri Kaynağı ve Atıf

Bazı sektörel veriler **İzmir Kalkınma Ajansı (İZKA)** açık yayınlarından ilham almıştır. Tüm anlık operasyonel veriler ise simülasyon motoru tarafından **deterministik olarak üretilir** (`js/engine/simulation.js`).

İlham kaynağı atfı: İzmir Kalkınma Ajansı kamuya açık raporları.

## Marka ve Atıf Uyarısı

Bu projede adı geçen tüm marka, şirket, kurum ve gemi adları (örnek: İZPORT, İBB, Petkim, Tüpraş, SOCAR, TCDD, MSC, Maersk vb.) yalnızca konsept gösterimi amacıyla kullanılmıştır. **İlgili tüm marka ve haklar sahiplerine aittir.** Bu proje, bahsi geçen hiçbir kuruluş tarafından onaylanmamış, sponsor olunmamış ya da bağlı değildir.

---

# İZPORT — Hackability 2026 Concept Demo

> ⚠️ **Concept demo. This is not a real application. Please read the disclaimer below before sharing.**

---

## ⚠️ Important Disclaimer (English)

This work is a concept demonstration developed in **12 hours** on **9 May 2026** as part of the **"Hackability — Sustainability, AI, and Coding"** competition organized by the **İzQ Entrepreneurship Center**.

**This is not a real application.**

- This project has **no official affiliation, endorsement, or sponsorship** from **İzmir Metropolitan Municipality**, **İZPORT Port Operations**, **İzmir Development Agency**, or any of the companies referenced (Petkim, Tüpraş, SOCAR, TCDD, Petrol Ofisi, Total, Alpet, Ege Gaz, Milangaz, Habaş, Ege Gübre, Ege Çelik, IDÇ, ETKİ, Batıliman, Nemport, Ulusoy) or global shipping lines (MSC, Maersk, Evergreen, CMA, COSCO, ONE, HMM, NYK).

- Some sectoral data is **inspired by publicly available publications from the İzmir Development Agency (İZKA)**; all vessel names, real-time emission values, terminal capacities, operator profiles, and alert scenarios are **entirely fictional and illustrative** — they do not reflect the actual operational performance of these organizations.

- All trademarks, company names, and institutional references appear solely for **concept demonstration purposes**; all rights belong to their respective owners.

**Team:** Team-6

---

## Competition Context

| | |
|---|---|
| **Competition** | Hackability — Sustainability, AI, and Coding |
| **Date** | 9 May 2026 |
| **Duration** | 12 hours |
| **Organizer** | İzQ Entrepreneurship Center |
| **Team** | Team-6 |

## About the Project

A conceptual **emissions and operations intelligence dashboard** for İzmir port operations. It showcases shore-power orchestration, air-quality monitoring, a rule-based alert engine, hash-chained audit logging, and PDF report generation through a realistic UI.

**All data is fictional.** No real operational data, real emission readings, or real vessel telemetry is included.

## 6 Pages

| Page | Content |
|---|---|
| **Dashboard** | KPI strip + operations matrix + shore-power grid |
| **Vessels** | 4-axis filters + 4 analytics charts + detail panel (manual CRUD) |
| **Emissions** | Multi-pollutant time series, compliance gauges, 6-hour linear projection |
| **Shore Power** | 21 ports in 3 tiers — 4 major + 17 industrial terminals |
| **Alerts & Recommendations** | Rule engine + embedded actionable resolutions |
| **Reports** | 6 templates, live preview, Turkish-character PDF generation |

## Technology

- **Pure vanilla JavaScript** (ES6+ modules, zero frameworks)
- **Chart.js, jsPDF, html2canvas** (via public CDN)
- **DejaVu Sans** for Turkish character support
- **No backend, API, or server** — fully client-side
- **localStorage** for persistent preferences and manual entries

## Running

ES modules cannot run on `file://`; a simple HTTP server is required:

```bash
python3 -m http.server 5173
```

Then in browser: `http://localhost:5173`

Alternatives: `npx serve`, `php -S localhost:5173`, etc.

## Data Source and Attribution

Some sectoral data is inspired by **publicly available publications from the İzmir Development Agency (İZKA)**. All real-time operational data is **generated deterministically** by the simulation engine (`js/engine/simulation.js`).

Inspiration credit: İzmir Development Agency public reports.

## Trademark Notice

All trademarks, company names, institutions, and vessel names referenced in this project (e.g., İZPORT, İBB, Petkim, Tüpraş, SOCAR, TCDD, MSC, Maersk, etc.) are used solely for concept demonstration purposes. **All related marks and rights belong to their respective owners.** This project is not endorsed, sponsored by, or affiliated with any of the organizations mentioned.
