/* Web del modelo 29-N. Gráficos en SVG/Canvas sin dependencias; datos en window.DATA (data.js). */
(() => {
'use strict';
const D = window.DATA;
const $ = (s, r = document) => r.querySelector(s);
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
};
const h = (tag, cls, html, parent) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
};
const col = k => `var(--c-${k})`;
const css = k => getComputedStyle(document.documentElement).getPropertyValue(k).trim();

/* ---------- formato ---------- */
const nf = d => new Intl.NumberFormat('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
const f1 = x => nf(1).format(x), f0 = x => nf(0).format(x), f2 = x => nf(2).format(x);
const pct = x => `${f1(x)} %`;
const signed = (x, f = f1) => {
  const s = f(Math.abs(x));
  if (!/[1-9]/.test(s)) return s;            // evita «−0,0»
  return (x > 0 ? '+' : '−') + s;
};
const prob = p => p >= .99 ? '>99 %' : p <= .01 ? '<1 %' : `${f0(p * 100)} %`;
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const dFmt = (s, o = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  new Intl.DateTimeFormat('es-ES', { ...o, timeZone: 'UTC' }).format(new Date(s + 'T00:00:00Z'));
const ms = s => Date.parse(s + 'T00:00:00Z');

/* ---------- utilidades ---------- */
const ease = t => 1 - Math.pow(1 - t, 3);
function tween(dur, fn, done) {
  if (REDUCED || dur <= 0) { fn(1); done && done(); return () => {}; }
  let id, t0, stop = false;
  const step = t => {
    if (stop) return;
    t0 ??= t;
    const p = Math.min((t - t0) / dur, 1);
    fn(ease(p));
    if (p < 1) id = requestAnimationFrame(step); else done && done();
  };
  id = requestAnimationFrame(step);
  return () => { stop = true; cancelAnimationFrame(id); };
}
const lin = (d0, d1, r0, r1) => {
  const f = x => r0 + (x - d0) / (d1 - d0 || 1) * (r1 - r0);
  f.inv = y => d0 + (y - r0) / (r1 - r0 || 1) * (d1 - d0);
  return f;
};
function niceStep(span, n) {
  const raw = span / n, p = 10 ** Math.floor(Math.log10(raw)), m = raw / p;
  return (m < 1.5 ? 1 : m < 3 ? 2 : m < 7 ? 5 : 10) * p;
}
function ticks(a, b, n) {
  const s = niceStep(b - a, n), o = [];
  for (let v = Math.ceil(a / s) * s; v <= b + 1e-9; v += s) o.push(+v.toFixed(6));
  return o;
}
function onVisible(el, fn, threshold = .18) {
  if (!('IntersectionObserver' in window)) return fn();
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { io.disconnect(); fn(); }
  }), { threshold });
  io.observe(el);
}

/* ---------- tooltip ---------- */
const tip = $('#tip');
function showTip(html, ev) {
  tip.innerHTML = html; tip.hidden = false;
  const r = tip.getBoundingClientRect(), pad = 14;
  let x = ev.clientX + pad, y = ev.clientY + pad;
  if (x + r.width > innerWidth - 8) x = ev.clientX - r.width - pad;
  if (y + r.height > innerHeight - 8) y = ev.clientY - r.height - pad;
  tip.style.transform = `translate(${Math.max(8, x)}px,${Math.max(8, y)}px)`;
}
const hideTip = () => { tip.hidden = true; };
addEventListener('scroll', hideTip, { passive: true });
const bindTip = (el, html) => {
  el.addEventListener('pointermove', e => showTip(typeof html === 'function' ? html(e) : html, e));
  el.addEventListener('pointerleave', hideTip);
};
const tr = (color, name, val, extra = '') =>
  `<div class="tr"><span><i class="sw" style="background:${col(color)}"></i>${name}</span><span>${val}${extra ? `<em>${extra}</em>` : ''}</span></div>`;

/* ---------- pestañas ---------- */
const tabs = [[$('#t-res'), $('#resultados')], [$('#t-mod'), $('#modelo')]];
const ind = $('.tab-ind');
const placeInd = () => {
  const b = tabs.find(([t]) => t.getAttribute('aria-selected') === 'true')[0];
  ind.style.width = b.offsetWidth + 'px';
  ind.style.transform = `translateX(${b.offsetLeft}px)`;
};
let modelReady = false;
function select(i, target) {
  tabs.forEach(([t, p], j) => {
    t.setAttribute('aria-selected', i === j); t.tabIndex = i === j ? 0 : -1; p.hidden = i !== j;
  });
  placeInd();
  if (i === 1 && !modelReady) { modelReady = true; initModel(); }
  else redrawAll();
  if (target) requestAnimationFrame(() => $('#' + target)?.scrollIntoView({ block: 'start' }));
  else scrollTo({ top: 0, behavior: 'instant' });
}
tabs.forEach(([t], i) => {
  t.addEventListener('click', () => { history.replaceState(null, '', i ? '#modelo' : '#resultados'); select(i); });
  t.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const j = 1 - i; tabs[j][0].focus(); tabs[j][0].click();
    }
  });
});
document.addEventListener('click', e => {
  const a = e.target.closest('a[href="#modelo"],a[href="#resultados"]');
  if (!a) return;
  e.preventDefault();
  const i = a.getAttribute('href') === '#modelo' ? 1 : 0;
  history.replaceState(null, '', a.getAttribute('href'));
  select(i, a.dataset.go);
});

/* ---------- tema ---------- */
$('#theme').addEventListener('click', () => {
  const dark = document.documentElement.dataset.theme
    ? document.documentElement.dataset.theme === 'dark'
    : matchMedia('(prefers-color-scheme: dark)').matches;
  const next = dark ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('tema', next); } catch (e) { /* sin almacenamiento */ }
  redrawAll();
});

/* redibujado responsive: cada gráfico se registra aquí */
const redraws = [];
function redrawAll() { redraws.forEach(f => { if (f.el.offsetParent !== null) f(); }); }
const responsive = (el, fn) => { fn.el = el; redraws.push(fn); return fn; };
let lastW = innerWidth, rt;
addEventListener('resize', () => {
  placeInd();
  if (innerWidth === lastW) return;
  lastW = innerWidth; clearTimeout(rt); rt = setTimeout(redrawAll, 140);
});

/* ================= portada ================= */
const S = D.seats;
const byKey = Object.fromEntries(S.perList.map(p => [p.key, p]));
const vKey = Object.fromEntries(D.vote.map(p => [p.key, p]));

function hero() {
  const days = Math.ceil((ms(D.meta.election) - Date.now()) / 864e5);
  $('#countdown').textContent = days > 1 ? `Faltan ${days} días · 29 de noviembre de 2026`
    : days === 1 ? 'Mañana se vota' : days === 0 ? 'Hoy se vota' : 'Última estimación antes del 29-N';
  const [a, b, c] = S.perList;
  const bloc = S.blocs[0];
  $('#lede').innerHTML = `Si se votara como apuntan hoy las encuestas, el <strong>${a.short}</strong> sería primera fuerza con unos
    <strong>${a.med} escaños</strong>, por delante del ${b.short} (${b.med}) y ${c.short} (${c.med}).
    ${bloc.label} sumaría <strong>${bloc.med}</strong>, ${bloc.med >= 176 ? 'por encima' : 'por debajo'} de los 176 de la mayoría absoluta.`;
  $('#facts').textContent = `${f0(D.meta.nPolls)} encuestas de ${D.meta.nHouses} casas desde el 23-J · última encuesta: ${dFmt(D.meta.lastPoll)} · actualizado el ${dFmt(D.meta.built)}`;
  const tile = (l, v, s) => `<div class="tile"><div class="l">${l}</div><div class="v">${v}</div><div class="s">${s}</div></div>`;
  const alt = S.blocs[2];
  $('#tiles').innerHTML =
    tile(`${a.short}, primera fuerza en escaños`, prob(D.summary.pPPfirstSeats), `${a.short}: ${a.p05}–${a.p95} escaños · ${b.short}: ${b.p05}–${b.p95}`) +
    tile('PP + Vox llegan a 176', prob(D.summary.pPPVox), `Suma de ${bloc.p05} a ${bloc.p95} escaños`) +
    tile('PP en solitario llega a 176', prob(D.summary.pPPalone), `Máximo simulado: ${Math.max(...S.sims.map(s => s[S.lists.indexOf('PP')]))} escaños`) +
    tile('Bloque PSOE ampliado', `${alt.med}`, `De ${alt.p05} a ${alt.p95} escaños: PSOE, FA, Podemos, Compromís, UPC, ERC, Bildu, PNV, BNG y Junts`);
  $('#foot-meta').textContent = `Actualizado el ${dFmt(D.meta.built)} con ${f0(D.meta.nDraws)} muestras del posterior y ${f0(D.meta.nSims)} simulaciones de escaños.`;
}

