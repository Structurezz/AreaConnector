// Site types — client copy of server/utils/siteTypes.js. Used as the fallback
// so the UI renders the right words before GET /api/site returns; the server
// response always wins. Keep TERMS / DEFAULT_MODULES in step with the server.
import { Building2, GraduationCap, BedDouble, Factory, Stethoscope, School } from 'lucide-react';

export const SITE_TYPES = ['estate', 'school', 'university', 'hotel', 'industrial', 'hospital'];

export const TERMS = {
  estate: {
    site: 'Estate', sites: 'Estates',
    member: 'Resident', members: 'Residents',
    unit: 'Unit', units: 'Units',
    family: 'Family member', familyPlural: 'Family members', household: 'Household',
    manager: 'Estate manager', dues: 'Estate bills',
    idLabel: 'ID number', classLabel: 'Group', idCheck: 'Staff check',
  },
  school: {
    site: 'Campus', sites: 'Campuses',
    member: 'Student', members: 'Students & staff',
    unit: 'Class', units: 'Classes',
    family: 'Parent / guardian', familyPlural: 'Parents & guardians', household: 'Family',
    manager: 'Administrator', dues: 'School fees',
    idLabel: 'Admission / staff no.', classLabel: 'Class', idCheck: 'Staff check',
  },
  // Universities, polytechnics and colleges: units are hostel rooms, block = hall
  university: {
    site: 'Campus', sites: 'Campuses',
    member: 'Student', members: 'Students & staff',
    unit: 'Room', units: 'Hostel rooms',
    family: 'Parent / guardian', familyPlural: 'Parents & guardians', household: 'Family',
    manager: 'Administrator', dues: 'Hostel & fees',
    idLabel: 'Matric / staff no.', classLabel: 'Department & level', idCheck: 'ID check',
    block: 'Hall',
  },
  hotel: {
    site: 'Property', sites: 'Properties',
    member: 'Guest', members: 'Guests',
    unit: 'Room', units: 'Rooms',
    family: 'Companion', familyPlural: 'Companions', household: 'Party',
    manager: 'Front desk', dues: 'Bills',
    idLabel: 'Staff ID', classLabel: 'Team', idCheck: 'Staff check',
  },
  industrial: {
    site: 'Site', sites: 'Sites',
    member: 'Employee', members: 'Employees',
    unit: 'Department', units: 'Departments',
    family: 'Dependant', familyPlural: 'Dependants', household: 'Team',
    manager: 'Facility manager', dues: 'Charges',
    idLabel: 'Staff ID', classLabel: 'Team', idCheck: 'Staff check',
  },
  hospital: {
    site: 'Hospital', sites: 'Hospitals',
    member: 'Patient / staff', members: 'Patients & staff',
    unit: 'Ward', units: 'Wards',
    family: 'Next of kin', familyPlural: 'Next of kin', household: 'Next of kin',
    manager: 'Administrator', dues: 'Bills',
    idLabel: 'Staff / patient no.', classLabel: 'Department', idCheck: 'Staff check',
  },
};

export const MODULES = {
  payments:    { label: 'Payments & dues',   description: 'Bills, dues and online payment' },
  marketplace: { label: 'Marketplace',       description: 'Members buy and sell to each other' },
  community:   { label: 'Community lounge',  description: 'Lounge, posts, polls, podcasts, DJ and the courtroom' },
  events:      { label: 'Events',            description: 'Event board and RSVPs' },
  neighbours:  { label: 'Directory & calls', description: 'Members call and buzz each other' },
  household:   { label: 'Family / household', description: 'Members add family with limited access' },
  gatelog:     { label: 'Deliveries & vehicles', description: 'Guards log deliveries and vehicles in and out' },
  shifts:      { label: 'Staff shifts',      description: 'Shift hours that guards can check at the gate' },
  stays:       { label: 'Guest stays',       description: 'Check-in / check-out dates; access ends at check-out' },
  visiting:    { label: 'Visiting hours',    description: 'Guards are warned when visitors arrive outside visiting hours' },
};

const ALL_ON = { payments: true, marketplace: true, community: true, events: true, neighbours: true, household: true };
export const DEFAULT_MODULES = {
  estate:     { ...ALL_ON, gatelog: false, shifts: false, stays: false, visiting: false },
  school:     { ...ALL_ON, marketplace: false, neighbours: false, gatelog: true, shifts: true, stays: false, visiting: false },
  university: { ...ALL_ON, household: false, gatelog: true, shifts: true, stays: false, visiting: true },
  hotel:      { ...ALL_ON, payments: false, marketplace: false, community: false, neighbours: false, gatelog: true, shifts: true, stays: true, visiting: false },
  industrial: { ...ALL_ON, payments: false, marketplace: false, household: false, gatelog: true, shifts: true, stays: false, visiting: false },
  hospital:   { ...ALL_ON, payments: false, marketplace: false, community: false, events: false, neighbours: false, gatelog: true, shifts: true, stays: false, visiting: true },
};

