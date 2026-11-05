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
    idLabel: 'ID number', classLabel: 'Group', idCheck: 'Staff check', stayIn: 'Move-in', stayOut: 'Move-out',
  },
  school: {
    site: 'Campus', sites: 'Campuses',
    member: 'Student', members: 'Students & staff',
    unit: 'Class', units: 'Classes',
    family: 'Parent / guardian', familyPlural: 'Parents & guardians', household: 'Family',
    manager: 'Administrator', dues: 'School fees',
    idLabel: 'Admission / staff no.', classLabel: 'Class', idCheck: 'Staff check', stayIn: 'Term start', stayOut: 'Term end',
  },
  // Universities, polytechnics and colleges: units are hostel rooms, block = hall
  university: {
    site: 'Campus', sites: 'Campuses',
    member: 'Student', members: 'Students & staff',
    unit: 'Room', units: 'Hostel rooms',
    family: 'Parent / guardian', familyPlural: 'Parents & guardians', household: 'Family',
    manager: 'Administrator', dues: 'Hostel & fees',
    idLabel: 'Matric / staff no.', classLabel: 'Department & level', idCheck: 'ID check', stayIn: 'Session start', stayOut: 'Session end',
    block: 'Hall',
  },
  hotel: {
    site: 'Property', sites: 'Properties',
    member: 'Guest', members: 'Guests',
    unit: 'Room', units: 'Rooms',
    family: 'Companion', familyPlural: 'Companions', household: 'Party',
    manager: 'Front desk', dues: 'Bills',
    idLabel: 'Staff ID', classLabel: 'Team', idCheck: 'Staff check', stayIn: 'Check-in', stayOut: 'Check-out',
  },
  industrial: {
    site: 'Site', sites: 'Sites',
    member: 'Employee', members: 'Employees',
    unit: 'Department', units: 'Departments',
    family: 'Dependant', familyPlural: 'Dependants', household: 'Team',
    manager: 'Facility manager', dues: 'Charges',
    idLabel: 'Staff ID', classLabel: 'Team', idCheck: 'Staff check', stayIn: 'Start date', stayOut: 'End date',
  },
  hospital: {
    site: 'Hospital', sites: 'Hospitals',
    member: 'Patient or staff member', members: 'Patients & staff',
    unit: 'Ward', units: 'Wards',
    family: 'Next of kin', familyPlural: 'Next of kin', household: 'Next of kin',
    manager: 'Administrator', dues: 'Bills',
    idLabel: 'Staff / patient no.', classLabel: 'Department', idCheck: 'Staff check', stayIn: 'Admission', stayOut: 'Discharge',
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
  requests:    { label: 'Requests',          description: 'Members send requests (housekeeping, call a nurse, repairs, incident reports) to the right staff' },
  rollcall:    { label: 'Emergency roll-call', description: 'Start a roll-call in an evacuation and see who is safe and who is missing' },
};

const ALL_ON = { payments: true, marketplace: true, community: true, events: true, neighbours: true, household: true };
export const DEFAULT_MODULES = {
  estate:     { ...ALL_ON, gatelog: false, shifts: false, stays: false, visiting: false, requests: false, rollcall: false },
  school:     { ...ALL_ON, marketplace: false, neighbours: false, gatelog: false, shifts: true, stays: false, visiting: false, requests: true, rollcall: true },
  university: { ...ALL_ON, household: false, gatelog: false, shifts: true, stays: false, visiting: true, requests: true, rollcall: true },
  hotel:      { ...ALL_ON, payments: false, marketplace: false, community: false, neighbours: false, gatelog: false, shifts: true, stays: true, visiting: false, requests: true, rollcall: true },
  industrial: { ...ALL_ON, payments: false, marketplace: false, household: false, gatelog: true, shifts: true, stays: false, visiting: false, requests: true, rollcall: true },
  hospital:   { ...ALL_ON, payments: false, marketplace: false, community: false, events: false, neighbours: false, gatelog: false, shifts: true, stays: true, visiting: true, requests: true, rollcall: true },
};

