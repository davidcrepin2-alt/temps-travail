'use strict';
/* Temps de travail — reprise de « Calcul temps travail4.xlsm ».
   Toutes les durées sont en minutes. */

const VERSION = '1.0.0';
const STORE_KEY = 'tempsTravail.v1';
const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const TYPES = ['Horaire', 'Forfait', 'Absence', 'Personnalisé'];
const QUOTITES = [1, 0.9, 0.8, 0.7, 0.6, 0.5];
// Listes reprises de la feuille Paramètres (tblCoupures, tblRetards)
const COUPURES = [0, 10, 15, 20, 30, 45, 60, 80, 140];
const RETARDS = [-120, -105, -90, -75, -60, -45, -30, -20, -15, -10, 0, 10, 15, 20, 30, 45, 60, 75, 90, 105, 120];

const DEFAULT_CODES = [
  { code: 'JC17', label: 'Journée 8h30-17h00', type: 'Horaire', start: '08:30', end: '17:00', pause: 45, forfait: 0 },
  { code: 'JC08', label: 'Journée 8h00-16h30', type: 'Horaire', start: '08:00', end: '16:30', pause: 45, forfait: 0 },
  { code: 'A12', label: 'Après-midi 13h30-17h00', type: 'Horaire', start: '13:30', end: '17:00', pause: 0, forfait: 0 },
  { code: 'RHS', label: 'Repos heures supplémentaires', type: 'Forfait', start: '', end: '', pause: 0, forfait: 0 },
  { code: 'CA', label: 'Congé annuel', type: 'Absence', start: '', end: '', pause: 0, forfait: 0 },
  { code: 'RF', label: 'Repos férié', type: 'Absence', start: '', end: '', pause: 0, forfait: 0 },
  { code: 'FP', label: 'Formation professionnelle', type: 'Forfait', start: '', end: '', pause: 0, forfait: 420 },
  { code: 'spé', label: 'Horaires variables', type: 'Personnalisé', start: '', end: '', pause: 0, forfait: 0 },
  { code: 'MA', label: 'Maladie', type: 'Absence', start: '', end: '', pause: 0, forfait: 0 },
  { code: 'RH', label: 'Repos hebdomadaire', type: 'Absence', start: '', end: '', pause: 0, forfait: 0 },
];

/* ---------- Durées ---------- */
function toMin(hhmm) {
  if (!hhmm) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm);
  return m ? (+m[1]) * 60 + (+m[2]) : null;
}
function toHHMM(min) {
  if (min == null || min === '') return '';
  min = ((min % 1440) + 1440) % 1440;
  return String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');
}
// 220 -> "3h40", -210 -> "-3h30"
function fmtDur(min, signed) {
  if (min == null) return '';
  const neg = min < 0, a = Math.abs(Math.round(min));
  const s = Math.floor(a / 60) + 'h' + String(a % 60).padStart(2, '0');
  return neg ? '-' + s : (signed && min > 0 ? '+' + s : s);
}
// "75h20", "75:20", "-3h30", "4", "4,5" -> minutes
function parseDur(txt) {
  txt = String(txt || '').trim().replace(/\s/g, '').replace('−', '-');
  if (!txt) return 0;
  const neg = txt.startsWith('-');
  txt = txt.replace(/^[+-]/, '');
  let m = /^(\d+)[h:](\d{0,2})$/i.exec(txt);
  let v;
  if (m) v = (+m[1]) * 60 + (+(m[2] || 0));
  else if (/^\d+([.,]\d+)?$/.test(txt)) v = Math.round(parseFloat(txt.replace(',', '.')) * 60);
  else return null;
  return neg ? -v : v;
}

