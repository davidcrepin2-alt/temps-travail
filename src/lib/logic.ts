/* Logique métier reprise de « Calcul temps travail4.xlsm ». Toutes les durées sont en minutes. */
import type { AppState, BackupFile, Code, CodeType, Day, SavedWeek, Totals, Week } from './types';

export const STORE_KEY = 'tempsTravail.v1';
export const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'] as const;
export const TYPES: CodeType[] = ['Horaire', 'Forfait', 'Absence', 'Personnalisé'];
export const QUOTITES = [1, 0.9, 0.8, 0.7, 0.6, 0.5];
// Listes reprises de la feuille Paramètres (tblCoupures, tblRetards)
export const COUPURES = [0, 10, 15, 20, 30, 45, 60, 80, 140];
export const RETARDS = [-120, -105, -90, -75, -60, -45, -30, -20, -15, -10, 0, 10, 15, 20, 30, 45, 60, 75, 90, 105, 120];

export const DEFAULT_CODES: Code[] = [
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
export function toMin(hhmm: string): number | null {
  if (!hhmm) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm);
  return m ? +m[1] * 60 + +m[2] : null;
}
export function toHHMM(min: number | null): string {
  if (min == null) return '';
  const v = ((min % 1440) + 1440) % 1440;
  return String(Math.floor(v / 60)).padStart(2, '0') + ':' + String(v % 60).padStart(2, '0');
}
/** 220 -> "3h40", -210 -> "-3h30" ; signed : "+3h40" */
export function fmtDur(min: number | null, signed = false): string {
  if (min == null) return '';
  const neg = min < 0, a = Math.abs(Math.round(min));
  const s = Math.floor(a / 60) + 'h' + String(a % 60).padStart(2, '0');
  return neg ? '-' + s : signed && min > 0 ? '+' + s : s;
}
/** "75h20", "75:20", "-3h30", "4", "4,5" -> minutes ; null si illisible */
export function parseDur(input: string): number | null {
  let txt = String(input || '').trim().replace(/\s/g, '').replace('−', '-');
  if (!txt) return 0;
  const neg = txt.startsWith('-');
  txt = txt.replace(/^[+-]/, '');
  const m = /^(\d+)[h:](\d{0,2})$/i.exec(txt);
  let v: number;
  if (m) v = +m[1] * 60 + +(m[2] || 0);
  else if (/^\d+([.,]\d+)?$/.test(txt)) v = Math.round(parseFloat(txt.replace(',', '.')) * 60);
  else return null;
  return neg ? -v : v;
}

/* ---------- Semaines ISO (= formule Saisie!G21) ---------- */
export function mondayOf(year: number, week: number): Date {
  const jan4 = new Date(year, 0, 4);
  const dow = (jan4.getDay() + 6) % 7; // lundi = 0
  return new Date(year, 0, 4 - dow + 7 * (week - 1));
}
export function isoWeek(d: Date): { year: number; week: number } {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7));
  const year = t.getFullYear();
  return { year, week: 1 + Math.round((t.getTime() - mondayOf(year, 1).getTime()) / 604800000 - 3 / 7) };
}
export const weeksInYear = (year: number) => isoWeek(new Date(year, 11, 28)).week;
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const fmtLong = (d: Date, withYear = false) =>
  d.toLocaleDateString('fr-FR', withYear ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'long' });
export const fmtShort = (d: Date) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
export const fmtDate = (d: Date) => d.toLocaleDateString('fr-FR');
export const quotLbl = (q: number) => Math.round(q * 100) + ' %';

/* ---------- Calculs (= formules Saisie lignes 10, 11, 13, 17) ---------- */
type CalcState = Pick<AppState, 'codes' | 'settings'>;

export const codeInfo = (state: Pick<AppState, 'codes'>, code: string): Code | null =>
  state.codes.find(c => c.code === code) ?? null;
export const isTimed = (k: Code | null): boolean => !!k && (k.type === 'Horaire' || k.type === 'Personnalisé');