export const CATEGORY_INFO = {
  guest:         { label: 'Visitor' },
  pickup:        { label: 'Authorised pickup', fields: ['studentName', 'studentClass'] },
  contractor:    { label: 'Contractor',        fields: ['company', 'job', 'vehiclePlate'], induction: true },
  supplier:      { label: 'Supplier',          fields: ['company', 'goods', 'vehiclePlate'], induction: true },
  delivery:      { label: 'Delivery',          fields: ['company', 'goods', 'vehiclePlate'] },
  patient_visit: { label: 'Patient visit',     fields: ['patientName', 'ward'] },
};
export const PASS_CATEGORIES = {
  estate:     ['guest', 'delivery', 'contractor'],
  school:     ['guest', 'pickup', 'contractor', 'supplier'],
  university: ['guest', 'delivery', 'contractor', 'supplier'],
  hotel:      ['guest', 'delivery'],
  industrial: ['guest', 'contractor', 'supplier', 'delivery'],
  hospital:   ['guest', 'patient_visit', 'contractor', 'supplier', 'delivery'],
};

// Colour + label for each pass category badge
export const CATEGORY_STYLE = {
  guest:         { color: '#6366F1', bg: '#EEF2FF' },
  pickup:        { color: '#0EA5E9', bg: '#F0F9FF' },
  contractor:    { color: '#F59E0B', bg: '#FFFBEB' },
  supplier:      { color: '#14B8A6', bg: '#F0FDFA' },
  delivery:      { color: '#8B5CF6', bg: '#F5F3FF' },
  patient_visit: { color: '#EC4899', bg: '#FDF2F8' },
};

// Labels for visitor.details keys
export const DETAIL_LABELS = {
  studentName: 'Student', studentClass: 'Class', company: 'Company', job: 'Job',
  goods: 'Goods', vehiclePlate: 'Vehicle plate', patientName: 'Patient', ward: 'Ward',
};

// Cards on the site-type picker (Settings, Register, add-estate)
export const TYPE_INFO = {
  estate:     { label: 'Estate',            Icon: Building2,     color: '#10B981', description: 'Residential estates and gated communities' },
  school:     { label: 'School (primary & secondary)', short: 'School', Icon: School,        color: '#0EA5E9', description: 'Students, staff, parents and authorised pickups' },
  university: { label: 'University / polytechnic', short: 'University', Icon: GraduationCap, color: '#7C3AED', description: 'Halls & hostel rooms, matric ID checks and hostel visiting hours' },
  hotel:      { label: 'Hotel',             Icon: BedDouble,     color: '#F59E0B', description: 'Guests with check-in / check-out and a room board' },
  industrial: { label: 'Industrial / office', short: 'Industrial', Icon: Factory,       color: '#64748B', description: 'Employees, contractors, deliveries and shifts' },
  hospital:   { label: 'Hospital',          Icon: Stethoscope,   color: '#EC4899', description: 'Patients, staff and visiting hours' },
};

export const normType = (t) => (SITE_TYPES.includes(t) ? t : 'estate');

// Fallback config for a type (before /api/site answers)
export function fallbackSite(type) {
  const t = normType(type);
  return {
    type: t,
    terms: TERMS[t],
    modules: { ...DEFAULT_MODULES[t] },
    passCategories: PASS_CATEGORIES[t].map(k => ({ key: k, ...CATEGORY_INFO[k] })),
    relationships: null,
    inductionText: '',
    visitingHours: { start: '10:00', end: '20:00', maxPerPatient: 0 },
    catalog: null,
    overrides: {},
  };
}

// Stay state from dates (mirrors server utils/stays stayState)
export function stayStateOf(stay, now = new Date()) {
  if (!stay || (!stay.checkIn && !stay.checkOut)) return 'none';
  if (stay.status === 'checked_out') return 'checked_out';
  if (stay.checkOut && new Date(stay.checkOut) <= now) return 'checked_out';
  if (stay.checkIn && new Date(stay.checkIn) > now) return 'upcoming';
  return 'in_house';
}

export const STAY_STATE = {
  upcoming:    { label: 'Upcoming',    color: '#0EA5E9', bg: '#F0F9FF' },
  in_house:    { label: 'In house',    color: '#10B981', bg: '#ECFDF5' },
  checked_out: { label: 'Checked out', color: '#64748B', bg: '#F1F5F9' },
};

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Is a nav item's module on? An array means "any of these"; no module = always.
export const moduleVisible = (module, on) => !module || (Array.isArray(module) ? module.some(on) : on(module));

// Word for a unit's block ("Hall" for universities, "Block" elsewhere)
export const blockWord = (terms) => terms?.block || 'Block';

// "Block A" for estates; "Moremi Hall" for universities (no double "Hall Hall")
export function blockName(block, terms) {
  if (!block) return '';
  const w = terms?.block;
  if (!w) return `Block ${block}`;
  return new RegExp(`\\b${w}\\b`, 'i').test(block) ? block : `${block} ${w}`;
}