/* ---------- Semaines ISO (= formule Saisie!G21) ---------- */
function mondayOf(year, week) {
  const jan4 = new Date(year, 0, 4);
  const dow = (jan4.getDay() + 6) % 7; // lundi = 0
  return new Date(year, 0, 4 - dow + 7 * (week - 1));
}
function isoWeek(d) {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7));
  const year = t.getFullYear();
  const w1 = mondayOf(year, 1);
  return { year, week: 1 + Math.round((t - w1) / 604800000 - 3 / 7) };
}
function weeksInYear(year) { return isoWeek(new Date(year, 11, 28)).week; }
function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
const fmtLong = (d, y) => d.toLocaleDateString('fr-FR', y ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'long' });
const fmtShort = d => d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
const fmtDate = d => d.toLocaleDateString('fr-FR');

/* ---------- Calculs (= formules Saisie lignes 10, 11, 13, 17) ---------- */
function codeInfo(state, code) { return state.codes.find(c => c.code === code) || null; }

// Temps pour la journée (null = vide)
function dayTime(state, day) {
  if (!day.code) return null;
  const c = codeInfo(state, day.code);
  if (!c) return null;
  if (c.type === 'Absence') return null;
  if (c.type === 'Forfait') return c.forfait || 0;
  const s = toMin(day.start), e = toMin(day.end);
  if (s == null || e == null) return null;
  return ((e - s) % 1440 + 1440) % 1440 - (day.pause || 0) + (day.retard || 0);
}
function dayHS(state, day, quotite) {
  const t = dayTime(state, day);
  return t == null ? null : t - Math.round(state.settings.daily * (quotite || 1));
}
function weekTotals(state, w) {
  if (w.totals) return w.totals; // semaine enregistrée : valeurs figées
  const days = w.days.map(d => ({ time: dayTime(state, d), hs: dayHS(state, d, w.quotite) }));
  const hsWeek = days.reduce((a, d) => a + (d.hs || 0), 0);
  return { days, hsWeek, cumul: hsWeek + (w.prev || 0) };
}

/* ---------- Stockage ---------- */
function blankDays() {
  return DAYS.map((_, i) => ({ code: i >= 5 ? 'RH' : '', start: '', end: '', pause: 0, retard: 0 }));
}
function defaultState() {
  const now = isoWeek(new Date());
  return {
    v: 1,
    settings: { daily: 420, city: 'Cambrai', motif: 'Vacation non terminée' },
    agents: [],
    codes: DEFAULT_CODES.map(c => ({ ...c })),
    history: {},
    cur: { agent: '', year: now.year, week: now.week, quotite: 1, days: blankDays(), prev: 0, prevManual: false },
  };
}
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      const d = defaultState();
      const st = { ...d, ...s, settings: { ...d.settings, ...(s.settings || {}) }, cur: { ...d.cur, ...(s.cur || {}) } };
      if (!Array.isArray(st.cur.days) || st.cur.days.length !== 7) st.cur.days = blankDays();
      return st;
    }
  } catch (e) { /* stockage indisponible */ }
  return defaultState();
}
let state = load();
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
  catch (e) { toast('Impossible d\'enregistrer sur ce téléphone'); }
}

const histKey = (agent, year, week) => `${agent}|${year}|${String(week).padStart(2, '0')}`;
const order = h => h.year * 100 + h.week;

// Cumul de la dernière semaine enregistrée avant (year, week) pour l'agent
function previousCumul(agent, year, week) {
  let best = null;
  for (const h of Object.values(state.history)) {
    if (h.agent !== agent || order(h) >= year * 100 + week) continue;
    if (!best || order(h) > order(best)) best = h;
  }
  if (!best) return null;
  return { cumul: weekTotals(state, best).cumul, year: best.year, week: best.week };
}

/* ---------- UI ---------- */
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const opt = (v, label, sel) => `<option value="${esc(v)}"${sel ? ' selected' : ''}>${esc(label)}</option>`;
const quotLbl = q => Math.round(q * 100) + ' %';
const signCls = v => v == null ? '' : v > 0 ? 'pos' : v < 0 ? 'neg' : '';

let toastTimer;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

