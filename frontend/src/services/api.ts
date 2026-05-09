import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { LoginCredentials, User, Calendar, Event, CalendarShare, UserSettings, ApiResponse, PaginatedResponse, CreateSharedCalendarResult } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Create axios instance with base configuration
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 300 seconds (5 minutes)
  headers: {
    'Content-Type': 'application/json',
  },
  auth: undefined,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ==================== AUTH ====================
export const authApi = {
  login: (credentials: LoginCredentials): Promise<ApiResponse<{ access_token: string; token_type: string; must_change_password: boolean }>> => {
    return api.post('/auth/login', {}, {
      auth: {
        username: credentials.username,
        password: credentials.password,
      },
    });
  },
  
  logout: (): Promise<ApiResponse<null>> => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return Promise.resolve({ data: null, message: 'Logged out' });
  },
  
  getMe: (): Promise<ApiResponse<User>> => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr) as User;
        return Promise.resolve({ data: user, message: 'User from cache' });
      } catch {
        return Promise.reject(new Error('No user data'));
      }
    }
    return api.get('/users/me').then(response => {
      return { data: response.data, message: 'User from API' };
    });
  },

  changePassword: (data: { current_password?: string; new_password: string }): Promise<ApiResponse<{ message: string; must_change_password: boolean }>> => {
    return api.post('/users/me/change-password', data);
  },
};

// ==================== USERS ====================
export interface UserWithOTP extends User {
  one_time_password?: string;
}

export interface PasswordChangeResponse {
  message: string;
  must_change_password: boolean;
}

export const usersApi = {
  // Note: User CRUD operations are no longer supported (users managed via Radicale)
  // Only settings management remains
  
  getAll: (): Promise<ApiResponse<User[]>> => {
    console.warn('User listing via /users/ is deprecated. Use /users/all-simple.');
    return Promise.reject(new Error('Use getAllSimple instead'));
  },
  
  getAllSimple: (): Promise<ApiResponse<string[]>> =>
    api.get('/users/all-simple'),
  
  syncWithRadicale: (): Promise<ApiResponse<{ message: string; deleted_count: number; radicale_users_count: number; user_settings_count: number }>> =>
    api.post('/users/sync'),
  
  getById: (username: string): Promise<ApiResponse<any>> =>
    // Changed from id to username
    api.get(`/users/${username}`),
  
  // User creation is now done via Radicale, not API
  // These endpoints are removed or will return errors:
  create: (user: any): Promise<ApiResponse<User>> => {
    console.warn('User creation via API is deprecated. Create users in Radicale.');
    return Promise.reject(new Error('User creation not supported via API'));
  },
  
  createWithOTP: (username: string, role: string = 'user'): Promise<ApiResponse<UserWithOTP>> => {
    console.warn('User creation with OTP via API is deprecated. Create users in Radicale.');
    return Promise.reject(new Error('User creation not supported via API'));
  },
  
  update: (username: string, user: any): Promise<ApiResponse<any>> => {
    console.warn('User update via API is deprecated.');
    return Promise.reject(new Error('User update not supported via API'));
  },
  
  delete: (username: string): Promise<ApiResponse<null>> => {
    console.warn('User deletion via API is deprecated. Delete users in Radicale.');
    return Promise.reject(new Error('User deletion not supported via API'));
  },
  
  resetPassword: (username: string): Promise<ApiResponse<UserWithOTP>> => {
    console.warn('Password reset via API is deprecated. Reset passwords in Radicale.');
    return Promise.reject(new Error('Password reset not supported via API'));
  },
  
  changeUserPassword: (username: string, data: { new_password: string }): Promise<ApiResponse<PasswordChangeResponse>> =>
    api.post(`/users/${username}/change-password`, data),
  
  // User creation (admin only)
  createUser: (username: string, password?: string): Promise<ApiResponse<{username: string, password: string, otp: boolean, message: string}>> =>
    api.post('/users/', { username, password }),
  
  // Reset user password (admin only)
  resetUserPassword: (username: string): Promise<ApiResponse<{username: string, new_password: string, otp: boolean, message: string}>> =>
    api.post(`/users/${username}/reset-password`),
  
  // Settings management (still supported)
  getSettings: (username: string): Promise<ApiResponse<UserSettings>> =>
    api.get(`/users/${username}/settings`),
  
  updateSettings: (username: string, settings: Partial<UserSettings>): Promise<ApiResponse<UserSettings>> =>
    api.put(`/users/${username}/settings`, settings),
};

