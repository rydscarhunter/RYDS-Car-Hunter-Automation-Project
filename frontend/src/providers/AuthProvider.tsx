
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { supabase, checkSupabaseConnection } from '@/lib/supabase';
import { UserProfile, AuthState } from '@/types/auth';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
  resetLoadingState: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: false, // Start with false to avoid initial blocked UI
    error: null,
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  // Debug log for state changes
  useEffect(() => {
    console.log('Auth state updated:', {
      isLoading: state.isLoading,
      hasUser: !!state.user,
      hasSession: !!state.session,
      hasError: !!state.error,
      errorMessage: state.error?.message
    });
  }, [state]);

  // Fetch user profile data
  const fetchUserProfile = async (user: User): Promise<UserProfile | null> => {
    try {
      console.log('Fetching user profile for user ID:', user.id);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        toast({
          title: "Error fetching profile",
          description: error.message,
          variant: "destructive",
        });
        return null;
      }

      console.log('User profile fetched successfully:', data);
      return data as UserProfile;
    } catch (error: any) {
      console.error('Exception in fetchUserProfile:', error);
      toast({
        title: "Error fetching profile",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  // Safety function to reset loading state
  const resetLoadingState = () => {
    console.log('Manually resetting loading state');
    setState(prev => ({ ...prev, isLoading: false, error: null }));
    toast({
      title: "Authentication reset",
      description: "Loading state has been reset. Please try signing in again.",
    });
  };

  useEffect(() => {
    // Verify connection before attempting auth initialization
    async function verifyAndInitialize() {
      console.log('Verifying Supabase connection before auth initialization...');
      const isConnected = await checkSupabaseConnection();
      
      if (!isConnected) {
        console.error('Supabase connection check failed, aborting auth initialization');
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: new Error('Could not connect to authentication service')
        }));
        toast({
          title: "Connection Error",
          description: "Could not connect to authentication service. Please try again later.",
          variant: "destructive",
        });
        return;
      }
      
      initializeAuth();
    }
    
    // Check for active session on mount
    const initializeAuth = async () => {
      console.log('Initializing authentication...');
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Safety timeout to prevent infinite loading
      const safetyTimeout = setTimeout(() => {
        console.warn('Auth initialization timeout reached, resetting loading state');
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: new Error('Authentication initialization timed out')
        }));
        
        toast({
          title: "Authentication timeout",
          description: "Could not connect to authentication service. Please try again.",
          variant: "destructive",
        });
      }, 5000); // 5 seconds timeout
      
      try {
        console.log('Getting session from Supabase...');
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }
        
        const session = data?.session;
        console.log('Session response received:', !!session);
        
        if (session?.user) {
          console.log('User found in session, fetching profile...');
          const userProfile = await fetchUserProfile(session.user);
          
          setState({
            session,
            user: userProfile,
            isLoading: false,
            error: null,
          });
          console.log('Auth initialized with user:', session.user.email);
        } else {
          console.log('No session found, initializing as not authenticated');
          setState({
            user: null,
            session: null,
            isLoading: false,
            error: null,
          });
        }
      } catch (error: any) {
        console.error('Auth initialization error:', error);
        setState({
          user: null,
          session: null,
          isLoading: false,
          error,
        });
        
        toast({
          title: "Authentication Error",
          description: error.message || "Failed to initialize authentication",
          variant: "destructive",
        });
      } finally {
        clearTimeout(safetyTimeout);
      }
    };

    // Set up auth state change listener first, then verify connection and initialize
    console.log('Setting up auth state change listener');
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, 'for user:', session?.user?.email);
        
        // Use setTimeout to avoid potential deadlocks with Supabase client
        setTimeout(async () => {
          if (event === 'SIGNED_IN' && session?.user) {
            console.log('User signed in, fetching profile');
            const userProfile = await fetchUserProfile(session.user);
            setState({
              session,
              user: userProfile,
              isLoading: false,
              error: null,
            });
            navigate('/');
          } else if (event === 'SIGNED_OUT') {
            console.log('User signed out');
            setState({
              user: null,
              session: null,
              isLoading: false,
              error: null,
            });
            navigate('/auth');
          }
        }, 0);
      }
    );
    
    // Start verification and initialization process
    verifyAndInitialize();

    return () => {
      console.log('Cleaning up auth listener');
      authListener.subscription.unsubscribe();
    };
  }, [navigate, toast]);

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      console.log('Attempting to sign up user:', email);
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          }
        }
      });

      if (error) throw error;

      console.log('Sign up API call successful:', data);
      
      toast({
        title: "Sign up successful!",
        description: "Check your email for a confirmation link.",
      });

      // Reset loading state whether or not we have a session (email confirmation may be required)
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
      }));
      console.log('Sign up completed successfully');
    } catch (error: any) {
      console.error('Sign up error:', error);
      toast({
        title: "Sign up failed",
        description: error.message || "An error occurred during sign up",
        variant: "destructive",
      });
      setState(prev => ({ ...prev, isLoading: false, error }));
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Attempting to sign in user:', email);
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Add a safety timeout for sign in as well
      const signInTimeout = setTimeout(() => {
        console.warn('Sign in operation timed out');
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: new Error('Sign in timed out, please try again')
        }));
        
        toast({
          title: "Sign in timeout",
          description: "The operation took too long. Please try again.",
          variant: "destructive",
        });
      }, 8000); // 8 seconds timeout
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      clearTimeout(signInTimeout);
      
      if (error) throw error;

      console.log('Sign in successful, user data received:', !!data.user);
      
      // The actual user state will be set by the onAuthStateChange listener
      // But let's make sure to reset loading state in case of any issues
      setState(prev => ({ ...prev, isLoading: false }));
      
      // Note: navigation to '/' happens in the onAuthStateChange handler
      
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast({
        title: "Sign in failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
      setState(prev => ({ ...prev, isLoading: false, error }));
    }
  };

  const signOut = async () => {
    try {
      console.log('Attempting to sign out user');
      setState(prev => ({ ...prev, isLoading: true }));
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Signed out",
        description: "You have been successfully signed out",
      });
      
      // The actual state will be updated by the onAuthStateChange listener
      // But ensure loading state is reset
      setState(prev => ({ ...prev, isLoading: false }));
      
      console.log('Sign out completed successfully');
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast({
        title: "Error signing out",
        description: error.message || "An error occurred during sign out",
        variant: "destructive",
      });
      setState(prev => ({ ...prev, isLoading: false, error }));
    }
  };

  const updateProfile = async (profile: Partial<UserProfile>) => {
    try {
      console.log('Updating user profile');
      setState(prev => ({ ...prev, isLoading: true }));
      
      if (!state.user?.id) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('profiles')
        .update(profile)
        .eq('id', state.user.id);

      if (error) throw error;

      // Refresh user data
      if (state.session?.user) {
        const updatedProfile = await fetchUserProfile(state.session.user);
        
        setState(prev => ({
          ...prev,
          user: updatedProfile,
          isLoading: false,
        }));

        toast({
          title: "Profile updated",
          description: "Your profile information has been updated successfully",
        });
      }
    } catch (error: any) {
      console.error('Update profile error:', error);
      toast({
        title: "Error updating profile",
        description: error.message || "An error occurred while updating your profile",
        variant: "destructive",
      });
      setState(prev => ({ ...prev, isLoading: false, error }));
    }
  };

  return (
    <AuthContext.Provider value={{ 
      ...state, 
      signIn, 
      signUp, 
      signOut,
      updateProfile,
      resetLoadingState,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