function showView(v) {
  document.querySelectorAll('.view').forEach(s => s.classList.toggle('active', s.id === 'v-' + v));
  document.querySelectorAll('nav.tabs button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  $('title').textContent = { semaine: 'Semaine', historique: 'Historique', reglages: 'Réglages' }[v];
  if (v === 'historique') renderHistory();
  if (v === 'reglages') renderSettings();
  window.scrollTo(0, 0);
}

// Charge la semaine (agent, année, semaine) depuis l'historique ou à blanc
function openWeek(agent, year, week) {
  const h = state.history[histKey(agent, year, week)];
  const a = state.agents.find(x => x.name === agent);
  if (h) {
    state.cur = { agent, year, week, quotite: h.quotite, days: h.days.map(d => ({ ...d })), prev: h.prev, prevManual: !!h.prevManual };
  } else {
    state.cur = { agent, year, week, quotite: a ? a.quotite : 1, days: blankDays(), prev: 0, prevManual: false };
  }
  autoPrev();
  save();
  renderWeek();
}
function autoPrev() {
  const c = state.cur;
  if (c.prevManual) return;
  const p = c.agent ? previousCumul(c.agent, c.year, c.week) : null;
  c.prev = p ? p.cumul : 0;
}

function renderWeek() {
  const c = state.cur;
  $('agent').innerHTML = (state.agents.length ? '' : opt('', '— Ajoutez un agent dans Réglages —', true)) +
    state.agents.map(a => opt(a.name, a.name, a.name === c.agent)).join('');
  if (!c.agent && state.agents.length) { c.agent = state.agents[0].name; c.quotite = state.agents[0].quotite; autoPrev(); }
  $('quotite').innerHTML = QUOTITES.concat(QUOTITES.includes(c.quotite) ? [] : [c.quotite]).map(q => opt(q, quotLbl(q), q === c.quotite)).join('');
  $('year').value = c.year;
  const nW = weeksInYear(c.year);
  $('week').innerHTML = Array.from({ length: nW }, (_, i) => opt(i + 1, 'S' + (i + 1), i + 1 === c.week)).join('');
  const mon = mondayOf(c.year, c.week), sun = addDays(mon, 6);
  $('weekLbl').textContent = `Semaine ${c.week} · ${c.year}`;
  $('weekDates').textContent = `${fmtLong(mon)} au ${fmtLong(sun, true)}`;
  const h = state.history[histKey(c.agent, c.year, c.week)];
  $('savedNote').textContent = h ? `Enregistrée le ${new Date(h.savedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}` : 'Non enregistrée';

  const codeOpts = sel => opt('', '—', !sel) + state.codes.map(k => opt(k.code, `${k.code} · ${k.label}`, k.code === sel)).join('') +
    (sel && !codeInfo(state, sel) ? opt(sel, sel + ' (supprimé)', true) : '');
  $('days').innerHTML = c.days.map((d, i) => {
    const k = codeInfo(state, d.code);
    const timed = k && (k.type === 'Horaire' || k.type === 'Personnalisé');
    let body = '';
    if (timed) {
      body = `<div class="grid2">
        <div><label class="f">Début</label><input type="time" data-i="${i}" data-f="start" value="${esc(d.start)}"></div>
        <div><label class="f">Fin</label><input type="time" data-i="${i}" data-f="end" value="${esc(d.end)}"></div>
        <div><label class="f">Coupure</label><select data-i="${i}" data-f="pause">${COUPURES.concat(COUPURES.includes(d.pause) ? [] : [d.pause]).map(v => opt(v, v ? fmtDur(v) : 'aucune', v === d.pause)).join('')}</select></div>
        <div><label class="f">Retard fin de poste</label><select data-i="${i}" data-f="retard">${RETARDS.concat(RETARDS.includes(d.retard) ? [] : [d.retard]).map(v => opt(v, v ? fmtDur(v, true) : 'aucun', v === d.retard)).join('')}</select></div>
      </div>`;
    } else if (k && k.type === 'Forfait') {
      body = `<div class="note">Forfait : ${fmtDur(k.forfait)}</div>`;
    } else if (k) {
      body = `<div class="note">${esc(k.label)} — non décompté</div>`;
    }
    return `<div class="card day">
      <h3><span style="text-transform:capitalize">${DAYS[i]}</span><small>${fmtShort(addDays(mon, i))}</small></h3>
      <div style="margin-top:8px"><select data-i="${i}" data-f="code" aria-label="Code horaire ${DAYS[i]}">${codeOpts(d.code)}</select></div>
      ${body}
      <div class="daysum"><span>Temps <b data-t="${i}"></b></span><span>HS jour <b data-h="${i}"></b></span></div>
    </div>`;
  }).join('');
  $('prevH').value = fmtDur(c.prev);
  updateTotals();
}

function updateTotals() {
  const c = state.cur, t = weekTotals(state, c);
  t.days.forEach((d, i) => {
    document.querySelector(`[data-t="${i}"]`).textContent = d.time == null ? '—' : fmtDur(d.time);
    const h = document.querySelector(`[data-h="${i}"]`);
    h.textContent = d.hs == null ? '—' : fmtDur(d.hs, true);
    h.className = signCls(d.hs);
  });
  $('hsWeek').textContent = fmtDur(t.hsWeek, true);
  $('hsWeek').className = signCls(t.hsWeek);
  $('hsCumul').textContent = fmtDur(t.cumul, true);
  $('hsCumul').className = 'big ' + signCls(t.cumul);
  const p = c.agent ? previousCumul(c.agent, c.year, c.week) : null;
  $('prevNote').textContent = c.prevManual ? 'HS précédente saisie manuellement' + (p ? ` (cumul S${p.week}/${p.year} : ${fmtDur(p.cumul, true)})` : '')
    : p ? `Reprise du cumul de la semaine ${p.week}/${p.year}` : 'Aucune semaine précédente enregistrée pour cet agent';
}

function onDayChange(e) {
  const el = e.target, i = +el.dataset.i, f = el.dataset.f;
  if (isNaN(i) || !f) return;
  const d = state.cur.days[i];
  if (f === 'code') {
    d.code = el.value;
    const k = codeInfo(state, d.code);
    if (k && k.type === 'Horaire') { d.start = k.start; d.end = k.end; d.pause = k.pause || 0; d.retard = 0; }
    else if (k && k.type === 'Personnalisé') { d.pause = d.pause || 0; }
    else { d.start = ''; d.end = ''; d.pause = 0; d.retard = 0; }
    save(); renderWeek(); return;
  }
  d[f] = (f === 'pause' || f === 'retard') ? +el.value : el.value;
  save(); updateTotals();
}

function saveWeek() {
  const c = state.cur;
  if (!c.agent) { toast('Choisissez d\'abord un agent'); return; }
  state.history[histKey(c.agent, c.year, c.week)] = {
    agent: c.agent, year: c.year, week: c.week, quotite: c.quotite,
    days: c.days.map(d => ({ ...d })), prev: c.prev, prevManual: c.prevManual, savedAt: Date.now(),
    totals: weekTotals(state, c),
  };
  save(); renderWeek();
  toast(`Semaine ${c.week} enregistrée`);
}

/* ---------- Historique ---------- */
function renderHistory() {
  const agents = [...new Set(Object.values(state.history).map(h => h.agent).concat(state.agents.map(a => a.name)))].sort();
  const selAgent = $('histAgent').value || state.cur.agent || agents[0] || '';
  $('histAgent').innerHTML = agents.map(a => opt(a, a, a === selAgent)).join('') || opt('', 'Aucun agent', true);
  const rows = Object.entries(state.history).filter(([, h]) => h.agent === selAgent).sort((a, b) => order(b[1]) - order(a[1]));
  $('histList').innerHTML = rows.length ? rows.map(([key, h]) => {
    const t = weekTotals(state, h), mon = mondayOf(h.year, h.week);
    return `<div class="item">
      <div class="t" data-open="${esc(key)}" style="cursor:pointer"><b>S${h.week} · ${h.year}</b>
        <small>${fmtShort(mon)} au ${fmtShort(addDays(mon, 6))} · HS sem. <span class="${signCls(t.hsWeek)}">${fmtDur(t.hsWeek, true)}</span></small></div>
      <b class="${signCls(t.cumul)}">${fmtDur(t.cumul, true)}</b>
      <button class="danger" data-del="${esc(key)}">Suppr.</button>
    </div>`;
  }).join('') : '<p class="muted" style="margin:0">Aucune semaine enregistrée.</p>';
}

/* ---------- Réglages ---------- */
function renderSettings() {
  $('agentList').innerHTML = state.agents.length ? state.agents.map((a, i) => `<div class="item">
      <div class="t"><b>${esc(a.name)}</b></div>
      <select data-aq="${i}" style="width:96px;flex:0 0 96px">${QUOTITES.map(q => opt(q, quotLbl(q), q === a.quotite)).join('')}</select>
      <button class="danger" data-adel="${i}">Suppr.</button>
    </div>`).join('') : '<p class="muted" style="margin:0">Aucun agent.</p>';
  $('newQuot').innerHTML = QUOTITES.map(q => opt(q, quotLbl(q), q === 1)).join('');

  $('codeList').innerHTML = state.codes.map((k, i) => `<div class="codeedit">
      <div class="row">
        <div style="flex:0 0 80px"><label class="f">Code</label><input data-c="${i}" data-cf="code" value="${esc(k.code)}"></div>
        <div><label class="f">Libellé</label><input data-c="${i}" data-cf="label" value="${esc(k.label)}"></div>
      </div>
      <div class="row" style="margin-top:8px">
        <div><label class="f">Type</label><select data-c="${i}" data-cf="type">${TYPES.map(t => opt(t, t, t === k.type)).join('')}</select></div>
        ${k.type === 'Horaire' ? `
        <div><label class="f">Début</label><input type="time" data-c="${i}" data-cf="start" value="${esc(k.start)}"></div>
        <div><label class="f">Fin</label><input type="time" data-c="${i}" data-cf="end" value="${esc(k.end)}"></div>` : ''}
        ${k.type === 'Forfait' ? `<div><label class="f">Durée forfait</label><input type="time" data-c="${i}" data-cf="forfait" value="${toHHMM(k.forfait)}"></div>` : ''}
      </div>
      <div class="row" style="margin-top:8px">
        ${k.type === 'Horaire' ? `<div><label class="f">Coupure</label><select data-c="${i}" data-cf="pause">${COUPURES.map(v => opt(v, v ? fmtDur(v) : 'aucune', v === k.pause)).join('')}</select></div>` : '<div></div>'}
        <div style="flex:0 0 auto;align-self:flex-end"><button class="danger" data-cdel="${i}">Supprimer</button></div>
      </div>
    </div>`).join('');

  $('daily').value = toHHMM(state.settings.daily);
  $('city').value = state.settings.city;
  $('motif').value = state.settings.motif;
  $('ver').textContent = VERSION;
}

/* ---------- Partage de fichiers ---------- */
async function shareFile(blob, name, title) {
  const file = new File([blob], name, { type: blob.type });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title });
      return;
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/* ---------- Fiche PDF (= feuille Fiche) ---------- */
function buildPdf(w) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const t = weekTotals(state, w), mon = mondayOf(w.year, w.week), sun = addDays(mon, 6);
  const L = 15, R = 195;
  let y = 18;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
  doc.text('DEMANDE DE VALIDATION D\'HEURES SUPPLÉMENTAIRES', 105, y, { align: 'center' });
  y += 10;
  doc.setFontSize(9); doc.setFont('helvetica', 'italic'); doc.text('À remplir par l\'intéressé', L, y);
  y += 8;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
  doc.text('NOM DE L\'AGENT : ' + w.agent, L, y);
  y += 8;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
  doc.text(`Sollicite la validation de mes heures du ${fmtDate(mon)} au ${fmtDate(sun)} (semaine ${w.week})`, L, y);
  y += 7;
  doc.text('Mon poste étant : voir tableau ci-dessous', L, y);
  doc.text('Quotité : ' + quotLbl(w.quotite), R, y, { align: 'right' });
  y += 7;
  doc.text('Motif des heures supplémentaires effectuées : ' + (w.motif || state.settings.motif), L, y, { maxWidth: R - L });
  y += 6;

  const cell = (i, fn) => fn(w.days[i], t.days[i]);
  const row = (label, fn) => [label, ...DAYS.map((_, i) => cell(i, fn))];
  const timed = d => { const k = codeInfo(state, d.code); return k && (k.type === 'Horaire' || k.type === 'Personnalisé'); };
  doc.autoTable({
    startY: y,
    margin: { left: L, right: 210 - R },
    head: [['', ...DAYS.map((d, i) => d.charAt(0).toUpperCase() + d.slice(1) + '\n' + fmtShort(addDays(mon, i)))]],
    body: [
      row('Code horaire', d => d.code || ''),
      row('Heure début de poste', d => timed(d) ? d.start.replace(':', 'h') : ''),
      row('Heure fin de poste', d => timed(d) ? d.end.replace(':', 'h') : ''),
      row('Temps de coupure midi', d => timed(d) && d.pause ? fmtDur(d.pause) : ''),
      row('Retard en fin de poste', d => timed(d) && d.retard ? fmtDur(d.retard, true) : ''),
      row('Temps pour la journée', (d, r) => r.time == null ? '' : fmtDur(r.time)),
      row('HS générées sur la journée', (d, r) => r.hs == null ? '' : fmtDur(r.hs, true)),
    ],
    theme: 'grid',
    styles: { fontSize: 9, halign: 'center', valign: 'middle', cellPadding: 1.8 },
    headStyles: { fillColor: [31, 78, 121], textColor: 255 },
    columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 42 } },
  });
  y = doc.lastAutoTable.finalY + 10;

  const line = (label, val) => {
    doc.setFont('helvetica', 'normal'); doc.text(label, L, y);
    doc.setFont('helvetica', 'bold'); doc.text(val, 120, y, { align: 'right' }); y += 7;
  };
  doc.setFontSize(11);
  line('Heures sup générées sur la semaine :', fmtDur(t.hsWeek, true));
  line('Heures sup semaine précédente :', fmtDur(w.prev, true));
  line('Heures sup à l\'issue de la semaine :', fmtDur(t.cumul, true));

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(`${state.settings.city}, le ${fmtDate(new Date())}`, 130, y);
  y += 7;
  doc.text('Signature de l\'intéressé', 130, y);
  y += 28;

  doc.setDrawColor(0); doc.setLineWidth(0.4);
  doc.rect(L, y, R - L, 62);
  y += 8;
  doc.setFont('helvetica', 'bold'); doc.text('PARTIE RÉSERVÉE AU CADRE DE SANTÉ', 105, y, { align: 'center' });
  y += 9;
  doc.setFont('helvetica', 'normal');
  doc.text('Validation des heures supplémentaires :   REFUSÉE   -   ACCORDÉE', L + 5, y);
  y += 9;
  doc.text('Pour la (ou les) journée(s) du : ......................................................................................', L + 5, y);
  y += 9;
  doc.text('Avis du cadre : ..........................................................................................................', L + 5, y);
  y += 9;
  doc.text('..............................................................................................................................', L + 5, y);
  y += 10;
  doc.text('Signature du cadre', 130, y);
  return doc;
}

