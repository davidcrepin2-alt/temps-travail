import { useState } from 'react';
import type { OpenWeek, Update } from '../App';
import { addDays, fmtDur, fmtShort, mondayOf, weekOrder, weekTotals, withAutoPrev } from '../lib/logic';
import type { AppState } from '../lib/types';
import type { View } from './TabBar';
import { signCls } from './ui';

export function HistoryView({ state, update, openWeek, go }: {
  state: AppState; update: Update; openWeek: OpenWeek; go: (v: View) => void;
}) {
  const agents = [...new Set([...Object.values(state.history).map(h => h.agent), ...state.agents.map(a => a.name)])].sort();
  const [sel, setSel] = useState(state.cur.agent || agents[0] || '');
  const rows = Object.entries(state.history)
    .filter(([, h]) => h.agent === sel)
    .sort((a, b) => weekOrder(b[1]) - weekOrder(a[1]));

  const del = (key: string) => {
    const h = state.history[key];
    if (!h || !confirm(`Supprimer la semaine ${h.week}/${h.year} de ${h.agent} ?`)) return;
    update(s => {
      const history = { ...s.history };
      delete history[key];
      const n = { ...s, history };
      return { ...n, cur: h.agent === s.cur.agent ? withAutoPrev(n, s.cur) : s.cur };
    });
  };

  return (
    <>
      <div className="card">
        <label className="f" htmlFor="histAgent">Agent</label>
        <select id="histAgent" value={sel} onChange={e => setSel(e.target.value)}>
          {agents.length ? agents.map(a => <option key={a} value={a}>{a}</option>) : <option value="">Aucun agent</option>}
        </select>
      </div>
      <div className="card list" id="histList">
        {rows.length ? rows.map(([key, h]) => {
          const t = weekTotals(state, h), mon = mondayOf(h.year, h.week);
          return (
            <div className="item" key={key}>
              <div className="t" style={{ cursor: 'pointer' }} onClick={() => { openWeek(h.agent, h.year, h.week); go('semaine'); }}>
                <b>S{h.week} · {h.year}</b>
                <small>
                  {fmtShort(mon)} au {fmtShort(addDays(mon, 6))} · HS sem.{' '}
                  <span className={signCls(t.hsWeek)}>{fmtDur(t.hsWeek, true)}</span>
                </small>
              </div>
              <b className={signCls(t.cumul)}>{fmtDur(t.cumul, true)}</b>
              <button className="danger" onClick={() => del(key)}>Suppr.</button>
            </div>
          );
        }) : <p className="muted" style={{ margin: 0 }}>Aucune semaine enregistrée.</p>}
      </div>
    </>
  );
}
