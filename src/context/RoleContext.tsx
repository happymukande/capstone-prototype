import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

export type AppRole = 'student' | 'teacher' | 'admin';

interface RoleContextType {
  role: AppRole;
  isHydrated: boolean;
  setRole: (nextRole: AppRole) => void;
}

interface RoleProviderProps {
  children: ReactNode;
}

const ROLE_STORAGE_KEY = 'capstone.role.v1';

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
  const [role, setRoleState] = useState<AppRole>(getDefaultRole);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const hydrateRole = async () => {
      try {
        const stored = await AsyncStorage.getItem(ROLE_STORAGE_KEY);
        if (stored && isAppRole(stored) && isMounted) {
          setRoleState(stored);
        }
      } finally {
        if (isMounted) setIsHydrated(true);
      }
    };

    void hydrateRole();
    return () => {
      isMounted = false;
    };
  }, []);

  const setRole = (nextRole: AppRole) => {
    setRoleState(nextRole);
    void AsyncStorage.setItem(ROLE_STORAGE_KEY, nextRole).catch(() => {
      // Ignore persistence failure and keep in-memory role.
    });
  };

  const value = useMemo(
    () => ({
      role,
      isHydrated,
      setRole,
    }),
    [role, isHydrated]
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextType {
  const context = useContext(RoleContext);
  if (!context) throw new Error('useRole must be used inside RoleProvider');
  return context;
}
