/**
 * pdf.js — Hybrid PDF generator using jsPDF + html2canvas with Unicode font.
 *
 * jsPDF's built-in helvetica is Latin-1 only — it strips diacritics and
 * Turkish-specific letters (ş, ğ, ı, İ, ç, ö, ü). At document creation we
 * fetch DejaVu Sans Regular + Bold (TTF) from a CDN, embed them via
 * `addFileToVFS` + `addFont`, and use them for every text op. The font
 * binary is cached per page-load.
 *
 * Tables wrap long cell content via `splitTextToSize`, dynamic row heights
 * keep wrapped lines inside their cells. The KPI grid wraps long labels.
 */

const CDN_JSPDF       = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
const CDN_HTML2CANVAS = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';

const FONT_REG_URL  = 'https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans.ttf';
const FONT_BOLD_URL = 'https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans-Bold.ttf';
const FONT_FAMILY   = 'DejaVuSans';

let _libsPromise = null;
let _fontPromise = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if ([...document.scripts].some((s) => s.src === src)) return resolve();
    const s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload  = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

export function loadPdfLibs() {
  if (_libsPromise) return _libsPromise;
  _libsPromise = Promise.all([loadScript(CDN_JSPDF), loadScript(CDN_HTML2CANVAS)])
    .then(() => {
      if (!window.jspdf || !window.jspdf.jsPDF) throw new Error('jsPDF unavailable');
      if (!window.html2canvas)                    throw new Error('html2canvas unavailable');
    });
  return _libsPromise;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

async function fetchFontBinary() {
  if (_fontPromise) return _fontPromise;
  _fontPromise = (async () => {
    const [regBuf, boldBuf] = await Promise.all([
      fetch(FONT_REG_URL).then((r) => { if (!r.ok) throw new Error('regular ttf fetch ' + r.status); return r.arrayBuffer(); }),
      fetch(FONT_BOLD_URL).then((r) => { if (!r.ok) throw new Error('bold ttf fetch ' + r.status); return r.arrayBuffer(); }),
    ]);
    return {
      regular: arrayBufferToBase64(regBuf),
      bold:    arrayBufferToBase64(boldBuf),
    };
  })().catch((err) => {
    console.warn('[pdf] Unicode font fetch failed — falling back to helvetica', err);
    _fontPromise = null;
    return null;
  });
  return _fontPromise;
}

async function attachUnicodeFont(pdf) {
  const fonts = await fetchFontBinary();
  if (!fonts) {
    pdf.setFont('helvetica', 'normal');
    return 'helvetica';
  }
  try {
    pdf.addFileToVFS('DejaVuSans.ttf', fonts.regular);
    pdf.addFont('DejaVuSans.ttf', FONT_FAMILY, 'normal');
    pdf.addFileToVFS('DejaVuSans-Bold.ttf', fonts.bold);
    pdf.addFont('DejaVuSans-Bold.ttf', FONT_FAMILY, 'bold');
    pdf.setFont(FONT_FAMILY, 'normal');
    return FONT_FAMILY;
  } catch (err) {
    console.warn('[pdf] addFont failed — using helvetica', err);
    pdf.setFont('helvetica', 'normal');
    return 'helvetica';
  }
}

/* Locale-aware uppercase so Turkish letters keep their diacritics. */
function upperLocale(s) {
  try { return String(s).toLocaleUpperCase('tr-TR'); }
  catch (_) { return String(s).toUpperCase(); }
}

/* ============================================================
 * Document factory
 * ============================================================ */

const DEFAULT_THEME = {
  brand:    [0, 157, 196],
  brandDeep:[0, 107, 140],
  text:     [22, 30, 40],
  muted:    [100, 116, 132],
  subtle:   [165, 175, 188],
  rule:     [218, 226, 234],
  bgSoft:   [241, 245, 249],
  success:  [29, 158, 117],
  warning:  [186, 117, 23],
  critical: [226, 75, 74],
};

const PAGE = { w: 210, h: 297, margin: 14 };

export async function createPdf({ title = 'İZPORT Report', author = '', subtitle = '', meta = {}, theme = {} } = {}) {
  await loadPdfLibs();
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'p' });
  const FF = await attachUnicodeFont(pdf);
  const T = { ...DEFAULT_THEME, ...theme };

  let cursorY = PAGE.margin;

  const setFontStyle = (style = 'normal') => pdf.setFont(FF, style);
  const setColor = (rgb, op = 'fill') => {
    if (op === 'fill') pdf.setFillColor(rgb[0], rgb[1], rgb[2]);
    if (op === 'text') pdf.setTextColor(rgb[0], rgb[1], rgb[2]);
    if (op === 'draw') pdf.setDrawColor(rgb[0], rgb[1], rgb[2]);
  };

  function ensureSpace(needed) {
    if (cursorY + needed > PAGE.h - PAGE.margin - 12) addPage();
  }

  function addPage() {
    pdf.addPage();
    cursorY = PAGE.margin;
    pageHeader();
  }

  function pageHeader() {
    setColor(T.brand, 'fill');
    pdf.rect(0, 0, PAGE.w, 6, 'F');
    setFontStyle('normal');
    pdf.setFontSize(8);
    setColor(T.muted, 'text');
    pdf.text('İZPORT', PAGE.margin, 12);
    /* page-header right-aligned title — shorten if extremely long */
    const headerTitle = pdf.splitTextToSize(title, 120)[0] || title;
    pdf.text(headerTitle, PAGE.w - PAGE.margin, 12, { align: 'right' });
    setColor(T.rule, 'draw');
    pdf.setLineWidth(0.2);
    pdf.line(PAGE.margin, 14, PAGE.w - PAGE.margin, 14);
    cursorY = 22;
  }

  function pageFooter(idx, total) {
    setFontStyle('normal');
    pdf.setFontSize(8);
    setColor(T.subtle, 'text');
    pdf.text(`${idx} / ${total}`, PAGE.w / 2, PAGE.h - 8, { align: 'center' });
    pdf.text(meta.brandLine || 'İzmir Büyükşehir Belediyesi', PAGE.margin, PAGE.h - 8);
    pdf.text(new Date().toISOString().slice(0, 10), PAGE.w - PAGE.margin, PAGE.h - 8, { align: 'right' });
  }

  /* ----------- programmatic primitives ----------- */

  function cover({ subtitle: sub, range, summary } = {}) {
    setColor(T.brandDeep, 'fill');
    pdf.rect(0, 0, PAGE.w, 90, 'F');
    setColor(T.brand, 'fill');
    pdf.rect(0, 80, PAGE.w, 12, 'F');

    pdf.setTextColor(255, 255, 255);

    setFontStyle('bold');
    pdf.setFontSize(10);
    pdf.text('İZPORT', PAGE.margin, 30);

    setFontStyle('bold');
    pdf.setFontSize(24);
    /* title may be long; wrap to two lines max */
    const titleLines = pdf.splitTextToSize(title, PAGE.w - 2 * PAGE.margin);
    pdf.text(titleLines.slice(0, 2), PAGE.margin, 50);

    if (sub || subtitle) {
      setFontStyle('normal');
      pdf.setFontSize(12);
      const subLines = pdf.splitTextToSize(sub || subtitle, PAGE.w - 2 * PAGE.margin);
      pdf.text(subLines.slice(0, 2), PAGE.margin, 64);
    }

    setFontStyle('normal');
    pdf.setFontSize(9);
    pdf.setTextColor(220, 240, 250);
    pdf.text('İzmir Büyükşehir Belediyesi · Liman Operasyonları', PAGE.margin, 74);

    cursorY = 110;
    setFontStyle('normal');
    setColor(T.muted, 'text');
    pdf.setFontSize(9);

    const metaPairs = [
      author ? ['Hazırlayan / Author', author] : null,
      ['Üretim / Generated',  new Date().toLocaleString('tr-TR')],
      range ? ['Aralık / Range', range] : null,
      meta.template ? ['Şablon / Template', meta.template] : null,
    ].filter(Boolean);

    metaPairs.forEach(([k, v], i) => {
      const y = cursorY + i * 6;
      setColor(T.subtle, 'text');
      setFontStyle('normal');
      pdf.text(k, PAGE.margin, y);
      setColor(T.text, 'text');
      setFontStyle('bold');
      pdf.text(String(v), PAGE.margin + 55, y);
    });
    cursorY += metaPairs.length * 6 + 8;

    if (summary) {
      heading('Yönetici Özeti / Executive Summary');
      paragraph(summary);
    }
  }

  function heading(text) {
    ensureSpace(14);
    setColor(T.brand, 'fill');
    pdf.rect(PAGE.margin, cursorY, 3, 6, 'F');
    setColor(T.text, 'text');
    setFontStyle('bold');
    pdf.setFontSize(13);
    const lines = pdf.splitTextToSize(text, PAGE.w - 2 * PAGE.margin - 6);
    lines.forEach((ln, i) => {
      if (i > 0) ensureSpace(7);
      pdf.text(ln, PAGE.margin + 6, cursorY + 5 + i * 6);
    });
    cursorY += 5 + lines.length * 6;
  }

  function subheading(text) {
    ensureSpace(8);
    setColor(T.muted, 'text');
    setFontStyle('bold');
    pdf.setFontSize(9);
    pdf.text(upperLocale(text), PAGE.margin, cursorY);
    cursorY += 5;
  }

  function paragraph(text) {
    setColor(T.text, 'text');
    setFontStyle('normal');
    pdf.setFontSize(10);
    const lines = pdf.splitTextToSize(String(text ?? ''), PAGE.w - 2 * PAGE.margin);
    for (const ln of lines) {
      ensureSpace(5.5);
      pdf.text(ln, PAGE.margin, cursorY);
      cursorY += 5;
    }
    cursorY += 2;
  }

  function bullet(items) {
    setColor(T.text, 'text');
    setFontStyle('normal');
    pdf.setFontSize(10);
    for (const it of items) {
      const lines = pdf.splitTextToSize(String(it ?? ''), PAGE.w - 2 * PAGE.margin - 5);
      lines.forEach((ln, i) => {
        ensureSpace(5.5);
        if (i === 0) pdf.text('•', PAGE.margin, cursorY);
        pdf.text(ln, PAGE.margin + 5, cursorY);
        cursorY += 5;
      });
      cursorY += 1;
    }
    cursorY += 2;
  }

  function kpiGrid(cards, { columns = 3 } = {}) {
    if (!cards || cards.length === 0) return;
    const gap = 4;
    const colW  = (PAGE.w - 2 * PAGE.margin - (columns - 1) * gap) / columns;
    const cardH = 26;

    let i = 0;
    while (i < cards.length) {
      ensureSpace(cardH + gap);
      const rowStartY = cursorY;
      let rowMaxH = cardH;

      for (let c = 0; c < columns && i < cards.length; c++, i++) {
        const card = cards[i];
        const x = PAGE.margin + c * (colW + gap);
        const y = rowStartY;

        /* background */
        setColor(T.bgSoft, 'fill');
        pdf.roundedRect(x, y, colW, cardH, 2.5, 2.5, 'F');

        /* label (uppercase, wrap to max 2 lines) */
        setFontStyle('bold');
        pdf.setFontSize(7);
        setColor(T.subtle, 'text');
        const labelLines = pdf
          .splitTextToSize(upperLocale(String(card.label || '')), colW - 5)
          .slice(0, 2);
        labelLines.forEach((ln, j) => pdf.text(ln, x + 2.5, y + 4.5 + j * 3));
        const afterLabelY = y + 4.5 + labelLines.length * 3 + 1;

        /* value (color tone, fit-to-width via shrink) */
        const tone =
          card.tone === 'critical' ? T.critical :
          card.tone === 'warning'  ? T.warning  :
          card.tone === 'success'  ? T.success  :
          card.tone === 'brand'    ? T.brand    : T.text;
        setColor(tone, 'text');
        setFontStyle('bold');
        let valueSize = 14;
        let valueText = String(card.value ?? '–');
        pdf.setFontSize(valueSize);
        while (pdf.getTextWidth(valueText) > colW - 5 && valueSize > 9) {
          valueSize -= 1;
          pdf.setFontSize(valueSize);
        }
        const valueY = afterLabelY + valueSize * 0.45;
        pdf.text(valueText, x + 2.5, valueY);

        /* unit (right of value) */
        if (card.unit) {
          setFontStyle('normal');
          pdf.setFontSize(8);
          setColor(T.muted, 'text');
          const unitText = String(card.unit);
          pdf.text(unitText, x + colW - 2.5, valueY, { align: 'right' });
        }

        /* delta + note row */
        if (card.delta || card.note) {
          setFontStyle('normal');
          pdf.setFontSize(7.5);
          setColor(T.muted, 'text');
          const noteY = y + cardH - 2.5;
          if (card.delta) pdf.text(String(card.delta), x + 2.5, noteY);
          if (card.note) {
            const noteText = pdf.splitTextToSize(String(card.note), colW - 5)[0] || '';
            pdf.text(noteText, x + colW - 2.5, noteY, { align: 'right' });
          }
        }

        if (cardH > rowMaxH) rowMaxH = cardH;
      }
      cursorY = rowStartY + rowMaxH + gap;
    }
    cursorY += 1;
  }

  function table({ headers, rows, columnWidths }) {
    if (!headers || headers.length === 0) return;
    const totalW = PAGE.w - 2 * PAGE.margin;
    const widths = columnWidths || headers.map(() => totalW / headers.length);
    const padX = 2;
    const lineH = 4;
    const headerH = 7;

    function drawHeader() {
      ensureSpace(headerH);
      setColor(T.brandDeep, 'fill');
      pdf.rect(PAGE.margin, cursorY - 4, totalW, headerH, 'F');
      pdf.setTextColor(255, 255, 255);
      setFontStyle('bold');
      pdf.setFontSize(8);
      let x = PAGE.margin;
      for (let i = 0; i < headers.length; i++) {
        const headerLines = pdf.splitTextToSize(upperLocale(String(headers[i])), widths[i] - padX * 2);
        pdf.text(headerLines[0] || '', x + padX, cursorY + 0.5);
        x += widths[i];
      }
      cursorY += headerH;
    }

    drawHeader();

    setFontStyle('normal');
    pdf.setFontSize(8.5);
    let zebra = 0;
    for (const r of rows) {
      /* Pre-compute wrapped lines per cell + tallest cell sets row height. */
      const wrapped = (r || []).map((cell, i) =>
        pdf.splitTextToSize(String(cell ?? '–'), widths[i] - padX * 2)
      );
      const maxLines = Math.max(1, ...wrapped.map((w) => w.length));
      const rowH = Math.max(6.5, maxLines * lineH + 2);

      /* Page break inside table — re-emit header on the next page. */
      if (cursorY + rowH > PAGE.h - PAGE.margin - 12) {
        addPage();
        zebra = 0;
        drawHeader();
      }

      if (zebra % 2 === 0) {
        setColor(T.bgSoft, 'fill');
        pdf.rect(PAGE.margin, cursorY - 4, totalW, rowH, 'F');
      }
      setColor(T.text, 'text');
      setFontStyle('normal');
      pdf.setFontSize(8.5);

      let cx = PAGE.margin;
      for (let i = 0; i < (r || []).length; i++) {
        const lines = wrapped[i];
        lines.forEach((ln, j) => {
          pdf.text(ln, cx + padX, cursorY + 0.5 + j * lineH);
        });
        cx += widths[i];
      }
      cursorY += rowH;
      zebra++;
    }
    cursorY += 3;
  }

  function divider() {
    ensureSpace(4);
    setColor(T.rule, 'draw');
    pdf.setLineWidth(0.2);
    pdf.line(PAGE.margin, cursorY, PAGE.w - PAGE.margin, cursorY);
    cursorY += 4;
  }

  async function snapshot(domEl, { caption = '', maxHeight = 130 } = {}) {
    if (!domEl) return;
    const canvas = await window.html2canvas(domEl, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
    });
    const ratio = canvas.width / canvas.height;
    let imgW = PAGE.w - 2 * PAGE.margin;
    let imgH = imgW / ratio;
    if (imgH > maxHeight) {
      imgH = maxHeight;
      imgW = imgH * ratio;
    }

    ensureSpace(imgH + (caption ? 6 : 0) + 4);
    const x = (PAGE.w - imgW) / 2;
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, cursorY, imgW, imgH, undefined, 'FAST');
    cursorY += imgH + 2;
    if (caption) {
      setColor(T.muted, 'text');
      setFontStyle('normal');
      pdf.setFontSize(8);
      const capLines = pdf.splitTextToSize(caption, PAGE.w - 2 * PAGE.margin);
      capLines.forEach((ln, j) => {
        ensureSpace(4);
        pdf.text(ln, PAGE.w / 2, cursorY + 2 + j * 4, { align: 'center' });
      });
      cursorY += capLines.length * 4 + 2;
    } else {
      cursorY += 2;
    }
  }

  function pageBreak() { addPage(); }

  function applyFooters() {
    const pages = pdf.internal.pages.length - 1;
    for (let i = 1; i <= pages; i++) {
      pdf.setPage(i);
      pageFooter(i, pages);
    }
  }

  function download(filename = 'izport-report.pdf') {
    applyFooters();
    pdf.save(filename);
  }

  function dataURL() {
    applyFooters();
    return pdf.output('datauristring');
  }

  return {
    pdf,
    cover, heading, subheading, paragraph, bullet, kpiGrid, table, divider, snapshot, pageBreak,
    download, dataURL,
  };
}