/* ---------- hemiciclo ---------- */
function hemicycle() {
  const svg = $('#hemi'), W = 800, Hh = 420, cx = W / 2, cy = 410, rows = 10, R1 = 392, R0 = 168, n = S.total;
  const radii = Array.from({ length: rows }, (_, i) => R0 + (R1 - R0) * i / (rows - 1));
  const sum = radii.reduce((a, b) => a + b, 0);
  let per = radii.map(r => n * r / sum), base = per.map(Math.floor);
  let left = n - base.reduce((a, b) => a + b, 0);
  per.map((v, i) => [v - base[i], i]).sort((a, b) => b[0] - a[0]).slice(0, left).forEach(([, i]) => base[i]++);
  const pts = [];
  radii.forEach((r, i) => {
    for (let k = 0; k < base[i]; k++) {
      const a = Math.PI - Math.PI * (k + .5) / base[i];
      pts.push({ a, x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) });
    }
  });
  pts.sort((p, q) => q.a - p.a);
  const dots = pts.map((p, i) => svgEl('circle', {
    cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: 9, class: 'in pre', style: `--d:${Math.round(i * 2.2)}ms`,
  }, svg));
  svgEl('line', { x1: cx, x2: cx, y1: cy - R1 - 16, y2: cy - R0 + 14, stroke: 'var(--ink)', 'stroke-width': 1.5, 'stroke-dasharray': '2 4', opacity: .55 }, svg);
  const lbl = svgEl('text', { x: cx, y: cy - R1 - 22, 'text-anchor': 'middle', fill: 'var(--ink2)', 'font-size': 14, 'font-family': 'Inter,sans-serif' }, svg);
  lbl.textContent = 'Mayoría: 176';

  const counts = arr => S.hemiOrder.map((k, i) => [k, arr[i]]);
  let current = counts(S.hemiOrder.map(k => S.typical[k]));
  function paint(list) {
    current = list;
    let i = 0;
    list.forEach(([k, c]) => { for (let j = 0; j < c && i < dots.length; j++, i++) {
      dots[i].style.fill = col(S.meta[k].color); dots[i].dataset.k = k;
    } });
    for (; i < dots.length; i++) dots[i].style.fill = 'var(--wash)';
    $('#hemi-legend').innerHTML = list.filter(([, c]) => c > 0).map(([k, c]) =>
      `<span><i style="background:${col(S.meta[k].color)}"></i>${S.meta[k].short} <b>${c}</b></span>`).join('');
    const m = Object.fromEntries(list);
    $('#hemi-n').textContent = m.PP + m.Vox;
  }
  svg.addEventListener('pointermove', e => {
    const k = e.target.dataset?.k;
    if (!k) return hideTip();
    const p = byKey[k], c = Object.fromEntries(current)[k];
    showTip(`<h5>${p.name}</h5>${c} escaños aquí<br><small>Mediana ${p.med} · intervalo ${p.p05}–${p.p95}</small>`, e);
  });
  svg.addEventListener('pointerleave', hideTip);

  const cap = $('#hemi-cap'), btn = $('#hemi-play'), lab = btn.querySelector('span:last-child'), ico = btn.querySelector('.ico');
  const typicalCap = 'PP + Vox en el reparto típico';
  const typical = () => { paint(counts(S.hemiOrder.map(k => S.typical[k]))); cap.textContent = typicalCap; };
  const one = () => {
    const i = Math.floor(Math.random() * S.sims.length), s = S.sims[i];
    paint(S.hemiOrder.map(k => [k, s[S.lists.indexOf(k)]]));
    cap.textContent = `PP + Vox en la simulación ${f0(i + 1)} de ${f0(S.sims.length)}`;
  };
  let timer = null;
  const stop = () => { clearInterval(timer); timer = null; ico.textContent = '▶'; lab.textContent = 'Simular elecciones'; };
  btn.addEventListener('click', () => {
    if (timer) return stop();
    one();
    if (REDUCED) return;
    timer = setInterval(one, 1500); ico.textContent = '❚❚'; lab.textContent = 'Parar';
  });
  $('#hemi-reset').addEventListener('click', () => { stop(); typical(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  typical();
  onVisible(svg, () => requestAnimationFrame(() => dots.forEach(d => d.classList.remove('pre'))), .05);
}

/* ---------- voto: densidades ---------- */
// Sin resultado propio en 2023: fueron en coalición o sólo se conocen por el prior del modelo
const NOT_2023 = ['FA', 'FV', 'Podemos', 'AA', 'AC', 'Otros'];
function voteChart() {
  const root = $('#vote');
  const rows = D.vote.filter(v => v.key !== 'Otros').concat(D.vote.filter(v => v.key === 'Otros'));
  const xmax = Math.ceil(Math.max(...rows.map(v => v.hist.hi)) / 5) * 5;
  root.innerHTML = '';
  const wrap = h('div', 'rows', null, root);
  const head = h('div', 'row vrow head', '<span>Candidatura</span><span class="axis-slot"></span><span class="rval" style="font-weight:400;font-size:12px;color:var(--muted)">Mediana</span><span class="rdelta" style="color:var(--muted);font-size:12px">vs 2023</span>', wrap);
  const items = rows.map(v => {
    const row = h('div', 'row vrow', null, wrap);
    h('div', 'rname', `<i class="sw" style="background:${col(v.color)}"></i><span class="fu">${v.name}</span><span class="ab">${v.short}</span>`, row);
    const slot = h('div', 'rsvg', null, row);
    h('div', 'rval', `${pct(v.med)}<small>${f1(v.p05)}–${f1(v.p95)}</small>`, row);
    h('div', 'rdelta', NOT_2023.includes(v.key) ? '–' : signed(v.diff), row);
    bindTip(row, `<h5>${v.name}</h5>Mediana ${pct(v.med)}<br>Intervalo del 90 %: ${f1(v.p05)}–${f1(v.p95)}<br>` +
      `<small>${NOT_2023.includes(v.key) ? '' : `En el 23-J: ${pct(v.y2023)}`}${v.pFirst > .001 ? ` · Primera fuerza: ${prob(v.pFirst)}` : ''}</small>`);
    return { v, slot };
  });
  const axisSlot = head.querySelector('.axis-slot');
  const draw = responsive(root, () => {
    const w = axisSlot.clientWidth, x = lin(0, xmax, 0, w), H = 36;
    axisSlot.innerHTML = '';
    const ax = svgEl('svg', { width: w, height: 22 }, axisSlot);
    ticks(0, xmax, w < 320 ? 3 : 7).forEach(t => {
      const tx = svgEl('text', { x: x(t), y: 15, 'text-anchor': t === 0 ? 'start' : 'middle' }, ax);
      tx.textContent = `${t} %`;
    });
    items.forEach(({ v, slot }, i) => {
      slot.innerHTML = '';
      const s = svgEl('svg', { width: w, height: H }, slot);
      ticks(0, xmax, w < 320 ? 3 : 7).forEach(t => svgEl('line', { class: 'grid-l', x1: x(t), x2: x(t), y1: 0, y2: H }, s));
      const { lo, hi, c } = v.hist, step = (hi - lo) / c.length, m = Math.max(...c);
      let d = `M${x(lo)},${H - 3}`;
      c.forEach((p, j) => { d += `L${x(lo + step * (j + .5)).toFixed(1)},${(H - 3 - p / m * (H - 9)).toFixed(1)}`; });
      d += `L${x(hi)},${H - 3}Z`;
      const g = svgEl('g', { style: `transform-origin:0 ${H - 3}px;transform:scaleY(${items.done ? 1 : 0});transition:transform .8s cubic-bezier(.2,1.2,.4,1) ${i * 45}ms` }, s);
      svgEl('path', { d, fill: col(v.color), opacity: .28 }, g);
      svgEl('line', { x1: x(v.p05), x2: x(v.p95), y1: H - 3, y2: H - 3, stroke: col(v.color), 'stroke-width': 3, 'stroke-linecap': 'round' }, s);
      svgEl('circle', { cx: x(v.med), cy: H - 3, r: 4.5, fill: col(v.color), stroke: 'var(--bg)', 'stroke-width': 2 }, s);
      if (!NOT_2023.includes(v.key))
        svgEl('line', { x1: x(v.y2023), x2: x(v.y2023), y1: H - 15, y2: H, stroke: 'var(--ink2)', 'stroke-width': 1.5 }, s);
      slot._g = g;
    });
  });
  draw();
  onVisible(root, () => { items.done = true; items.forEach(({ slot }) => { slot._g.style.transform = 'scaleY(1)'; }); }, .08);
  const r = D.raw.mean;
  const cmp = ['PP', 'PSOE', 'Vox'].map(k => `${k} ${f1(r[k])} frente a ${f1(vKey[k].med)}`).join('; ');
  $('#vote-note').innerHTML = `La marca vertical es el resultado del 23-J. Frente Amplio, Compromís y Podemos no se comparan porque concurrieron juntos en Sumar (${pct(vKey.FA.y2023 + vKey.FV.y2023 + vKey.Podemos.y2023)}), ni tampoco Adelante Andalucía, Aliança Catalana y Otros, que en 2023 no se observan por separado.
    El dato de Podemos es su base nacional, incluida la parte que irá en coalición en C. Valenciana, Cataluña y Canarias.
    Para comparar, la media simple de las ${D.raw.nHouses} casas con encuestas en los últimos ${D.raw.days} días da ${cmp} del modelo.`;
  $('#vote-table').innerHTML = `<table><thead><tr><th>Candidatura</th><th class="n">Mediana</th><th class="n">Media</th><th class="n">P5</th><th class="n">P95</th><th class="n">23-J</th></tr></thead><tbody>` +
    rows.map(v => `<tr><td>${v.name}</td><td class="n">${f1(v.med)}</td><td class="n">${f1(v.mean)}</td><td class="n">${f1(v.p05)}</td><td class="n">${f1(v.p95)}</td><td class="n">${f1(v.y2023)}</td></tr>`).join('') + '</tbody></table>';
}

/* ---------- evolución ---------- */
function evolution() {
  const root = $('#evo'), E = D.evolution;
  const T = D.dates.length, tms = D.dates.map(ms);
  const lastPoll = ms(D.meta.lastPoll);
  const keys = ['PP', 'PSOE', 'Vox', 'S', 'Podemos', 'SALF'];
  const sel = new Set(keys);
  const events = [
    { d: ms(D.meta.split), n: 1, t: 'Las encuestas empiezan a separar a Podemos de Sumar' },
    { d: ms(D.meta.birthSALF), n: 2, t: 'SALF aparece en las encuestas' },
    { d: ms(D.meta.coalition), n: 3, t: 'Se cierran los acuerdos de candidaturas de 2026' },
  ];
  $('#evo-note').innerHTML = events.map(e => `<b>${e.n}</b> ${e.t} (${dFmt(new Date(e.d).toISOString().slice(0, 10), { month: 'short', year: 'numeric' })})`).join(' · ') +
    `. La zona sombreada es proyección: desde la última encuesta el modelo solo arrastra la tendencia y aumenta la incertidumbre. El espacio Sumar agrupa a Frente Amplio y Compromís. Desde el 13-O los puntos de Podemos se reescalan a su base nacional (se divide entre ${f2(D.meta.podemosShare)}).`;

  root.innerHTML = '';
  const canvas = h('canvas', null, null, root);
  const svg = svgEl('svg', { role: 'img', 'aria-label': 'Evolución de la intención de voto por partido desde julio de 2023' }, root);
  const defs = svgEl('defs', {}, svg);
  const clip = svgEl('rect', { y: -10 }, svgEl('clipPath', { id: 'evo-clip' }, defs));
  const gShade = svgEl('g', {}, svg), gGrid = svgEl('g', {}, svg), gEv = svgEl('g', {}, svg);
  const gBand = svgEl('g', { 'clip-path': 'url(#evo-clip)' }, svg), gLine = svgEl('g', { 'clip-path': 'url(#evo-clip)' }, svg);
  const gHead = svgEl('g', {}, svg);
  const cross = svgEl('line', { class: 'axis-l', opacity: 0 }, svg), gCross = svgEl('g', {}, svg);
  const hit = svgEl('rect', { fill: 'transparent' }, svg);

  const st = { x0: tms[0], y1: 40, prog: 0, showPolls: true, W: 0, H: 0, range: 'all' };
  const series = {}; keys.forEach(k => {
    series[k] = {
      band: svgEl('path', { fill: col(E[k].color), opacity: .13 }, gBand),
      line: svgEl('path', { fill: 'none', stroke: col(E[k].color), 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, gLine),
      fade: sel.has(k) ? 1 : 0,
    };
  });
  const pollPts = keys.map(k => [k, D.polls.filter(p => p[3][k] != null).map(p => [ms(p[0]), p[3][k]])]);
  const margin = () => ({ l: 34, r: st.W < 560 ? 84 : 104, t: 22, b: 26 });
  const scales = () => {
    const m = margin();
    return { m, x: lin(st.x0, tms[T - 1], m.l, st.W - m.r), y: lin(0, st.y1, st.H - m.b, m.t) };
  };
  const yMax = (x0) => {
    let v = 0;
    sel.forEach(k => E[k].p95.forEach((q, i) => { if (q != null && tms[i] >= x0) v = Math.max(v, q); }));
    return Math.ceil((v + 1.5) / 5) * 5;
  };

  function drawDots(cut) {
    const dpr = devicePixelRatio || 1, c = canvas.getContext('2d');
    canvas.width = st.W * dpr; canvas.height = st.H * dpr;
    canvas.style.width = st.W + 'px'; canvas.style.height = st.H + 'px';
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!st.showPolls) return;
    const { x, y, m } = scales();
    c.globalAlpha = +css('--dot-a') || .34;
    pollPts.forEach(([k, pts]) => {
      if (!sel.has(k)) return;
      c.fillStyle = css(`--c-${E[k].color}`);
      pts.forEach(([t, v]) => {
        if (t > cut || t < st.x0) return;
        const py = y(v); if (py < m.t) return;
        c.beginPath(); c.arc(x(t), py, st.W < 560 ? 1.4 : 2, 0, 7); c.fill();
      });
    });
  }
  function drawFrame() {
    const { m, x, y } = scales();
    gGrid.textContent = ''; gEv.textContent = ''; gShade.textContent = '';
    svgEl('rect', { x: x(lastPoll), y: m.t, width: Math.max(0, x(tms[T - 1]) - x(lastPoll)), height: st.H - m.t - m.b, fill: 'var(--wash)' }, gShade);
    ticks(0, st.y1, st.H < 400 ? 4 : 6).forEach(t => {
      svgEl('line', { class: t ? 'grid-l' : 'axis-l', x1: m.l, x2: st.W - m.r, y1: y(t), y2: y(t) }, gGrid);
      svgEl('text', { x: m.l - 7, y: y(t) + 4, 'text-anchor': 'end' }, gGrid).textContent = t;
    });
    // eje temporal
    const span = (tms[T - 1] - st.x0) / 864e5, stepM = span > 700 ? (st.W < 560 ? 12 : 6) : span > 200 ? (st.W < 560 ? 3 : 2) : 1;
    const d0 = new Date(st.x0), dm = new Date(Date.UTC(d0.getUTCFullYear(), Math.ceil(d0.getUTCMonth() / stepM + .01) * stepM, 1));
    for (let d = dm; +d <= tms[T - 1]; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + stepM, 1))) {
      const lab = stepM >= 12 ? String(d.getUTCFullYear()) : new Intl.DateTimeFormat('es-ES', { month: 'short', timeZone: 'UTC' }).format(d).replace('.', '') + (d.getUTCMonth() < stepM ? ` ${String(d.getUTCFullYear()).slice(2)}` : '');
      svgEl('text', { x: x(+d), y: st.H - 7, 'text-anchor': 'middle' }, gGrid).textContent = lab;
    }
    let prevX = -99;
    events.forEach(e => {
      if (e.d < st.x0) return;
      svgEl('line', { class: 'axis-l', x1: x(e.d), x2: x(e.d), y1: m.t - 2, y2: st.H - m.b }, gEv);
      const mx = Math.max(x(e.d), prevX + 18); prevX = mx;    // que no se pisen los marcadores
      const c = svgEl('circle', { cx: mx, cy: m.t - 8, r: 8, fill: 'var(--surface)', stroke: 'var(--axis)' }, gEv);
      const t = svgEl('text', { x: mx, y: m.t - 4, 'text-anchor': 'middle', class: 'ink', style: 'font-size:10.5px' }, gEv);
      t.textContent = e.n;
      bindTip(c, e.t);
    });
    keys.forEach(k => {
      const s = series[k], e = E[k];
      let top = '', bot = '', ln = '', started = false;
      for (let i = 0; i < T; i++) {
        if (e.med[i] == null) continue;
        const px = x(tms[i]).toFixed(1);
        ln += `${started ? 'L' : 'M'}${px},${y(e.med[i]).toFixed(1)}`;
        top += `${started ? 'L' : 'M'}${px},${y(e.p95[i]).toFixed(1)}`;
        bot = `L${px},${y(e.p05[i]).toFixed(1)}` + bot;
        started = true;
      }
      s.line.setAttribute('d', ln); s.band.setAttribute('d', top + bot + 'Z');
      s.line.style.opacity = s.fade; s.band.style.opacity = .13 * s.fade;
    });
    hit.setAttribute('x', m.l); hit.setAttribute('y', m.t); hit.setAttribute('width', Math.max(0, st.W - m.l - m.r)); hit.setAttribute('height', st.H - m.t - m.b);
    setProgress(st.prog);
  }
  function setProgress(p) {
    st.prog = p;
    const { m, x, y } = scales();
    const cut = st.x0 + (tms[T - 1] - st.x0) * p;
    clip.setAttribute('x', m.l - 4); clip.setAttribute('width', Math.max(0, x(cut) - m.l + 6));
    clip.setAttribute('height', st.H + 20);
    drawDots(cut);
    // cabezas: etiquetas que acompañan a las líneas
    let idx = tms.findIndex(t => t > cut); idx = idx < 0 ? T - 1 : Math.max(idx - 1, 0);
    gHead.textContent = '';
    const heads = keys.filter(k => sel.has(k) && E[k].med[idx] != null)
      .map(k => ({ k, v: E[k].med[idx], y: y(E[k].med[idx]) })).sort((a, b) => a.y - b.y);
    for (let i = 1; i < heads.length; i++) heads[i].y = Math.max(heads[i].y, heads[i - 1].y + 15);
    const over = heads.length ? heads[heads.length - 1].y - (st.H - m.b - 2) : 0;
    if (over > 0) { heads.forEach(hh => { hh.y -= over; }); for (let i = heads.length - 2; i >= 0; i--) heads[i].y = Math.min(heads[i].y, heads[i + 1].y - 15); }
    const hx = x(Math.max(tms[idx], st.x0));
    heads.forEach(hd => {
      svgEl('circle', { cx: hx, cy: y(hd.v), r: 4, fill: col(E[hd.k].color), stroke: 'var(--bg)', 'stroke-width': 2 }, gHead);
      const t = svgEl('text', { x: hx + 9, y: hd.y + 4, class: 'ink' }, gHead);
      t.textContent = `${E[hd.k].short} ${f1(hd.v)}`;
    });
  }
  const draw = responsive(root, () => {
    st.W = root.clientWidth; st.H = root.clientHeight;
    svg.setAttribute('width', st.W); svg.setAttribute('height', st.H);
    drawFrame();
  });
  draw();

  let stopZoom = null;
  function retarget() {
    const r = st.range;
    const x1 = r === 'all' ? tms[0] : tms[T - 1] - r * 30.44 * 864e5;
    const from = { x0: st.x0, y1: st.y1, f: Object.fromEntries(keys.map(k => [k, series[k].fade])) }, ty = yMax(x1);
    stopZoom && stopZoom();
    stopZoom = tween(500, p => {
      st.x0 = from.x0 + (x1 - from.x0) * p; st.y1 = from.y1 + (ty - from.y1) * p;
      keys.forEach(k => { series[k].fade = from.f[k] + ((sel.has(k) ? 1 : 0) - from.f[k]) * p; });
      drawFrame();
    });
  }
  st.y1 = yMax(st.x0);

  // controles
  const chips = $('#evo-chips');
  keys.forEach(k => {
    const b = h('button', 'chip', `<i class="sw" style="background:${col(E[k].color)}"></i>${E[k].short}`, chips);
    b.setAttribute('aria-pressed', 'true');
    b.addEventListener('click', () => {
      if (sel.has(k) && sel.size === 1) return;
      sel.has(k) ? sel.delete(k) : sel.add(k);
      b.setAttribute('aria-pressed', sel.has(k));
      retarget();
    });
  });
  $('#evo-range').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    [...e.currentTarget.children].forEach(c => c.classList.toggle('on', c === b));
    st.range = b.dataset.r === 'all' ? 'all' : +b.dataset.r;
    retarget();
  });
  $('#evo-polls').addEventListener('change', e => { st.showPolls = e.target.checked; drawFrame(); });
  let stopPlay = null;
  const playBtn = $('#evo-play');
  // Reproducción lineal, no con ease-out: el tiempo avanza a ritmo constante
  const playLinear = dur => {
    stopPlay && stopPlay();
    if (REDUCED) return setProgress(1);
    let t0, id, stop = false;
    const step = t => {
      if (stop) return;
      t0 ??= t; const p = Math.min((t - t0) / dur, 1);
      setProgress(p);
      if (p < 1) id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    stopPlay = () => { stop = true; cancelAnimationFrame(id); };
  };
  playBtn.addEventListener('click', () => playLinear(6000));

  // cursor
  const onMove = ev => {
    const { x, y, m } = scales(), rect = svg.getBoundingClientRect();
    const t = x.inv(ev.clientX - rect.left);
    let i = 0, best = Infinity;
    tms.forEach((v, j) => { if (Math.abs(v - t) < best) { best = Math.abs(v - t); i = j; } });
    if (tms[i] < st.x0) return;
    cross.setAttribute('x1', x(tms[i])); cross.setAttribute('x2', x(tms[i]));
    cross.setAttribute('y1', m.t); cross.setAttribute('y2', st.H - m.b); cross.setAttribute('opacity', 1);
    gCross.textContent = '';
    const list = keys.filter(k => sel.has(k) && E[k].med[i] != null).sort((a, b) => E[b].med[i] - E[a].med[i]);
    list.forEach(k => svgEl('circle', { cx: x(tms[i]), cy: y(E[k].med[i]), r: 4, fill: col(E[k].color), stroke: 'var(--bg)', 'stroke-width': 2 }, gCross));
    const proj = tms[i] > lastPoll ? ' · proyección' : '';
    showTip(`<h5>${i ? 'Quincena en torno al ' : ''}${dFmt(D.dates[i])}${proj}</h5>` +
      list.map(k => tr(E[k].color, E[k].short, `${f1(E[k].med[i])} %`, `${f1(E[k].p05[i])}–${f1(E[k].p95[i])}`)).join(''), ev);
  };
  hit.addEventListener('pointermove', onMove);
  hit.addEventListener('pointerleave', () => { hideTip(); cross.setAttribute('opacity', 0); gCross.textContent = ''; });

  drawFrame();
  onVisible(root, () => playLinear(4200), .25);
}

