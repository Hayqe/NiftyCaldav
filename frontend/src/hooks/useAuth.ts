import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/services/api';
import { jwtDecode } from '@/utils';
import type { User, LoginCredentials } from '@/types';

interface TokenPayload {
  sub: number;
  username: string;
  role: string;
  exp: number;
  iat: number;
}

interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (data: { current_password: string; new_password: string }) => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [error, setError] = useState<Error | null>(null);
  const [userState, setUserState] = useState<User | null>(null);
  const queryClient = useQueryClient();

  // Parse token from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (token) {
      try {
        const decoded = jwtDecode<TokenPayload>(token);
        const user: User = {
          id: decoded.sub,
          username: decoded.username,
          role: decoded.role as 'admin' | 'user',
          created_at: '',
          updated_at: '',
        };
        setUserState(user);
      } catch {
        // Token invalid, clear it
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    } else if (userStr) {
      try {
        const user = JSON.parse(userStr) as User;
        setUserState(user);
      } catch {
        localStorage.removeItem('user');
      }
    }
  }, []);

  const isAuthenticated = !!userState || !!localStorage.getItem('token');

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (response) => {
      const { access_token } = response.data;
      localStorage.setItem('token', access_token);
      
      // Decode token to get user info
      try {
        const decoded = jwtDecode<TokenPayload>(access_token);
        const user: User = {
          id: decoded.sub,
          username: decoded.username,
          role: decoded.role as 'admin' | 'user',
          created_at: '',
          updated_at: '',
        };
        localStorage.setItem('user', JSON.stringify(user));
        setUserState(user);
        setError(null);
        
        // Invalidate queries and refetch data
        queryClient.invalidateQueries({ queryKey: ['auth'] });
        queryClient.invalidateQueries({ queryKey: ['calendars'] });
        queryClient.invalidateQueries({ queryKey: ['events'] });
      } catch (err) {
        setError(new Error('Invalid token received'));
        throw err;
      }
    },
    onError: (err) => {
      if (err instanceof Error) {
        setError(err);
      }
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUserState(null);
      setError(null);
      queryClient.clear();
      
      // Redirect to login if not already there
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    },
    onError: (err) => {
      if (err instanceof Error) {
        setError(err);
      }
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
    onError: (err) => {
      if (err instanceof Error) {
        setError(err);
      }
    },
  });

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      await loginMutation.mutateAsync(credentials);
    } catch (err) {
      throw err;
    }
  }, [loginMutation]);

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (err) {
      // If logout fails, just clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUserState(null);
      queryClient.clear();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
  }, [logoutMutation, queryClient]);

  const changePassword = useCallback(async (data: { current_password: string; new_password: string }) => {
    await changePasswordMutation.mutateAsync(data);
  }, [changePasswordMutation]);

  return {
    user: userState,
    isAuthenticated,
    isLoading: loginMutation.isPending || logoutMutation.isPending,
    error,
    login,
    logout,
    changePassword,
  };
}


