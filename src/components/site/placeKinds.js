// Kinds of places on the site map — icon, colour and wording per site type.
import {
  Hotel, Building, Landmark, DoorOpen, Cross, BookOpen, Dumbbell, CircleParking, ShieldCheck, Church, Utensils, Briefcase, MapPin,
} from 'lucide-react';

export const PLACE_KINDS = ['hall', 'building', 'faculty', 'gate', 'clinic', 'library', 'sports', 'parking', 'security', 'chapel', 'food', 'office', 'other'];

export const KIND_INFO = {
  hall:     { label: 'Hall / hostel', Icon: Hotel,         color: '#7C3AED' },
  building: { label: 'Building',      Icon: Building,      color: '#0EA5E9' },
  faculty:  { label: 'Faculty',       Icon: Landmark,      color: '#6366F1' },
  gate:     { label: 'Gate',          Icon: DoorOpen,      color: '#F59E0B' },
  clinic:   { label: 'Clinic',        Icon: Cross,         color: '#EF4444' },
  library:  { label: 'Library',       Icon: BookOpen,      color: '#14B8A6' },
  sports:   { label: 'Sports',        Icon: Dumbbell,      color: '#22C55E' },
  parking:  { label: 'Parking',       Icon: CircleParking, color: '#64748B' },
  security: { label: 'Security post', Icon: ShieldCheck,   color: '#0F766E' },
  chapel:   { label: 'Chapel / mosque', Icon: Church,      color: '#A855F7' },
  food:     { label: 'Food',          Icon: Utensils,      color: '#F97316' },
  office:   { label: 'Office',        Icon: Briefcase,     color: '#3B82F6' },
  other:    { label: 'Other',         Icon: MapPin,        color: '#EC4899' },
};

// "Hall / hostel" for universities, "Block of flats" for estates, "Wing" for hotels & hospitals
const HALL_LABEL = { estate: 'Block of flats', school: 'Boarding house', university: 'Hall / hostel', hotel: 'Wing', industrial: 'Block', hospital: 'Wing' };
const FACULTY_LABEL = { school: 'Department', university: 'Faculty', hospital: 'Department', industrial: 'Department', hotel: 'Department', estate: 'Amenity' };

export function kindLabel(kind, type) {
  if (kind === 'hall') return HALL_LABEL[type] || KIND_INFO.hall.label;
  if (kind === 'faculty') return FACULTY_LABEL[type] || KIND_INFO.faculty.label;
  return (KIND_INFO[kind] || KIND_INFO.other).label;
}