/* ---------- paneles territoriales ---------- */
function smalls() {
  const root = $('#smalls'), E = D.evolution, T = D.dates.length, tms = D.dates.map(ms);
  const keys = ['ERC', 'Junts', 'Bildu', 'PNV', 'BNG', 'CCa', 'UPN', 'AA', 'AC'];
  const ymax = Math.ceil(Math.max(...keys.flatMap(k => E[k].p95)) + .1);
  const cards = keys.map(k => {
    const c = h('div', 'small', `<h4>${E[k].short}<span>${f1(E[k].med[T - 1])} %</span></h4>`, root);
    return { k, c, slot: h('div', null, null, c) };
  });
  let revealed = false;
  const draw = responsive(root, () => {
    cards.forEach(({ k, slot, c }) => {
      const W = slot.clientWidth, H = 96, m = { l: 16, r: 4, t: 6, b: 16 };
      const x = lin(tms[0], tms[T - 1], m.l, W - m.r), y = lin(0, ymax, H - m.b, m.t), e = E[k];
      slot.innerHTML = '';
      const s = svgEl('svg', { width: W, height: H, role: 'img', 'aria-label': `Evolución de ${e.name}` }, slot);
      [0, ymax / 2, ymax].forEach(t => {
        svgEl('line', { class: t ? 'grid-l' : 'axis-l', x1: m.l, x2: W - m.r, y1: y(t), y2: y(t) }, s);
        svgEl('text', { x: m.l - 4, y: y(t) + 3.5, 'text-anchor': 'end' }, s).textContent = t;
      });
      ['2024', '2025', '2026'].forEach(a => {
        svgEl('text', { x: x(ms(a + '-01-01')), y: H - 3, 'text-anchor': 'middle' }, s).textContent = a;
      });
      const id = 'c' + k, cp = svgEl('rect', { x: 0, y: 0, height: H, width: revealed ? W : 0, style: 'transition:width 1.6s ease-out' }, svgEl('clipPath', { id }, s));
      const g = svgEl('g', { 'clip-path': `url(#${id})` }, s);
      let top = '', bot = '', ln = '';
      e.med.forEach((v, i) => {
        const px = x(tms[i]).toFixed(1);
        ln += `${i ? 'L' : 'M'}${px},${y(v).toFixed(1)}`;
        top += `${i ? 'L' : 'M'}${px},${y(e.p95[i]).toFixed(1)}`;
        bot = `L${px},${y(e.p05[i]).toFixed(1)}` + bot;
      });
      svgEl('path', { d: top + bot + 'Z', fill: col(e.color), opacity: .16 }, g);
      svgEl('path', { d: ln, fill: 'none', stroke: col(e.color), 'stroke-width': 2, 'stroke-linejoin': 'round' }, g);
      c._reveal = () => cp.setAttribute('width', W);
    });
  });
  draw();
  cards.forEach(({ k, c }) => bindTip(c, `<h5>${E[k].name}</h5>29-N: ${pct(E[k].med[T - 1])}<br><small>Intervalo: ${f1(E[k].p05[T - 1])}–${f1(E[k].p95[T - 1])}</small>`));
  onVisible(root, () => { revealed = true; cards.forEach(({ c }) => c._reveal()); }, .1);
}

