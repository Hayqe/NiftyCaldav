import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { LoginCredentials, User, Calendar, Event, CalendarShare, UserSettings, ApiResponse, PaginatedResponse } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Create axios instance with base configuration
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
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
  login: (credentials: LoginCredentials): Promise<ApiResponse<{ access_token: string; token_type: string }>> => {
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
    return Promise.reject(new Error('Not authenticated'));
  },

  changePassword: (_data: { current_password: string; new_password: string }): Promise<ApiResponse<null>> => {
    return Promise.reject(new Error('Not implemented'));
  },
};

// ==================== USERS ====================
export const usersApi = {
  getAll: (page: number = 1, perPage: number = 20): Promise<PaginatedResponse<User>> =>
    api.get('/users/', { params: { page, per_page: perPage } }),
  
  getById: (id: number): Promise<ApiResponse<User>> =>
    api.get(`/users/${id}`),
  
  create: (user: Omit<User, 'id' | 'created_at' | 'updated_at'> & { password: string }): Promise<ApiResponse<User>> =>
    api.post('/users/', user),
  
  update: (id: number, user: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>): Promise<ApiResponse<User>> =>
    api.put(`/users/${id}`, user),
  
  delete: (id: number): Promise<ApiResponse<null>> =>
    api.delete(`/users/${id}`),
};

// ==================== CALENDARS ====================
export const calendarsApi = {
  getAll: (): Promise<ApiResponse<Calendar[]>> =>
    api.get('/calendars/'),
  
  getById: (id: number): Promise<ApiResponse<Calendar>> =>
    api.get(`/calendars/${id}`),
  
  getMyCalendars: (): Promise<ApiResponse<Calendar[]>> =>
    api.get('/calendars/'),
  
  getSharedCalendars: (): Promise<ApiResponse<Calendar[]>> =>
    Promise.resolve({ data: [], message: 'Shared calendars' }),
  
  create: (calendar: Omit<Calendar, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Calendar>> =>
    api.post('/calendars/', calendar),
  
  update: (id: number, data: Partial<Omit<Calendar, 'id' | 'created_at' | 'updated_at'>>): Promise<ApiResponse<Calendar>> =>
    api.put(`/calendars/${id}`, data),
  
  delete: (id: number): Promise<ApiResponse<null>> =>
    api.delete(`/calendars/${id}`),
};

// ==================== CALENDAR SHARES ====================
export const sharesApi = {
  getCalendarShares: (calendarId: number): Promise<ApiResponse<CalendarShare[]>> =>
    api.get(`/calendars/${calendarId}/shares/`),
  
  addShare: (calendarId: number, data: { user_id: number; permission: 'read' | 'write' | 'admin' }): Promise<ApiResponse<CalendarShare>> =>
    api.post(`/calendars/${calendarId}/shares/`, data),
  
  updateShare: (calendarId: number, userId: number, data: { permission: 'read' | 'write' | 'admin' }): Promise<ApiResponse<CalendarShare>> =>
    api.put(`/calendars/${calendarId}/shares/${userId}/`, data),
  
  removeShare: (calendarId: number, userId: number): Promise<ApiResponse<null>> =>
    api.delete(`/calendars/${calendarId}/shares/${userId}/`),
};

// ==================== EVENTS ====================
export const eventsApi = {
  // Backend uses /events/ with calendar_id as query parameter
  getAll: (calendarId: number, start: string, end: string): Promise<ApiResponse<Event[]>> =>
    api.get('/events/', { params: { calendar_id: calendarId, start, end } }),
  
  getById: (calendarId: number, eventId: string): Promise<ApiResponse<Event>> =>
    api.get(`/events/${eventId}/`, { params: { calendar_id: calendarId } }),
  
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
    if (event.description !== undefined) backendEvent.description = event.description;
    if (event.start !== undefined) backendEvent.start = event.start;
    if (event.end !== undefined) backendEvent.end = event.end;
    if (event.location !== undefined) backendEvent.location = event.location;
    return api.put(`/events/${eventId}/`, backendEvent, { params: { calendar_id: calendarId } });
  },
  
  delete: (calendarId: number, eventId: string): Promise<ApiResponse<null>> =>
    api.delete(`/events/${eventId}/`, { params: { calendar_id: calendarId } }),
  
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
    return api.post(`/calendars/${calendarId}/ics-import/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
