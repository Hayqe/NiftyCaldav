import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { calendarsApi, sharesApi } from '@/services/api';
import type { Calendar, CalendarShare } from '@/types';

// Regular calendars (from Radicale)
export function useMyCalendars() {
  return useQuery({
    queryKey: ['calendars', 'my'],
    queryFn: calendarsApi.getMyCalendars,
    staleTime: 1000,
  });
}

// Shared calendars (from database)
export function useSharedCalendars() {
  return useQuery({
    queryKey: ['calendars', 'shared'],
    queryFn: calendarsApi.getSharedCalendars,
    staleTime: 1000,
  });
}

// Get a specific shared calendar by ID
export function useSharedCalendar(id: number | null) {
  return useQuery({
    queryKey: ['calendars', 'shared', id],
    queryFn: () => calendarsApi.getSharedCalendarById(id!),
    enabled: !!id,
    staleTime: 1000,
  });
}

// Combined: my calendars + shared calendars
export function useAllCalendars() {
  const myCalendars = useMyCalendars();
  const sharedCalendars = useSharedCalendars();
  
  // Combine when both are loaded
  const combined = {
    ...myCalendars,
    data: myCalendars.data && sharedCalendars.data 
      ? [...myCalendars.data, ...sharedCalendars.data]
      : myCalendars.data || sharedCalendars.data || [],
  };
  
  return combined;
}

export function useCheckWritePermission(calendarId: number | null) {
  return useQuery({
    queryKey: ['calendars', calendarId, 'write-permission'],
    queryFn: () => calendarsApi.checkWritePermission(calendarId!),
    enabled: !!calendarId,
    staleTime: 5000,
  });
}

export function useCheckReadPermission(calendarId: number | null) {
  return useQuery({
    queryKey: ['calendars', calendarId, 'read-permission'],
    queryFn: () => calendarsApi.checkReadPermission(calendarId!),
    enabled: !!calendarId,
    staleTime: 5000,
  });
}

export function useAllRadicaleCalendars() {
  return useQuery({
    queryKey: ['calendars', 'all'],
    queryFn: calendarsApi.getAll,
    staleTime: 1000,
  });
}

export function useCalendar(id: number | null) {
  return useQuery({
    queryKey: ['calendars', id],
    queryFn: () => calendarsApi.getById(id!),
    enabled: !!id,
    staleTime: 1000,
  });
}

// Calendar shares (now using username instead of user_id)
export function useCalendarShares(calendarId: number | null) {
  return useQuery({
    queryKey: ['calendars', calendarId, 'shares'],
    queryFn: () => sharesApi.getCalendarShares(calendarId!),
    enabled: !!calendarId,
    staleTime: 1000,
  });
}

export function useCreateCalendar() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: calendarsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendars'] });
    },
  });
}

export function useCreateSharedCalendar() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: calendarsApi.createShared,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendars'] });
      queryClient.invalidateQueries({ queryKey: ['calendars', 'shared'] });
    },
  });
}

export function useUpdateCalendar() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Calendar> }) => 
      calendarsApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['calendars'] });
      queryClient.invalidateQueries({ queryKey: ['calendars', id] });
    },
  });
}

export function useDeleteCalendar() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: calendarsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendars'] });
    },
  });
}

// Delete shared calendar
export function useDeleteSharedCalendar() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: calendarsApi.deleteShared,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendars', 'shared'] });
      queryClient.invalidateQueries({ queryKey: ['calendars'] });
    },
  });
}

// Share operations (now using username instead of user_id)
export function useAddShare() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ calendarId, data }: { calendarId: number; data: { user: string; rights: 'RW' | 'RO' } }) =>
      sharesApi.addShare(calendarId, data),
    onSuccess: (_, { calendarId }) => {
      queryClient.invalidateQueries({ queryKey: ['calendars', calendarId, 'shares'] });
      queryClient.invalidateQueries({ queryKey: ['calendars', 'shared'] });
    },
  });
}

export function useUpdateShare() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ calendarId, username, data }: { calendarId: number; username: string; data: { rights: 'RW' | 'RO' } }) =>
      sharesApi.updateShare(calendarId, username, data),
    onSuccess: (_, { calendarId }) => {
      queryClient.invalidateQueries({ queryKey: ['calendars', calendarId, 'shares'] });
    },
  });
}

export function useRemoveShare() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ calendarId, username }: { calendarId: number; username: string }) =>
      sharesApi.removeShare(calendarId, username),
    onSuccess: (_, { calendarId }) => {
      queryClient.invalidateQueries({ queryKey: ['calendars', calendarId, 'shares'] });
      queryClient.invalidateQueries({ queryKey: ['calendars', 'shared'] });
    },
  });
}