// ==================== CALENDARS ====================
export const calendarsApi = {
  getAll: (): Promise<ApiResponse<Calendar[]>> =>
    api.get('/calendars/'),
  
  getById: (id: number): Promise<ApiResponse<Calendar>> =>
    api.get(`/calendars/${id}`),
  
  getMyCalendars: (): Promise<ApiResponse<Calendar[]>> =>
    api.get('/calendars/'),
  
  // Get shared calendars (new endpoint)
  getSharedCalendars: (): Promise<ApiResponse<any[]>> =>
    api.get('/calendars/shared'),
  
  // Get shared calendars owned by current user
  getMySharedCalendars: (): Promise<ApiResponse<any[]>> =>
    api.get('/calendars/shared/my'),
  
  // Get shared calendar by ID
  getSharedCalendarById: (id: number): Promise<ApiResponse<any>> =>
    api.get(`/calendars/shared/${id}`),
  
  checkWritePermission: (calendarId: number): Promise<ApiResponse<{ has_write_permission: boolean }>> =>
    api.get(`/calendars/${calendarId}/check-write-permission`),
  
  checkReadPermission: (calendarId: number): Promise<ApiResponse<{ has_read_permission: boolean }>> =>
    api.get(`/calendars/${calendarId}/check-read-permission`),
  
  create: (calendar: Omit<Calendar, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Calendar>> =>
    api.post('/calendars/', calendar),
  
  // Create shared calendar (returns shared calendar with generated credentials)
  createShared: (calendar: Omit<Calendar, 'id' | 'created_at' | 'updated_at' | 'generated_username' | 'generated_password' | 'radicale_url' | 'system_username' | 'system_password'>): Promise<ApiResponse<CreateSharedCalendarResult>> =>
    api.post('/calendars/create-shared', calendar),
  
  update: (id: number, data: Partial<Omit<Calendar, 'id' | 'created_at' | 'updated_at'>>): Promise<ApiResponse<Calendar>> =>
    api.put(`/calendars/${id}`, data),
  
  delete: (id: number): Promise<ApiResponse<null>> =>
    api.delete(`/calendars/${id}`),
  
  // Delete shared calendar
  deleteShared: (id: number): Promise<ApiResponse<null>> =>
    api.delete(`/calendars/shared/${id}`),
};

// ==================== CALENDAR SHARES ====================
export const sharesApi = {
  // Note: share endpoints now use username (string) instead of user_id (number)
  
  getCalendarShares: (calendarId: number): Promise<ApiResponse<CalendarShare[]>> =>
    api.get(`/calendars/shared/${calendarId}/shares`),
  
  addShare: (calendarId: number, data: { user: string; rights: 'RW' | 'RO' }): Promise<ApiResponse<CalendarShare>> =>
    api.post(`/calendars/shared/${calendarId}/shares`, data),
  
  updateShare: (calendarId: number, username: string, data: { rights: 'RW' | 'RO' }): Promise<ApiResponse<CalendarShare>> =>
    api.put(`/calendars/shared/${calendarId}/shares/${username}`, data),
  
  removeShare: (calendarId: number, username: string): Promise<ApiResponse<null>> =>
    api.delete(`/calendars/shared/${calendarId}/shares/${username}`),
};

// ==================== EVENTS ====================
export const eventsApi = {
  // Backend uses /events/ with calendar_id as query parameter
  getAll: (calendarId: number, start: string, end: string): Promise<ApiResponse<Event[]>> =>
    api.get('/events/', { params: { calendar_id: calendarId, start, end } }),
  
  getById: (calendarId: number, eventId: string): Promise<ApiResponse<Event>> =>
    api.get('/events/get', { params: { calendar_id: calendarId, event_id: eventId } }),
  
  create: (calendarId: number, event: Omit<Event, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Event>> => {
    // Map frontend Event type (with title) to backend EventCreate schema (with summary)
    const backendEvent = {
      summary: event.title,
      description: event.description,
      start: event.start,
      end: event.end,
      location: event.location,
    };
    return api.post('/events/', backendEvent, { params: { calendar_id: calendarId } });
  },
  
  update: (calendarId: number, eventId: string, event: Partial<Omit<Event, 'id' | 'created_at' | 'updated_at'>>): Promise<ApiResponse<Event>> => {
    // Map frontend Event type (with title) to backend EventUpdate schema (with summary)
    const backendEvent: Record<string, any> = {};
    if (event.title !== undefined) backendEvent.summary = event.title;
    if (event.start !== undefined) backendEvent.start = event.start;
    if (event.end !== undefined) backendEvent.end = event.end;
    if (event.description !== undefined) backendEvent.description = event.description;
    if (event.location !== undefined) backendEvent.location = event.location;
    return api.put('/events/update', backendEvent, { params: { calendar_id: calendarId, event_id: eventId } });
  },
  
  delete: (calendarId: number, eventId: string): Promise<ApiResponse<null>> =>
    api.delete('/events/delete', { params: { calendar_id: calendarId, event_id: eventId } }),
  
  // Get events for date range across all calendars
  getEventsForDateRange: (start: string, end: string): Promise<ApiResponse<Event[]>> =>
    api.get('/events/', { params: { start, end } }),
};

// ==================== SETTINGS ====================
export const settingsApi = {
  get: (): Promise<ApiResponse<UserSettings>> =>
    api.get('/settings/'),
  
  update: (settings: Partial<UserSettings>): Promise<ApiResponse<UserSettings>> =>
    api.put('/settings/', settings),
};

// ==================== ICS IMPORT ====================
export const icsApi = {
  import: (calendarId: number, file: File): Promise<ApiResponse<{ imported: number; errors: number }>> => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/ics/import', formData, {
      params: { calendar_id: calendarId },
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
