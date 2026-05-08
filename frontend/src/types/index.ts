// User Types
// Note: User no longer has id field since users are managed via Radicale
export interface User {
  username: string;
  role: 'admin' | 'user';
  must_change_password?: boolean;
}

export interface UserSettings {
  radicale_username?: string;  // Primary key: Radicale username
  calendar_colors?: string;
  notifications_enabled?: boolean;
  timezone?: string;
  language?: string;
  default_view: string;
  highlight_weekend: boolean;
  weekend_color: string;
  default_duration?: number;
  default_calendar?: string | null;
  show_week_numbers?: boolean;
  otp?: boolean;  // One-time password flag
}

// Calendar Types
export interface Calendar {
  id: number;
  name: string;
  description?: string | null;
  owner_username?: string;  // Owner's Radicale username (not ID)
  color?: string;
  url?: string;
  // Fields for shared calendars
  generated_username?: string;
  generated_password?: string;
  radicale_url?: string;
  is_shared?: boolean;
  is_owner?: boolean;
  permission?: 'read' | 'write' | 'admin' | 'RW' | 'RO';
}

export interface CalendarShare {
  id?: number;
  shared_calendar_id?: number;
  user: string;  // Changed from user_id to user (Radicale username string)
  rights: 'RW' | 'RO';  // Changed from permission to rights
  created_at?: string;
}

export interface CalendarWithShares extends Calendar {
  shares?: CalendarShare[];
}

export interface CreateSharedCalendarResult extends Calendar {
  generated_username: string;
  generated_password: string;
  radicale_url: string;
}

export interface CalendarWithPermission extends Calendar {
  has_write_permission?: boolean;
  has_read_permission?: boolean;
}

// Event Types
export interface Event {
  id: string;
  calendar_id: number;
  title: string;
  description: string | null;
  start: string; // ISO 8601 datetime
  end: string; // ISO 8601 datetime
  all_day: boolean;
  recurring: boolean;
  recurrence_rule: string | null; // RRULE
  location: string | null;
  color: string | null;
  created_at?: string;
  updated_at?: string;
  calendar?: Calendar;
  calendar_name?: string;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Auth Types
export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// View Types
export type CalendarView = 'day' | 'week' | 'month' | 'list';

// ICS Import Types
export interface ICSFile {
  file: File;
  calendar_id: number;
}