/** Temps pour la journée (null = vide / non décompté) */
export function dayTime(state: CalcState, day: Day): number | null {
  if (!day.code) return null;
  const c = codeInfo(state, day.code);
  if (!c || c.type === 'Absence') return null;
  if (c.type === 'Forfait') return c.forfait || 0;
  const s = toMin(day.start), e = toMin(day.end);
  if (s == null || e == null) return null;
  return (((e - s) % 1440) + 1440) % 1440 - (day.pause || 0) + (day.retard || 0);
}
export function dayHS(state: CalcState, day: Day, quotite: number): number | null {
  const t = dayTime(state, day);
  return t == null ? null : t - Math.round(state.settings.daily * (quotite || 1));
}
export function weekTotals(state: CalcState, w: Week & { totals?: Totals }): Totals {
  if (w.totals) return w.totals; // semaine enregistrée : valeurs figées
  const days = w.days.map(d => ({ time: dayTime(state, d), hs: dayHS(state, d, w.quotite) }));
  const hsWeek = days.reduce((a, d) => a + (d.hs ?? 0), 0);
  return { days, hsWeek, cumul: hsWeek + (w.prev || 0) };
}

/* ---------- État et stockage ---------- */
export const blankDays = (): Day[] => DAYS.map((_, i) => ({ code: i >= 5 ? 'RH' : '', start: '', end: '', pause: 0, retard: 0 }));

export function defaultState(): AppState {
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
export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as Partial<AppState>, d = defaultState();
      const st: AppState = { ...d, ...s, settings: { ...d.settings, ...s.settings }, cur: { ...d.cur, ...s.cur } } as AppState;
      if (!Array.isArray(st.cur.days) || st.cur.days.length !== 7) st.cur.days = blankDays();
      return st;
    }
  } catch { /* stockage indisponible */ }
  return defaultState();
}
export function saveState(state: AppState): boolean {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); return true; }
  catch { return false; }
}

export const histKey = (agent: string, year: number, week: number) => `${agent}|${year}|${String(week).padStart(2, '0')}`;
export const weekOrder = (h: { year: number; week: number }) => h.year * 100 + h.week;

/** Cumul de la dernière semaine enregistrée avant (year, week) pour l'agent */
export function previousCumul(state: AppState, agent: string, year: number, week: number) {
  let best: SavedWeek | null = null;
  for (const h of Object.values(state.history)) {
    if (h.agent !== agent || weekOrder(h) >= year * 100 + week) continue;
    if (!best || weekOrder(h) > weekOrder(best)) best = h;
  }
  return best ? { cumul: weekTotals(state, best).cumul, year: best.year, week: best.week } : null;
}

/** cur avec la HS précédente recalculée (sauf saisie manuelle) */
export function withAutoPrev(state: AppState, cur: Week): Week {
  if (cur.prevManual) return cur;
  const p = cur.agent ? previousCumul(state, cur.agent, cur.year, cur.week) : null;
  return { ...cur, prev: p ? p.cumul : 0 };
}

/** Semaine (agent, année, n°) depuis l'historique ou à blanc */
export function openWeekCur(state: AppState, agent: string, year: number, week: number): Week {
  const h = state.history[histKey(agent, year, week)];
  const a = state.agents.find(x => x.name === agent);
  const cur: Week = h
    ? { agent, year, week, quotite: h.quotite, days: h.days.map(d => ({ ...d })), prev: h.prev, prevManual: !!h.prevManual }
    : { agent, year, week, quotite: a ? a.quotite : 1, days: blankDays(), prev: 0, prevManual: false };
  return withAutoPrev(state, cur);
}

export function isBackup(data: unknown): data is BackupFile {
  const d = data as BackupFile;
  return !!d && d.app === 'temps-travail' && typeof d.history === 'object' && Array.isArray(d.agents) && Array.isArray(d.codes);
}

/** Fusion d'une sauvegarde importée : agents et codes mis à jour, semaines identiques remplacées */
export function mergeImport(state: AppState, data: BackupFile): AppState {
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
  const next: AppState = { ...state, settings: { ...state.settings, ...data.settings }, agents, codes, history: { ...state.history, ...data.history } };
  const cur = !next.cur.agent && agents.length ? { ...next.cur, agent: agents[0].name } : next.cur;
  return { ...next, cur: withAutoPrev(next, cur) };
}

export function toBackup(state: AppState): BackupFile {
  return { app: 'temps-travail', v: 1, exportedAt: new Date().toISOString(),
    settings: state.settings, agents: state.agents, codes: state.codes, history: state.history };
}
