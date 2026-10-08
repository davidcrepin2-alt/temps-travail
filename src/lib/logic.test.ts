import { describe, expect, it } from 'vitest';
import {
  blankDays, dayHS, dayTime, defaultState, fmtDur, histKey, isoWeek, mergeImport, mondayOf, openWeekCur,
  parseDur, previousCumul, weekTotals, weeksInYear,
} from './logic';
import type { AppState, Day, SavedWeek } from './types';

const AGENT = 'AGENT Test';
const d = (code = '', start = '', end = '', pause = 0, retard = 0): Day => ({ code, start, end, pause, retard });

// Semaines 40 et 41/2026 reprises de la feuille « Historique plannings » de l'Excel
function excelState(): AppState {
  const s = defaultState();
  const w40: SavedWeek = {
    agent: AGENT, year: 2026, week: 40, quotite: 1, prev: 4245, prevManual: true, savedAt: 0,
    days: [d('MA'), d('MA'), d('MA'), d('spé', '08:00', '17:00', 20), d('spé', '08:00', '18:15', 20), d('RH'), d('RH')],
  };
  const w41: SavedWeek = {
    agent: AGENT, year: 2026, week: 41, quotite: 1, prev: 4520, prevManual: false, savedAt: 0,
    days: [d(), d(), d('A12', '13:30', '17:00'), d(), d(), d('RH'), d('RH')],
  };
  return { ...s, agents: [{ name: AGENT, quotite: 1 }], history: { [histKey(AGENT, 2026, 40)]: w40, [histKey(AGENT, 2026, 41)]: w41 } };
}

describe('semaines ISO (formule Saisie!G21)', () => {
  it('lundi de la semaine', () => {
    expect(mondayOf(2026, 40).toLocaleDateString('fr-FR')).toBe('28/09/2026');
    expect(mondayOf(2026, 1).toLocaleDateString('fr-FR')).toBe('29/12/2025');
  });
  it('numéro de semaine et nombre de semaines', () => {
    expect(isoWeek(new Date(2026, 9, 7))).toEqual({ year: 2026, week: 41 });
    expect(isoWeek(new Date(2027, 0, 1))).toEqual({ year: 2026, week: 53 });
    expect(weeksInYear(2026)).toBe(53);
    expect(weeksInYear(2025)).toBe(52);
  });
});

describe('durées', () => {
  it('format', () => {
    expect(fmtDur(220)).toBe('3h40');
    expect(fmtDur(-210)).toBe('-3h30');
    expect(fmtDur(45, true)).toBe('+0h45');
    expect(fmtDur(0, true)).toBe('0h00');
  });
  it('saisie libre', () => {
    expect(parseDur('75h20')).toBe(4520);
    expect(parseDur('-3h15')).toBe(-195);
    expect(parseDur('12:30')).toBe(750);
    expect(parseDur('4,5')).toBe(270);
    expect(parseDur('')).toBe(0);
    expect(parseDur('abc')).toBeNull();
  });
});

describe('calculs (formules Saisie lignes 10, 11, 13, 17)', () => {
  const s = defaultState();
  it('codes horaires', () => {
    expect(dayTime(s, d('JC17', '08:30', '17:00', 45))).toBe(465);
    expect(dayTime(s, d('JC17', '08:30', '17:00', 45, 15))).toBe(480);
    expect(dayHS(s, d('JC17', '08:30', '17:00', 45), 1)).toBe(45);
  });
  it('forfaits et absences', () => {
    expect(dayTime(s, d('FP'))).toBe(420);
    expect(dayHS(s, d('RHS'), 1)).toBe(-420);
    expect(dayTime(s, d('CA'))).toBeNull();
    expect(dayHS(s, d('RH'), 1)).toBeNull();
    expect(dayTime(s, d())).toBeNull();
  });
  it('travail de nuit et horaire incomplet', () => {
    expect(dayTime(s, d('spé', '21:00', '07:00'))).toBe(600);
    expect(dayTime(s, d('spé', '08:00', ''))).toBeNull();
  });
  it('quotité', () => {
    expect(dayHS(s, d('JC17', '08:30', '17:00', 45, 15), 0.8)).toBe(144);
    // comme dans l'Excel, un forfait n'est pas proratisé
    expect(dayHS(s, d('FP'), 0.8)).toBe(84);
  });
});

describe("valeurs de l'historique Excel", () => {
  const s = excelState();
  it('semaine 40 : +4h35, cumul 75h20', () => {
    const t = weekTotals(s, s.history[histKey(AGENT, 2026, 40)]);
    expect(t.days[3]).toEqual({ time: 520, hs: 100 });
    expect(t.hsWeek).toBe(275);
    expect(t.cumul).toBe(4520);
  });
  it('semaine 41 : -3h30, cumul 71h50', () => {
    const t = weekTotals(s, s.history[histKey(AGENT, 2026, 41)]);
    expect(t.hsWeek).toBe(-210);
    expect(t.cumul).toBe(4310);
  });
  it('HS précédente reprise automatiquement', () => {
    expect(previousCumul(s, AGENT, 2026, 42)).toEqual({ cumul: 4310, year: 2026, week: 41 });
    expect(openWeekCur(s, AGENT, 2026, 42).prev).toBe(4310);
    expect(openWeekCur(s, AGENT, 2026, 40).prev).toBe(4245); // saisie manuelle conservée
    expect(previousCumul(s, AGENT, 2026, 40)).toBeNull();
  });
  it('les totaux figés priment', () => {
    const w = { ...s.history[histKey(AGENT, 2026, 41)], totals: { days: [], hsWeek: 1, cumul: 2 } };
    expect(weekTotals(s, w).cumul).toBe(2);
  });
});

describe('import', () => {
  it('fusionne agents, codes et semaines', () => {
    const base = { ...defaultState(), agents: [{ name: 'B', quotite: 1 }] };
    const src = excelState();
    const next = mergeImport(base, {
      app: 'temps-travail', v: 1, exportedAt: '', settings: src.settings, history: src.history,
      agents: [{ name: 'B', quotite: 0.8 }, { name: 'A', quotite: 1 }],
      codes: [{ code: 'N12', label: 'Nuit', type: 'Horaire', start: '21:00', end: '07:00', pause: 0, forfait: 0 }],
    });
    expect(next.agents).toEqual([{ name: 'A', quotite: 1 }, { name: 'B', quotite: 0.8 }]);
    expect(next.codes.at(-1)?.code).toBe('N12');
    expect(Object.keys(next.history)).toHaveLength(2);
    expect(next.cur.days).toEqual(blankDays());
  });
});