/* ---------- escaños ---------- */
function seatsChart() {
  const root = $('#seats'), rows = S.perList;
  const idx = k => S.lists.indexOf(k);
  $('#seats-sub').textContent = `Mediana e intervalo del 90 % en ${f0(D.meta.nSims)} simulaciones del reparto en las 52 circunscripciones. El rombo marca los escaños de 2023.`;
  const xmax = Math.ceil(Math.max(...rows.map(r => Math.max(r.p95, r.s2023 || 0))) / 10) * 10 + 5;
  const wrap = h('div', 'rows', null, root);
  const head = h('div', 'row srow head', '<span>Candidatura</span><span class="axis-slot"></span><span class="rval" style="font-weight:400;font-size:12px;color:var(--muted)">Escaños</span><span class="rdelta" style="color:var(--muted);font-size:12px">vs 2023</span>', wrap);
  const items = rows.map(r => {
    const row = h('div', 'row srow', null, wrap);
    h('div', 'rname', `<i class="sw" style="background:${col(r.color)}"></i>${r.short}`, row);
    const slot = h('div', 'rsvg', null, row);
    h('div', 'rval', `${r.med}<small>${r.p05}–${r.p95}</small>`, row);
    h('div', 'rdelta', r.s2023 != null ? signed(r.med - r.s2023, f0) : '–', row);
    bindTip(row, () => {
      const top = [...r.dist].sort((a, b) => b[1] - a[1]).slice(0, 4).sort((a, b) => a[0] - b[0]);
      return `<h5>${r.name}</h5>Mediana ${r.med} · intervalo ${r.p05}–${r.p95}` +
        (r.s2023 != null ? `<br>En 2023: ${r.s2023}` : '') +
        `<br><small>Resultados más frecuentes: ${top.map(([s, p]) => `${s} (${f0(p * 100)} %)`).join(', ')}</small>` +
        (r.pAny < .99 ? `<br><small>Obtiene representación: ${prob(r.pAny)}</small>` : '');
    });
    return { r, slot };
  });
  const axisSlot = head.querySelector('.axis-slot');
  let shown = false;
  const draw = responsive(root, () => {
    const w = axisSlot.clientWidth, x = lin(0, xmax, 4, w - 6), H = 36;
    axisSlot.innerHTML = '';
    const ax = svgEl('svg', { width: w, height: 22 }, axisSlot);
    const tk = ticks(0, xmax, w < 320 ? 3 : 6);
    tk.forEach(t => { svgEl('text', { x: x(t), y: 15, 'text-anchor': 'middle' }, ax).textContent = t; });
    items.forEach(({ r, slot }, i) => {
      slot.innerHTML = '';
      const s = svgEl('svg', { width: w, height: H }, slot);
      tk.forEach(t => svgEl('line', { class: 'grid-l', x1: x(t), x2: x(t), y1: 0, y2: H }, s));
      const dl = `${i * 40}ms`;
      const bw = Math.max(x(r.p95) - x(r.p05), 8);
      const band = svgEl('rect', { x: x(r.p05) - (x(r.p95) === x(r.p05) ? 4 : 0), y: H / 2 - 7, width: bw, height: 14, rx: 7, fill: col(r.color), opacity: .28, style: `transform-box:fill-box;transform-origin:center;transform:scaleX(${shown ? 1 : 0});transition:transform .7s cubic-bezier(.3,.9,.3,1) ${dl}` }, s);
      const dot = svgEl('circle', { cx: shown ? x(r.med) : x(0), cy: H / 2, r: 5, fill: col(r.color), stroke: 'var(--bg)', 'stroke-width': 2, style: `transition:cx .9s cubic-bezier(.3,.9,.3,1) ${dl}` }, s);
      if (r.s2023 != null) {
        const px = x(r.s2023);
        svgEl('path', { d: `M${px},${H / 2 - 6}l5,6l-5,6l-5,-6Z`, fill: 'none', stroke: 'var(--ink2)', 'stroke-width': 1.4 }, s);
      }
      slot._go = () => { band.style.transform = 'scaleX(1)'; dot.setAttribute('cx', x(r.med)); dot.style.cx = x(r.med) + 'px'; };
    });
  });
  draw();
  onVisible(root, () => { shown = true; items.forEach(({ slot }) => slot._go()); }, .08);
  const left = S.sims.map(s => ['FA', 'Podemos', 'Compromís-FV', 'UPC'].reduce((a, k) => a + s[idx(k)], 0)).sort((a, b) => a - b);
  const q = p => left[Math.round(p * (left.length - 1))];
  $('#seats-note').textContent = `Frente Amplio, Podemos, Compromís-FV y UPC no tienen comparación directa. Su equivalente de 2023 es Sumar, con ${S.seats2023.Sumar} escaños, y juntos suman ahora ${q(.5)} (${q(.05)}–${q(.95)}). La caída combina menos voto (del ${pct(vKey.FA.y2023 + vKey.FV.y2023 + vKey.Podemos.y2023)} al ${pct(vKey.FA.med + vKey.FV.med + vKey.Podemos.med)}) y un voto repartido en varias listas, que D'Hondt penaliza en las circunscripciones pequeñas.`;
  $('#seats-table').innerHTML = `<table><thead><tr><th>Candidatura</th><th class="n">Mediana</th><th class="n">Media</th><th class="n">P5</th><th class="n">P95</th><th class="n">2023</th></tr></thead><tbody>` +
    rows.map(r => `<tr><td>${r.name}</td><td class="n">${r.med}</td><td class="n">${f1(r.mean)}</td><td class="n">${r.p05}</td><td class="n">${r.p95}</td><td class="n">${r.s2023 ?? '–'}</td></tr>`).join('') + '</tbody></table>';
}

