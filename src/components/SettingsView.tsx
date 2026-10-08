import { useRef, useState } from 'react';
import type { Toast, Update } from '../App';
import { QUOTITES, isBackup, mergeImport, openWeekCur, quotLbl, toBackup, toHHMM, toMin } from '../lib/logic';
import { shareFile } from '../lib/share';
import type { Agent, AppState, Code, Settings } from '../lib/types';
import { CodeEditor } from './CodeEditor';
import { TextCommit } from './inputs';
import { withExtra } from './ui';
import { VersionInfo } from './VersionInfo';

export function SettingsView({ state, update, toast }: { state: AppState; update: Update; toast: Toast }) {
  const [newName, setNewName] = useState('');
  const [newQuot, setNewQuot] = useState('1');
  const fileRef = useRef<HTMLInputElement>(null);
  const setSettings = (patch: Partial<Settings>) => update(s => ({ ...s, settings: { ...s.settings, ...patch } }));

  /* ----- Agents ----- */
  const addAgent = () => {
    const name = newName.trim().replace(/\s+/g, ' ');
    if (!name) { toast('Saisissez un nom'); return; }
    if (state.agents.some(a => a.name.toLowerCase() === name.toLowerCase())) { toast('Cet agent existe déjà'); return; }
    update(s => ({ ...s, agents: [...s.agents, { name, quotite: +newQuot }].sort((a, b) => a.name.localeCompare(b.name, 'fr')) }));
    setNewName('');
    toast('Agent ajouté');
  };
  const delAgent = (a: Agent) => {
    if (!confirm(`Retirer ${a.name} de la liste ?\n(Son historique est conservé.)`)) return;
    update(s => {
      const agents = s.agents.filter(x => x.name !== a.name);
      if (s.cur.agent !== a.name) return { ...s, agents };
      const n = { ...s, agents };
      return { ...n, cur: agents.length ? openWeekCur(n, agents[0].name, s.cur.year, s.cur.week) : { ...s.cur, agent: '' } };
    });
  };

  /* ----- Codes ----- */
  const setCode = (i: number, patch: Partial<Code>) =>
    update(s => ({ ...s, codes: s.codes.map((k, j) => (j === i ? { ...k, ...patch } : k)) }));
  const renameCode = (i: number, v: string): boolean => {
    const old = state.codes[i].code;
    if (v === old) return true;
    if (!v || state.codes.some((x, j) => j !== i && x.code === v)) { toast('Code vide ou déjà utilisé'); return false; }
    // Les jours en cours de saisie suivent le renommage
    update(s => ({
      ...s,
      codes: s.codes.map((k, j) => (j === i ? { ...k, code: v } : k)),
      cur: { ...s.cur, days: s.cur.days.map(d => (d.code === old ? { ...d, code: v } : d)) },
    }));
    return true;
  };
  const delCode = (i: number) => {
    if (!confirm(`Supprimer le code ${state.codes[i].code} ?`)) return;
    update(s => ({ ...s, codes: s.codes.filter((_, j) => j !== i) }));
  };
  const addCode = () => update(s => {
    let n = 1;
    while (s.codes.some(k => k.code === 'NOUV' + n)) n++;
    return { ...s, codes: [...s.codes, { code: 'NOUV' + n, label: 'Nouveau code', type: 'Horaire', start: '08:00', end: '16:00', pause: 0, forfait: 0 }] };
  });

  /* ----- Sauvegarde ----- */
  const exportJson = async () => {
    const d = new Date(), p2 = (n: number) => String(n).padStart(2, '0');
    await shareFile(new Blob([JSON.stringify(toBackup(state), null, 1)], { type: 'application/json' }),
      `sauvegarde-temps-travail-${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}.json`, 'Sauvegarde temps de travail');
  };
  const importJson = (file: File) => {
    const r = new FileReader();
    r.onload = () => {
      let data: unknown;
      try { data = JSON.parse(String(r.result)); } catch { toast('Fichier illisible'); return; }
      if (!isBackup(data)) { toast('Ce fichier n\'est pas une sauvegarde de l\'app'); return; }
      const n = Object.keys(data.history).length;
      if (!confirm(`Importer ${data.agents.length} agent(s), ${data.codes.length} code(s) et ${n} semaine(s) ?\nLes semaines existantes identiques seront remplacées.`)) return;
      update(s => mergeImport(s, data));
      toast('Import terminé');
    };
    r.readAsText(file);
  };

  return (
    <>
      <h2>Agents</h2>
      <div className="card list" id="agentList">
        {state.agents.length ? state.agents.map(a => (
          <div className="item" key={a.name}>
            <div className="t"><b>{a.name}</b></div>
            <select style={{ width: 96, flex: '0 0 96px' }} value={String(a.quotite)}
              onChange={e => update(s => ({ ...s, agents: s.agents.map(x => (x.name === a.name ? { ...x, quotite: +e.target.value } : x)) }))}>
              {withExtra(QUOTITES, a.quotite).map(q => <option key={q} value={String(q)}>{quotLbl(q)}</option>)}
            </select>
            <button className="danger" onClick={() => delAgent(a)}>Suppr.</button>
          </div>
        )) : <p className="muted" style={{ margin: 0 }}>Aucun agent.</p>}
      </div>
      <div className="card">
        <div className="row">
          <div style={{ flex: 2 }}>
            <label className="f" htmlFor="newAgent">Nom (NOM Prénom)</label>
            <input id="newAgent" type="text" autoCapitalize="words" value={newName} onChange={e => setNewName(e.target.value)} />
          </div>
          <div>
            <label className="f" htmlFor="newQuot">Quotité</label>
            <select id="newQuot" value={newQuot} onChange={e => setNewQuot(e.target.value)}>
              {QUOTITES.map(q => <option key={q} value={String(q)}>{quotLbl(q)}</option>)}
            </select>
          </div>
        </div>
        <button style={{ width: '100%', marginTop: 10 }} id="addAgent" onClick={addAgent}>Ajouter l'agent</button>
      </div>

      <h2>Codes horaires</h2>
      <div className="card" id="codeList">
        {state.codes.map((k, i) => (
          <CodeEditor key={i + '|' + k.code} k={k}
            onRename={v => renameCode(i, v)} onChange={patch => setCode(i, patch)} onDelete={() => delCode(i)} />
        ))}
      </div>
      <div className="card"><button className="sec" style={{ width: '100%' }} onClick={addCode}>Ajouter un code</button></div>

      <h2>Paramètres</h2>
      <div className="card">
        <div className="row">
          <div>
            <label className="f" htmlFor="daily">Temps journalier (100 %)</label>
            <input id="daily" type="time" value={toHHMM(state.settings.daily)}
              onChange={e => { const v = toMin(e.target.value); if (v) setSettings({ daily: v }); }} />
          </div>
          <div>
            <label className="f" htmlFor="city">Ville (fiche)</label>
            <TextCommit id="city" value={state.settings.city} onCommit={city => setSettings({ city })} />
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <label className="f" htmlFor="motif">Motif par défaut (fiche)</label>
          <TextCommit id="motif" value={state.settings.motif} onCommit={motif => setSettings({ motif })} />
        </div>
      </div>

      <h2>Sauvegarde</h2>
      <div className="card">
        <p className="note" style={{ marginTop: 0 }}>
          Les données sont stockées uniquement dans ce téléphone. Exportez régulièrement une sauvegarde (dans Fichiers / OneDrive) pour ne rien perdre.
        </p>
        <div className="actions" style={{ marginBottom: 0 }}>
          <button id="btnExport" onClick={exportJson}>Exporter</button>
          <button className="sec" id="btnImport" onClick={() => fileRef.current?.click()}>Importer</button>
        </div>
        <input ref={fileRef} type="file" accept=".json,application/json" hidden
          onChange={e => { const f = e.target.files?.[0]; if (f) importJson(f); e.target.value = ''; }} />
      </div>
      <VersionInfo />
    </>
  );
}