// Roles inside a site — client copy of server/utils/siteRoles.js (fallback
// until GET /api/site answers with roles / defaultRole / assignLabel /
// requestKinds). Flags: staff, responds (alert types), scoped (same unit or
// block), onCall, assignable, specialty, rollcall.
const R = (key, label, plural, extra = {}) => ({ key, label, plural, staff: false, responds: [], scoped: false, onCall: false, assignable: false, specialty: false, rollcall: false, ...extra });
const ALL_ALERTS = ['medical', 'security', 'fire', 'other'];

export const ROLES = {
  estate: [R('resident', 'Resident', 'Residents')],
  hospital: [
    R('patient', 'Patient', 'Patients'),
    R('doctor', 'Doctor', 'Doctors', { staff: true, responds: ['medical'], onCall: true, assignable: true, specialty: true }),
    R('nurse', 'Nurse', 'Nurses', { staff: true, responds: ['medical'], scoped: true, onCall: true, assignable: true }),
    R('staff', 'Hospital staff', 'Hospital staff', { staff: true, rollcall: true }),
  ],
  university: [
    R('student', 'Student', 'Students'),
    R('lecturer', 'Lecturer', 'Lecturers', { staff: true, assignable: true, specialty: true }),
    R('warden', 'Hall warden / porter', 'Hall wardens & porters', { staff: true, responds: ALL_ALERTS, scoped: true, assignable: true, rollcall: true }),
    R('clinic', 'Clinic staff', 'Clinic staff', { staff: true, responds: ['medical'], onCall: true }),
    R('staff', 'University staff', 'University staff', { staff: true, rollcall: true }),
  ],
  school: [
    R('student', 'Student', 'Students'),
    R('teacher', 'Teacher', 'Teachers', { staff: true, responds: ['medical', 'security', 'other'], scoped: true, assignable: true, specialty: true, rollcall: true }),
    R('nurse', 'School nurse', 'School nurses', { staff: true, responds: ['medical'], onCall: true }),
    R('staff', 'School staff', 'School staff', { staff: true, rollcall: true }),
  ],
  hotel: [
    R('guest', 'Guest', 'Guests'),
    R('front_desk', 'Front desk', 'Front desk', { staff: true, responds: ['security', 'other'] }),
    R('housekeeping', 'Housekeeping', 'Housekeeping', { staff: true }),
    R('maintenance', 'Maintenance', 'Maintenance', { staff: true }),
    R('duty_manager', 'Duty manager', 'Duty managers', { staff: true, responds: ALL_ALERTS, onCall: true, rollcall: true }),
  ],
  industrial: [
    R('employee', 'Employee', 'Employees'),
    R('supervisor', 'Supervisor', 'Supervisors', { staff: true, responds: ALL_ALERTS, scoped: true, assignable: true, rollcall: true }),
    R('safety_officer', 'Safety officer', 'Safety officers', { staff: true, responds: ALL_ALERTS, onCall: true, rollcall: true }),
    R('first_aider', 'First aider', 'First aiders', { staff: true, responds: ['medical'], onCall: true }),
  ],
};

