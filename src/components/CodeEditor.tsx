import { COUPURES, TYPES, toHHMM, toMin } from '../lib/logic';
import type { Code, CodeType } from '../lib/types';
import { DurationSelect, TextCommit } from './inputs';

export function CodeEditor({ k, onRename, onChange, onDelete }: {
  k: Code; onRename: (v: string) => boolean; onChange: (patch: Partial<Code>) => void; onDelete: () => void;
}) {
  return (
    <div className="codeedit">
      <div className="row">
        <div style={{ flex: '0 0 80px' }}><label className="f">Code</label><TextCommit value={k.code} onCommit={onRename} /></div>
        <div><label className="f">Libellé</label><TextCommit value={k.label} onCommit={label => onChange({ label })} /></div>
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <div><label className="f">Type</label>
          <select value={k.type} onChange={e => onChange({ type: e.target.value as CodeType })}>
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        {k.type === 'Horaire' && (
          <>
            <div><label className="f">Début</label><input type="time" value={k.start} onChange={e => onChange({ start: e.target.value })} /></div>
            <div><label className="f">Fin</label><input type="time" value={k.end} onChange={e => onChange({ end: e.target.value })} /></div>
          </>
        )}
        {k.type === 'Forfait' && (
          <div><label className="f">Durée forfait</label>
            <input type="time" value={toHHMM(k.forfait)} onChange={e => onChange({ forfait: toMin(e.target.value) || 0 })} /></div>
        )}
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        {k.type === 'Horaire'
          ? <div><label className="f">Coupure</label>
              <DurationSelect value={k.pause} options={COUPURES} zeroLabel="aucune" onChange={pause => onChange({ pause })} /></div>
          : <div />}
        <div style={{ flex: '0 0 auto', alignSelf: 'flex-end' }}><button className="danger" onClick={onDelete}>Supprimer</button></div>
      </div>
    </div>
  );
}
