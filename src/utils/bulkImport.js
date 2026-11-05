// Bulk resident import — template is "Name, Email, Phone, Unit" (the last
// column takes the site's unit word, e.g. "Ward" for hospitals). Non-estate
// sites add "Role" (doctor, nurse… blank = the member role) and an ID column
// named by the role form ("Patient / hospital no.", "Matric number"), so staff
// and members can be imported at once. opts = { roles, idLabel }.
// Accepts pasted text, a CSV file, or a PDF (text-based, e.g. an exported table).

export const TEMPLATE_HEADERS = ['Name', 'Email', 'Phone', 'Unit'];

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /^\+?[\d\s().-]{7,}$/;

// Split one CSV line, honouring "quoted, values" and "" escapes.
function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',' || ch === ';' || ch === '\t') { out.push(cur.trim()); cur = ''; }
    else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

// "Doctor" / "doctors" / "doctor" → 'doctor'; blank or unknown → '' (member role)
export function roleKeyFrom(text, roles = []) {
  const t = String(text || '').trim().toLowerCase();
  if (!t) return '';
  const hit = roles.find(r => [r.key, r.label, r.plural].some(x => String(x || '').toLowerCase() === t))
    || roles.find(r => t.startsWith(String(r.label || '').toLowerCase().split(' ')[0]));
  return hit && hit !== roles[0] ? hit.key : '';
}

function headerIndex(cells, unitWord, opts) {
  const lower = cells.map(c => c.toLowerCase());
  const find = (...keys) => lower.findIndex(c => keys.some(k => c.includes(k)));
  const idx = {
    name:  find('name'),
    email: find('email', 'e-mail'),
    unit:  find('unit', 'apartment', 'apt', 'flat', 'house', ...(unitWord && unitWord !== 'Unit' ? [unitWord.toLowerCase()] : [])),
    phone: find('phone', 'mobile', 'tel'),
    role:  opts?.roles ? find('role', 'position', 'job') : -1,
    id:    opts?.roles ? find('id', 'no.', 'number', 'matric', ...(opts.idLabel ? [opts.idLabel.toLowerCase()] : [])) : -1,
  };
  // "Unit number" / "Staff ID number" must not steal each other's column
  if (idx.id === idx.unit) idx.id = lower.findIndex((c, i) => i !== idx.unit && /\bid\b|no\.|matric/.test(c));
  return idx.email >= 0 ? idx : null;
}

// Text → [{ name, email, unitNumber, phone }]. Uses a header row when present,
// otherwise positional "Name, Email, Phone, Unit". With 3 columns the third is phone if it looks like one, else unit.
export function parseBulkText(raw, unitWord, opts) {
  const lines = (raw || '').replace(/^﻿/, '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!lines.length) return [];

  const first = splitCsvLine(lines[0]);
  const idx = headerIndex(first, unitWord, opts) && !EMAIL_RE.test(lines[0]) ? headerIndex(first, unitWord, opts) : null;
  const rows = idx ? lines.slice(1) : lines;

  return rows
    .map(line => {
      const p = splitCsvLine(line);
      if (idx) {
        const at = (i) => (i >= 0 ? p[i] || '' : '');
        return { name: at(idx.name), email: at(idx.email), unitNumber: at(idx.unit), phone: at(idx.phone), role: at(idx.role), idNumber: at(idx.id) };
      }
      if (p.length >= 4) return { name: p[0], email: p[1], phone: p[2], unitNumber: p[3], role: opts?.roles ? p[4] : '', idNumber: opts?.roles ? p[5] : '' };
      const third = p[2] || '';
      return PHONE_RE.test(third)
        ? { name: p[0] || '', email: p[1] || '', phone: third, unitNumber: '' }
        : { name: p[0] || '', email: p[1] || '', phone: '', unitNumber: third };
    })
    .map(r => ({
      name: r.name.trim(), email: r.email.trim(), phone: (r.phone || '').trim(), unitNumber: r.unitNumber.trim(),
      role: opts?.roles ? roleKeyFrom(r.role, opts.roles) : '', idNumber: (r.idNumber || '').trim(),
    }))
    .filter(r => r.name && EMAIL_RE.test(r.email));
}

export const isValidEmail = (v) => EMAIL_RE.test(v || '');

export const emptyRow = () => ({ name: '', email: '', phone: '', unitNumber: '', role: '', idNumber: '' });

// terms (optional): site terms — the unit column and file name follow them.
// opts.roles: add Role + ID columns (non-estate sites)
export function downloadTemplate(terms, opts) {
  const custom = terms && terms.unit && terms.unit !== 'Unit';
  const base = custom ? [...TEMPLATE_HEADERS.slice(0, 3), terms.unit] : TEMPLATE_HEADERS;
  const withRoles = !!opts?.roles?.length;
  const headers = withRoles ? [...base, 'Role', opts.idLabel || 'ID number'] : base;
  const staff = withRoles ? opts.roles.find(r => r.staff) : null;
  const csv = withRoles
    ? `${headers.join(',')}\nChioma Obi,chioma@gmail.com,+2348012345678,1A,${opts.roles[0].label},P-1001\nEmeka Nwosu,emeka@email.com,,1B,${staff?.label || ''},S-204\n`
    : `${headers.join(',')}\nChioma Obi,chioma@gmail.com,+2348012345678,1A\nEmeka Nwosu,emeka@email.com,,1B\n`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = custom ? `${(terms.members || 'members').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-template.csv` : 'residents-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// PDF → rows. Groups text items into visual lines, then finds the email on each
// line: text before it is the name; after it, a phone-like cell is the phone
// and the rest is the unit.
async function parsePdf(file) {
  const pdfjs = await import('pdfjs-dist');
  const { default: workerSrc } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const rows = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const { items } = await page.getTextContent();
    const lines = [];
    items.filter(it => it.str.trim()).forEach(it => {
      const [x, y] = [it.transform[4], it.transform[5]];
      let line = lines.find(l => Math.abs(l.y - y) < 4);
      if (!line) { line = { y, cells: [] }; lines.push(line); }
      line.cells.push({ x, str: it.str.trim() });
    });
    lines.sort((a, b) => b.y - a.y).forEach(l => {
      const cells = l.cells.sort((a, b) => a.x - b.x).map(c => c.str);
      const ei = cells.findIndex(c => EMAIL_RE.test(c));
      if (ei < 0) return;
      const email = cells[ei].match(EMAIL_RE)[0];
      const name = cells.slice(0, ei).join(' ').replace(/^\d+[.)]?\s+/, '').trim();
      const after = cells.slice(ei + 1);
      const pi = after.findIndex(c => PHONE_RE.test(c));
      const phone = pi >= 0 ? after[pi] : '';
      const unitNumber = after.filter((_, i) => i !== pi).join(' ').trim();
      if (name) rows.push({ name, email, phone, unitNumber, role: '', idNumber: '' });
    });
  }
  return rows;
}

export async function parseBulkFile(file, unitWord, opts) {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  if (isPdf) return parsePdf(file);
  return parseBulkText(await file.text(), unitWord, opts);
}