// What the onboarding form asks for each role (the apps render it):
//   unit        — label of the unit picker ('' = no unit needed)
//   stay        — ask for stay / admission dates
//   id / group  — labels for memberProfile.idNumber / className ('' = hide)
//   specialty   — label for roleInfo.specialty ('' = hide)
//   shift, onCall, assign (assigned staff), kin (next of kin / parent / companion)
//   emailOptional — can be added without an app login (e.g. a patient whose
//                   next of kin uses the app; a young pupil whose parents do)
const F = (o) => ({ unit: '', stay: false, id: '', group: '', specialty: '', shift: false, onCall: false, assign: false, kin: false, kinLabel: '', emailOptional: false, ...o });
export const FORMS = {
  estate:     { resident: F({ unit: 'Apartment', kin: true, kinLabel: 'Family member' }) },
  hospital: {
    patient: F({ unit: 'Ward & bed', stay: true, id: 'Patient / hospital no.', assign: true, kin: true, kinLabel: 'Next of kin', emailOptional: true }),
    doctor:  F({ unit: 'Ward or department they work in', id: 'Staff ID', specialty: 'Specialty', shift: true, onCall: true }),
    nurse:   F({ unit: 'Ward they work in', id: 'Staff ID', shift: true, onCall: true }),
    staff:   F({ unit: 'Department', id: 'Staff ID', specialty: 'Job title', shift: true }),
  },
  university: {
    student:  F({ unit: 'Hall & room', stay: true, id: 'Matric number', group: 'Department & level', assign: true, kin: true, kinLabel: 'Parent / guardian' }),
    lecturer: F({ unit: 'Department / office', id: 'Staff ID', specialty: 'Department / course' }),
    warden:   F({ unit: 'Hall they cover', id: 'Staff ID', shift: true }),
    clinic:   F({ unit: 'Clinic', id: 'Staff ID', specialty: 'Role (doctor, nurse…)', shift: true, onCall: true }),
    staff:    F({ unit: 'Office', id: 'Staff ID', specialty: 'Job title', shift: true }),
  },
  school: {
    student: F({ unit: 'Class', id: 'Admission number', group: 'Arm / house', assign: true, kin: true, kinLabel: 'Parent / guardian', emailOptional: true }),
    teacher: F({ unit: 'Class they teach (form class)', id: 'Staff ID', specialty: 'Subject' }),
    nurse:   F({ unit: 'Sick bay', id: 'Staff ID', shift: true, onCall: true }),
    staff:   F({ unit: 'Office', id: 'Staff ID', specialty: 'Job title', shift: true }),
  },
  hotel: {
    guest:        F({ unit: 'Room', stay: true, kin: true, kinLabel: 'Companion' }),
    front_desk:   F({ unit: 'Desk / post', id: 'Staff ID', shift: true }),
    housekeeping: F({ unit: 'Floor / section', id: 'Staff ID', shift: true }),
    maintenance:  F({ unit: 'Workshop', id: 'Staff ID', specialty: 'Trade (electrical, plumbing…)', shift: true }),
    duty_manager: F({ unit: 'Office', id: 'Staff ID', shift: true, onCall: true }),
  },
  industrial: {
    employee:       F({ unit: 'Department', id: 'Staff ID', specialty: 'Job title', shift: true, assign: true }),
    supervisor:     F({ unit: 'Department they supervise', id: 'Staff ID', shift: true }),
    safety_officer: F({ unit: 'Office', id: 'Staff ID', shift: true, onCall: true }),
    first_aider:    F({ unit: 'Department', id: 'Staff ID', shift: true, onCall: true }),
  },
};

// What a member's assigned people are called
export const ASSIGN_LABEL = {
  estate: '', hospital: 'Care team', university: 'Adviser & warden', school: 'Class teacher',
  hotel: '', industrial: 'Supervisor',
};

