import { createContext } from 'react';
import type { ApiUser } from './api';

export interface AuthState {
  user: ApiUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, displayName: string, school?: string, status?: string) => Promise<boolean>;
  signOut: () => void;
  /* Re-fetch /auth/me after profile edits so nav + pages see fresh fields. */
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthState>({} as AuthState);
