/* Temps de travail — logique métier (sans interface).
   Reprise de « Calcul temps travail4.xlsm ». Toutes les durées sont en minutes. */

export const STORE_KEY = 'tempsTravail.v1';
export const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
export const TYPES = ['Horaire', 'Forfait', 'Absence', 'Personnalisé'];
export const QUOTITES = [1, 0.9, 0.8, 0.7, 0.6, 0.5];
// Listes reprises de la feuille Paramètres (tblCoupures, tblRetards)
export const COUPURES = [0, 10, 15, 20, 30, 45, 60, 80, 140];
export const RETARDS = [-120, -105, -90, -75, -60, -45, -30, -20, -15, -10, 0, 10, 15, 20, 30, 45, 60, 75, 90, 105, 120];

export const DEFAULT_CODES = [
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
export function toMin(hhmm) {
  if (!hhmm) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm);
  return m ? (+m[1]) * 60 + (+m[2]) : null;
}
export function toHHMM(min) {
  if (min == null || min === '') return '';
  min = ((min % 1440) + 1440) % 1440;
  return String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');
}
// 220 -> "3h40", -210 -> "-3h30"
export function fmtDur(min, signed) {
  if (min == null) return '';
  const neg = min < 0, a = Math.abs(Math.round(min));
  const s = Math.floor(a / 60) + 'h' + String(a % 60).padStart(2, '0');
  return neg ? '-' + s : (signed && min > 0 ? '+' + s : s);
}
// "75h20", "75:20", "-3h30", "4", "4,5" -> minutes (null si illisible)
export function parseDur(txt) {
  txt = String(txt || '').trim().replace(/\s/g, '').replace('−', '-');
  if (!txt) return 0;
  const neg = txt.startsWith('-');
  txt = txt.replace(/^[+-]/, '');
  const m = /^(\d+)[h:](\d{0,2})$/i.exec(txt);
  let v;
  if (m) v = (+m[1]) * 60 + (+(m[2] || 0));
  else if (/^\d+([.,]\d+)?$/.test(txt)) v = Math.round(parseFloat(txt.replace(',', '.')) * 60);
  else return null;
  return neg ? -v : v;
}

/* ---------- Semaines ISO (= formule Saisie!G21) ---------- */
export function mondayOf(year, week) {
  const jan4 = new Date(year, 0, 4);
  const dow = (jan4.getDay() + 6) % 7; // lundi = 0
  return new Date(year, 0, 4 - dow + 7 * (week - 1));
}
export function isoWeek(d) {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7));
  const year = t.getFullYear();
  return { year, week: 1 + Math.round((t - mondayOf(year, 1)) / 604800000 - 3 / 7) };
}
export const weeksInYear = year => isoWeek(new Date(year, 11, 28)).week;
export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const fmtLong = (d, y) => d.toLocaleDateString('fr-FR', y ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'long' });
export const fmtShort = d => d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
export const fmtDate = d => d.toLocaleDateString('fr-FR');
export const quotLbl = q => Math.round(q * 100) + ' %';

/* ---------- Calculs (= formules Saisie lignes 10, 11, 13, 17) ---------- */
export const codeInfo = (state, code) => state.codes.find(c => c.code === code) || null;
export const isTimed = k => !!k && (k.type === 'Horaire' || k.type === 'Personnalisé');

// Temps pour la journée (null = vide / non décompté)
export function dayTime(state, day) {
  if (!day.code) return null;
  const c = codeInfo(state, day.code);
  if (!c || c.type === 'Absence') return null;
  if (c.type === 'Forfait') return c.forfait || 0;
  const s = toMin(day.start), e = toMin(day.end);
  if (s == null || e == null) return null;
  return ((e - s) % 1440 + 1440) % 1440 - (day.pause || 0) + (day.retard || 0);
}
export function dayHS(state, day, quotite) {
  const t = dayTime(state, day);
  return t == null ? null : t - Math.round(state.settings.daily * (quotite || 1));
}
export function weekTotals(state, w) {
  if (w.totals) return w.totals; // semaine enregistrée : valeurs figées
  const days = w.days.map(d => ({ time: dayTime(state, d), hs: dayHS(state, d, w.quotite) }));
  const hsWeek = days.reduce((a, d) => a + (d.hs || 0), 0);
  return { days, hsWeek, cumul: hsWeek + (w.prev || 0) };
}

