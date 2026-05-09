/**
 * charts.js — Chart.js helpers + theme-aware color resolver.
 *
 * All chart factories read CSS custom properties at creation time so the chart
 * matches the active theme. Pages should call destroy() on unmount and
 * re-create on theme change (subscribe to 'ui').
 */

const STATIC = {
  success:  '#1D9E75',
  warning:  '#BA7517',
  critical: '#E24B4A',
  /* extra palette used by stacked / categorical charts */
  series: ['#009DC4', '#1D9E75', '#BA7517', '#E24B4A', '#7A6CDA', '#00B8DB', '#E5C28A', '#5BC2E7'],
};

export function cssVar(name, fallback = '') {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export function themePalette() {
  return {
    text:        cssVar('--text-primary', '#E8EEF4'),
    textMuted:   cssVar('--text-tertiary', '#6B7B8C'),
    textSubtle:  cssVar('--text-muted', '#4A5868'),
    grid:        cssVar('--border-subtle', 'rgba(255,255,255,0.06)'),
    bg:          cssVar('--bg-2', '#131C25'),
    elev:        cssVar('--bg-3', '#1A2430'),
    brand:       cssVar('--brand-primary', '#009DC4'),
    brandDeep:   cssVar('--brand-primary-deep', '#006B8C'),
    brandBright: cssVar('--brand-primary-bright', '#4FC3DD'),
    success:     cssVar('--status-success', STATIC.success),
    warning:     cssVar('--status-warning', STATIC.warning),
    critical:    cssVar('--status-critical', STATIC.critical),
    info:        cssVar('--brand-primary', '#009DC4'),
    series:      STATIC.series,
  };
}

export function toneColor(tone) {
  const p = themePalette();
  return p[tone] ?? p.brand;
}

export function ensureChart() { return !!window.Chart; }

/* ------------------------------------------------------------------
 * Common option presets
 * ------------------------------------------------------------------ */
export function basePalette() { return themePalette(); }

export function commonOptions() {
  const p = themePalette();
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: p.textMuted, font: { family: 'Inter, system-ui, sans-serif', size: 11 }, boxWidth: 10, boxHeight: 10 },
        position: 'bottom',
      },
      tooltip: {
        backgroundColor: p.elev,
        titleColor: p.text,
        bodyColor: p.text,
        borderColor: p.grid,
        borderWidth: 1,
        padding: 8,
        cornerRadius: 6,
        boxPadding: 4,
      },
    },
    scales: {
      x: { ticks: { color: p.textSubtle, font: { size: 10 } }, grid: { color: p.grid, drawBorder: false } },
      y: { ticks: { color: p.textSubtle, font: { size: 10 } }, grid: { color: p.grid, drawBorder: false } },
    },
    animation: { duration: 320 },
    elements: { line: { borderJoinStyle: 'round' }, point: { radius: 0 } },
  };
}

export function gradient(canvas, color, alphaTop = 0.32, alphaBottom = 0) {
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.clientHeight || 200);
  grad.addColorStop(0, hexAlpha(color, alphaTop));
  grad.addColorStop(1, hexAlpha(color, alphaBottom));
  return grad;
}

