import { useCallback, useEffect, useRef, useState } from 'react';
import { HistoryView } from './components/HistoryView';
import { SettingsView } from './components/SettingsView';
import { TabBar, type View } from './components/TabBar';
import { WeekView } from './components/WeekView';
import * as logic from './lib/logic';
import { loadState, openWeekCur, saveState } from './lib/logic';
import type { AppState, Week } from './lib/types';

export type Update = (fn: (s: AppState) => AppState) => void;
export type OpenWeek = (agent: string, year: number, week: number) => void;
export type Toast = (msg: string) => void;

const TITLES: Record<View, string> = { semaine: 'Semaine', historique: 'Historique', reglages: 'Réglages' };

export default function App() {
  const [state, setState] = useState<AppState>(loadState);
  const [view, setView] = useState<View>('semaine');
  const [toastMsg, setToastMsg] = useState('');
  const stateRef = useRef(state);
  stateRef.current = state;

  const toastTimer = useRef<number>(undefined);
  const toast = useCallback<Toast>(msg => {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(''), 2200);
  }, []);

  useEffect(() => {
    if (!saveState(state)) toast('Impossible d\'enregistrer sur ce téléphone');
  }, [state, toast]);

  // Choisit le premier agent si aucun n'est sélectionné
  useEffect(() => {
    if (!state.cur.agent && state.agents.length) {
      setState(s => ({ ...s, cur: openWeekCur(s, s.agents[0].name, s.cur.year, s.cur.week) }));
    }
  }, [state.cur.agent, state.agents.length]);

  const update = useCallback<Update>(fn => setState(fn), []);
  const openWeek = useCallback<OpenWeek>(
    (agent, year, week) => setState(s => ({ ...s, cur: openWeekCur(s, agent, year, week) })), []);

  // Accès pour les tests automatisés de bout en bout
  useEffect(() => {
    window.TT = {
      ...logic,
      buildPdf: async (w: Week) => (await import('./lib/pdf')).buildPdf(stateRef.current, w),
      get state() { return stateRef.current; },
    };
  }, []);

  const go = (v: View) => { setView(v); window.scrollTo(0, 0); };

  return (
    <>
      <header><h1 id="title">{TITLES[view]}</h1></header>
      <main>
        {view === 'semaine' && <WeekView state={state} update={update} openWeek={openWeek} toast={toast} />}
        {view === 'historique' && <HistoryView state={state} update={update} openWeek={openWeek} go={go} />}
        {view === 'reglages' && <SettingsView state={state} update={update} toast={toast} />}
      </main>
      <TabBar view={view} go={go} />
      <div className={'toast' + (toastMsg ? ' show' : '')} id="toast">{toastMsg}</div>
    </>
  );
}
