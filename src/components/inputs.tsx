/* Champs validés à la sortie du champ (pas à chaque frappe). */
import { useEffect, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { fmtDur, parseDur } from '../lib/logic';
import type { Week } from '../lib/types';

const blurOnEnter = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') e.currentTarget.blur(); };

/** Texte libre ; onCommit peut renvoyer false pour refuser la valeur */
export function TextCommit({ id, value, onCommit, style }: {
  id?: string; value: string; onCommit: (v: string) => boolean | void; style?: CSSProperties;
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const commit = () => {
    const t = v.trim();
    if (t !== value && onCommit(t) === false) setV(value);
  };
  return <input id={id} type="text" value={v} style={style} onChange={e => setV(e.target.value)} onBlur={commit} onKeyDown={blurOnEnter} />;
}

export function YearInput({ year, onCommit }: { year: number; onCommit: (y: number) => void }) {
  const [v, setV] = useState(String(year));
  useEffect(() => setV(String(year)), [year]);
  const commit = () => {
    const y = +v;
    if (y >= 2000 && y <= 2100 && y !== year) onCommit(y); else setV(String(year));
  };
  return <input id="year" type="number" inputMode="numeric" min={2000} max={2100} value={v}
    onChange={e => setV(e.target.value)} onBlur={commit} onKeyDown={blurOnEnter} />;
}

/** HS précédente : « 12h30 » / « -3h15 » ; vide = retour au calcul automatique (onCommit(null)) */
export function PrevInput({ cur, onCommit, onInvalid }: {
  cur: Week; onCommit: (v: number | null) => void; onInvalid: () => void;
}) {
  const [v, setV] = useState(fmtDur(cur.prev));
  useEffect(() => setV(fmtDur(cur.prev)), [cur.prev, cur.agent, cur.year, cur.week]);
  const commit = () => {
    if (v.trim() === '') { onCommit(null); return; }
    const m = parseDur(v);
    if (m == null) { onInvalid(); setV(fmtDur(cur.prev)); return; }
    if (m !== cur.prev || !cur.prevManual) onCommit(m);
    setV(fmtDur(m));
  };
  return (
    <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
      <input id="prevH" type="text" placeholder="0h00" value={v} style={{ width: 100, flex: '0 0 100px', textAlign: 'right' }}
        onChange={e => setV(e.target.value)} onBlur={commit} onKeyDown={blurOnEnter} />
    </div>
  );
}

/** Liste de durées (coupure, retard) ; ajoute la valeur courante si elle n'est pas dans la liste */
export function DurationSelect({ value, options, signed, zeroLabel, onChange, ...rest }: {
  value: number; options: number[]; signed?: boolean; zeroLabel: string; onChange: (v: number) => void;
  'data-i'?: number; 'data-f'?: string;
}) {
  const list = options.includes(value) ? options : [...options, value];
  return (
    <select {...rest} value={String(value)} onChange={e => onChange(+e.target.value)}>
      {list.map(v => <option key={v} value={String(v)}>{v ? fmtDur(v, signed) : zeroLabel}</option>)}
    </select>
  );
}