// Requests members can send, per type, and which roles receive them
export const REQUEST_KINDS = {
  estate: [],
  hospital: [
    { key: 'call_nurse',  label: 'Call a nurse',        roles: ['nurse'],  urgent: true },
    { key: 'call_doctor', label: 'Call a doctor',       roles: ['doctor'], urgent: true },
    { key: 'assistance',  label: 'Help with something', roles: ['nurse'] },
    { key: 'meal',        label: 'Food & drink',        roles: ['staff'] },
    { key: 'management',  label: 'Hospital management', roles: [], managers: true },
    { key: 'other',       label: 'Something else',      roles: ['staff', 'nurse'] },
  ],
  university: [
    { key: 'hostel_repair', label: 'Hostel repair',       roles: ['warden'] },
    { key: 'clinic',        label: 'See the clinic',      roles: ['clinic'] },
    { key: 'other',         label: 'Ask the hall office', roles: ['warden'] },
    { key: 'management',    label: 'Student affairs',     roles: [], managers: true },
  ],
  school: [
    { key: 'sick_bay',   label: 'Sick bay',            roles: ['nurse'], urgent: true },
    { key: 'teacher',    label: 'Message the teacher', roles: ['teacher'] },
    { key: 'other',      label: 'School office',       roles: ['staff'] },
    { key: 'management', label: 'School management',   roles: [], managers: true },
  ],
  hotel: [
    { key: 'housekeeping', label: 'Housekeeping',     roles: ['housekeeping'] },
    { key: 'maintenance',  label: 'Repairs',          roles: ['maintenance'] },
    { key: 'room_service', label: 'Room service',     roles: ['front_desk'] },
    { key: 'concierge',    label: 'Concierge',        roles: ['front_desk'] },
    { key: 'other',        label: 'Something else',   roles: ['front_desk', 'duty_manager'] },
    { key: 'management',   label: 'Hotel management', roles: [], managers: true },
  ],
  industrial: [
    { key: 'incident',   label: 'Report an injury or incident', roles: ['supervisor', 'safety_officer', 'first_aider'], urgent: true },
    { key: 'hazard',     label: 'Report a hazard',               roles: ['safety_officer', 'supervisor'] },
    { key: 'equipment',  label: 'Equipment fault',               roles: ['supervisor'] },
    { key: 'management', label: 'Site management',               roles: [], managers: true },
  ],
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
    roles: ROLES[t].map(r => ({ ...r, form: (FORMS[t] || {})[r.key] || F({ unit: 'Unit' }) })),
    defaultRole: ROLES[t][0].key,
    assignLabel: ASSIGN_LABEL[t] || '',
    requestKinds: REQUEST_KINDS[t] || [],
  };
}

// A role definition from a site's roles; unknown / unset → the default role
export function roleOf(roles, key) {
  const list = roles && roles.length ? roles : ROLES.estate;
  return list.find(r => r.key === key) || list[0];
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

// Grammar helpers for site terms in sentences
// lower('Hostel rooms') → 'hostel rooms' (mid-sentence use)
export const lower = (s = '') => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');
// an('Ward') → 'a', an('Apartment') → 'an'
export const an = (s = '') => (/^[aeiou]/i.test(s) ? 'an' : 'a');
// withAn('ward') → 'a ward'
export const withAn = (s = '') => `${an(s)} ${s}`;

// Stored unit types (Unit.type) and bill types (PaymentSchedule.type) are
// fixed values; these are their names per site type. Estates keep each
// screen's existing labels (null = use the screen's own label).
export const UNIT_TYPE_LABELS = {
  estate:     null,
  school:     { apartment: 'Classroom',   house: 'Boarding house', shop: 'Tuck shop', office: 'Office' },
  university: { apartment: 'Hostel room', house: 'Self-contained', shop: 'Shop',      office: 'Office' },
  hotel:      { apartment: 'Room',        house: 'Suite',          shop: 'Shop',      office: 'Office' },
  industrial: { apartment: 'Department',  house: 'Staff quarters', shop: 'Store',     office: 'Office' },
  hospital:   { apartment: 'Ward',        house: 'Private room',   shop: 'Pharmacy',  office: 'Office' },
};
export const BILL_TYPE_LABELS = {
  estate:     null,
  school:     { security_dues: 'Security fee', maintenance: 'Maintenance', levy: 'School levy',       contribution: 'PTA contribution', other: 'Other' },
  university: { security_dues: 'Security fee', maintenance: 'Hostel maintenance', levy: 'Departmental levy', contribution: 'Contribution', other: 'Other' },
  hotel:      { security_dues: 'Security fee', maintenance: 'Maintenance', levy: 'Service charge',    contribution: 'Contribution', other: 'Other' },
  industrial: { security_dues: 'Security fee', maintenance: 'Maintenance', levy: 'Levy',              contribution: 'Contribution', other: 'Other' },
  hospital:   { security_dues: 'Security fee', maintenance: 'Maintenance', levy: 'Hospital levy',     contribution: 'Contribution', other: 'Other' },
};
// unitTypeLabel('house', 'hospital', 'House') → 'Private room'; estates get the fallback
export const unitTypeLabel = (value, type, fallback) => UNIT_TYPE_LABELS[type]?.[value] || fallback;
export const billTypeLabel = (value, type, fallback) => BILL_TYPE_LABELS[type]?.[value] || fallback;
