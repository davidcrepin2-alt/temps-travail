import type { OpenWeek, Toast, Update } from '../App';
import {
  QUOTITES, addDays, blankDays, codeInfo, fmtDur, fmtLong, histKey, isoWeek, mondayOf, previousCumul, quotLbl,
  weekTotals, weeksInYear, withAutoPrev,
} from '../lib/logic';
import { safeName, shareFile } from '../lib/share';
import type { AppState, Day, Week } from '../lib/types';
import { DayCard } from './DayCard';
import { PrevInput, YearInput } from './inputs';
import { signCls, withExtra } from './ui';

export function WeekView({ state, update, openWeek, toast }: {
  state: AppState; update: Update; openWeek: OpenWeek; toast: Toast;
}) {
  const c = state.cur;
  const totals = weekTotals(state, c);
  const mon = mondayOf(c.year, c.week);
  const saved = state.history[histKey(c.agent, c.year, c.week)];
  const p = c.agent ? previousCumul(state, c.agent, c.year, c.week) : null;

  const setCur = (fn: (cur: Week) => Week) => update(s => ({ ...s, cur: fn(s.cur) }));
  const setDay = (i: number, patch: Partial<Day>) =>
    setCur(cur => ({ ...cur, days: cur.days.map((d, j) => (j === i ? { ...d, ...patch } : d)) }));

  // Changer de code pré-remplit l'horaire du code (équivalent des lignes 1-2 cachées de l'Excel)
  const setCode = (i: number, code: string) => {
    const k = codeInfo(state, code);
    if (k?.type === 'Horaire') setDay(i, { code, start: k.start, end: k.end, pause: k.pause || 0, retard: 0 });
    else if (k?.type === 'Personnalisé') setDay(i, { code });
    else setDay(i, { code, start: '', end: '', pause: 0, retard: 0 });
  };

  const shift = (n: number) => {
    let { year, week } = c;
    week += n;
    if (week < 1) { year--; week = weeksInYear(year); }
    else if (week > weeksInYear(year)) { year++; week = 1; }
    openWeek(c.agent, year, week);
  };

  const save = () => {
    if (!c.agent) { toast('Choisissez d\'abord un agent'); return; }
    update(s => ({
      ...s,
      history: {
        ...s.history,
        [histKey(s.cur.agent, s.cur.year, s.cur.week)]: {
          ...s.cur, days: s.cur.days.map(d => ({ ...d })), savedAt: Date.now(), totals: weekTotals(s, s.cur),
        },
      },
    }));
    toast(`Semaine ${c.week} enregistrée`);
  };

  const pdf = async () => {
    if (!c.agent) { toast('Choisissez d\'abord un agent'); return; }
    const { buildPdf } = await import('../lib/pdf');
    const doc = buildPdf(state, c);
    await shareFile(doc.output('blob'), safeName(`Fiche HS ${c.agent} S${c.week}-${c.year}.pdf`), 'Fiche heures supplémentaires');
  };

  const reset = () => {
    if (!confirm('Effacer la saisie de cette semaine ?\n(L\'historique enregistré n\'est pas modifié.)')) return;
    update(s => ({ ...s, cur: withAutoPrev(s, { ...s.cur, days: blankDays(), prevManual: false }) }));
  };

  return (
    <>
      <div className="card">
        <div className="row">
          <div style={{ flex: 2 }}>
            <label className="f" htmlFor="agent">Agent</label>
            <select id="agent" value={c.agent} onChange={e => openWeek(e.target.value, c.year, c.week)}>
              {!state.agents.length && <option value="">— Ajoutez un agent dans Réglages —</option>}
              {state.agents.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="f" htmlFor="quotite">Quotité</label>
            <select id="quotite" value={String(c.quotite)} onChange={e => setCur(cur => ({ ...cur, quotite: +e.target.value }))}>
              {withExtra(QUOTITES, c.quotite).map(q => <option key={q} value={String(q)}>{quotLbl(q)}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="weekbar">
          <button className="sec icon" id="prevW" aria-label="Semaine précédente" onClick={() => shift(-1)}>◀</button>
          <div className="mid">
            <b>Semaine {c.week} · {c.year}</b>
            <span>{fmtLong(mon)} au {fmtLong(addDays(mon, 6), true)}</span>
          </div>
          <button className="sec icon" id="nextW" aria-label="Semaine suivante" onClick={() => shift(1)}>▶</button>
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <div>
            <label className="f" htmlFor="year">Année</label>
            <YearInput year={c.year} onCommit={y => openWeek(c.agent, y, Math.min(c.week, weeksInYear(y)))} />
          </div>
          <div>
            <label className="f" htmlFor="week">N° semaine</label>
            <select id="week" value={String(c.week)} onChange={e => openWeek(c.agent, c.year, +e.target.value)}>
              {Array.from({ length: weeksInYear(c.year) }, (_, i) => <option key={i} value={String(i + 1)}>S{i + 1}</option>)}
            </select>
          </div>
          <div style={{ alignSelf: 'flex-end' }}>
            <button className="sec" id="todayW" style={{ width: '100%' }}
              onClick={() => { const n = isoWeek(new Date()); openWeek(c.agent, n.year, n.week); }}>Aujourd'hui</button>
          </div>
        </div>
        <div className="note">
          {saved
            ? `Enregistrée le ${new Date(saved.savedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}`
            : 'Non enregistrée'}
        </div>
      </div>

      <div id="days">
        {c.days.map((d, i) => (
          <DayCard key={i} i={i} day={d} date={addDays(mon, i)} state={state} res={totals.days[i]}
            onCode={code => setCode(i, code)} onChange={patch => setDay(i, patch)} />
        ))}
      </div>

      <div className="card sum">
        <span>HS générées sur la semaine</span>
        <b id="hsWeek" className={signCls(totals.hsWeek)}>{fmtDur(totals.hsWeek, true)}</b>
        <span>HS semaine précédente</span>
        <PrevInput cur={c} onInvalid={() => toast('Format attendu : 12h30 ou -3h15')}
          onCommit={v => update(s => ({
            ...s,
            cur: v == null ? withAutoPrev(s, { ...s.cur, prevManual: false }) : { ...s.cur, prev: v, prevManual: true },
          }))} />
        <span>HS à l'issue de la semaine</span>
        <b id="hsCumul" className={'big ' + signCls(totals.cumul)}>{fmtDur(totals.cumul, true)}</b>
      </div>
      <div className="note" id="prevNote" style={{ margin: '-4px 4px 0' }}>
        {c.prevManual
          ? 'HS précédente saisie manuellement' + (p ? ` (cumul S${p.week}/${p.year} : ${fmtDur(p.cumul, true)})` : '')
          : p ? `Reprise du cumul de la semaine ${p.week}/${p.year}` : 'Aucune semaine précédente enregistrée pour cet agent'}
      </div>

      <div className="actions">
        <button className="full" id="btnSave" onClick={save}>Enregistrer la semaine</button>
        <button className="sec" id="btnPdf" onClick={pdf}>Fiche PDF</button>
        <button className="danger" id="btnReset" onClick={reset}>Remise à zéro</button>
      </div>
    </>
  );
}