async function exportPdf() {
  const c = state.cur;
  if (!c.agent) { toast('Choisissez d\'abord un agent'); return; }
  if (!window.jspdf) { toast('Module PDF pas encore chargé, réessayez'); return; }
  const doc = buildPdf(c);
  const name = `Fiche HS ${c.agent} S${c.week}-${c.year}.pdf`.replace(/[\\/:*?"<>|]/g, '');
  await shareFile(doc.output('blob'), name, 'Fiche heures supplémentaires');
}

/* ---------- Sauvegarde JSON ---------- */
async function exportJson() {
  const data = { app: 'temps-travail', v: 1, exportedAt: new Date().toISOString(), settings: state.settings, agents: state.agents, codes: state.codes, history: state.history };
  const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
  const d = new Date();
  await shareFile(blob, `sauvegarde-temps-travail-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`, 'Sauvegarde temps de travail');
}
function importJson(file) {
  const r = new FileReader();
  r.onload = () => {
    let data;
    try { data = JSON.parse(r.result); } catch (e) { toast('Fichier illisible'); return; }
    if (!data || data.app !== 'temps-travail' || typeof data.history !== 'object') { toast('Ce fichier n\'est pas une sauvegarde de l\'app'); return; }
    const n = Object.keys(data.history).length;
    if (!confirm(`Importer ${data.agents.length} agent(s), ${data.codes.length} code(s) et ${n} semaine(s) ?\nLes semaines existantes identiques seront remplacées.`)) return;
    state.settings = { ...state.settings, ...data.settings };
    for (const a of data.agents) {
      const ex = state.agents.find(x => x.name === a.name);
      if (ex) ex.quotite = a.quotite; else state.agents.push({ name: a.name, quotite: a.quotite });
    }
    state.agents.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    for (const k of data.codes) {
      const i = state.codes.findIndex(x => x.code === k.code);
      if (i >= 0) state.codes[i] = k; else state.codes.push(k);
    }
    Object.assign(state.history, data.history);
    if (!state.cur.agent && state.agents.length) state.cur.agent = state.agents[0].name;
    autoPrev(); save(); renderSettings(); renderWeek();
    toast('Import terminé');
  };
  r.readAsText(file);
}

/* ---------- Événements ---------- */
function bind() {
  document.querySelectorAll('nav.tabs button').forEach(b => b.addEventListener('click', () => showView(b.dataset.v)));

  $('agent').addEventListener('change', e => openWeek(e.target.value, state.cur.year, state.cur.week));
  $('quotite').addEventListener('change', e => { state.cur.quotite = +e.target.value; save(); updateTotals(); });
  $('week').addEventListener('change', e => openWeek(state.cur.agent, state.cur.year, +e.target.value));
  $('year').addEventListener('change', e => {
    const y = +e.target.value;
    if (y < 2000 || y > 2100) { $('year').value = state.cur.year; return; }
    openWeek(state.cur.agent, y, Math.min(state.cur.week, weeksInYear(y)));
  });
  const shift = n => {
    let { year, week } = state.cur;
    week += n;
    if (week < 1) { year--; week = weeksInYear(year); }
    else if (week > weeksInYear(year)) { year++; week = 1; }
    openWeek(state.cur.agent, year, week);
  };
  $('prevW').addEventListener('click', () => shift(-1));
  $('nextW').addEventListener('click', () => shift(1));
  $('todayW').addEventListener('click', () => { const n = isoWeek(new Date()); openWeek(state.cur.agent, n.year, n.week); });

  $('days').addEventListener('change', onDayChange);
  $('prevH').addEventListener('change', e => {
    const v = parseDur(e.target.value);
    if (e.target.value.trim() === '') { state.cur.prevManual = false; autoPrev(); }
    else if (v == null) { toast('Format attendu : 12h30 ou -3h15'); }
    else { state.cur.prev = v; state.cur.prevManual = true; }
    e.target.value = fmtDur(state.cur.prev);
    save(); updateTotals();
  });

  $('btnSave').addEventListener('click', saveWeek);
  $('btnPdf').addEventListener('click', exportPdf);
  $('btnReset').addEventListener('click', () => {
    if (!confirm('Effacer la saisie de cette semaine ?\n(L\'historique enregistré n\'est pas modifié.)')) return;
    state.cur.days = blankDays(); state.cur.prevManual = false; autoPrev();
    save(); renderWeek();
  });

  $('histAgent').addEventListener('change', renderHistory);
  $('histList').addEventListener('click', e => {
    const del = e.target.closest('[data-del]'), op = e.target.closest('[data-open]');
    if (del) {
      const h = state.history[del.dataset.del];
      if (h && confirm(`Supprimer la semaine ${h.week}/${h.year} de ${h.agent} ?`)) {
        delete state.history[del.dataset.del];
        if (h.agent === state.cur.agent) autoPrev();
        save(); renderHistory(); renderWeek();
      }
    } else if (op) {
      const h = state.history[op.dataset.open];
      if (h) { openWeek(h.agent, h.year, h.week); showView('semaine'); }
    }
  });

  $('addAgent').addEventListener('click', () => {
    const name = $('newAgent').value.trim().replace(/\s+/g, ' ');
    if (!name) { toast('Saisissez un nom'); return; }
    if (state.agents.some(a => a.name.toLowerCase() === name.toLowerCase())) { toast('Cet agent existe déjà'); return; }
    state.agents.push({ name, quotite: +$('newQuot').value });
    state.agents.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    if (!state.cur.agent) { state.cur.agent = name; state.cur.quotite = +$('newQuot').value; }
    $('newAgent').value = '';
    save(); renderSettings(); renderWeek(); toast('Agent ajouté');
  });
  $('agentList').addEventListener('change', e => {
    const i = e.target.dataset.aq;
    if (i == null) return;
    state.agents[+i].quotite = +e.target.value;
    save();
  });
  $('agentList').addEventListener('click', e => {
    const b = e.target.closest('[data-adel]');
    if (!b) return;
    const a = state.agents[+b.dataset.adel];
    if (!confirm(`Retirer ${a.name} de la liste ?\n(Son historique est conservé.)`)) return;
    state.agents.splice(+b.dataset.adel, 1);
    if (state.cur.agent === a.name) state.cur.agent = state.agents[0] ? state.agents[0].name : '';
    save(); renderSettings(); renderWeek();
  });

  $('codeList').addEventListener('change', e => {
    const i = e.target.dataset.c, f = e.target.dataset.cf;
    if (i == null) return;
    const k = state.codes[+i];
    let v = e.target.value;
    if (f === 'code') {
      v = v.trim();
      if (!v || state.codes.some((x, j) => j !== +i && x.code === v)) { toast('Code vide ou déjà utilisé'); e.target.value = k.code; return; }
      // Les jours saisis suivent le renommage
      const old = k.code;
      state.cur.days.forEach(d => { if (d.code === old) d.code = v; });
    }
    if (f === 'pause') v = +v;
    if (f === 'forfait') v = toMin(v) || 0;
    k[f] = v;
    save();
    if (f === 'type') renderSettings();
    renderWeek();
  });
  $('codeList').addEventListener('click', e => {
    const b = e.target.closest('[data-cdel]');
    if (!b) return;
    const k = state.codes[+b.dataset.cdel];
    if (!confirm(`Supprimer le code ${k.code} ?`)) return;
    state.codes.splice(+b.dataset.cdel, 1);
    save(); renderSettings(); renderWeek();
  });
  $('addCode').addEventListener('click', () => {
    let n = 1; while (state.codes.some(k => k.code === 'NOUV' + n)) n++;
    state.codes.push({ code: 'NOUV' + n, label: 'Nouveau code', type: 'Horaire', start: '08:00', end: '16:00', pause: 0, forfait: 0 });
    save(); renderSettings(); renderWeek();
  });
  $('daily').addEventListener('change', e => { const v = toMin(e.target.value); if (v) { state.settings.daily = v; save(); renderWeek(); } });
  $('city').addEventListener('change', e => { state.settings.city = e.target.value.trim(); save(); });
  $('motif').addEventListener('change', e => { state.settings.motif = e.target.value.trim(); save(); });

  $('btnExport').addEventListener('click', exportJson);
  $('btnImport').addEventListener('click', () => $('importFile').click());
  $('importFile').addEventListener('change', e => { if (e.target.files[0]) importJson(e.target.files[0]); e.target.value = ''; });
}

bind();
renderWeek();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// Exposé pour les tests
window.TT = { buildPdf, dayTime, dayHS, weekTotals, mondayOf, isoWeek, weeksInYear, parseDur, fmtDur, get state() { return state; } };