/* ---------- pactómetro ---------- */
function pactometer() {
  const order = S.perList.filter(p => p.mean >= .05).map(p => p.key);
  const sel = new Set(S.blocs[0].members);
  const chips = $('#pact-chips'), presets = $('#pact-presets'), histRoot = $('#pact-hist'), bar = $('#pact-bar');
  const btns = {};
  order.forEach(k => {
    const p = byKey[k], b = h('button', 'chip', `<i class="sw" style="background:${col(p.color)}"></i>${p.short} <small>${p.med}</small>`, chips);
    btns[k] = b;
    b.addEventListener('click', () => { sel.has(k) ? sel.delete(k) : sel.add(k); update(); });
  });
  const pre = [
    ['PP + Vox', S.blocs[0].members], ['Bloque PP ampliado', S.blocs[1].members],
    ['Bloque PSOE ampliado', S.blocs[2].members], ['PP + PSOE', ['PP', 'PSOE']], ['Vaciar', []],
  ];
  pre.forEach(([l, m]) => {
    const b = h('button', null, l, presets);
    b.addEventListener('click', () => { sel.clear(); m.forEach(k => sel.add(k)); update(); });
  });
  const segs = {};
  [...order].sort((a, b) => S.hemiOrder.indexOf(a) - S.hemiOrder.indexOf(b)).forEach(k => {
    const i = h('i', null, null, bar); i.style.background = col(byKey[k].color); i.style.width = 0; segs[k] = i;
  });
  h('span', 'pact-mark', null, bar).title = 'Mayoría absoluta: 176 escaños';

  let bars = [], W = 0, Hh = 190;
  const m = { l: 8, r: 8, t: 22, b: 24 };
  histRoot.innerHTML = '';
  const svg = svgEl('svg', { role: 'img', 'aria-label': 'Distribución de escaños de la suma elegida' }, histRoot);
  const gAxis = svgEl('g', {}, svg), gBars = svgEl('g', {}, svg), gMark = svgEl('g', {}, svg);
  const NB = 88, X0 = 0, X1 = 352;     // bins de 4 escaños
  for (let i = 0; i < NB; i++) bars.push(svgEl('rect', { rx: 2, style: 'transition:y .45s cubic-bezier(.3,.9,.3,1),height .45s cubic-bezier(.3,.9,.3,1),fill .3s' }, gBars));
  let vals = [];
  function layout() {
    W = histRoot.clientWidth;
    svg.setAttribute('width', W); svg.setAttribute('height', Hh);
    const x = lin(X0, X1, m.l, W - m.r);
    gAxis.textContent = ''; gMark.textContent = '';
    svgEl('line', { class: 'axis-l', x1: m.l, x2: W - m.r, y1: Hh - m.b, y2: Hh - m.b }, gAxis);
    ticks(0, 350, W < 500 ? 4 : 7).forEach(t => { svgEl('text', { x: x(t), y: Hh - 7, 'text-anchor': 'middle' }, gAxis).textContent = t; });
    svgEl('line', { x1: x(176), x2: x(176), y1: m.t - 6, y2: Hh - m.b, stroke: 'var(--ink)', 'stroke-width': 1.5 }, gMark);
    svgEl('text', { x: x(176), y: m.t - 10, 'text-anchor': 'middle', class: 'ink' }, gMark).textContent = '176';
    const bw = Math.max((W - m.l - m.r) / NB - 1.5, 1);
    bars.forEach((b, i) => { b.setAttribute('x', x(i * 4)); b.setAttribute('width', bw); b.style.fill = i * 4 + 3 >= 176 ? 'var(--ink)' : 'var(--axis)'; });
    place();
  }
  function place() {
    const counts = new Array(NB).fill(0);
    vals.forEach(v => { counts[Math.min(NB - 1, Math.floor(v / 4))]++; });
    const mx = Math.max(...counts, 1), hgt = Hh - m.t - m.b;
    bars.forEach((b, i) => {
      const hh = counts[i] / mx * hgt;
      b.style.y = (Hh - m.b - hh) + 'px'; b.style.height = hh + 'px';
    });
  }
  function update() {
    order.forEach(k => btns[k].setAttribute('aria-pressed', sel.has(k)));
    const ix = [...sel].map(k => S.lists.indexOf(k));
    vals = S.sims.map(s => ix.reduce((a, i) => a + s[i], 0));
    const sorted = [...vals].sort((a, b) => a - b), n = sorted.length;
    const qt = p => sorted[Math.round(p * (n - 1))];
    const p176 = vals.filter(v => v >= 176).length / n;
    $('#pact-p').textContent = sel.size ? prob(p176) : '–';
    $('#pact-sub').textContent = sel.size ? `Mediana: ${qt(.5)} escaños · intervalo ${qt(.05)}–${qt(.95)}` : 'Elige alguna candidatura';
    order.forEach(k => {
      segs[k].style.width = sel.has(k) ? `${byKey[k].mean / 352 * 100}%` : 0;
      segs[k].classList.toggle('on', sel.has(k));
    });
    [...presets.children].forEach((b, i) => {
      const mm = pre[i][1]; b.classList.toggle('on', mm.length === sel.size && mm.every(k => sel.has(k)));
    });
    place();
  }
  responsive(histRoot, layout);
  vals = S.sims.map(() => 0);
  layout();
  order.forEach(k => btns[k].setAttribute('aria-pressed', sel.has(k)));
  onVisible(histRoot, update, .1);
}

