/**
 * i18n.js — Lightweight translation layer.
 *
 * - Two dictionaries (tr, en); keys use dot notation.
 * - Reads current language from the central store's `ui` slice.
 * - Components subscribe to the `ui` slice to re-render on language change.
 * - Persists language + theme to localStorage and writes the chosen theme to
 *   `documentElement.dataset.theme` so CSS variables can swap atomically.
 * - `registerStrings(extra)` lets pages contribute their own keys at module
 *   load time, keeping per-page strings co-located with their UI code.
 */

import store from './store/state.js';

const STORAGE_LANG  = 'portiq.lang';
const STORAGE_THEME = 'portiq.theme';

const DEFAULT_LANG  = 'tr';
const DEFAULT_THEME = 'dark';

/* ============================================================ */
const dictionaries = {
  tr: {
    /* brand */
    'brand.name':         'İZPORT',
    'brand.subtitle':     'İzmir Liman Operasyonları Kurumsal Yönetim Paneli',
    'brand.tag':          '',
    'brand.attribution':  'İzmir Liman Konsept Demosu',

    /* disclaimer (legal / demo indicators) */
    'disclaimer.popup.title':       'Konsept Demo · Hackability 2026',
    'disclaimer.popup.intro':       'Bu çalışma, İzQ Girişimcilik Merkezi tarafından düzenlenen "Hackability — Sürdürülebilirlik, Yapay Zeka ve Kodlama" yarışması kapsamında 9 Mayıs 2026 tarihinde 12 saatte geliştirilmiş bir konsept fikir gösterimidir.',
    'disclaimer.popup.warning':     '⚠️ Bu gerçek bir uygulama değildir.',
    'disclaimer.popup.bullet1':     'İzmir Büyükşehir Belediyesi, İZPORT Liman İşletmeciliği, İzmir Kalkınma Ajansı ve adı geçen tüm şirketler (Petkim, Tüpraş, SOCAR, TCDD, Petrol Ofisi, Total, Alpet, Ege Gaz, Milangaz, Habaş, Ege Gübre, Ege Çelik, IDÇ, ETKİ, Batıliman, Nemport, Ulusoy) ile global armatörler (MSC, Maersk, Evergreen, CMA, COSCO, ONE, HMM, NYK) ile bu projenin hiçbir resmi bağı, onayı veya sponsorluğu yoktur.',
    'disclaimer.popup.bullet2':     'Bazı sektörel veriler İzmir Kalkınma Ajansı\'nın kamuya açık yayınlarından ilham almıştır; tüm gemi adları, anlık emisyon değerleri, terminal kapasiteleri, çalışan profilleri ve uyarı senaryoları tamamen kurgusal ve illustratiftir.',
    'disclaimer.popup.bullet3':     'Adı geçen tüm marka, şirket ve kurum adları yalnızca konsept gösterimi amacıyla kullanılmıştır; ilgili haklar sahiplerine aittir.',
    'disclaimer.popup.team':        'Takım: Takım-6',
    'disclaimer.popup.acknowledge': 'Anladım',
    'disclaimer.footer.text':       'Konsept Demo · Tüm veriler kurgusaldır · Hackability 9 Mayıs 2026 · İzQ Girişimcilik Merkezi · Takım-6',
    'disclaimer.badge':             'DEMO',

    /* sidebar */
    'sidebar.section.live':      'Canlı',
    'sidebar.section.workspace': 'Çalışma Alanı',
    'nav.dashboard':             'Gösterge Paneli',
    'nav.vessels':               'Gemiler',
    'nav.emissions':             'Emisyonlar',
    'nav.shore':                 'Karadan Güç',
    'nav.alerts':                'Uyarı ve Öneriler',
    'nav.reports':               'Raporlar',
    'nav.settings':              'Ayarlar',
    'sidebar.user.name':         'Operasyon Şefi',
    'sidebar.user.role':         '1. Kademe · Vardiyada',

    /* account switcher */
    'account.switcher.title':    'Hesap Yönetimi',
    'account.switcher.subtitle': 'Aktif hesabı değiştir, ekle veya sil',
    'account.active':            'Aktif',
    'account.signed_in_as':      'Giriş yapan',
    'account.section.switch':    'Diğer hesaplar',
    'account.switch_to':         'Bu hesaba geç',
    'account.add':               'Yeni hesap ekle',
    'account.add.title':         'Yeni Hesap',
    'account.add.subtitle':      'Yeni bir operatör profili oluştur',
    'account.delete':            'Hesabı sil',
    'account.delete.confirm':    '{name} silinecek. Devam edilsin mi?',
    'account.delete.last':       'Son hesabı silemezsiniz.',
    'account.field.name':        'Ad Soyad',
    'account.field.role':        'Rol / Ünvan',
    'account.field.email':       'E-posta',
    'account.role.ops_lead':     '1. Kademe · Vardiyada',
    'account.role.analyst':      '2. Kademe · Veri Analisti',
    'account.role.env_eng':      'Çevre Mühendisi',
    'account.role.harbor':       'Liman Müdürü',
    'account.role.custom':       'Operatör',
    'account.empty.role':        'Rol belirtilmemiş',

    /* audit log */
    'audit.title':            'Etkinlik Kaydı',
    'audit.subtitle':          'Salt-okunur · Hash zinciri ile doğrulanır',
    'audit.filter.all':        'Tümü',
    'audit.filter.account':    'Hesap',
    'audit.filter.operation':  'Operasyon',
    'audit.filter.data':       'Veri',
    'audit.filter.alert':      'Uyarı',
    'audit.filter.report':     'Rapor',
    'audit.filter.system':     'Sistem',
    'audit.search.placeholder':'Kayıtlar arasında ara…',
    'audit.empty.title':       'Henüz kayıt yok',
    'audit.empty.body':        'Sistem etkinlikleri burada görünür.',
    'audit.export.csv':        'CSV indir',
    'audit.records':           '{n} kayıt',
    'audit.integrity_ok':      'Bütünlük doğrulandı',
    'audit.integrity_broken':  'Bütünlük ihlali tespit edildi (kayıt #{idx})',
    'audit.aria.open':         'Etkinlik kaydını aç',
    'audit.aria.close':        'Kapat',
    'audit.append_only_note':  'Bu kayıt salt-okunur; içerikleri silinemez veya değiştirilemez.',
    'audit.hash_label':        'Zincir hash\'i',
    'audit.cat.account':       'Hesap',
    'audit.cat.operation':     'Operasyon',
    'audit.cat.data':          'Veri',
    'audit.cat.alert':         'Uyarı',
    'audit.cat.report':        'Rapor',
    'audit.cat.system':        'Sistem',

    /* log action templates */
    'log.system.boot':       'Sistem başlatıldı',
    'log.system.signin':     '{name} oturum açtı',
    'log.account.switch':    'Hesaba geçildi: {name}',
    'log.account.add':       'Yeni hesap oluşturuldu: {name}',
    'log.account.remove':    'Hesap kaldırıldı: {name}',
    'log.shore.engage':      'Karadan güç etkinleştirildi: {dock} ({vessel}, {kw} kW)',
    'log.shore.release':     'Karadan güç bırakıldı: {dock} ({vessel})',
    'log.vessel.add':        'Manuel gemi eklendi: {name}',
    'log.vessel.remove':     'Manuel gemi silindi: {name}',
    'log.vessel.update':     'Gemi güncellendi: {name}',
    'log.reading.add':       'Manuel emisyon ölçümü eklendi: {pollutant} {value} {unit}',
    'log.reading.remove':    'Manuel ölçüm silindi: {pollutant}',
    'log.alert.resolve':     'Uyarı çözüldü: {title} · eylem: {action}',
    'log.alert.dismiss':     'Uyarı yoksayıldı: {title}',
    'log.ui.theme':          'Tema değiştirildi: {theme}',
    'log.ui.lang':           'Dil değiştirildi: {lang}',
    'log.report.generate':   'Rapor üretildi: {template}',
    'log.data.reset':        'Tüm veriler sıfırlandı',

    /* topbar */
    'topbar.port':          'İzmir Limanı',
    'topbar.subtitle':      'Emisyon ve Operasyon Zekâsı',
    'topbar.aqi':           'Hava Kalitesi',
    'topbar.aqi.optimal':   'En İyi',
    'topbar.aqi.nominal':   'Normal',
    'topbar.aqi.elevated':  'Yükseldi',
    'topbar.aqi.critical':  'Sınır Aşıldı',
    'topbar.weather':       'Hava',
    'topbar.sim.live':      'Canlı · #{count}',
    'topbar.sim.paused':    'Simülasyon duraklatıldı',
    'topbar.sim.idle':      'Başlatılıyor…',
    'topbar.theme.toggle':  'Temayı değiştir',
    'topbar.theme.dark':    'Koyu mod',
    'topbar.theme.light':   'Açık mod',
    'topbar.lang.aria':     'Dil seçimi',
    'topbar.reset':         'Verileri sıfırla',
    'topbar.reset.confirm': 'Manuel girilen tüm veriler ve uyarılar silinecek. Devam edilsin mi?',

    /* common */
    'common.search':   'Ara',
    'common.add':      'Ekle',
    'common.edit':     'Düzenle',
    'common.delete':   'Sil',
    'common.save':     'Kaydet',
    'common.cancel':   'Vazgeç',
    'common.confirm':  'Onayla',
    'common.close':    'Kapat',
    'common.export':   'Dışa aktar',
    'common.import':   'İçe aktar',
    'common.refresh':  'Yenile',
    'common.loading':  'Yükleniyor…',
    'common.empty.title': 'Veri yok',
    'common.empty.body':  'Bu görünümde henüz kayıt bulunmuyor.',
    'common.from':     'Başlangıç',
    'common.to':       'Bitiş',
    'common.last24h':  'Son 24 saat',
    'common.last7d':   'Son 7 gün',
    'common.last30d':  'Son 30 gün',
    'common.custom':   'Özel',
    'common.apply':    'Uygula',
    'common.reset':    'Sıfırla',
    'common.show':     'Göster',
    'common.hide':     'Gizle',
    'common.required': 'Zorunlu alan',
    'common.optional': '(opsiyonel)',
    'common.yes':      'Evet',
    'common.no':       'Hayır',
    'common.actions':  'İşlemler',
    'common.preview':  'Önizleme',
    'common.print':    'Yazdır',
    'common.download': 'İndir',
    'common.send':     'Gönder',
    'common.range':    'Aralık',
    'common.total':    'Toplam',
    'common.average':  'Ortalama',
    'common.min':      'Min',
    'common.max':      'Maks',
    'common.no_data':  'Yeterli veri yok',
    'common.add_new':  'Yeni Ekle',
    'common.details':  'Detay',
    'common.dismiss':  'Yoksay',
    'common.resolve':  'Çöz',
    'common.snooze':   'Ertele',
    'common.applied':  'Uygulandı',
    'common.copy':     'Kopyala',
    'common.toggle':   'Değiştir',

    /* page headings */
    'page.dashboard.title':  'Gösterge Paneli',
    'page.vessels.title':    'Gemiler',
    'page.vessels.subtitle': 'AIS telemetri, emisyon profili, manuel kayıt',
    'page.emissions.title':  'Emisyonlar',
    'page.emissions.subtitle': 'Hava kalitesi izleme ve uyumluluk analitiği',
    'page.shore.title':      'Karadan Güç',
    'page.shore.subtitle':   'Soğuk-ütüleme orkestrasyonu, kapasite ve geri-dönüş analizi',
    'page.alerts.title':     'Uyarı ve Öneriler',
    'page.alerts.subtitle':  'Kural tabanlı tespit ve eyleme dönüşür çözümler',
    'page.reports.title':    'Raporlar',
    'page.reports.subtitle': 'Kategori seçerek PDF kurumsal rapor',

    /* kpi */
    'kpi.aggregate':       '{name} · Toplam',
    'kpi.trend24':         '24s eğilim',
    'kpi.threshold':       'limit {value} {unit}',
    'kpi.shore.label':     'Karadan Güç · Önlenen CO₂',
    'kpi.shore.active':    '{n} aktif',
    'kpi.shore.empty':     'Karadan güç çeken rıhtım yok',
    'kpi.shore.engaged':   '{n} rıhtım şebekeden besleniyor',
    'kpi.shore.target':    'hedef ≥ 3 rıhtım',
    'kpi.status.success':  'iyi',
    'kpi.status.info':     'gözlem',
    'kpi.status.warning':  'uyarı',
    'kpi.status.critical': 'kritik',

    /* operations matrix */
    'ops.title':            'Operasyon Matrisi',
    'ops.count.under':      '{count} gemi izleniyor',
    'ops.count.filtered':   '{filtered} / {total} gemi · {filter} filtresi',
    'ops.empty':            '"{filter}" filtresine uyan gemi yok.',
    'ops.col.vessel':       'Gemi',
    'ops.col.type':         'Tip',
    'ops.col.status':       'Durum',
    'ops.col.eta':          'Tahmini Varış',
    'ops.col.fuel':         'Yakıt',
    'ops.col.speed':        'Hız',
    'ops.col.dispersion':   'Dağılım',
    'ops.filter.all':       'Tüm gemiler',
    'ops.filter.critical':  'Kritik',
    'ops.filter.warning':   'Uyarı',
    'ops.filter.info':      'Gözlem',
    'ops.filter.success':   'Uyumlu',
    'ops.eta.berth':        'Yanaşıyor',
    'ops.eta.imminent':     'Çok Yakında',
    'ops.eta.scheduled':    'Programda',
    'ops.unit.knots':       'kn',

    /* vessel statuses & types */
    'status.approaching': 'Yaklaşıyor',
    'status.docked':      'Yanaştı',
    'status.loading':     'Yükleme',
    'status.departing':   'Ayrılıyor',
    'status.anchored':    'Demirde',
    'type.container':     'Konteyner',
    'type.tanker':        'Tanker',
    'type.bulk':          'Dökme Yük',
    'type.roro':          'Ro-Ro',
    'type.lng':           'LNG Tankeri',
    'dispersion.low':     'düşük',
    'dispersion.medium':  'orta',
    'dispersion.high':    'yüksek',

    /* shore (component, dashboard) */
    'shore.title':            'Karadan Güç Şebekesi',
    'shore.subtitle':         'Soğuk-ütüleme orkestrasyonu · 4 liman',
    'shore.engage_all':       'Tümünü etkinleştir',
    'shore.disengage_all':    'Tümünü durdur',
    'shore.summary.active':   'Aktif Rıhtım',
    'shore.summary.occupied': '/ {n} dolu',
    'shore.summary.load':     'Şebeke Yükü',
    'shore.summary.co2':      'Önlenen CO₂',
    'shore.summary.capacity': 'Kapasite Kullanımı',
    'shore.dock.occupied':    'Dolu',
    'shore.dock.empty':       'Boş',
    'shore.dock.available':   'Rıhtım boş — sıradaki atama bekleniyor',
    'shore.dock.idle':        'beklemede · {n} kW talep',
    'shore.toggle.active':    'Karadan güç · {n} kg CO₂/s tasarruf',
    'shore.toggle.aux':       'Yardımcı motor çalışıyor — karadan gücü etkinleştir',
    'shore.toggle.empty':     'Gemi yok',
    'shore.toggle.tooltip':   'Karadan gücü değiştir',
    'shore.toggle.tooltip_empty': 'Gemi yanaşmamış',

    /* copilot */
    'copilot.title':             'Operasyon Asistanı',
    'copilot.subtitle':          'Operasyon asistanı · Konsept demo',
    'copilot.online':            'Çevrimiçi',
    'copilot.badge':             'AI v2',
    'copilot.input.placeholder': 'Bir soru sorun veya komut yazın…',
    'copilot.input.aria':        'Mesaj',
    'copilot.send.aria':         'Gönder',
    'copilot.foot.note':         'Konsept demo · Tüm veriler kurgusaldır',
    'copilot.welcome':           'Merhaba! İZPORT operasyon asistanınızım. Liman emisyonları, gemi durumu, karadan güç optimizasyonu ve uyumluluk denetimi için canlı verilere bağlıyım. Size nasıl yardımcı olabilirim?',
    'copilot.suggest.summary':   'Son 24s CO₂ anomalilerini özetle',
    'copilot.suggest.threshold': 'NOₓ eşiğini aşan gemiler hangileri?',
    'copilot.suggest.shore':     'Karadan güç fırsatlarını listele',
    'copilot.suggest.alerts':    'Açık kritik uyarıları göster',
    'copilot.thinking':          '▍ analiz ediliyor…',
    'copilot.fab.open':          'Asistanı aç',
    'copilot.fab.close':         'Asistanı kapat',
    'copilot.reply.co2':         '**CO₂ analizi** — Şu anki toplam {value} {unit} (limit {threshold}). Limitin **%{pct}** seviyesinde. Son 24 saatte **{breaches}** kez aşıldı. En yüksek katkı: **{topName}** ({topVal} kg/s). Karadan güç önerileri hazır — ister misiniz?',
    'copilot.reply.nox':         '**NOₓ analizi** — Toplam {value} {unit} (limit {threshold}). **{count}** gemi NOₓ eşiğini aşıyor: {names}. Bu gemiler için yakıt değişikliği ve hız azaltma önerileri uygulanabilir.',
    'copilot.reply.sox':         '**SOₓ analizi** — Toplam {value} {unit} (limit {threshold}). Şu anda **%{pct}** seviyesinde. Düşük-kükürtlü yakıta geçiş veya scrubber etkinleştirme ile **~{save} kg/s** azaltım mümkün.',
    'copilot.reply.shore':       '**Karadan güç durumu** — {active} / {occupied} dolu rıhtım besleniyor. Şebeke yükü **{kw} kW**, önlenen CO₂ **{co2} kg/s**. {opportunities} fırsat tespit edildi: {oppList}. Tek tıkla etkinleştirme için Karadan Güç sayfasına geçebilirsiniz.',
    'copilot.reply.vessels':     '**Filo durumu** — Toplam **{total}** gemi izleniyor: {docked} yanaştı, {approaching} yaklaşıyor, {anchored} demirde. Uyumluluk oranı **%{compliance}**. {critical} gemi kritik durumda.',
    'copilot.reply.alerts':      '**Aktif uyarılar** — {open} açık uyarı ({critical} kritik, {warning} uyarı). En son: {latestTitle}. Çözüm önerilerini görmek için Uyarı & Öneriler sayfasına geçebilirsiniz.',
    'copilot.reply.weather':     '**Hava koşulları** — Rüzgâr {wind} m/s {dir}, sıcaklık {temp}°C, dağılım riski **{risk}**. {recommendation}',
    'copilot.reply.summary':     '**Operasyon özeti** — **{vessels}** gemi izleniyor, **{alerts}** açık uyarı, **{shore}** rıhtım karadan güçle besleniyor. CO₂ limitin **%{co2pct}** seviyesinde. Detay için ilgili sayfayı açabilirim.',
    'copilot.reply.fallback':    'Anladım. Şu konularda canlı veri sunabilirim: emisyonlar (CO₂/NOₓ/SOₓ), gemi filosu durumu, karadan güç optimizasyonu, açık uyarılar ve hava dağılım koşulları. Hangisini görmek istersiniz?',
    'copilot.reply.no_breach':   'belirgin aşım yok',
    'copilot.reply.weather_calm':'Koşullar elverişli, ek tedbir gerekmiyor.',
    'copilot.reply.weather_warn':'Düşük rüzgâr nedeniyle açıkta demirleme veya bekleme önerilir.',
    'copilot.reply.weather_crit':'Yetersiz dağılım — yaklaşan gemiler için throttle uygulanmalı.',
    'copilot.reply.no_opps':     'henüz fırsat yok',

    /* alerts (component-level) */
    'alert.shore.engaged':       'Karadan güç etkinleştirildi',
    'alert.shore.released':      'Karadan güç bırakıldı',
    'alert.shore.body.engaged':  '{name} şu an {kw} kW çekiyor',
    'alert.shore.body.released': '{name} yardımcı yüke geçti',

    /* alerts (engine-generated) */
    'alert.agg_exceedance.title':  '{pollutant} eşik aşımı',
    'alert.agg_exceedance.body':   'Liman geneli {pollutant} {value} {unit} (limit {threshold}) — %{pct} üstünde.',
    'alert.agg_elevated.title':    '{pollutant} yükseldi',
    'alert.agg_elevated.body':     'Liman geneli {pollutant} {value} {unit} — limitin %{pct} seviyesinde.',
    'alert.vessel_co2.title':      '{name} · CO₂ aşımı',
    'alert.vessel_co2.body':       'Geminin CO₂ üretimi {value} kg/s — limitin %{pct} üstünde.',
    'alert.shore_available.title': 'Karadan güç fırsatı: {dock}',
    'alert.shore_available.body':  '{vessel} {dock} rıhtımında. Karadan güç etkinleştirilirse ~{kw} kW şebekeye taşınır, ~{co2} kg/s CO₂ önlenir.',
    'alert.dispersion.title':      'Dağılım riski yüksek: {name}',
    'alert.dispersion.body':       'Rüzgâr {wind} m/s ({dir}). Yetersiz dağılım koşulları.',
    'alert.eta_conflict.title':    'ETA çakışması: {name}',
    'alert.eta_conflict.body':     'Gelişine {mins} dk · boş rıhtım yok.',

    /* recommendations */
    'rec.engage_shore':     'Karadan gücü etkinleştir',
    'rec.reroute_berth':    'Alternatif rıhtıma yönlendir',
    'rec.reduce_idle':      'Boşta kalma süresini kısalt',
    'rec.throttle_inbound': 'Yaklaşan gemileri yavaşlat',
    'rec.anchor_offshore':  'Açıkta demirlemeye al',
    'rec.wait_for_wind':    'Rüzgâr koşullarını bekle',
    'rec.switch_fuel':      'Daha temiz yakıta geç',
  },

  en: {
    'brand.name':         'İZPORT',
    'brand.subtitle':     'İzmir Port Operations · Corporate Management Dashboard',
    'brand.tag':          '',
    'brand.attribution':  'İzmir Port Concept Demo',

    /* disclaimer (legal / demo indicators) */
    'disclaimer.popup.title':       'Concept Demo · Hackability 2026',
    'disclaimer.popup.intro':       'This is a concept demonstration developed in 12 hours on 9 May 2026 as part of the "Hackability — Sustainability, AI, and Coding" competition organized by İzQ Entrepreneurship Center.',
    'disclaimer.popup.warning':     '⚠️ This is not a real application.',
    'disclaimer.popup.bullet1':     'This project has no official affiliation, endorsement, or sponsorship from İzmir Metropolitan Municipality, İZPORT Port Operations, İzmir Development Agency, or any of the companies referenced (Petkim, Tüpraş, SOCAR, TCDD, Petrol Ofisi, Total, Alpet, Ege Gaz, Milangaz, Habaş, Ege Gübre, Ege Çelik, IDÇ, ETKİ, Batıliman, Nemport, Ulusoy) or global shipping lines (MSC, Maersk, Evergreen, CMA, COSCO, ONE, HMM, NYK).',
    'disclaimer.popup.bullet2':     'Some sectoral data is inspired by publicly available publications from the İzmir Development Agency (İZKA); all vessel names, real-time emission values, terminal capacities, operator profiles, and alert scenarios are entirely fictional and illustrative.',
    'disclaimer.popup.bullet3':     'All trademarks, company names, and institutional references appear solely for concept demonstration purposes; all rights belong to their respective owners.',
    'disclaimer.popup.team':        'Team: Team-6',
    'disclaimer.popup.acknowledge': 'I Understand',
    'disclaimer.footer.text':       'Concept Demo · All data is fictional · Hackability 9 May 2026 · İzQ Entrepreneurship Center · Team-6',
    'disclaimer.badge':             'DEMO',

    'sidebar.section.live':      'Live',
    'sidebar.section.workspace': 'Workspace',
    'nav.dashboard':             'Dashboard',
    'nav.vessels':               'Vessels',
    'nav.emissions':             'Emissions',
    'nav.shore':                 'Shore Power',
    'nav.alerts':                'Alerts & Recommendations',
    'nav.reports':               'Reports',
    'nav.settings':              'Settings',
    'sidebar.user.name':         'Ops Supervisor',
    'sidebar.user.role':         'Tier 1 · On Watch',

    'account.switcher.title':    'Account Manager',
    'account.switcher.subtitle': 'Switch the active profile, add or remove accounts',
    'account.active':            'Active',
    'account.signed_in_as':      'Signed in as',
    'account.section.switch':    'Other accounts',
    'account.switch_to':         'Switch to this account',
    'account.add':               'Add new account',
    'account.add.title':         'New Account',
    'account.add.subtitle':      'Create a new operator profile',
    'account.delete':            'Remove account',
    'account.delete.confirm':    '{name} will be removed. Continue?',
    'account.delete.last':       'You cannot remove the last account.',
    'account.field.name':        'Full name',
    'account.field.role':        'Role / Title',
    'account.field.email':       'Email',
    'account.role.ops_lead':     'Tier 1 · On Watch',
    'account.role.analyst':      'Tier 2 · Data Analyst',
    'account.role.env_eng':      'Environmental Engineer',
    'account.role.harbor':       'Harbor Master',
    'account.role.custom':       'Operator',
    'account.empty.role':        'Role unspecified',

    'audit.title':            'Activity Log',
    'audit.subtitle':          'Read-only · Hash-chain verified',
    'audit.filter.all':        'All',
    'audit.filter.account':    'Account',
    'audit.filter.operation':  'Operation',
    'audit.filter.data':       'Data',
    'audit.filter.alert':      'Alert',
    'audit.filter.report':     'Report',
    'audit.filter.system':     'System',
    'audit.search.placeholder':'Search records…',
    'audit.empty.title':       'No records yet',
    'audit.empty.body':        'System activity will appear here.',
    'audit.export.csv':        'Export CSV',
    'audit.records':           '{n} records',
    'audit.integrity_ok':      'Integrity verified',
    'audit.integrity_broken':  'Integrity violation at record #{idx}',
    'audit.aria.open':         'Open activity log',
    'audit.aria.close':        'Close',
    'audit.append_only_note':  'This ledger is read-only; entries cannot be edited or deleted.',
    'audit.hash_label':        'Chain hash',
    'audit.cat.account':       'Account',
    'audit.cat.operation':     'Operation',
    'audit.cat.data':          'Data',
    'audit.cat.alert':         'Alert',
    'audit.cat.report':        'Report',
    'audit.cat.system':        'System',

    'log.system.boot':       'System started',
    'log.system.signin':     '{name} signed in',
    'log.account.switch':    'Switched to account: {name}',
    'log.account.add':       'New account created: {name}',
    'log.account.remove':    'Account removed: {name}',
    'log.shore.engage':      'Shore power engaged: {dock} ({vessel}, {kw} kW)',
    'log.shore.release':     'Shore power released: {dock} ({vessel})',
    'log.vessel.add':        'Manual vessel added: {name}',
    'log.vessel.remove':     'Manual vessel removed: {name}',
    'log.vessel.update':     'Vessel updated: {name}',
    'log.reading.add':       'Manual emission reading added: {pollutant} {value} {unit}',
    'log.reading.remove':    'Manual reading removed: {pollutant}',
    'log.alert.resolve':     'Alert resolved: {title} · action: {action}',
    'log.alert.dismiss':     'Alert dismissed: {title}',
    'log.ui.theme':          'Theme changed: {theme}',
    'log.ui.lang':           'Language changed: {lang}',
    'log.report.generate':   'Report generated: {template}',
    'log.data.reset':        'All data reset',

    'topbar.port':          'Port of İzmir',
    'topbar.subtitle':      'Emissions & Operations Intelligence',
    'topbar.aqi':           'Air Quality',
    'topbar.aqi.optimal':   'Optimal',
    'topbar.aqi.nominal':   'Nominal',
    'topbar.aqi.elevated':  'Elevated',
    'topbar.aqi.critical':  'Above limit',
    'topbar.weather':       'Weather',
    'topbar.sim.live':      'Live · #{count}',
    'topbar.sim.paused':    'Simulation paused',
    'topbar.sim.idle':      'Booting…',
    'topbar.theme.toggle':  'Toggle theme',
    'topbar.theme.dark':    'Dark mode',
    'topbar.theme.light':   'Light mode',
    'topbar.lang.aria':     'Language selection',
    'topbar.reset':         'Reset data',
    'topbar.reset.confirm': 'All manual entries and alerts will be erased. Continue?',

    'common.search':   'Search',
    'common.add':      'Add',
    'common.edit':     'Edit',
    'common.delete':   'Delete',
    'common.save':     'Save',
    'common.cancel':   'Cancel',
    'common.confirm':  'Confirm',
    'common.close':    'Close',
    'common.export':   'Export',
    'common.import':   'Import',
    'common.refresh':  'Refresh',
    'common.loading':  'Loading…',
    'common.empty.title': 'No data',
    'common.empty.body':  'No records to display in this view.',
    'common.from':     'From',
    'common.to':       'To',
    'common.last24h':  'Last 24h',
    'common.last7d':   'Last 7 days',
    'common.last30d':  'Last 30 days',
    'common.custom':   'Custom',
    'common.apply':    'Apply',
    'common.reset':    'Reset',
    'common.show':     'Show',
    'common.hide':     'Hide',
    'common.required': 'Required',
    'common.optional': '(optional)',
    'common.yes':      'Yes',
    'common.no':       'No',
    'common.actions':  'Actions',
    'common.preview':  'Preview',
    'common.print':    'Print',
    'common.download': 'Download',
    'common.send':     'Send',
    'common.range':    'Range',
    'common.total':    'Total',
    'common.average':  'Average',
    'common.min':      'Min',
    'common.max':      'Max',
    'common.no_data':  'Insufficient data',
    'common.add_new':  'Add new',
    'common.details':  'Details',
    'common.dismiss':  'Dismiss',
    'common.resolve':  'Resolve',
    'common.snooze':   'Snooze',
    'common.applied':  'Applied',
    'common.copy':     'Copy',
    'common.toggle':   'Toggle',

    'page.dashboard.title':  'Dashboard',
    'page.vessels.title':    'Vessels',
    'page.vessels.subtitle': 'AIS telemetry, emission profile, manual records',
    'page.emissions.title':  'Emissions',
    'page.emissions.subtitle': 'Air quality monitoring & compliance analytics',
    'page.shore.title':      'Shore Power',
    'page.shore.subtitle':   'Cold-ironing orchestration, capacity & ROI',
    'page.alerts.title':     'Alerts & Recommendations',
    'page.alerts.subtitle':  'Rule-based detection with actionable resolutions',
    'page.reports.title':    'Reports',
    'page.reports.subtitle': 'Category-based corporate PDF report builder',

    'kpi.aggregate':       '{name} · Aggregate',
    'kpi.trend24':         '24h trend',
    'kpi.threshold':       'limit {value} {unit}',
    'kpi.shore.label':     'Shore Power · CO₂ Avoided',
    'kpi.shore.active':    '{n} active',
    'kpi.shore.empty':     'No berths drawing shore power',
    'kpi.shore.engaged':   '{n} berths drawing grid power',
    'kpi.shore.target':    'target ≥ 3 berths',
    'kpi.status.success':  'success',
    'kpi.status.info':     'info',
    'kpi.status.warning':  'warning',
    'kpi.status.critical': 'critical',

    'ops.title':            'Operations Matrix',
    'ops.count.under':      '{count} vessels under watch',
    'ops.count.filtered':   '{filtered} of {total} vessels · filtered by {filter}',
    'ops.empty':            'No vessels match the "{filter}" filter.',
    'ops.col.vessel':       'Vessel',
    'ops.col.type':         'Type',
    'ops.col.status':       'Status',
    'ops.col.eta':          'ETA',
    'ops.col.fuel':         'Fuel',
    'ops.col.speed':        'Speed',
    'ops.col.dispersion':   'Dispersion',
    'ops.filter.all':       'All vessels',
    'ops.filter.critical':  'Critical',
    'ops.filter.warning':   'Warning',
    'ops.filter.info':      'Watch',
    'ops.filter.success':   'Compliant',
    'ops.eta.berth':        'Berth',
    'ops.eta.imminent':     'Imminent',
    'ops.eta.scheduled':    'On schedule',
    'ops.unit.knots':       'kn',

    'status.approaching': 'Approaching',
    'status.docked':      'Docked',
    'status.loading':     'Loading',
    'status.departing':   'Departing',
    'status.anchored':    'Anchored',
    'type.container':     'Container',
    'type.tanker':        'Tanker',
    'type.bulk':          'Bulk Carrier',
    'type.roro':          'Ro-Ro',
    'type.lng':           'LNG Carrier',
    'dispersion.low':     'low',
    'dispersion.medium':  'medium',
    'dispersion.high':    'high',

    'shore.title':            'Shore Power Grid',
    'shore.subtitle':         'Cold-ironing orchestration · 4 ports',
    'shore.engage_all':       'Engage all occupied',
    'shore.disengage_all':    'Disengage all',
    'shore.summary.active':   'Berths Active',
    'shore.summary.occupied': '/ {n} occupied',
    'shore.summary.load':     'Grid Load',
    'shore.summary.co2':      'CO₂ Avoided',
    'shore.summary.capacity': 'Capacity Used',
    'shore.dock.occupied':    'Occupied',
    'shore.dock.empty':       'Empty',
    'shore.dock.available':   'Berth available — awaiting next assignment',
    'shore.dock.idle':        'idle · {n} kW demand',
    'shore.toggle.active':    'Shore Power · saving {n} kg CO₂/h',
    'shore.toggle.aux':       'Aux engine running — engage shore power',
    'shore.toggle.empty':     'No vessel',
    'shore.toggle.tooltip':   'Toggle shore power',
    'shore.toggle.tooltip_empty': 'No vessel docked',

    'copilot.title':             'Operations Copilot',
    'copilot.subtitle':          'Operations assistant · Concept demo',
    'copilot.online':            'Online',
    'copilot.badge':             'AI v2',
    'copilot.input.placeholder': 'Ask a question or type a command…',
    'copilot.input.aria':        'Message',
    'copilot.send.aria':         'Send',
    'copilot.foot.note':         'Concept demo · All data is fictional',
    'copilot.welcome':           'Hello! I\'m your İZPORT operations assistant, connected to live data on emissions, vessel status, shore-power optimization, and compliance. How can I help?',
    'copilot.suggest.summary':   'Summarize last 24h CO₂ anomalies',
    'copilot.suggest.threshold': 'Which vessels exceed NOₓ threshold?',
    'copilot.suggest.shore':     'List shore-power opportunities',
    'copilot.suggest.alerts':    'Show open critical alerts',
    'copilot.thinking':          '▍ analyzing…',
    'copilot.fab.open':          'Open Copilot',
    'copilot.fab.close':         'Close Copilot',
    'copilot.reply.co2':         '**CO₂ analysis** — Current aggregate {value} {unit} (limit {threshold}). At **{pct}%** of limit. Breached **{breaches}** times in last 24h. Top contributor: **{topName}** ({topVal} kg/h). Shore-power recommendations are ready — want them?',
    'copilot.reply.nox':         '**NOₓ analysis** — Total {value} {unit} (limit {threshold}). **{count}** vessels exceed the NOₓ threshold: {names}. Fuel-switching and idle reduction can be applied for these vessels.',
    'copilot.reply.sox':         '**SOₓ analysis** — Total {value} {unit} (limit {threshold}). Currently at **{pct}%**. Switching to low-sulfur fuel or activating scrubbers could reduce by **~{save} kg/h**.',
    'copilot.reply.shore':       '**Shore-power state** — {active} of {occupied} occupied berths drawing grid power. Grid load **{kw} kW**, CO₂ avoided **{co2} kg/h**. {opportunities} opportunities detected: {oppList}. One-click engagement available on the Shore Power page.',
    'copilot.reply.vessels':     '**Fleet status** — **{total}** vessels under watch: {docked} docked, {approaching} approaching, {anchored} anchored. Compliance rate **{compliance}%**. {critical} vessels in critical state.',
    'copilot.reply.alerts':      '**Active alerts** — {open} open ({critical} critical, {warning} warning). Latest: {latestTitle}. See resolutions on the Alerts & Recommendations page.',
    'copilot.reply.weather':     '**Weather** — Wind {wind} m/s {dir}, temperature {temp}°C, dispersion risk **{risk}**. {recommendation}',
    'copilot.reply.summary':     '**Operations summary** — **{vessels}** vessels under watch, **{alerts}** open alerts, **{shore}** berths on shore power. CO₂ at **{co2pct}%** of limit. Open the relevant page for detail.',
    'copilot.reply.fallback':    'Got it. I can give live readouts on: emissions (CO₂/NOₓ/SOₓ), fleet status, shore-power optimization, open alerts, and weather dispersion. Which would you like?',
    'copilot.reply.no_breach':   'no notable breaches',
    'copilot.reply.weather_calm':'Conditions are favorable, no extra action needed.',
    'copilot.reply.weather_warn':'Low wind — anchorage or holding pattern recommended.',
    'copilot.reply.weather_crit':'Insufficient dispersion — throttle inbound traffic.',
    'copilot.reply.no_opps':     'no current opportunities',

    'alert.shore.engaged':       'Shore power engaged',
    'alert.shore.released':      'Shore power released',
    'alert.shore.body.engaged':  '{name} now drawing {kw} kW',
    'alert.shore.body.released': '{name} released to auxiliary load',

    'alert.agg_exceedance.title':  '{pollutant} threshold breach',
    'alert.agg_exceedance.body':   'Port-wide {pollutant} {value} {unit} (limit {threshold}) — {pct}% above limit.',
    'alert.agg_elevated.title':    '{pollutant} elevated',
    'alert.agg_elevated.body':     'Port-wide {pollutant} {value} {unit} — {pct}% of limit.',
    'alert.vessel_co2.title':      '{name} · CO₂ exceedance',
    'alert.vessel_co2.body':       'Vessel CO₂ {value} kg/h — {pct}% above limit.',
    'alert.shore_available.title': 'Shore power opportunity: {dock}',
    'alert.shore_available.body':  '{vessel} at {dock}. Engaging shore power moves ~{kw} kW to grid, avoids ~{co2} kg/h CO₂.',
    'alert.dispersion.title':      'High dispersion risk: {name}',
    'alert.dispersion.body':       'Wind {wind} m/s ({dir}). Poor dispersion conditions.',
    'alert.eta_conflict.title':    'ETA conflict: {name}',
    'alert.eta_conflict.body':     '{mins} min until arrival · no berth free.',

    'rec.engage_shore':     'Engage shore power',
    'rec.reroute_berth':    'Reroute to alternative berth',
    'rec.reduce_idle':      'Reduce idle time',
    'rec.throttle_inbound': 'Throttle inbound traffic',
    'rec.anchor_offshore':  'Anchor offshore',
    'rec.wait_for_wind':    'Wait for wind shift',
    'rec.switch_fuel':      'Switch to cleaner fuel',
  },
};

