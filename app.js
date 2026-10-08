/* Temps de travail — interface React (React 18 + htm, sans étape de compilation). */
import {
  DAYS, TYPES, QUOTITES, COUPURES, RETARDS,
  toMin, toHHMM, fmtDur, parseDur, mondayOf, isoWeek, weeksInYear, addDays, fmtLong, fmtShort, quotLbl,
  codeInfo, isTimed, dayTime, dayHS, weekTotals, blankDays, loadState, saveState, histKey, weekOrder,
  previousCumul, withAutoPrev, openWeekCur, mergeImport, buildPdf, shareFile,
} from './logic.js';

const { useState, useEffect, useRef, useCallback } = React;
const html = htm.bind(React.createElement);
const REPO = 'https://github.com/davidcrepin2-alt/temps-travail';

const signCls = v => v == null ? '' : v > 0 ? 'pos' : v < 0 ? 'neg' : '';
const withExtra = (list, v) => list.includes(v) ? list : list.concat([v]);
const safeName = s => s.replace(/[\\/:*?"<>|]/g, '');

/* ================= Application ================= */
function App() {
  const [state, setState] = useState(loadState);
  const [view, setView] = useState('semaine');
  const [toastMsg, setToastMsg] = useState('');
  const stateRef = useRef(state);
  stateRef.current = state;

  const toastTimer = useRef();
  const toast = useCallback(msg => {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 2200);
  }, []);

  useEffect(() => { if (!saveState(state)) toast('Impossible d\'enregistrer sur ce téléphone'); }, [state]);

  // Choisit le premier agent si aucun n'est sélectionné
  useEffect(() => {
    if (!state.cur.agent && state.agents.length) setState(s => ({ ...s, cur: openWeekCur(s, s.agents[0].name, s.cur.year, s.cur.week) }));
  }, [state.cur.agent, state.agents.length]);

  const update = useCallback(fn => setState(s => fn(s)), []);
  const openWeek = useCallback((agent, year, week) => update(s => ({ ...s, cur: openWeekCur(s, agent, year, week) })), [update]);

  // Accès pour les tests automatisés
  window.TT = { dayTime, dayHS, weekTotals, mondayOf, isoWeek, weeksInYear, parseDur, fmtDur,
    buildPdf: w => buildPdf(stateRef.current, w), get state() { return stateRef.current; } };

  const go = v => { setView(v); window.scrollTo(0, 0); };
  const titles = { semaine: 'Semaine', historique: 'Historique', reglages: 'Réglages' };

  return html`
    <header><h1 id="title">${titles[view]}</h1></header>
    <main>
      ${view === 'semaine' && html`<${WeekView} state=${state} update=${update} openWeek=${openWeek} toast=${toast} />`}
      ${view === 'historique' && html`<${HistoryView} state=${state} update=${update} openWeek=${openWeek} go=${go} />`}
      ${view === 'reglages' && html`<${SettingsView} state=${state} update=${update} toast=${toast} />`}
    </main>
    <${TabBar} view=${view} go=${go} />
    <div className=${'toast' + (toastMsg ? ' show' : '')} id="toast">${toastMsg}</div>
  `;
}

/* ================= Semaine ================= */
function WeekView({ state, update, openWeek, toast }) {
  const c = state.cur;
  const totals = weekTotals(state, c);
  const mon = mondayOf(c.year, c.week);
  const saved = state.history[histKey(c.agent, c.year, c.week)];
  const p = c.agent ? previousCumul(state, c.agent, c.year, c.week) : null;

  const setCur = fn => update(s => ({ ...s, cur: fn(s.cur) }));
  const shift = n => {
    let { year, week } = c;
    week += n;
    if (week < 1) { year--; week = weeksInYear(year); }
    else if (week > weeksInYear(year)) { year++; week = 1; }
    openWeek(c.agent, year, week);
  };

  const setDay = (i, patch) => setCur(cur => ({ ...cur, days: cur.days.map((d, j) => j === i ? { ...d, ...patch } : d) }));
  const setCode = (i, code) => {
    const k = codeInfo(state, code);
    const d = c.days[i];
    if (k && k.type === 'Horaire') setDay(i, { code, start: k.start, end: k.end, pause: k.pause || 0, retard: 0 });
    else if (k && k.type === 'Personnalisé') setDay(i, { code });
    else setDay(i, { code, start: '', end: '', pause: 0, retard: 0 });
  };

  const save = () => {
    if (!c.agent) { toast('Choisissez d\'abord un agent'); return; }
    update(s => ({ ...s, history: { ...s.history, [histKey(c.agent, c.year, c.week)]: {
      agent: c.agent, year: c.year, week: c.week, quotite: c.quotite,
      days: c.days.map(d => ({ ...d })), prev: c.prev, prevManual: c.prevManual, savedAt: Date.now(),
      totals: weekTotals(s, s.cur),
    } } }));
    toast(`Semaine ${c.week} enregistrée`);
  };
  const pdf = async () => {
    if (!c.agent) { toast('Choisissez d\'abord un agent'); return; }
    if (!window.jspdf) { toast('Module PDF pas encore chargé, réessayez'); return; }
    const doc = buildPdf(state, c);
    await shareFile(doc.output('blob'), safeName(`Fiche HS ${c.agent} S${c.week}-${c.year}.pdf`), 'Fiche heures supplémentaires');
  };
  const reset = () => {
    if (!confirm('Effacer la saisie de cette semaine ?\n(L\'historique enregistré n\'est pas modifié.)')) return;
    update(s => ({ ...s, cur: withAutoPrev(s, { ...s.cur, days: blankDays(), prevManual: false }) }));
  };

  return html`
    <div className="card">
      <div className="row">
        <div style=${{ flex: 2 }}>
          <label className="f" htmlFor="agent">Agent</label>
          <select id="agent" value=${c.agent} onChange=${e => openWeek(e.target.value, c.year, c.week)}>
            ${!state.agents.length && html`<option value="">— Ajoutez un agent dans Réglages —</option>`}
            ${state.agents.map(a => html`<option key=${a.name} value=${a.name}>${a.name}</option>`)}
          </select>
        </div>
        <div>
          <label className="f" htmlFor="quotite">Quotité</label>
          <select id="quotite" value=${String(c.quotite)} onChange=${e => setCur(cur => ({ ...cur, quotite: +e.target.value }))}>
            ${withExtra(QUOTITES, c.quotite).map(q => html`<option key=${q} value=${String(q)}>${quotLbl(q)}</option>`)}
          </select>
        </div>
      </div>
    </div>

    <div className="card">
      <div className="weekbar">
        <button className="sec icon" id="prevW" aria-label="Semaine précédente" onClick=${() => shift(-1)}>◀</button>
        <div className="mid"><b>Semaine ${c.week} · ${c.year}</b><span>${fmtLong(mon)} au ${fmtLong(addDays(mon, 6), true)}</span></div>
        <button className="sec icon" id="nextW" aria-label="Semaine suivante" onClick=${() => shift(1)}>▶</button>
      </div>
      <div className="row" style=${{ marginTop: 10 }}>
        <div>
          <label className="f" htmlFor="year">Année</label>
          <${YearInput} year=${c.year} onCommit=${y => openWeek(c.agent, y, Math.min(c.week, weeksInYear(y)))} />
        </div>
        <div>
          <label className="f" htmlFor="week">N° semaine</label>
          <select id="week" value=${String(c.week)} onChange=${e => openWeek(c.agent, c.year, +e.target.value)}>
            ${Array.from({ length: weeksInYear(c.year) }, (_, i) => html`<option key=${i} value=${String(i + 1)}>S${i + 1}</option>`)}
          </select>
        </div>
        <div style=${{ alignSelf: 'flex-end' }}>
          <button className="sec" id="todayW" style=${{ width: '100%' }} onClick=${() => { const n = isoWeek(new Date()); openWeek(c.agent, n.year, n.week); }}>Aujourd'hui</button>
        </div>
      </div>
      <div className="note">${saved ? `Enregistrée le ${new Date(saved.savedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}` : 'Non enregistrée'}</div>
    </div>

    <div id="days">
      ${c.days.map((d, i) => html`<${DayCard} key=${i} i=${i} day=${d} date=${addDays(mon, i)} state=${state} res=${totals.days[i]}
          onCode=${code => setCode(i, code)} onChange=${patch => setDay(i, patch)} />`)}
    </div>

    <div className="card sum">
      <span>HS générées sur la semaine</span><b id="hsWeek" className=${signCls(totals.hsWeek)}>${fmtDur(totals.hsWeek, true)}</b>
      <span>HS semaine précédente</span>
      <${PrevInput} cur=${c} toast=${toast} onCommit=${v => update(s => ({ ...s, cur: v == null
        ? withAutoPrev(s, { ...s.cur, prevManual: false })
        : { ...s.cur, prev: v, prevManual: true } }))} />
      <span>HS à l'issue de la semaine</span><b id="hsCumul" className=${'big ' + signCls(totals.cumul)}>${fmtDur(totals.cumul, true)}</b>
    </div>
    <div className="note" id="prevNote" style=${{ margin: '-4px 4px 0' }}>
      ${c.prevManual ? 'HS précédente saisie manuellement' + (p ? ` (cumul S${p.week}/${p.year} : ${fmtDur(p.cumul, true)})` : '')
        : p ? `Reprise du cumul de la semaine ${p.week}/${p.year}` : 'Aucune semaine précédente enregistrée pour cet agent'}
    </div>

    <div className="actions">
      <button className="full" id="btnSave" onClick=${save}>Enregistrer la semaine</button>
      <button className="sec" id="btnPdf" onClick=${pdf}>Fiche PDF</button>
      <button className="danger" id="btnReset" onClick=${reset}>Remise à zéro</button>
    </div>
  `;
}

function YearInput({ year, onCommit }) {
  const [v, setV] = useState(String(year));
  useEffect(() => setV(String(year)), [year]);
  const commit = () => {
    const y = +v;
    if (y >= 2000 && y <= 2100 && y !== year) onCommit(y); else setV(String(year));
  };
  return html`<input id="year" type="number" inputMode="numeric" min="2000" max="2100" value=${v}
    onChange=${e => setV(e.target.value)} onBlur=${commit} onKeyDown=${e => e.key === 'Enter' && e.target.blur()} />`;
}

// Saisie libre « 12h30 » / « -3h15 » ; vide = retour au calcul automatique
function PrevInput({ cur, onCommit, toast }) {
  const [v, setV] = useState(fmtDur(cur.prev));
  useEffect(() => setV(fmtDur(cur.prev)), [cur.prev, cur.agent, cur.year, cur.week]);
  const commit = () => {
    if (v.trim() === '') { onCommit(null); return; }
    const m = parseDur(v);
    if (m == null) { toast('Format attendu : 12h30 ou -3h15'); setV(fmtDur(cur.prev)); return; }
    if (m !== cur.prev || !cur.prevManual) onCommit(m);
    setV(fmtDur(m));
  };
  return html`<div className="row" style=${{ justifyContent: 'flex-end', gap: 6 }}>
    <input id="prevH" type="text" placeholder="0h00" value=${v} style=${{ width: 100, flex: '0 0 100px', textAlign: 'right' }}
      onChange=${e => setV(e.target.value)} onBlur=${commit} onKeyDown=${e => e.key === 'Enter' && e.target.blur()} />
  </div>`;
}

function DayCard({ i, day, date, state, res, onCode, onChange }) {
  const k = codeInfo(state, day.code);
  let body = null;
  if (isTimed(k)) {
    body = html`<div className="grid2">
      <div><label className="f">Début</label><input type="time" data-i=${i} data-f="start" value=${day.start} onChange=${e => onChange({ start: e.target.value })} /></div>
      <div><label className="f">Fin</label><input type="time" data-i=${i} data-f="end" value=${day.end} onChange=${e => onChange({ end: e.target.value })} /></div>
      <div><label className="f">Coupure</label>
        <select data-i=${i} data-f="pause" value=${String(day.pause)} onChange=${e => onChange({ pause: +e.target.value })}>
          ${withExtra(COUPURES, day.pause).map(v => html`<option key=${v} value=${String(v)}>${v ? fmtDur(v) : 'aucune'}</option>`)}
        </select></div>
      <div><label className="f">Retard fin de poste</label>
        <select data-i=${i} data-f="retard" value=${String(day.retard)} onChange=${e => onChange({ retard: +e.target.value })}>
          ${withExtra(RETARDS, day.retard).map(v => html`<option key=${v} value=${String(v)}>${v ? fmtDur(v, true) : 'aucun'}</option>`)}
        </select></div>
    </div>`;
  } else if (k && k.type === 'Forfait') {
    body = html`<div className="note">Forfait : ${fmtDur(k.forfait)}</div>`;
  } else if (k) {
    body = html`<div className="note">${k.label} — non décompté</div>`;
  }
  return html`<div className="card day">
    <h3><span style=${{ textTransform: 'capitalize' }}>${DAYS[i]}</span><small>${fmtShort(date)}</small></h3>
    <div style=${{ marginTop: 8 }}>
      <select data-i=${i} data-f="code" aria-label=${'Code horaire ' + DAYS[i]} value=${day.code} onChange=${e => onCode(e.target.value)}>
        <option value="">—</option>
        ${state.codes.map(c => html`<option key=${c.code} value=${c.code}>${c.code} · ${c.label}</option>`)}
        ${day.code && !k && html`<option value=${day.code}>${day.code} (supprimé)</option>`}
      </select>
    </div>
    ${body}
    <div className="daysum">
      <span>Temps <b data-t=${i}>${res.time == null ? '—' : fmtDur(res.time)}</b></span>
      <span>HS jour <b data-h=${i} className=${signCls(res.hs)}>${res.hs == null ? '—' : fmtDur(res.hs, true)}</b></span>
    </div>
  </div>`;
}

/* ================= Historique ================= */
function HistoryView({ state, update, openWeek, go }) {
  const agents = [...new Set(Object.values(state.history).map(h => h.agent).concat(state.agents.map(a => a.name)))].sort();
  const [sel, setSel] = useState(state.cur.agent || agents[0] || '');
  const rows = Object.entries(state.history).filter(([, h]) => h.agent === sel).sort((a, b) => weekOrder(b[1]) - weekOrder(a[1]));

  const del = key => {
    const h = state.history[key];
    if (!h || !confirm(`Supprimer la semaine ${h.week}/${h.year} de ${h.agent} ?`)) return;
    update(s => {
      const history = { ...s.history };
      delete history[key];
      const n = { ...s, history };
      return { ...n, cur: h.agent === s.cur.agent ? withAutoPrev(n, s.cur) : s.cur };
    });
  };

  return html`
    <div className="card">
      <label className="f" htmlFor="histAgent">Agent</label>
      <select id="histAgent" value=${sel} onChange=${e => setSel(e.target.value)}>
        ${agents.length ? agents.map(a => html`<option key=${a} value=${a}>${a}</option>`) : html`<option value="">Aucun agent</option>`}
      </select>
    </div>
    <div className="card list" id="histList">
      ${rows.length ? rows.map(([key, h]) => {
        const t = weekTotals(state, h), mon = mondayOf(h.year, h.week);
        return html`<div className="item" key=${key}>
          <div className="t" style=${{ cursor: 'pointer' }} onClick=${() => { openWeek(h.agent, h.year, h.week); go('semaine'); }}>
            <b>S${h.week} · ${h.year}</b>
            <small>${fmtShort(mon)} au ${fmtShort(addDays(mon, 6))} · HS sem. <span className=${signCls(t.hsWeek)}>${fmtDur(t.hsWeek, true)}</span></small>
          </div>
          <b className=${signCls(t.cumul)}>${fmtDur(t.cumul, true)}</b>
          <button className="danger" onClick=${() => del(key)}>Suppr.</button>
        </div>`;
      }) : html`<p className="muted" style=${{ margin: 0 }}>Aucune semaine enregistrée.</p>`}
    </div>
  `;
}

/* ================= Réglages ================= */
function SettingsView({ state, update, toast }) {
  const [newName, setNewName] = useState('');
  const [newQuot, setNewQuot] = useState('1');
  const fileRef = useRef();
  const setSettings = patch => update(s => ({ ...s, settings: { ...s.settings, ...patch } }));

  const addAgent = () => {
    const name = newName.trim().replace(/\s+/g, ' ');
    if (!name) { toast('Saisissez un nom'); return; }
    if (state.agents.some(a => a.name.toLowerCase() === name.toLowerCase())) { toast('Cet agent existe déjà'); return; }
    update(s => ({ ...s, agents: [...s.agents, { name, quotite: +newQuot }].sort((a, b) => a.name.localeCompare(b.name, 'fr')) }));
    setNewName('');
    toast('Agent ajouté');
  };
  const delAgent = a => {
    if (!confirm(`Retirer ${a.name} de la liste ?\n(Son historique est conservé.)`)) return;
    update(s => {
      const agents = s.agents.filter(x => x.name !== a.name);
      if (s.cur.agent !== a.name) return { ...s, agents };
      const n = { ...s, agents };
      return { ...n, cur: agents.length ? openWeekCur(n, agents[0].name, s.cur.year, s.cur.week) : { ...s.cur, agent: '' } };
    });
  };

  const setCode = (i, patch) => update(s => ({ ...s, codes: s.codes.map((k, j) => j === i ? { ...k, ...patch } : k) }));
  const renameCode = (i, v) => {
    v = v.trim();
    const old = state.codes[i].code;
    if (v === old) return true;
    if (!v || state.codes.some((x, j) => j !== i && x.code === v)) { toast('Code vide ou déjà utilisé'); return false; }
    // Les jours en cours de saisie suivent le renommage
    update(s => ({ ...s, codes: s.codes.map((k, j) => j === i ? { ...k, code: v } : k),
      cur: { ...s.cur, days: s.cur.days.map(d => d.code === old ? { ...d, code: v } : d) } }));
    return true;
  };
  const delCode = i => {
    if (!confirm(`Supprimer le code ${state.codes[i].code} ?`)) return;
    update(s => ({ ...s, codes: s.codes.filter((_, j) => j !== i) }));
  };
  const addCode = () => update(s => {
    let n = 1; while (s.codes.some(k => k.code === 'NOUV' + n)) n++;
    return { ...s, codes: [...s.codes, { code: 'NOUV' + n, label: 'Nouveau code', type: 'Horaire', start: '08:00', end: '16:00', pause: 0, forfait: 0 }] };
  });

  const exportJson = async () => {
    const data = { app: 'temps-travail', v: 1, exportedAt: new Date().toISOString(), settings: state.settings, agents: state.agents, codes: state.codes, history: state.history };
    const d = new Date(), p2 = n => String(n).padStart(2, '0');
    await shareFile(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }),
      `sauvegarde-temps-travail-${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}.json`, 'Sauvegarde temps de travail');
  };
  const importJson = file => {
    const r = new FileReader();
    r.onload = () => {
      let data;
      try { data = JSON.parse(r.result); } catch (e) { toast('Fichier illisible'); return; }
      if (!data || data.app !== 'temps-travail' || typeof data.history !== 'object') { toast('Ce fichier n\'est pas une sauvegarde de l\'app'); return; }
      const n = Object.keys(data.history).length;
      if (!confirm(`Importer ${data.agents.length} agent(s), ${data.codes.length} code(s) et ${n} semaine(s) ?\nLes semaines existantes identiques seront remplacées.`)) return;
      update(s => mergeImport(s, data));
      toast('Import terminé');
    };
    r.readAsText(file);
  };

  return html`
    <h2>Agents</h2>
    <div className="card list" id="agentList">
      ${state.agents.length ? state.agents.map(a => html`<div className="item" key=${a.name}>
        <div className="t"><b>${a.name}</b></div>
        <select style=${{ width: 96, flex: '0 0 96px' }} value=${String(a.quotite)}
          onChange=${e => update(s => ({ ...s, agents: s.agents.map(x => x.name === a.name ? { ...x, quotite: +e.target.value } : x) }))}>
          ${withExtra(QUOTITES, a.quotite).map(q => html`<option key=${q} value=${String(q)}>${quotLbl(q)}</option>`)}
        </select>
        <button className="danger" onClick=${() => delAgent(a)}>Suppr.</button>
      </div>`) : html`<p className="muted" style=${{ margin: 0 }}>Aucun agent.</p>`}
    </div>
    <div className="card">
      <div className="row">
        <div style=${{ flex: 2 }}><label className="f" htmlFor="newAgent">Nom (NOM Prénom)</label>
          <input id="newAgent" type="text" autoCapitalize="words" value=${newName} onChange=${e => setNewName(e.target.value)} /></div>
        <div><label className="f" htmlFor="newQuot">Quotité</label>
          <select id="newQuot" value=${newQuot} onChange=${e => setNewQuot(e.target.value)}>
            ${QUOTITES.map(q => html`<option key=${q} value=${String(q)}>${quotLbl(q)}</option>`)}
          </select></div>
      </div>
      <button style=${{ width: '100%', marginTop: 10 }} id="addAgent" onClick=${addAgent}>Ajouter l'agent</button>
    </div>

    <h2>Codes horaires</h2>
    <div className="card" id="codeList">
      ${state.codes.map((k, i) => html`<${CodeEditor} key=${i + '|' + k.code} k=${k}
        onRename=${v => renameCode(i, v)} onChange=${patch => setCode(i, patch)} onDelete=${() => delCode(i)} />`)}
    </div>
    <div className="card"><button className="sec" style=${{ width: '100%' }} onClick=${addCode}>Ajouter un code</button></div>

    <h2>Paramètres</h2>
    <div className="card">
      <div className="row">
        <div><label className="f" htmlFor="daily">Temps journalier (100 %)</label>
          <input id="daily" type="time" value=${toHHMM(state.settings.daily)} onChange=${e => { const v = toMin(e.target.value); if (v) setSettings({ daily: v }); }} /></div>
        <div><label className="f" htmlFor="city">Ville (fiche)</label>
          <${TextCommit} id="city" value=${state.settings.city} onCommit=${v => setSettings({ city: v })} /></div>
      </div>
      <div style=${{ marginTop: 10 }}><label className="f" htmlFor="motif">Motif par défaut (fiche)</label>
        <${TextCommit} id="motif" value=${state.settings.motif} onCommit=${v => setSettings({ motif: v })} /></div>
    </div>

    <h2>Sauvegarde</h2>
    <div className="card">
      <p className="note" style=${{ marginTop: 0 }}>Les données sont stockées uniquement dans ce téléphone. Exportez régulièrement une sauvegarde (dans Fichiers / OneDrive) pour ne rien perdre.</p>
      <div className="actions" style=${{ marginBottom: 0 }}>
        <button id="btnExport" onClick=${exportJson}>Exporter</button>
        <button className="sec" id="btnImport" onClick=${() => fileRef.current.click()}>Importer</button>
      </div>
      <input ref=${fileRef} type="file" accept=".json,application/json" hidden
        onChange=${e => { if (e.target.files[0]) importJson(e.target.files[0]); e.target.value = ''; }} />
    </div>
    <${VersionInfo} />
  `;
}