/* ---------- provincias ---------- */
function provinces() {
  const root = $('#provs'), P = S.provinces;
  const ccaa = [...new Set(P.map(p => p.ccaa))].sort((a, b) => a.localeCompare(b, 'es'));
  const selc = $('#prov-ccaa');
  selc.innerHTML = '<option value="">Todas</option>' + ccaa.map(c => `<option>${esc(c)}</option>`).join('');
  let sort = 'seats';
  function draw() {
    let list = P.filter(p => !selc.value || p.ccaa === selc.value);
    if (sort === 'open') list = [...list].sort((a, b) => a.pMode - b.pMode);
    if (sort === 'az') list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'es'));
    root.innerHTML = '';
    list.forEach((p, i) => {
      const c = h('div', 'prov', null, root);
      c.style.setProperty('--d', `${Math.min(i, 24) * 18}ms`);
      const on = p.parts.filter(x => x.s > 0);
      const contested = p.parts.filter(x => x.lo !== x.hi).map(x => S.meta[x.k].short);
      c.innerHTML = `<h4>${esc(p.name)}<span>${p.seats} escaños</span></h4>
        <div class="sd">${on.flatMap(x => Array(x.s).fill(`<i style="background:${col(S.meta[x.k].color)}"></i>`)).join('')}</div>
        <div class="pm"><b style="width:${p.pMode * 100}%"></b></div>
        <div class="tx">${on.map(x => `${S.meta[x.k].short} <b>${x.s}</b>`).join(' · ')}<br>Este reparto: ${prob(p.pMode)} de las simulaciones</div>`;
      bindTip(c, `<h5>${esc(p.name)} <small>${esc(p.ccaa)}</small></h5>` +
        p.parts.map(x => tr(S.meta[x.k].color, S.meta[x.k].short, f1(x.m), `${x.lo}–${x.hi}`)).join('') +
        (contested.length ? `<small>Escaños medios e intervalo del 90 %</small>` : '<small>Sin variación entre simulaciones</small>'));
    });
  }
  $('#prov-sort').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    [...e.currentTarget.children].forEach(c => c.classList.toggle('on', c === b));
    sort = b.dataset.s; draw();
  });
  selc.addEventListener('change', draw);
  draw();
}