/* Page-contributed strings, merged on top of base dictionaries. */
const extras = { tr: {}, en: {} };

/**
 * Pages call this on module load to register their own keys.
 *   registerStrings({ tr: { 'vessels.kpi.total': '...' }, en: { ... } });
 */
export function registerStrings(map) {
  for (const lang of Object.keys(map || {})) {
    if (!extras[lang]) extras[lang] = {};
    Object.assign(extras[lang], map[lang]);
  }
}

/* ============================================================ */
export function t(key, params = null) {
  const lang = getLanguage();
  const base = dictionaries[lang] || dictionaries[DEFAULT_LANG];
  const ext  = extras[lang] || {};
  let val = ext[key] ?? base[key];
  if (val == null) {
    /* fall back to default language */
    val = (extras[DEFAULT_LANG] && extras[DEFAULT_LANG][key]) ?? dictionaries[DEFAULT_LANG][key] ?? key;
  }
  if (params) {
    for (const k of Object.keys(params)) {
      val = val.replace(new RegExp(`\\{${k}\\}`, 'g'), params[k]);
    }
  }
  return val;
}

export function getLanguage() { return store.get('ui')?.language || DEFAULT_LANG; }
export function getTheme()    { return store.get('ui')?.theme    || DEFAULT_THEME; }

