/** Toutes les durées sont en minutes. */

export type CodeType = 'Horaire' | 'Forfait' | 'Absence' | 'Personnalisé';

export interface Code {
  code: string;
  label: string;
  type: CodeType;
  /** "HH:MM" (type Horaire) */
  start: string;
  end: string;
  /** coupure par défaut (type Horaire) */
  pause: number;
  /** durée du forfait (type Forfait) */
  forfait: number;
}

export interface Agent {
  name: string;
  quotite: number;
}

export interface Day {
  code: string;
  start: string;
  end: string;
  pause: number;
  retard: number;
}

export interface DayResult {
  /** null = vide / non décompté */
  time: number | null;
  hs: number | null;
}

export interface Totals {
  days: DayResult[];
  hsWeek: number;
  cumul: number;
}

export interface Week {
  agent: string;
  year: number;
  week: number;
  quotite: number;
  days: Day[];
  /** HS de la semaine précédente */
  prev: number;
  prevManual: boolean;
}

export interface SavedWeek extends Week {
  savedAt: number;
  /** totaux figés à l'enregistrement */
  totals?: Totals;
}

export interface Settings {
  /** temps journalier à 100 % */
  daily: number;
  city: string;
  motif: string;
}

export interface AppState {
  v: 1;
  settings: Settings;
  agents: Agent[];
  codes: Code[];
  /** clé : "AGENT|ANNÉE|SS" */
  history: Record<string, SavedWeek>;
  /** semaine en cours de saisie */
  cur: Week;
}

export interface BackupFile {
  app: 'temps-travail';
  v: 1;
  exportedAt: string;
  settings: Settings;
  agents: Agent[];
  codes: Code[];
  history: Record<string, SavedWeek>;
}
