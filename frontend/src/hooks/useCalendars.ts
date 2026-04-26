import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { calendarsApi, sharesApi } from '@/services/api';
import type { Calendar } from '@/types';

export function useMyCalendars() {
  return useQuery({
    queryKey: ['calendars', 'my'],
    queryFn: calendarsApi.getMyCalendars,
    staleTime: 1000 * 60 * 5,
  });
}

export function useSharedCalendars() {
  return useQuery({
    queryKey: ['calendars', 'shared'],
    queryFn: calendarsApi.getSharedCalendars,
    staleTime: 1000 * 60 * 5,
  });
}

export function useAllCalendars() {
  return useQuery({
    queryKey: ['calendars', 'all'],
    queryFn: calendarsApi.getAll,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCalendar(id: number | null) {
  return useQuery({
    queryKey: ['calendars', id],
    queryFn: () => calendarsApi.getById(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCalendarShares(calendarId: number | null) {
  return useQuery({
    queryKey: ['calendars', calendarId, 'shares'],
    queryFn: () => sharesApi.getCalendarShares(calendarId!),
    enabled: !!calendarId,
    staleTime: 1000 * 60 * 5,
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

export function useAddShare() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ calendarId, data }: { calendarId: number; data: { user_id: number; permission: 'read' | 'write' | 'admin' } }) =>
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
    mutationFn: ({ calendarId, userId, data }: { calendarId: number; userId: number; data: { permission: 'read' | 'write' | 'admin' } }) =>
      sharesApi.updateShare(calendarId, userId, data),
    onSuccess: (_, { calendarId }) => {
      queryClient.invalidateQueries({ queryKey: ['calendars', calendarId, 'shares'] });
    },
  });
}

export function useRemoveShare() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ calendarId, userId }: { calendarId: number; userId: number }) =>
      sharesApi.removeShare(calendarId, userId),
    onSuccess: (_, { calendarId }) => {
      queryClient.invalidateQueries({ queryKey: ['calendars', calendarId, 'shares'] });
      queryClient.invalidateQueries({ queryKey: ['calendars', 'shared'] });
    },
  });
}