export function setLanguage(lang) {
  if (!dictionaries[lang]) return;
  store.patch('ui', { language: lang });
  try { localStorage.setItem(STORAGE_LANG, lang); } catch (_) {}
  document.documentElement.lang = lang;
}

export function setTheme(theme) {
  if (theme !== 'dark' && theme !== 'light') return;
  store.patch('ui', { theme });
  try { localStorage.setItem(STORAGE_THEME, theme); } catch (_) {}
  document.documentElement.dataset.theme = theme;
}

export function toggleTheme() {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark');
}

export function syncFromDocument() {
  const docTheme = document.documentElement.dataset.theme;
  const docLang  = document.documentElement.lang;
  const theme = (docTheme === 'light' || docTheme === 'dark') ? docTheme : DEFAULT_THEME;
  const lang  = dictionaries[docLang] ? docLang : DEFAULT_LANG;
  store.patch('ui', { language: lang, theme });
}

export function formatNumber(n, opts = {}) {
  const lang = getLanguage();
  const locale = lang === 'tr' ? 'tr-TR' : 'en-US';
  return new Intl.NumberFormat(locale, opts).format(n);
}

export function formatDate(d) {
  const lang = getLanguage();
  const locale = lang === 'tr' ? 'tr-TR' : 'en-GB';
  return d.toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}