export function hexAlpha(hex, alpha) {
  /* convert #RRGGBB to rgba() with alpha */
  if (!hex) return `rgba(0,0,0,${alpha})`;
  if (hex.startsWith('rgba') || hex.startsWith('rgb(')) return hex;
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* ------------------------------------------------------------------
 * Factories — return a Chart instance configured for the active theme.
 * ------------------------------------------------------------------ */
export function lineChart(canvas, datasets, opts = {}) {
  if (!ensureChart()) return null;
  const p = themePalette();
  const cfg = {
    type: 'line',
    data: {
      labels: opts.labels || [],
      datasets: datasets.map((d, i) => {
        const color = d.color || p.series[i % p.series.length];
        return {
          label: d.label,
          data: d.data,
          borderColor: color,
          backgroundColor: d.fill === false ? color : gradient(canvas, color, 0.22, 0),
          fill: d.fill !== false,
          tension: d.tension ?? 0.4,
          borderWidth: d.borderWidth ?? 2,
          pointRadius: 0,
          pointHoverRadius: 3,
          pointHoverBorderColor: '#fff',
          pointHoverBackgroundColor: color,
          spanGaps: true,
        };
      }),
    },
    options: { ...commonOptions(), ...opts.options },
  };
  return new window.Chart(canvas, cfg);
}

export function barChart(canvas, datasets, opts = {}) {
  if (!ensureChart()) return null;
  const p = themePalette();
  const cfg = {
    type: 'bar',
    data: {
      labels: opts.labels || [],
      datasets: datasets.map((d, i) => {
        const color = d.color || p.series[i % p.series.length];
        return {
          label: d.label,
          data: d.data,
          backgroundColor: hexAlpha(color, 0.85),
          borderColor: color,
          borderWidth: 0,
          borderRadius: 4,
          maxBarThickness: 28,
          stack: d.stack || undefined,
        };
      }),
    },
    options: {
      ...commonOptions(),
      scales: {
        ...commonOptions().scales,
        x: { ...commonOptions().scales.x, stacked: !!opts.stacked },
        y: { ...commonOptions().scales.y, stacked: !!opts.stacked, beginAtZero: true },
      },
      ...opts.options,
    },
  };
  return new window.Chart(canvas, cfg);
}

export function doughnutChart(canvas, data, opts = {}) {
  if (!ensureChart()) return null;
  const p = themePalette();
  const cfg = {
    type: 'doughnut',
    data: {
      labels: data.map((d) => d.label),
      datasets: [{
        data: data.map((d) => d.value),
        backgroundColor: data.map((d, i) => d.color || p.series[i % p.series.length]),
        borderColor: p.bg,
        borderWidth: 2,
        hoverOffset: 6,
      }],
    },
    options: {
      ...commonOptions(),
      cutout: opts.cutout ?? '64%',
      ...opts.options,
    },
  };
  return new window.Chart(canvas, cfg);
}

export function radarChart(canvas, datasets, opts = {}) {
  if (!ensureChart()) return null;
  const p = themePalette();
  const cfg = {
    type: 'radar',
    data: {
      labels: opts.labels || [],
      datasets: datasets.map((d, i) => {
        const color = d.color || p.series[i % p.series.length];
        return {
          label: d.label,
          data: d.data,
          borderColor: color,
          backgroundColor: hexAlpha(color, 0.18),
          pointRadius: 2,
          pointBackgroundColor: color,
          borderWidth: 2,
        };
      }),
    },
    options: {
      ...commonOptions(),
      scales: {
        r: {
          angleLines: { color: p.grid },
          grid:       { color: p.grid },
          pointLabels:{ color: p.textMuted, font: { size: 10 } },
          ticks:      { color: p.textSubtle, backdropColor: 'transparent', font: { size: 9 } },
        },
      },
      ...opts.options,
    },
  };
  return new window.Chart(canvas, cfg);
}

export function scatterChart(canvas, datasets, opts = {}) {
  if (!ensureChart()) return null;
  const p = themePalette();
  const cfg = {
    type: 'scatter',
    data: {
      datasets: datasets.map((d, i) => {
        const color = d.color || p.series[i % p.series.length];
        return {
          label: d.label,
          data: d.data,
          backgroundColor: hexAlpha(color, 0.7),
          borderColor: color,
          borderWidth: 1,
          pointRadius: d.pointRadius ?? 5,
          pointHoverRadius: 7,
        };
      }),
    },
    options: { ...commonOptions(), ...opts.options },
  };
  return new window.Chart(canvas, cfg);
}

/* Render a heatmap on a plain canvas (no Chart.js plugin needed). */
export function drawHeatmap(canvas, { rows, cols, values, min = 0, max = 1, color }) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1);
  const h = canvas.height = canvas.clientHeight * (window.devicePixelRatio || 1);
  ctx.clearRect(0, 0, w, h);
  const cellW = w / cols;
  const cellH = h / rows;
  const palette = themePalette();
  const baseColor = color || palette.brand;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = values[r]?.[c] ?? 0;
      const norm = max > min ? (v - min) / (max - min) : 0;
      ctx.fillStyle = hexAlpha(baseColor, 0.06 + norm * 0.85);
      ctx.fillRect(c * cellW, r * cellH, cellW - 1, cellH - 1);
    }
  }
}
