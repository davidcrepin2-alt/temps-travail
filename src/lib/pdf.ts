/* Fiche de demande de validation des HS (= feuille « Fiche » de l'Excel).
   Chargé à la demande pour ne pas alourdir le démarrage de l'app. */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DAYS, addDays, codeInfo, fmtDate, fmtDur, fmtShort, isTimed, mondayOf, quotLbl, weekTotals } from './logic';
import type { AppState, Day, DayResult, Totals, Week } from './types';

export function buildPdf(state: AppState, w: Week & { totals?: Totals }): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const t = weekTotals(state, w), mon = mondayOf(w.year, w.week), sun = addDays(mon, 6);
  const L = 15, R = 195;
  let y = 18;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
  doc.text('DEMANDE DE VALIDATION D\'HEURES SUPPLÉMENTAIRES', 105, y, { align: 'center' });
  y += 10;
  doc.setFontSize(9); doc.setFont('helvetica', 'italic'); doc.text('À remplir par l\'intéressé', L, y);
  y += 8;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
  doc.text('NOM DE L\'AGENT : ' + w.agent, L, y);
  y += 8;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
  doc.text(`Sollicite la validation de mes heures du ${fmtDate(mon)} au ${fmtDate(sun)} (semaine ${w.week})`, L, y);
  y += 7;
  doc.text('Mon poste étant : voir tableau ci-dessous', L, y);
  doc.text('Quotité : ' + quotLbl(w.quotite), R, y, { align: 'right' });
  y += 7;
  doc.text('Motif des heures supplémentaires effectuées : ' + state.settings.motif, L, y, { maxWidth: R - L });
  y += 6;

  const timed = (d: Day) => isTimed(codeInfo(state, d.code));
  const row = (label: string, fn: (d: Day, r: DayResult) => string) => [label, ...DAYS.map((_, i) => fn(w.days[i], t.days[i]))];
  autoTable(doc, {
    startY: y,
    margin: { left: L, right: 210 - R },
    head: [['', ...DAYS.map((d, i) => d.charAt(0).toUpperCase() + d.slice(1) + '\n' + fmtShort(addDays(mon, i)))]],
    body: [
      row('Code horaire', d => d.code || ''),
      row('Heure début de poste', d => (timed(d) ? d.start.replace(':', 'h') : '')),
      row('Heure fin de poste', d => (timed(d) ? d.end.replace(':', 'h') : '')),
      row('Temps de coupure midi', d => (timed(d) && d.pause ? fmtDur(d.pause) : '')),
      row('Retard en fin de poste', d => (timed(d) && d.retard ? fmtDur(d.retard, true) : '')),
      row('Temps pour la journée', (_, r) => (r.time == null ? '' : fmtDur(r.time))),
      row('HS générées sur la journée', (_, r) => (r.hs == null ? '' : fmtDur(r.hs, true))),
    ],
    theme: 'grid',
    styles: { fontSize: 9, halign: 'center', valign: 'middle', cellPadding: 1.8 },
    headStyles: { fillColor: [31, 78, 121], textColor: 255 },
    columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 42 } },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  const line = (label: string, val: string) => {
    doc.setFont('helvetica', 'normal'); doc.text(label, L, y);
    doc.setFont('helvetica', 'bold'); doc.text(val, 120, y, { align: 'right' }); y += 7;
  };
  doc.setFontSize(11);
  line('Heures sup générées sur la semaine :', fmtDur(t.hsWeek, true));
  line('Heures sup semaine précédente :', fmtDur(w.prev, true));
  line('Heures sup à l\'issue de la semaine :', fmtDur(t.cumul, true));

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(`${state.settings.city}, le ${fmtDate(new Date())}`, 130, y);
  y += 7;
  doc.text('Signature de l\'intéressé', 130, y);
  y += 28;

  doc.setDrawColor(0); doc.setLineWidth(0.4);
  doc.rect(L, y, R - L, 62);
  y += 8;
  doc.setFont('helvetica', 'bold'); doc.text('PARTIE RÉSERVÉE AU CADRE DE SANTÉ', 105, y, { align: 'center' });
  y += 9;
  doc.setFont('helvetica', 'normal');
  doc.text('Validation des heures supplémentaires :   REFUSÉE   -   ACCORDÉE', L + 5, y);
  y += 9;
  doc.text('Pour la (ou les) journée(s) du : ......................................................................................', L + 5, y);
  y += 9;
  doc.text('Avis du cadre : ..........................................................................................................', L + 5, y);
  y += 9;
  doc.text('..............................................................................................................................', L + 5, y);
  y += 10;
  doc.text('Signature du cadre', 130, y);
  return doc;
}