/* ---------- État et stockage ---------- */
export const blankDays = () => DAYS.map((_, i) => ({ code: i >= 5 ? 'RH' : '', start: '', end: '', pause: 0, retard: 0 }));

export function defaultState() {
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
export function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const s = JSON.parse(raw), d = defaultState();
      const st = { ...d, ...s, settings: { ...d.settings, ...(s.settings || {}) }, cur: { ...d.cur, ...(s.cur || {}) } };
      if (!Array.isArray(st.cur.days) || st.cur.days.length !== 7) st.cur.days = blankDays();
      return st;
    }
  } catch (e) { /* stockage indisponible */ }
  return defaultState();
}
export function saveState(state) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); return true; }
  catch (e) { return false; }
}

export const histKey = (agent, year, week) => `${agent}|${year}|${String(week).padStart(2, '0')}`;
export const weekOrder = h => h.year * 100 + h.week;

// Cumul de la dernière semaine enregistrée avant (year, week) pour l'agent
export function previousCumul(state, agent, year, week) {
  let best = null;
  for (const h of Object.values(state.history)) {
    if (h.agent !== agent || weekOrder(h) >= year * 100 + week) continue;
    if (!best || weekOrder(h) > weekOrder(best)) best = h;
  }
  return best ? { cumul: weekTotals(state, best).cumul, year: best.year, week: best.week } : null;
}

// Renvoie cur avec la HS précédente recalculée (sauf saisie manuelle)
export function withAutoPrev(state, cur) {
  if (cur.prevManual) return cur;
  const p = cur.agent ? previousCumul(state, cur.agent, cur.year, cur.week) : null;
  return { ...cur, prev: p ? p.cumul : 0 };
}

// Semaine (agent, année, n°) depuis l'historique ou à blanc
export function openWeekCur(state, agent, year, week) {
  const h = state.history[histKey(agent, year, week)];
  const a = state.agents.find(x => x.name === agent);
  const cur = h
    ? { agent, year, week, quotite: h.quotite, days: h.days.map(d => ({ ...d })), prev: h.prev, prevManual: !!h.prevManual }
    : { agent, year, week, quotite: a ? a.quotite : 1, days: blankDays(), prev: 0, prevManual: false };
  return withAutoPrev(state, cur);
}

// Fusion d'une sauvegarde importée
export function mergeImport(state, data) {
  const agents = state.agents.map(a => ({ ...a }));
  for (const a of data.agents) {
    const ex = agents.find(x => x.name === a.name);
    if (ex) ex.quotite = a.quotite; else agents.push({ name: a.name, quotite: a.quotite });
  }
  agents.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  const codes = state.codes.map(k => ({ ...k }));
  for (const k of data.codes) {
    const i = codes.findIndex(x => x.code === k.code);
    if (i >= 0) codes[i] = k; else codes.push(k);
  }
  const next = { ...state, settings: { ...state.settings, ...data.settings }, agents, codes, history: { ...state.history, ...data.history } };
  let cur = next.cur;
  if (!cur.agent && agents.length) cur = { ...cur, agent: agents[0].name };
  next.cur = withAutoPrev(next, cur);
  return next;
}

/* ---------- Fiche PDF (= feuille Fiche) ---------- */
export function buildPdf(state, w) {
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
  doc.text('Motif des heures supplémentaires effectuées : ' + state.settings.motif, L, y, { maxWidth: R - L });
  y += 6;

  const timed = d => isTimed(codeInfo(state, d.code));
  const row = (label, fn) => [label, ...DAYS.map((_, i) => fn(w.days[i], t.days[i]))];
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

/* ---------- Partage de fichiers (feuille de partage iOS, sinon téléchargement) ---------- */
export async function shareFile(blob, name, title) {
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
