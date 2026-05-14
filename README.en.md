<div align="center">

[🇹🇷 Türkçe](./README.md) · **🇬🇧 English**

# 🌊 İZPORT

### Port Operations Intelligence — Concept Demo

![Status](https://img.shields.io/badge/Status-Concept_Demo-orange?style=flat-square)
![License](https://img.shields.io/badge/License-CC_BY--NC--ND_4.0-lightgrey?style=flat-square)
![Hackathon](https://img.shields.io/badge/Hackathon-Hackability_2026-blue?style=flat-square)
![Made with](https://img.shields.io/badge/Made_with-Vanilla_JS-yellow?style=flat-square)
![Backend](https://img.shields.io/badge/Backend-None-success?style=flat-square)
![Languages](https://img.shields.io/badge/UI-TR_%7C_EN-informational?style=flat-square)

**İzQ Hackability 2026 · Sustainability, AI, and Coding**

</div>

---

> ⚠️ **Concept demo. This is not a real application. Please read the disclaimer below before sharing.**

---

## ⚠️ Important Disclaimer

This work is a concept demonstration developed in **12 hours** on **9 May 2026** as part of the **"Hackability — Sustainability, AI, and Coding"** competition organized by the **İzQ Entrepreneurship Center**.

**This is not a real application.**

- This project has **no official affiliation, endorsement, or sponsorship** from **İzmir Metropolitan Municipality**, **İZPORT Port Operations**, **İzmir Development Agency**, or any of the companies referenced (Petkim, Tüpraş, SOCAR, TCDD, Petrol Ofisi, Total, Alpet, Ege Gaz, Milangaz, Habaş, Ege Gübre, Ege Çelik, IDÇ, ETKİ, Batıliman, Nemport, Ulusoy) or global shipping lines (MSC, Maersk, Evergreen, CMA, COSCO, ONE, HMM, NYK).

- Some sectoral data is **inspired by publicly available publications from the İzmir Development Agency (İZKA)**; all vessel names, real-time emission values, terminal capacities, operator profiles, and alert scenarios are **entirely fictional and illustrative** — they do not reflect the actual operational performance of these organizations.

- All trademarks, company names, and institutional references appear solely for **concept demonstration purposes**; all rights belong to their respective owners.

**Team:** Team-6

---

## 📚 Table of Contents

- [📋 About](#-about)
- [🎯 Concept and Vision](#-concept-and-vision)
- [✨ Highlights](#-highlights)
- [🛠️ Tech Stack](#️-tech-stack)
- [🚀 Quick Start](#-quick-start)
- [📄 Pages](#-pages)
- [📁 Project Structure](#-project-structure)
- [📊 Data Model and Attribution](#-data-model-and-attribution)
- [🏆 Competition Context](#-competition-context)
- [⚖️ License](#️-license)
- [™️ Trademark Notice](#️-trademark-notice)
- [🙏 Acknowledgments](#-acknowledgments)
- [📧 Contact](#-contact)

---

## 📋 About

İZPORT is a conceptual **emissions and operations intelligence dashboard** for İzmir port operations. It showcases shore-power orchestration, air-quality monitoring, a rule-based alert engine, hash-chained audit logging, and PDF report generation through a realistic UI. All data is fictional and produced by a local simulation engine.

---

## 🎯 Concept and Vision

Operational intelligence for a wide port basin like the Gulf of İzmir could typically involve a hardware layer such as:

- Air-quality sensors installed at port berths (PM2.5, NOₓ, SOₓ)
- Vessel AIS telemetry receivers
- Shore-power (cold ironing) infrastructure telemetry
- Meteorological stations (wind, temperature, humidity)
- Operator desktop workstations

This project is a **UX concept** of what users could encounter on a panel if such a system were deployed.

In a real implementation:

- Data sources (sensors, AIS feeds, etc.) would be real
- The software could be rewritten in a different language, framework, or architecture
- Feature scope and UX decisions could be entirely different based on requirements

The purpose of this repository is not to provide a finished product, production infrastructure, or implementation recommendation — but to **make the UI/UX of the concept tangible**. All decisions were first-pass approaches made within a 12-hour competition.

---

## ✨ Highlights

- **Realistic port operations panel** — 21 ports, 12 vessels, 4 operator profiles, shore-power grid, rule engine
- **Simulation engine** — 3.5-second tick loop; emissions, weather, and vessel status update live
- **Rule-based alert engine** — 5 rule families (aggregate exceedance, dispersion risk, ETA conflict, etc.), each alert carries actionable recommendations
- **Hash-chained audit log** — FNV-1a hash for tampering detection, read-only activity log
- **AI Operations Copilot** — context-aware deterministic reply engine (live-data assistant impression without a real LLM)
- **Turkish-character PDF report generation** — jsPDF + DejaVu Sans embed, 6 templates
- **Bilingual UI** — 600+ i18n keys, full TR/EN parity, locale-aware numbers and dates
- **Light and dark theme** — atomic switching, FOUC-preventing early bootstrap
- **localStorage persistence** — manual entries, preferences, audit log survive across sessions
- **Responsive design** — desktop-first, mobile-presentable (4 breakpoints: 1280 / 1180 / 720 / 480 px)

---

## 🛠️ Tech Stack

| Layer | Choice | Note |
|---|---|---|
| **Language** | JavaScript (ES6+ modules) | Native module system |
| **Framework** | None | Pure vanilla HTML5 + CSS3 + JS |
| **Styling** | CSS Custom Properties + Grid + Flex | Token-based theming, zero preprocessor |
| **Charts** | [Chart.js](https://www.chartjs.org/) 4.4.1 | Theme-aware, runtime color resolution |
| **PDF** | [jsPDF](https://github.com/parallax/jsPDF) 2.5.1 + [html2canvas](https://html2canvas.hertzen.com/) 1.4.1 | DejaVu Sans embed for Turkish characters |
| **Fonts** | Inter, JetBrains Mono, DejaVu Sans | System fonts + jsdelivr CDN |
| **Backend** | **None** | Fully client-side, zero server |
| **Build** | **None** | Run with `python3 -m http.server` |
| **Persistence** | localStorage | Manual data, preferences, audit log |

---

## 🚀 Quick Start

ES modules do not run on `file://`; a simple HTTP server is required.

```bash
# 1. Clone the repository
git clone https://github.com/OzcanOrhanDemirci/IzQ_IzPort_Hackathon.git
cd IzQ_IzPort_Hackathon

# 2. Start a local HTTP server (Python 3)
python3 -m http.server 5173

# 3. Open in browser
# http://localhost:5173
```

Alternative servers: `npx serve`, `php -S localhost:5173`, etc.

A disclaimer pop-up appears on first load. Click "I Understand" to proceed. The pop-up is shown every session.

---

## 📄 Pages

The application consists of 6 main pages, managed by a hash-based SPA router.

### 🟢 Dashboard

**Route:** `#/dashboard`

Operations center at a glance. Bento-box CSS Grid layout presents all key metrics and vessel status.

**Sections:**

- KPI strip (4 cells): CO₂, NOₓ, SOₓ aggregate sparkline cards + shore-power CO₂ avoided
- Operations matrix: 4-axis filtered vessel table (status, fuel, severity, dispersion)
- Shore-power grid: compact berth grid with instant toggle

**UX highlights:**

- Sparklines show 24-hour trends with %± delta annotations
- Theme-aware colors (success/info/warning/critical tones)
- Operation status at a single glance

### 🟢 Vessels

**Route:** `#/vessels`

Complete operational view of the fleet.

**Sections:**

- 5 KPI cards (total, docked, approaching, compliance %, average speed)
- 4-axis filter rail (type, status, fuel, severity) + live searchbox
- 4-up analytics panel: donut, stacked bar, severity breakdown, speed histogram
- Sortable vessel table (12 columns: name, type, status, ETA, fuel, speed, CO₂/NOₓ/SOₓ mini-bars, severity, alert badge)
- Detail panel: profile block + 24-hour emission trend + active alerts
- Manual vessel entry form (IMO format validation, auto-calculated severity)

**UX highlights:**

- Multi-select filter chips for quick drill-down
- Live search on IMO number or vessel name
- Edit/delete for manual vessels; view-only for simulation vessels

### 🟢 Emissions (Air Quality)

**Route:** `#/emissions`

Air-quality monitoring and compliance analytics.

**Sections:**

- 5 KPI sparkline cards (CO₂, NOₓ, SOₓ threshold ratios, breach count, compliance rate)
- Multi-pollutant time series (3 datasets, threshold-normalized, horizontal threshold lines)
- Source attribution doughnut (vessel-sourced + auxiliary engine + baseline)
- 24-hour × pollutant heatmap (Canvas, ratio color gradient)
- Compliance gauges (horizontal bars for 3 pollutants)
- 6-hour linear projection (linear regression, threshold-violation annotation)
- Top contributors ranking (highest-emitting vessels)
- Manual measurement CRUD form

**UX highlights:**

- Range selection (24h / 7d / 30d / Custom)
- Pollutant chip toggle (CO₂, NOₓ, SOₓ multi-select)
- Detail-level color coding (success/warning/critical)

### 🟢 Shore Power

**Route:** `#/shore`

21 İzmir ports managed in three-tier structure.

**Sections:**

- 5 KPI cards (connected docks, grid load MW, today's kWh, CO₂ avoided, capacity utilization %)
- Main port operations (4 major ports): rich card layout, vessel/status, kw_used vs kw_capacity bar, session cumulative kWh + CO₂
- Selected port detail: full berth card + 4 stat cards (session kWh, CO₂ avoided, capacity utilization, demand fulfillment)
- Port directory: 17 industrial terminals in category-filterable grid (Petrochemical, Refinery, Fuel, Gas, Steel, Fertilizer, Container, Cruise)
- Capacity stacked area chart (24-hour power draw per berth)
- Activation heatmap (hourly active/passive matrix)
- ROI panel (CO₂ avoided + illustrative equivalents: trees, households, highway km)
- Smart recommendations (opportunity detection on occupied berths without shore power)
- Activation history table

**UX highlights:**

- Category filter chips in directory (only categories with data are rendered)
- One-click shore-power engage/release toggle
- Card click smooth-scrolls and focuses the detail panel

### 🟢 Alerts and Recommendations

**Route:** `#/alerts`

Rule-based detection + actionable resolutions. The flagship page.

**Sections:**

- 4 KPIs (open, critical, resolved today, average resolution time)
- Filter rail (status, severity, category multi-select + searchbox)
- 24h trend chart (severity-stacked bar)
- Rule engine panel (radar chart of active rule-family trigger intensity)
- Alert feed: severity-colored left rail, title + body, meta info, hit count, embedded recommendation cards
- Resolution analytics (most-applied recommendations, resolution-time histogram + median + p90)
- Manual alert creation form

**UX highlights:**

- Each alert has an embedded "Apply" button that dispatches a store action (e.g., shore-power engage)
- Subsiding conditions auto-resolve
- Snooze (15min / 1h) and open-in-target (navigate to vessels/shore page)

### 🟢 Reports

**Route:** `#/reports`

Enterprise-grade PDF report builder.

**Sections:**

- Left panel — Builder: 6 templates (Executive Summary, Compliance Audit, Operations Briefing, Shore-Power ROI, Alert Summary, Custom), date range, 10-section toggles, pollutant filter, severity filter, cover fields
- Right panel — Live preview: A4 page simulation, cover + KPI grid + vessel mini-table + Chart.js sparklines + recent alerts + compliance table
- PDF generation: DejaVu Sans Turkish-character support, programmatic primitives (cover, heading, table, kpiGrid), html2canvas snapshots, page-break management
- CSV export
- Recent reports list (metadata in localStorage)

**UX highlights:**

- Left panel selections reflect instantly in the right panel
- Turkish characters (ş, ğ, ı, İ, ç, ö, ü) render correctly in PDF
- Multi-line table cell wrapping, header redrawn on page break

---

## 📁 Project Structure

35 files · ~16,000 lines of code · zero build step.

```
IzQ_IzPort_Hackathon/
├── .gitignore                          # Git exclusion list
├── LICENSE                             # CC BY-NC-ND 4.0 license text
├── README.md                           # Turkish version (default)
├── README.en.md                        # This file (English)
├── İZPORT-PROJE-RAPORU.md              # Detailed technical report (TR)
├── index.html                          # Single entry point + early bootstrap
│
├── css/
│   ├── main.css                        # Design tokens, theme variables, reset
│   ├── layout.css                      # App shell grid + responsive breakpoints
│   ├── components.css                  # Shared components (modal, table, sidebar, etc.)
│   └── pages.css                       # Cross-page shared utilities
│
└── js/
    ├── main.js                         # Bootstrap orchestrator
    ├── router.js                       # Hash-based SPA router
    ├── i18n.js                         # TR/EN dictionaries + registerStrings API
    │
    ├── store/
    │   ├── state.js                    # Proxy + Pub/Sub central state store
    │   └── persistence.js              # localStorage hydration + auto-save
    │
    ├── engine/
    │   ├── simulation.js               # Mock data engine (3.5s tick)
    │   ├── alertEngine.js              # 5 rule families → alert + recommendation
    │   └── logger.js                   # Hash-chained audit logger
    │
    ├── utils/
    │   ├── format.js                   # Locale-aware number/date/duration formatter
    │   ├── charts.js                   # Theme-aware Chart.js factories
    │   ├── modal.js                    # Modal + form builder (with validation)
    │   ├── validate.js                 # Form validators
    │   └── pdf.js                      # jsPDF + html2canvas + DejaVu Sans
    │
    ├── components/
    │   ├── sidebar.js                  # Left nav + account switcher
    │   ├── topbar.js                   # Top bar: pills + toggles + audit
    │   ├── kpiWidget.js                # Dashboard KPI sparkline cards
    │   ├── operationsMatrix.js         # Dashboard vessel table
    │   ├── shorePowerGrid.js           # Dashboard compact berth grid
    │   ├── aiCopilot.js                # Right AI assistant drawer
    │   ├── auditDrawer.js              # Right audit log drawer
    │   └── disclaimer.js               # Opening popup + bottom footer band
    │
    └── pages/
        ├── registry.js                 # Route → module map
        ├── dashboard.js                # Bento composer
        ├── vessels.js                  # Fleet management
        ├── emissions.js                # Air quality
        ├── shore.js                    # Shore power + 21 ports
        ├── alerts.js                   # Alerts flagship
        └── reports.js                  # PDF builder
```

---

## 📊 Data Model and Attribution

The entire application state is split into 16 slices, managed by a Proxy + Pub/Sub pattern.

| Slice | Content | Persisted (localStorage) |
|---|---|---|
| `vessels` | 8 simulation vessels | No (reseeded on each boot) |
| `manual_vessels` | User-added vessels | **Yes** |
| `weather` | Wind, temperature, dispersion risk | No |
| `emissions` | CO₂/NOₓ/SOₓ × {current, history[48], threshold} | No |
| `manual_readings` | User emission measurements | **Yes** |
| `shore_power` | 21 docks + total_kw + total_co2_saved + history | No |
| `alerts` | Open + resolved alert feed | **Yes** |
| `recommendations` | Applied recommendations log | **Yes** |
| `copilot` | Drawer state + messages + suggestions | No |
| `meta` | tick_count, sim_status, started_at | No |
| `ui` | language, theme, audit_open | **Yes** |
| `report_config` | Report builder selections | **Yes** |
| `route` | { id, params } from router | No |
| `settings` | sim_paused, alert_engine_enabled | **Yes** |
| `accounts` | { active_id, list[] } | **Yes** |
| `audit_log` | Hash-chained entries | **Yes** |

### Data Source

Some sectoral data (port count, terminal categories, etc.) is inspired by publicly available publications from the **İzmir Development Agency (İZKA)**. All real-time operational data is generated deterministically by `js/engine/simulation.js`.

---

## 🏆 Competition Context

| | |
|---|---|
| **Competition** | Hackability — Sustainability, AI, and Coding |
| **Date** | 9 May 2026 |
| **Duration** | 12 hours |
| **Organizer** | İzQ Entrepreneurship Center |
| **Team** | Team-6 |

---

## ⚖️ License

This project is licensed under the **[Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International (CC BY-NC-ND 4.0)](https://creativecommons.org/licenses/by-nc-nd/4.0/)** license.

**Summary:**

- ✅ **You may view** — read the source code
- ✅ **You may clone and run locally** — for personal / educational evaluation
- ✅ **You may share the unmodified work with attribution**
- ❌ **No commercial use** — selling, monetization, customer demos, commercial product integration
- ❌ **No modifications or derivative works** — code fragments may not be used in other projects
- ❌ **Attribution and disclaimer must not be removed**

For the full license text, see **[LICENSE](./LICENSE)**.

Third-party libraries (Chart.js, jsPDF, html2canvas, DejaVu Sans) retain their original licenses.

---

## ™️ Trademark Notice

All trademarks, company names, institutions, and vessel names referenced in this project (including but not limited to İZPORT, İBB, İZKA, Petkim, Tüpraş, SOCAR, TCDD, Petrol Ofisi, Total, Alpet, Ege Gaz, Milangaz, Habaş, Ege Gübre, Ege Çelik, IDÇ, ETKİ, Batıliman, Nemport, Ulusoy, MSC, Maersk, Evergreen, CMA, COSCO, ONE, HMM, NYK) are used solely for concept demonstration purposes. **All related marks and rights belong to their respective owners.** This project is not endorsed, sponsored by, or affiliated with any of the organizations mentioned.

---

## 🙏 Acknowledgments

- **[İzQ Entrepreneurship Center](https://izqgirisimcilik.com/)** — for organizing the Hackability 2026 competition
- **[İzmir Development Agency (İZKA)](https://www.izka.org.tr/)** — for the inspiring publicly available sector publications
- **[Chart.js](https://www.chartjs.org/)** — all charts and sparklines
- **[jsPDF](https://github.com/parallax/jsPDF)** + **[html2canvas](https://html2canvas.hertzen.com/)** — PDF generation infrastructure
- **[DejaVu Sans](https://dejavu-fonts.github.io/)** — font with Turkish character support

---

## 📧 Contact

**Developer:** Özcan Orhan Demirci
**GitHub:** [@OzcanOrhanDemirci](https://github.com/OzcanOrhanDemirci)

For questions or feedback, please open a GitHub Issue.

---

<div align="center">

**Made for İzQ Hackability 2026 · 9 May 2026 · Team-6**

[🇹🇷 Türkçe oku](./README.md)

</div>
