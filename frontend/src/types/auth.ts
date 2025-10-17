
export interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  company?: string;
  email: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuthState {
  user: UserProfile | null;
  session: any | null;
  isLoading: boolean;
  error: Error | null;
}