/* ---------- casas ---------- */
function houses() {
  const root = $('#houses'), Hs = D.houses, rowH = 27;
  let party = 'PP', shown = false;
  const seg = $('#house-party');
  Hs.parties.forEach((p, i) => {
    const b = h('button', i ? '' : 'on', p.name, seg);
    b.addEventListener('click', () => {
      [...seg.children].forEach(c => c.classList.toggle('on', c === b));
      party = p.key; update();
    });
  });
  const svg = svgEl('svg', { role: 'img', 'aria-label': 'Sesgo estimado de cada casa encuestadora' }, root);
  const gAxis = svgEl('g', {}, svg), gRows = svgEl('g', {}, svg);
  const rows = Hs.rows.map(r => {
    const g = svgEl('g', { class: 'hrow' }, gRows);
    const hover = svgEl('rect', { x: 0, y: -rowH / 2, height: rowH, fill: 'transparent' }, g);
    const name = svgEl('text', { y: 4, class: 'ink2', 'text-anchor': 'end' }, g);
    name.textContent = r.name;
    const ln = svgEl('line', { 'stroke-width': 3, 'stroke-linecap': 'round', opacity: .4 }, g);
    const dot = svgEl('circle', { r: 5, stroke: 'var(--bg)', 'stroke-width': 2 }, g);
    bindTip(g, () => {
      const [lo, md, hi] = r.eff[party];
      return `<h5>${esc(r.name)}</h5>${signed(md, f2)} puntos<br><small>Intervalo: ${signed(lo, f1)} a ${signed(hi, f1)} · ${r.n} encuestas</small><br><small>Con 1.000 entrevistas, equivale a una muestra de ~${f0(r.neff)}</small>`;
    });
    return { r, g, hover, name, ln, dot };
  });
  const dims = () => {
    const W = root.clientWidth, labelW = W < 520 ? 118 : 160;
    return { W, l: labelW + 12, rt: 10, t: 26, H: 26 + rows.length * rowH + 6 };
  };
  function update() {
    const { W, l, rt, t, H } = dims();
    const lim = Math.ceil(Math.max(...Hs.rows.map(r => Math.max(Math.abs(r.eff[party][0]), Math.abs(r.eff[party][2]))))) + .5;
    const x = lin(-lim, lim, l, W - rt);
    svg.setAttribute('width', W); svg.setAttribute('height', H);
    gAxis.textContent = '';
    ticks(-lim, lim, W < 520 ? 4 : 8).forEach(v => {
      svgEl('line', { class: v === 0 ? 'axis-l' : 'grid-l', x1: x(v), x2: x(v), y1: t - 6, y2: H }, gAxis);
      svgEl('text', { x: x(v), y: 13, 'text-anchor': 'middle' }, gAxis).textContent = v === 0 ? '0' : signed(v, f0);
    });
    const c = col(Hs.parties.find(p => p.key === party).color);
    const sorted = [...rows].sort((a, b) => a.r.eff[party][1] - b.r.eff[party][1]);
    sorted.forEach(({ r, g, hover, name, ln, dot }, i) => {
      const [lo, md, hi] = r.eff[party];
      g.style.transform = `translateY(${t + i * rowH + rowH / 2}px)`;
      hover.setAttribute('width', W);
      name.setAttribute('x', l - 12);
      ln.style.stroke = c; dot.style.fill = c;
      const px = shown ? x(md) : x(0);
      ln.setAttribute('x1', shown ? x(lo) : x(0)); ln.setAttribute('x2', shown ? x(hi) : x(0));
      ln.setAttribute('y1', 0); ln.setAttribute('y2', 0);
      dot.setAttribute('cx', px); dot.style.cx = px + 'px';
    });
  }
  responsive(root, update);
  update();
  onVisible(root, () => { shown = true; update(); }, .06);
  const top = [...Hs.rows].sort((a, b) => b.l1 - a.l1), noisy = [...Hs.rows].sort((a, b) => a.neff - b.neff)[0];
  $('#house-note').textContent = `Solo casas con ${Hs.minPolls} encuestas o más. Casa con mayor desviación global: ${top[0].name} (${f1(top[0].l1)} puntos de voto desplazados entre partidos). Mayor ruido: ${noisy.name}, cuyas 1.000 entrevistas valen como ~${f0(noisy.neff)}. El «sesgo» es la desviación respecto a la estimación, no una valoración de la calidad o la intención de la casa.`;
  const keys = Hs.parties.map(p => p.key);
  $('#house-table').innerHTML = `<table><thead><tr><th>Casa</th><th class="n">Encuestas</th>${Hs.parties.map(p => `<th class="n">${p.name}</th>`).join('')}<th class="n">φ</th><th class="n">n efectivo*</th></tr></thead><tbody>` +
    [...Hs.rows].sort((a, b) => a.name.localeCompare(b.name, 'es')).map(r => `<tr><td>${esc(r.name)}</td><td class="n">${r.n}</td>${keys.map(k => `<td class="n">${signed(r.eff[k][1], f1)}</td>`).join('')}<td class="n">${f0(r.phi)}</td><td class="n">${f0(r.neff)}</td></tr>`).join('') +
    '</tbody></table><p class="note">* Tamaño efectivo de una muestra de 1.000 con la sobredispersión φ de la casa. Un φ muy alto indica series más suaves de lo que explicaría el muestreo.</p>';
}

/* ================= pestaña del modelo ================= */
function initModel() {
  if (window.renderMathInElement) {
    renderMathInElement($('#modelo'), { delimiters: [{ left: '\\[', right: '\\]', display: true }, { left: '\\(', right: '\\)', display: false }], throwOnError: false });
  }
  const L = D.learned, G = D.diag;
  $('#flow-polls').textContent = `${f0(D.meta.nPolls)} sondeos de ${D.meta.nHouses} casas`;
  $('#flow-seats').textContent = `${f0(D.meta.nSims)} simulaciones con D'Hondt en 52 provincias`;
  $('#tbl-podemos').textContent = `${f0(D.meta.podemosShare * 100)} % de su base: el resto va en coalición en C. Valenciana, Cataluña y Canarias`;
  $('#lik-text').innerHTML = `Si \\(\\phi_h\\) es grande, la casa se comporta como un muestreo aleatorio; si es pequeño, sus datos son más ruidosos de lo que indica su muestra. Si una encuesta no publica el tamaño se supone ${f0(D.meta.nDefault)}, y se limita a ${f0(D.meta.nCap)}. Las reestimaciones de una misma ola del CIS comparten muestra para no contar los mismos datos varias veces.`;
  $('#rho-text').textContent = `El prior Beta(${f1(L.rho.priorA)}, ${f1(L.rho.priorB)}) se actualiza con las encuestas de octubre: ρ queda en ${f1(L.rho.q[1] * 100)} % (${f1(L.rho.q[0] * 100)}–${f1(L.rho.q[2] * 100)}).`;
  $('#priors').innerHTML = `<table class="plain"><thead><tr><th>Parámetro</th><th>Prior</th><th>Significado</th></tr></thead><tbody>
    <tr><td>\\(\\sigma_k\\) estatales</td><td>HalfNormal(${f2(L.rows[0].sigmaPrior)})</td><td>Volatilidad quincenal, en logits</td></tr>
    <tr><td>\\(\\sigma_k\\) territoriales</td><td>HalfNormal(${f2(L.rows[7].sigmaPrior)})</td><td>Volatilidad de los partidos territoriales</td></tr>
    <tr><td>\\(L\\)</td><td>LKJ(2)</td><td>Correlación del bloque estatal</td></tr>
    <tr><td>\\(\\mu_k\\)</td><td>Normal(0, 0,10)</td><td>Sesgo común de la industria</td></tr>
    <tr><td>\\(\\tau_k\\)</td><td>HalfNormal(0,15)</td><td>Dispersión de los sesgos entre casas</td></tr>
    <tr><td>\\(\\log\\phi_h\\)</td><td>Normal(log 400, 1)</td><td>Sobredispersión de cada casa</td></tr>
    <tr><td>\\(\\rho\\)</td><td>Beta(${f1(L.rho.priorA)}, ${f1(L.rho.priorB)})</td><td>Compromís dentro del espacio Sumar, con media ≈ 0,13</td></tr>
    <tr><td>\\(\\eta_0\\)</td><td>Normal(resultado de 2023, 0,3–1)</td><td>Punto de partida, más ajustado donde 2023 no separa los componentes</td></tr>
  </tbody></table>`;
  if (window.renderMathInElement) ['#lik-text', '#priors'].forEach(s => renderMathInElement($(s), { delimiters: [{ left: '\\(', right: '\\)', display: false }], throwOnError: false }));

  const converged = G.rhatVote < 1.05 && G.rhatHyper < 1.05 && G.divergences === 0;
  $('#diag-text').textContent = `Ajuste con NUTS, ${G.chains} cadenas de ${f0(G.draws)} muestras. ` + (converged
    ? `No hay señales de falta de convergencia. Los hiperparámetros tienen menos muestras efectivas, algo habitual en modelos jerárquicos: bastan para medianas e intervalos del 90 %, no para colas extremas.`
    : `Atención: algún diagnóstico supera los umbrales habituales y estos resultados deben tomarse con cautela.`);
  const vt = [...L.rows].filter(r => r.key !== 'Otros').sort((a, b) => b.vol[1] - a.vol[1]);
  $('#vol-text').textContent = `Desviación típica del cambio quincenal, en puntos de voto al nivel actual de cada partido. ${vt[0].short} y ${vt[1].short} son los más volátiles.`;
  const tile = (l, v, s) => `<div class="tile"><div class="l">${l}</div><div class="v">${v}</div><div class="s">${s}</div></div>`;
  $('#diag').innerHTML = tile('Divergencias', f0(G.divergences), `En ${f0(G.chains * G.draws)} muestras`) +
    tile('R̂ máximo (voto final)', f2(G.rhatVote), `Muestras efectivas mínimas: ${f0(G.essVote)}`) +
    tile('R̂ máximo (hiperparámetros)', f2(G.rhatHyper), `Muestras efectivas mínimas: ${f0(G.essHyper)}`);

  modelBars('#m-vol', L.rows.filter(r => r.key !== 'Otros').map(r => ({ n: r.short, c: r.color, q: r.vol })).sort((a, b) => b.q[1] - a.q[1]), { unit: 'pp', dec: 2, zero: 0 });
  modelBars('#m-common', L.rows.filter(r => r.anchored).map(r => ({ n: r.short, c: r.color, q: r.common })).sort((a, b) => b.q[1] - a.q[1]), { unit: 'pp', dec: 2, sym: true });
  rhoChart(); corrChart(); fitChart();
}

