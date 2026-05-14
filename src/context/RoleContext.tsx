import React, { createContext, ReactNode, useContext, useMemo } from 'react';
import { useAuth } from '../../context/AuthProvider';

export type AppRole = 'student' | 'teacher' | 'admin';

interface RoleContextType {
  role: AppRole;
  isHydrated: boolean;
}

interface RoleProviderProps {
  children: ReactNode;
}

const ALLOWED_ROLES: AppRole[] = ['student', 'teacher', 'admin'];

function isAppRole(value: unknown): value is AppRole {
  return ALLOWED_ROLES.includes(value as AppRole);
}

function getDefaultRole(): AppRole {
  const envRole = process.env.EXPO_PUBLIC_APP_ROLE?.trim().toLowerCase();
  if (isAppRole(envRole)) return envRole;

  if (process.env.EXPO_PUBLIC_ADMIN_API_KEY) return 'admin';
  if (process.env.EXPO_PUBLIC_TEACHER_API_KEY) return 'teacher';
  return 'student';
}

const RoleContext = createContext<RoleContextType | null>(null);

export function RoleProvider({ children }: RoleProviderProps) {
  const { role: authRole, isLoading } = useAuth();
  const role = isAppRole(authRole) ? authRole : getDefaultRole();

  const value = useMemo(
    () => ({
      role,
      isHydrated: !isLoading,
    }),
    [role, isLoading]
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextType {
  const context = useContext(RoleContext);
  if (!context) throw new Error('useRole must be used inside RoleProvider');
  return context;
}
