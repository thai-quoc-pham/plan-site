/* Biểu đồ nhẹ bằng SVG/HTML thuần, không thư viện. Mọi giá trị đều có chữ kèm số để không chỉ dựa vào màu. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WeddingCharts = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const MAX_SLICES = 7;
  const pct = (v, total) => total > 0 ? Math.round(v / total * 1000) / 10 : 0;
  const r1 = n => String(Math.round(n * 10) / 10);

  function donut(items, o = {}) {
    const fmt = o.fmt || String;
    let list = items.filter(x => x.value > 0).sort((a, b) => b.value - a.value);
    if (list.length > MAX_SLICES + 1) {
      const rest = list.slice(MAX_SLICES);
      list = [...list.slice(0, MAX_SLICES), { label: 'Khác', value: rest.reduce((s, x) => s + x.value, 0) }];
    }
    const total = list.reduce((s, x) => s + x.value, 0);
    if (!total) return '';
    let acc = 0;
    const segs = list.map((x, i) => {
      const share = x.value / total * 100, seg = { ...x, i, share, offset: 25 - acc };
      acc += share; return seg;
    });
    const summary = segs.map(s => `${s.label} ${Math.round(s.share)}%`).join(', ');
    const label = `${o.ariaLabel || 'Biểu đồ tròn'}: ${summary}`;
    const circles = segs.map(s => `<circle class="donut-seg" cx="21" cy="21" r="15.9155" fill="none" stroke-width="6" style="stroke:var(--chart-${s.i + 1})" stroke-dasharray="${r1(s.share)} ${r1(100 - s.share)}" stroke-dashoffset="${r1(s.offset)}"></circle>`).join('');
    const center = o.centerValue != null ? `<text x="21" y="20.5" text-anchor="middle" class="donut-value">${esc(o.centerValue)}</text><text x="21" y="26" text-anchor="middle" class="donut-label">${esc(o.centerLabel || '')}</text>` : '';
    const legend = segs.map(s => `<li><span class="legend-dot" style="background:var(--chart-${s.i + 1})"></span><span class="legend-name">${esc(s.label)}</span><span class="legend-val">${esc(fmt(s.value))} · ${Math.round(s.share)}%</span></li>`).join('');
    return `<div class="donut-wrap"><svg class="donut" viewBox="0 0 42 42" role="img" aria-label="${esc(label)}"><circle cx="21" cy="21" r="15.9155" fill="none" stroke="var(--line)" stroke-width="6"></circle>${circles}${center}</svg><ul class="chart-legend">${legend}</ul></div>`;
  }

  /** Thanh ngang theo nhóm: mỗi dòng một danh mục, mỗi series một thanh. */
  function bars(rows, o = {}) {
    const fmt = o.fmt || String, series = o.series || [];
    if (!rows.length || !series.length) return '';
    const max = Math.max(0, ...rows.flatMap(r => series.map(s => Number(r[s.key]) || 0)));
    if (!max) return '';
    const legend = series.map((s, i) => `<span class="legend-item"><span class="legend-dot s${i}"></span>${esc(s.label)}</span>`).join('');
    const body = rows.map(r => `<div class="hbar-row"><div class="hbar-name">${esc(r.label)}</div><div class="hbar-tracks">${series.map((s, i) => {
      const v = Number(r[s.key]) || 0;
      return `<div class="hbar-line"><div class="hbar-track"><span class="hbar-fill s${i}" style="width:${r1(v / max * 100)}%"></span></div><span class="hbar-val">${esc(fmt(v))}</span></div>`;
    }).join('')}</div></div>`).join('');
    return `<div class="hbars" role="group" aria-label="${esc(o.ariaLabel || 'Biểu đồ cột')}"><div class="chart-legend-inline">${legend}</div>${body}</div>`;
  }

  /** Một thanh xếp chồng (ví dụ cơ cấu xác nhận khách mời). */
  function stack(items, o = {}) {
    const fmt = o.fmt || String, list = items.filter(x => x.value > 0), total = list.reduce((s, x) => s + x.value, 0);
    if (!total) return '';
    const label = `${o.ariaLabel || 'Cơ cấu'}: ${list.map(x => `${x.label} ${x.value}`).join(', ')}`;
    return `<div class="stackbar" role="img" aria-label="${esc(label)}">${list.map(x => `<span style="width:${r1(pct(x.value, total))}%;background:${x.color}"></span>`).join('')}</div><ul class="chart-legend row">${list.map(x => `<li><span class="legend-dot" style="background:${x.color}"></span><span class="legend-name">${esc(x.label)}</span><span class="legend-val">${esc(fmt(x.value))} · ${Math.round(pct(x.value, total))}%</span></li>`).join('')}</ul>`;
  }

  /** Thanh tiến độ so với mục tiêu; vượt mục tiêu thì đổi màu và vẫn hiện số thực. */
  function progress(value, target, o = {}) {
    const fmt = o.fmt || String, ratio = target > 0 ? value / target : 0, over = target > 0 && value > target;
    const width = Math.min(100, Math.max(0, ratio * 100));
    return `<div class="chart-progress ${over ? 'over' : ''}" role="progressbar" aria-label="${esc(o.label || 'Tiến độ')}" aria-valuemin="0" aria-valuemax="${Math.round(target)}" aria-valuenow="${Math.round(value)}" aria-valuetext="${esc(fmt(value))} / ${esc(fmt(target))}"><span style="width:${r1(width)}%"></span></div>`;
  }
  return { donut, bars, stack, progress, esc };
});
