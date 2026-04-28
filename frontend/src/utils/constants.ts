import type { CalendarView } from '@/types';

export const CALENDAR_VIEWS: { id: CalendarView; label: string; icon: string }[] = [
  { id: 'day', label: 'Dag', icon: 'CalendarDays' },
  { id: 'week', label: 'Week', icon: 'CalendarWeek' },
  { id: 'month', label: 'Maand', icon: 'Calendar' },
  { id: 'list', label: 'Lijst', icon: 'List' },
];

export const CALENDAR_COLORS = [
  { value: 'orange', label: 'Oranje', hex: '#c26321' },
  { value: 'rust', label: 'Roest', hex: '#a3501a' },
  { value: 'brown', label: 'Bruin', hex: '#854215' },
  { value: 'sand', label: 'Zand', hex: '#d6d3d1' },
  { value: 'sage', label: 'Salie', hex: '#84a98c' },
  { value: 'muted-blue', label: 'Gedempt Blauw', hex: '#6b9ac4' },
  { value: 'slate', label: 'Leisteen', hex: '#52796f' },
  { value: 'deep-purple', label: 'Diep Paars', hex: '#4a4e69' },
  { value: 'charcoal', label: 'Antraciet', hex: '#22223b' },
  { value: 'warm-gray', label: 'Warm Grijs', hex: '#a4ac86' },
];

export const PERMISSION_OPTIONS = [
  { value: 'read', label: 'Alleen lezen' },
  { value: 'write', label: 'Lezen & schrijven' },
  { value: 'admin', label: 'Beheerder' },
];

export const WEEKDAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

export const MONTHS = [
  'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
  'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'
];

export const TIMEZONES = [
  { value: 'Europe/Amsterdam', label: 'Amsterdam (CET/CEST)' },
  { value: 'Europe/Brussels', label: 'Brussel (CET/CEST)' },
  { value: 'UTC', label: 'UTC' },
];

export const LANGUAGES = [
  { value: 'nl', label: 'Nederlands' },
  { value: 'en', label: 'English' },
];