function modelBars(sel, items, o) {
  const root = $(sel), rowH = 26;
  const svg = svgEl('svg', { role: 'img' }, root);
  let done = false;
  const draw = responsive(root, () => {
    svg.textContent = '';
    const W = root.clientWidth, l = 96, rt = 54, t = 20, H = t + items.length * rowH + 4;
    svg.setAttribute('width', W); svg.setAttribute('height', H);
    const hi = Math.max(...items.map(i => Math.abs(i.q[2])), ...items.map(i => Math.abs(i.q[0])));
    const lim = hi * 1.08, x = lin(o.sym ? -lim : 0, lim, l, W - rt);
    ticks(o.sym ? -lim : 0, lim, W < 480 ? 4 : 6).forEach(v => {
      svgEl('line', { class: v === 0 ? 'axis-l' : 'grid-l', x1: x(v), x2: x(v), y1: t - 4, y2: H }, svg);
      svgEl('text', { x: x(v), y: 11, 'text-anchor': 'middle' }, svg).textContent = o.sym ? signed(v, nf(1).format) : nf(1).format(v);
    });
    items.forEach((it, i) => {
      const y = t + i * rowH + rowH / 2, base = 0;
      svgEl('text', { x: l - 10, y: y + 4, 'text-anchor': 'end', class: 'ink2' }, svg).textContent = it.n;
      const ln = svgEl('line', { x1: x(base), x2: x(base), y1: y, y2: y, stroke: col(it.c), 'stroke-width': 3, 'stroke-linecap': 'round', opacity: .4, style: `transition:all .7s ease ${i * 30}ms` }, svg);
      const dot = svgEl('circle', { cx: x(base), cy: y, r: 5, fill: col(it.c), stroke: 'var(--bg)', 'stroke-width': 2, style: `transition:all .7s ease ${i * 30}ms` }, svg);
      svgEl('text', { x: W - 4, y: y + 4, 'text-anchor': 'end', class: 'ink' }, svg).textContent = o.sym ? signed(it.q[1], f2) : f2(it.q[1]);
      const go = () => { ln.setAttribute('x1', x(it.q[0])); ln.setAttribute('x2', x(it.q[2])); dot.setAttribute('cx', x(it.q[1])); dot.style.cx = x(it.q[1]) + 'px'; };
      if (done) go(); else onVisible(root, () => { done = true; requestAnimationFrame(go); }, .1);
      bindTip(dot, `<h5>${it.n}</h5>${f2(it.q[1])} puntos<br><small>Intervalo: ${f2(it.q[0])} a ${f2(it.q[2])}</small>`);
    });
  });
  draw();
}

function rhoChart() {
  const root = $('#m-rho'), R = D.learned.rho;
  const svg = svgEl('svg', { role: 'img', 'aria-label': 'Prior y posterior de rho' }, root);
  const draw = responsive(root, () => {
    svg.textContent = '';
    const W = root.clientWidth, H = 190, m = { l: 8, r: 8, t: 12, b: 24 };
    svg.setAttribute('width', W); svg.setAttribute('height', H);
    const g = R.grid, x = lin(g[0], g[g.length - 1], m.l, W - m.r);
    const mx = Math.max(...R.post, ...R.prior), y = lin(0, mx, H - m.b, m.t);
    svgEl('line', { class: 'axis-l', x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b }, svg);
    ticks(g[0], g[g.length - 1], 5).forEach(t => { svgEl('text', { x: x(t), y: H - 7, 'text-anchor': 'middle' }, svg).textContent = `${f0(t * 100)} %`; });
    const path = a => a.map((v, i) => `${i ? 'L' : 'M'}${x(g[i]).toFixed(1)},${y(v).toFixed(1)}`).join('');
    svgEl('path', { d: path(R.post) + `L${x(g[g.length - 1])},${y(0)}L${x(g[0])},${y(0)}Z`, fill: col('compromis'), opacity: .25 }, svg);
    svgEl('path', { d: path(R.post), fill: 'none', stroke: col('compromis'), 'stroke-width': 2 }, svg);
    svgEl('path', { d: path(R.prior), fill: 'none', stroke: 'var(--muted)', 'stroke-width': 2, 'stroke-dasharray': '4 4' }, svg);
    const pk = R.post.indexOf(Math.max(...R.post));
    svgEl('text', { x: x(g[pk]) + 12, y: y(R.post[pk]) + 12, class: 'ink' }, svg).textContent = 'Posterior';
    const pr = g.findIndex(v => v >= .185);
    svgEl('text', { x: x(g[pr]) + 4, y: y(R.prior[pr]) - 8, class: 'ink2' }, svg).textContent = 'Prior';
  });
  draw();
}

function corrChart() {
  const root = $('#m-corr'), C = D.learned.corr, n = C.labels.length;
  const svg = svgEl('svg', { role: 'img', 'aria-label': 'Matriz de correlación entre partidos estatales' }, root);
  const draw = responsive(root, () => {
    svg.textContent = '';
    const W = Math.min(root.clientWidth, 420), l = 72, t = 54, cell = (W - l) / n, H = t + cell * n;
    svg.setAttribute('width', W); svg.setAttribute('height', H); svg.style.width = W + 'px';
    C.labels.forEach((lb, i) => {
      svgEl('text', { x: l - 7, y: t + cell * (i + .5) + 4, 'text-anchor': 'end' }, svg).textContent = lb;
      svgEl('text', { transform: `translate(${l + cell * (i + .5) + 3},${t - 6}) rotate(-45)` }, svg).textContent = lb;
    });
    C.m.forEach((row, i) => row.forEach((v, j) => {
      if (j > i) return;
      const a = i === j ? 0 : Math.min(Math.abs(v) / .5, 1);
      const r = svgEl('rect', { x: l + j * cell + 1, y: t + i * cell + 1, width: cell - 2, height: cell - 2, rx: 3,
        fill: i === j ? 'var(--wash)' : (v < 0 ? 'var(--div-neg)' : 'var(--div-pos)'), 'fill-opacity': i === j ? 1 : .12 + a * .78 }, svg);
      if (i !== j) {
        const tx = svgEl('text', { x: l + (j + .5) * cell, y: t + (i + .5) * cell + 4, 'text-anchor': 'middle', style: `font-size:${cell < 40 ? 10 : 11}px;${a > .55 ? 'fill:#fff' : 'fill:var(--ink)'}` }, svg);
        tx.textContent = signed(v, f2);
        bindTip(r, `${C.labels[i]} y ${C.labels[j]}: ${signed(v, f2)}`);
      }
    }));
  });
  draw();
}

function fitChart() {
  const root = $('#m-fit'), F = D.fit;
  const svg = svgEl('svg', { role: 'img', 'aria-label': 'Error de las encuestas con y sin efectos de casa' }, root);
  const draw = responsive(root, () => {
    svg.textContent = '';
    const W = root.clientWidth, l = 60, rowH = 52, H = F.parties.length * rowH + 8, rt = 40;
    svg.setAttribute('width', W); svg.setAttribute('height', H);
    const x = lin(0, Math.max(...F.noHouse) * 1.05, l, W - rt);
    F.parties.forEach((p, i) => {
      const y = i * rowH + 6, c = D.vote.find(v => v.key === p).color;
      svgEl('text', { x: l - 10, y: y + 25, 'text-anchor': 'end', class: 'ink' }, svg).textContent = p;
      [[F.noHouse[i], 'var(--axis)', 'Sin casa'], [F.withHouse[i], col(c), 'Con casa']].forEach(([v, fill, lab], j) => {
        const yy = y + j * 21;
        const r = svgEl('rect', { x: l, y: yy, width: x(v) - l, height: 17, rx: 3, fill }, svg);
        svgEl('text', { x: x(v) + 6, y: yy + 13, class: 'ink' }, svg).textContent = f2(v);
        const lb = svgEl('text', { x: l + 7, y: yy + 13, style: `font-size:11px;fill:${j ? '#fff' : 'var(--ink)'}` }, svg);
        lb.textContent = lab;
        bindTip(r, `${p}, ${lab.toLowerCase()}: ${f2(v)} puntos`);
      });
    });
  });
  draw();
}

/* ================= arranque ================= */
hero(); hemicycle(); voteChart(); evolution(); smalls(); seatsChart(); pactometer(); provinces(); houses();
const initial = location.hash === '#modelo' ? 1 : 0;
placeInd();
if (initial) select(1);
document.fonts?.ready.then(placeInd);
})();
