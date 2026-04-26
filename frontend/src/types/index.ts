// User Types
export interface User {
  id: number;
  username: string;
  role: 'admin' | 'user';
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  user_id: number;
  calendar_colors: string;
  notifications_enabled: boolean;
  timezone: string;
  language: string;
}

// Calendar Types
export interface Calendar {
  id: number;
  name: string;
  description: string | null;
  owner_id: number;
  owner?: User;
  color?: string;
  created_at: string;
  updated_at: string;
}

export interface CalendarShare {
  calendar_id: number;
  user_id: number;
  permission: 'read' | 'write' | 'admin';
  created_at: string;
  calendar?: Calendar;
  user?: User;
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
  created_at: string;
  updated_at: string;
  calendar?: Calendar;
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