// Champ texte validé à la sortie du champ (évite d'enregistrer à chaque frappe)
function TextCommit({ id, value, onCommit, style }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return html`<input id=${id} type="text" value=${v} style=${style} onChange=${e => setV(e.target.value)}
    onBlur=${() => { const t = v.trim(); if (t !== value) { if (onCommit(t) === false) setV(value); } }}
    onKeyDown=${e => e.key === 'Enter' && e.target.blur()} />`;
}

function CodeEditor({ k, onRename, onChange, onDelete }) {
  return html`<div className="codeedit">
    <div className="row">
      <div style=${{ flex: '0 0 80px' }}><label className="f">Code</label><${TextCommit} value=${k.code} onCommit=${onRename} /></div>
      <div><label className="f">Libellé</label><${TextCommit} value=${k.label} onCommit=${v => onChange({ label: v })} /></div>
    </div>
    <div className="row" style=${{ marginTop: 8 }}>
      <div><label className="f">Type</label>
        <select value=${k.type} onChange=${e => onChange({ type: e.target.value })}>
          ${TYPES.map(t => html`<option key=${t} value=${t}>${t}</option>`)}
        </select></div>
      ${k.type === 'Horaire' && html`
        <div><label className="f">Début</label><input type="time" value=${k.start} onChange=${e => onChange({ start: e.target.value })} /></div>
        <div><label className="f">Fin</label><input type="time" value=${k.end} onChange=${e => onChange({ end: e.target.value })} /></div>`}
      ${k.type === 'Forfait' && html`
        <div><label className="f">Durée forfait</label><input type="time" value=${toHHMM(k.forfait)} onChange=${e => onChange({ forfait: toMin(e.target.value) || 0 })} /></div>`}
    </div>
    <div className="row" style=${{ marginTop: 8 }}>
      ${k.type === 'Horaire' ? html`<div><label className="f">Coupure</label>
        <select value=${String(k.pause)} onChange=${e => onChange({ pause: +e.target.value })}>
          ${withExtra(COUPURES, k.pause).map(v => html`<option key=${v} value=${String(v)}>${v ? fmtDur(v) : 'aucune'}</option>`)}
        </select></div>` : html`<div></div>`}
      <div style=${{ flex: '0 0 auto', alignSelf: 'flex-end' }}><button className="danger" onClick=${onDelete}>Supprimer</button></div>
    </div>
  </div>`;
}

