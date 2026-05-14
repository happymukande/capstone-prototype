import { ReactNode } from 'react';

export type AuthUser = {
  id: string;
  email?: string;
  is_anonymous?: boolean;
  created_at?: string;
  user_metadata?: {
    role?: string;
    username?: string;
    full_name?: string;
    name?: string;
    phone_number?: string;
    isGuest?: boolean;
  };
};

export type AuthContextValue = {
  session: unknown;
  user: AuthUser | null;
  role: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
};

export function AuthProvider(props: { children: ReactNode }): JSX.Element;
export function useAuth(): AuthContextValue;
