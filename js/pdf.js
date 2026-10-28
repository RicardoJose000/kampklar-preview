// Builds the signed parental consent form that is emailed to the parent and the club.
import { ageClass, CONSENT_VERSION } from './store.js';
import { fmtDate, fmtDateTime } from './ui.js';

export const CONSENT_ITEMS = [
  { key: 'participation', required: true, title: 'Participation', text: 'My child may take part in training, matches and club events.' },
  { key: 'data', required: true, title: 'Data processing', text: 'The club may store the information in this account to organise teams, contact me and keep training records.' },
  { key: 'photo', required: false, title: 'Photos (optional)', text: 'The club may publish team photos where my child appears on its website and in newsletters.' }
];

export function consentPdf({ parent, child, consent }) {
  const J = window.jspdf?.jsPDF;
  if (!J) {
    const txt = `Parental consent\n\nChild: ${child.first} ${child.last}\nSigned by: ${consent.signedBy}\nDate: ${fmtDateTime(consent.at)}\n`;
    return 'data:text/plain;base64,' + btoa(unescape(encodeURIComponent(txt)));
  }
  const doc = new J({ unit: 'mm', format: 'a4' });
  const W = 210, M = 20;
  const navy = [14, 26, 43], accent = [255, 90, 31], muted = [93, 104, 120], line = [227, 231, 236];

  doc.setFillColor(...navy); doc.rect(0, 0, W, 42, 'F');
  doc.setFillColor(...accent); doc.circle(M + 2.5, 17, 2.5, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
  doc.text('KAMPKLAR', M + 8, 18.6);
  doc.setFontSize(22); doc.text('Parental consent form', M, 33);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(200, 212, 227);
  doc.text(`Reference ${consent.id.toUpperCase()}`, W - M, 18.6, { align: 'right' });
  doc.text(`Version ${CONSENT_VERSION}`, W - M, 24, { align: 'right' });

  let y = 58;
  const pair = (label, value, x) => {
    doc.setFontSize(8); doc.setTextColor(...muted); doc.text(label.toUpperCase(), x, y);
    doc.setFontSize(11.5); doc.setTextColor(...navy); doc.setFont('helvetica', 'bold'); doc.text(String(value), x, y + 6);
    doc.setFont('helvetica', 'normal');
  };
  doc.setFontSize(12); doc.setTextColor(...accent); doc.setFont('helvetica', 'bold'); doc.text('Player', M, y - 6); doc.setFont('helvetica', 'normal');
  pair('Name', `${child.first} ${child.last}`, M); pair('Date of birth', fmtDate(child.dob), 90); pair('Class', ageClass(child), 150);
  y += 24;
  doc.setFontSize(12); doc.setTextColor(...accent); doc.setFont('helvetica', 'bold'); doc.text('Parent or guardian', M, y - 6); doc.setFont('helvetica', 'normal');
  pair('Name', `${parent.first} ${parent.last}`, M); pair('Email', parent.email, 90);
  y += 22;
  doc.setDrawColor(...line); doc.line(M, y, W - M, y);
  y += 12;

  doc.setFontSize(12); doc.setTextColor(...accent); doc.setFont('helvetica', 'bold'); doc.text('Consent given', M, y); doc.setFont('helvetica', 'normal');
  y += 8;
  CONSENT_ITEMS.forEach(item => {
    const yes = !!consent.items[item.key];
    doc.setDrawColor(...(yes ? accent : line)); doc.setFillColor(...(yes ? accent : [255, 255, 255]));
    doc.roundedRect(M, y - 4, 5, 5, 1, 1, yes ? 'F' : 'S');
    if (yes) { doc.setDrawColor(255, 255, 255); doc.setLineWidth(.6); doc.line(M + 1.1, y - 1.6, M + 2.2, y - .3); doc.line(M + 2.2, y - .3, M + 4, y - 2.9); doc.setLineWidth(.2); }
    doc.setFontSize(11); doc.setTextColor(...navy); doc.setFont('helvetica', 'bold');
    doc.text(`${item.title}: ${yes ? 'Yes' : 'No'}`, M + 9, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...muted);
    const lines = doc.splitTextToSize(item.text, W - 2 * M - 9);
    doc.text(lines, M + 9, y + 5.5);
    y += 9 + lines.length * 4.6;
  });

  y += 6;
  doc.setFontSize(9.5); doc.setTextColor(...muted);
  const gdpr = doc.splitTextToSize('You can withdraw any consent at any time from your account under "Privacy and data". You can also download all stored data or delete the account completely. Withdrawal does not affect processing that happened before it.', W - 2 * M);
  doc.text(gdpr, M, y);
  y += gdpr.length * 4.6 + 14;

  doc.setFillColor(244, 246, 248); doc.roundedRect(M, y, W - 2 * M, 34, 3, 3, 'F');
  doc.setFontSize(8); doc.setTextColor(...muted);
  doc.text('SIGNED ELECTRONICALLY BY', M + 8, y + 10);
  doc.text('DATE AND TIME', 128, y + 10);
  doc.setFont('times', 'italic'); doc.setFontSize(22); doc.setTextColor(...navy);
  doc.text(consent.signedBy, M + 8, y + 24);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5);
  doc.text(fmtDateTime(consent.at), 128, y + 22);

  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...muted);
  doc.text('Kampklar youth handball  |  This copy was sent automatically to the parent and the club.', M, 285);

  return doc.output('datauristring', { filename: `consent-${child.first}.pdf` });
}