// Commit publié : version.json est écrit par le déploiement GitHub Actions
function VersionInfo() {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    fetch('version.json', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setInfo)
      .catch(() => setInfo(false));
  }, []);
  let content;
  if (info === null) content = 'Version : …';
  else if (!info || !info.sha) content = 'Version : locale (non publiée)';
  else content = html`Version : <a id="commit" href=${REPO + '/commit/' + info.sha} target="_blank" rel="noopener"><code>${info.sha.slice(0, 7)}</code></a>
    ${info.date && html`<br />publiée le ${new Date(info.date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}`}`;
  return html`<p className="note" id="ver" style=${{ textAlign: 'center' }}>Temps de travail · ${content}</p>`;
}

/* ================= Barre d'onglets ================= */
const ICONS = {
  semaine: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>`,
  historique: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></svg>`,
  reglages: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>`,
};
function TabBar({ view, go }) {
  const tabs = [['semaine', 'Semaine'], ['historique', 'Historique'], ['reglages', 'Réglages']];
  return html`<nav className="tabs">
    ${tabs.map(([v, label]) => html`<button key=${v} data-v=${v} className=${view === v ? 'on' : ''} onClick=${() => go(v)}>${ICONS[v]}${label}</button>`)}
  </nav>`;
}

ReactDOM.createRoot(document.getElementById('root')).render(html`<${App} />`);

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
