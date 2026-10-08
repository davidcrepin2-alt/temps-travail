import { COUPURES, DAYS, RETARDS, codeInfo, fmtDur, fmtShort, isTimed } from '../lib/logic';
import type { AppState, Day, DayResult } from '../lib/types';
import { DurationSelect } from './inputs';
import { signCls } from './ui';

export function DayCard({ i, day, date, state, res, onCode, onChange }: {
  i: number; day: Day; date: Date; state: AppState; res: DayResult;
  onCode: (code: string) => void; onChange: (patch: Partial<Day>) => void;
}) {
  const k = codeInfo(state, day.code);
  let body = null;
  if (isTimed(k)) {
    body = (
      <div className="grid2">
        <div><label className="f">Début</label>
          <input type="time" data-i={i} data-f="start" value={day.start} onChange={e => onChange({ start: e.target.value })} /></div>
        <div><label className="f">Fin</label>
          <input type="time" data-i={i} data-f="end" value={day.end} onChange={e => onChange({ end: e.target.value })} /></div>
        <div><label className="f">Coupure</label>
          <DurationSelect data-i={i} data-f="pause" value={day.pause} options={COUPURES} zeroLabel="aucune" onChange={pause => onChange({ pause })} /></div>
        <div><label className="f">Retard fin de poste</label>
          <DurationSelect data-i={i} data-f="retard" value={day.retard} options={RETARDS} signed zeroLabel="aucun" onChange={retard => onChange({ retard })} /></div>
      </div>
    );
  } else if (k?.type === 'Forfait') {
    body = <div className="note">Forfait : {fmtDur(k.forfait)}</div>;
  } else if (k) {
    body = <div className="note">{k.label} — non décompté</div>;
  }

  return (
    <div className="card day">
      <h3><span style={{ textTransform: 'capitalize' }}>{DAYS[i]}</span><small>{fmtShort(date)}</small></h3>
      <div style={{ marginTop: 8 }}>
        <select data-i={i} data-f="code" aria-label={'Code horaire ' + DAYS[i]} value={day.code} onChange={e => onCode(e.target.value)}>
          <option value="">—</option>
          {state.codes.map(c => <option key={c.code} value={c.code}>{c.code} · {c.label}</option>)}
          {day.code && !k && <option value={day.code}>{day.code} (supprimé)</option>}
        </select>
      </div>
      {body}
      <div className="daysum">
        <span>Temps <b data-t={i}>{res.time == null ? '—' : fmtDur(res.time)}</b></span>
        <span>HS jour <b data-h={i} className={signCls(res.hs)}>{res.hs == null ? '—' : fmtDur(res.hs, true)}</b></span>
      </div>
    </div>
  );
}
