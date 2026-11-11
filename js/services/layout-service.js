import { db, fs } from '../firebase.js';
import { ref, forCreate, forUpdate, logAudit } from './firestore-service.js';

export const FONTS = ['Noto Sans Bengali', 'Noto Serif Bengali', 'Hind Siliguri'];
export const TEMPLATE_ROLES = ['owner', 'admin', 'examManager']; // mirrors canManageTemplates in firestore.rules
export const DEFAULT_LAYOUT = {
  name: '', isDefault: false, pageSize: 'A4', orientation: 'portrait', customW: 210, customH: 297, margin: 15, columns: 1, border: false,
  fontFamily: FONTS[0], fontSize: 12, lineHeight: 1.5, qSpacing: 4, sSpacing: 6, paperLang: 'bn',
  hLogo: true, hInstitution: true, hAddress: true, hTitle: true, hSubject: true, hClass: true, hDate: true, hDuration: true, hMarks: true,
  sName: true, sRoll: true, sReg: false, sClass: false, sSection: false, sSign: false,
  marksAlign: 'right', optionsLayout: 'grid', pageNumbers: true, footerText: '', watermark: ''
};
const chk = keys => keys.map(k => [k, 'check']);
// The designer form is generated from this list: [field, kind, options or [min, max, step]].
export const GROUPS = [
  ['page', [['pageSize', 'select', ['A4', 'Legal', 'Custom']], ['orientation', 'select', ['portrait', 'landscape']], ['customW', 'number', [100, 600, 1]], ['customH', 'number', [100, 900, 1]],
    ['margin', 'number', [0, 40, 1]], ['columns', 'select', ['1', '2']], ['border', 'check']]],
  ['type', [['fontFamily', 'select', FONTS], ['fontSize', 'number', [8, 20, 0.5]], ['lineHeight', 'number', [1, 2.4, 0.1]], ['qSpacing', 'number', [0, 20, 1]],
    ['sSpacing', 'number', [0, 30, 1]], ['paperLang', 'select', ['bn', 'en']]]],
  ['header', chk(['hLogo', 'hInstitution', 'hAddress', 'hTitle', 'hSubject', 'hClass', 'hDate', 'hDuration', 'hMarks'])],
  ['student', chk(['sName', 'sRoll', 'sReg', 'sClass', 'sSection', 'sSign'])],
  ['extra', [['marksAlign', 'select', ['right', 'inline', 'none']], ['optionsLayout', 'select', ['grid', 'list']], ['pageNumbers', 'check'], ['footerText', 'text'], ['watermark', 'text']]]
];
export const LABELS = { pageSize: 'p.pageSize', orientation: 'p.orientation', customW: 'p.customW', customH: 'p.customH', margin: 'p.margin', columns: 'p.columns', border: 'p.border',
  fontFamily: 'p.fontFamily', fontSize: 'p.fontSize', lineHeight: 'p.lineHeight', qSpacing: 'p.qSpacing', sSpacing: 'p.sSpacing', paperLang: 'p.paperLang',
  hLogo: 'p.hLogo', hInstitution: 'p.hInstitution', hAddress: 'f.address', hTitle: 'x.title', hSubject: 'x.subjectId', hClass: 'x.className', hDate: 'x.date', hDuration: 'x.durationMin', hMarks: 'x.totalMarks',
  sName: 'pp.name', sRoll: 'pp.roll', sReg: 'pp.reg', sClass: 'x.className', sSection: 'pp.section', sSign: 'pp.sign',
  marksAlign: 'p.marksAlign', optionsLayout: 'p.optionsLayout', pageNumbers: 'p.pageNumbers', footerText: 'p.footerText', watermark: 'p.watermark' };
export const OPTION_LABELS = { orientation: { portrait: 'p.portrait', landscape: 'p.landscape' }, marksAlign: { right: 'p.mk.right', inline: 'p.mk.inline', none: 'p.mk.none' },
  optionsLayout: { grid: 'p.ol.grid', list: 'p.ol.list' }, pageSize: { Custom: 'p.custom' } };

const warn = e => console.warn('Audit log not written', e);
/** Only the design fields (no ids, stamps or the default flag). */
export const cleanLayout = l => Object.fromEntries(Object.keys(DEFAULT_LAYOUT).filter(k => k !== 'isDefault').map(k => [k, l[k]]));

export async function listLayouts(orgId) {
  const s = await fs.getDocs(ref.col(orgId, 'paperLayouts'));
  return s.docs.map(d => ({ ...DEFAULT_LAYOUT, ...d.data(), id: d.id })).sort((a, b) => a.name.localeCompare(b.name));
}
export async function saveLayout(orgId, id, layout) {
  if (id) { await fs.updateDoc(ref.doc(orgId, 'paperLayouts', id), forUpdate(layout)); logAudit(orgId, 'layout.update', { id }).catch(warn); return id; }
  const r = await fs.addDoc(ref.col(orgId, 'paperLayouts'), forCreate(orgId, { ...layout, isDefault: false }));
  logAudit(orgId, 'layout.create', { id: r.id }).catch(warn);
  return r.id;
}
export async function deleteLayout(orgId, id) {
  await fs.deleteDoc(ref.doc(orgId, 'paperLayouts', id));
  logAudit(orgId, 'layout.delete', { id }).catch(warn);
}
export async function setDefaultLayout(orgId, id, list) {
  const b = fs.writeBatch(db);
  list.forEach(l => { if (l.isDefault !== (l.id === id)) b.update(ref.doc(orgId, 'paperLayouts', l.id), forUpdate({ isDefault: l.id === id })); });
  await b.commit();
}
