import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/services/api';
import { jwtDecode } from '@/utils';
import type { User, LoginCredentials, AuthState } from '@/types';

interface TokenPayload {
  username: string;
  role: string;
  exp: number;
  iat: number;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  must_change_password: boolean;
}

interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
  mustChangePassword: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (data: { current_password?: string; new_password: string }) => Promise<void>;
  clearMustChangePassword: () => void;
}

// Helper to decode JWT token and extract user info
function decodeToken(token: string): TokenPayload | null {
  try {
    const payload = jwtDecode<TokenPayload>(token);
    return payload;
  } catch {
    return null;
  }
}

// Helper to create User object from token payload
function createUserFromPayload(payload: TokenPayload | null, mustChangePassword: boolean = false): User | null {
  if (!payload) return null;
  return {
    username: payload.username,
    role: payload.role as 'admin' | 'user',
    must_change_password: mustChangePassword,
  };
}

export function useAuth(): UseAuthReturn {
  const [error, setError] = useState<Error | null>(null);
  const [userState, setUserState] = useState<User | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState<boolean>(false);
  const queryClient = useQueryClient();

  // Parse token from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    const mustChangePw = localStorage.getItem('must_change_password') === 'true';
    
    if (mustChangePw) {
      setMustChangePassword(true);
    }
    
    if (token) {
      try {
        const payload = decodeToken(token);
        const user = createUserFromPayload(payload, mustChangePw);
        if (user) {
          localStorage.setItem('user', JSON.stringify(user));
          setUserState(user);
          setError(null);
        } else {
          // Clear invalid token
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('must_change_password');
        }
      } catch {
        // Token invalid, try to use cached user if available
        if (userStr) {
          try {
            const user = JSON.parse(userStr) as User;
            setUserState(user);
          } catch {
            localStorage.removeItem('user');
          }
        }
        // Clear invalid token
        localStorage.removeItem('token');
        localStorage.removeItem('must_change_password');
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
      const { access_token, must_change_password } = response.data;
      localStorage.setItem('token', access_token);
      localStorage.setItem('must_change_password', String(must_change_password));
      setMustChangePassword(must_change_password);
      
      // Decode token to get user info
      try {
        const payload = decodeToken(access_token);
        const user = createUserFromPayload(payload, must_change_password);
        if (user) {
          localStorage.setItem('user', JSON.stringify(user));
          setUserState(user);
          setError(null);
          
          // Invalidate queries and refetch data
          queryClient.invalidateQueries({ queryKey: ['auth'] });
          queryClient.invalidateQueries({ queryKey: ['calendars'] });
          queryClient.invalidateQueries({ queryKey: ['events'] });
        } else {
          throw new Error('Invalid token received');
        }
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
      localStorage.removeItem('must_change_password');
      setUserState(null);
      setMustChangePassword(false);
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
    onSuccess: (response) => {
      setError(null);
      setMustChangePassword(false);
      localStorage.removeItem('must_change_password');
      // Update user state
      if (userState) {
        setUserState({ ...userState, must_change_password: false });
      }
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
    onError: (err) => {
      if (err instanceof Error) {
        setError(err);
      }
    },
  });

  const clearMustChangePassword = useCallback(() => {
    setMustChangePassword(false);
    localStorage.removeItem('must_change_password');
    if (userState) {
      setUserState({ ...userState, must_change_password: false });
    }
  }, [userState]);

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
      localStorage.removeItem('must_change_password');
      setUserState(null);
      setMustChangePassword(false);
      queryClient.clear();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
  }, [logoutMutation, queryClient]);

  const changePassword = useCallback(async (data: { current_password?: string; new_password: string }) => {
    await changePasswordMutation.mutateAsync(data);
  }, [changePasswordMutation]);

  return {
    user: userState,
    isAuthenticated,
    isLoading: loginMutation.isPending || logoutMutation.isPending,
    error,
    mustChangePassword,
    login,
    logout,
    changePassword,
    clearMustChangePassword,
  };
}
