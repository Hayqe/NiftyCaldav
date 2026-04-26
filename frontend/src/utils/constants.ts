import type { CalendarView } from '@/types';

export const CALENDAR_VIEWS: { id: CalendarView; label: string; icon: string }[] = [
  { id: 'day', label: 'Dag', icon: 'CalendarDays' },
  { id: 'week', label: 'Week', icon: 'CalendarWeek' },
  { id: 'month', label: 'Maand', icon: 'Calendar' },
  { id: 'list', label: 'Lijst', icon: 'List' },
];

export const CALENDAR_COLORS = [
  { value: 'blue', label: 'Blauw', hex: '#3b82f6' },
  { value: 'red', label: 'Rood', hex: '#ef4444' },
  { value: 'green', label: 'Groen', hex: '#10b981' },
  { value: 'purple', label: 'Paars', hex: '#8b5cf6' },
  { value: 'orange', label: 'Oranje', hex: '#f97316' },
  { value: 'yellow', label: 'Geel', hex: '#eab308' },
  { value: 'pink', label: 'Roze', hex: '#ec4899' },
  { value: 'indigo', label: 'Indigo', hex: '#6366f1' },
  { value: 'teal', label: 'Turquoise', hex: '#14b8a6' },
  { value: 'gray', label: 'Grijs', hex: '#6b7280' },
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
