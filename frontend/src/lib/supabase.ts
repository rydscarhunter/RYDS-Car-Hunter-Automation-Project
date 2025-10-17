
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://wjcxxoztgkratgyyhomr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqY3h4b3p0Z2tyYXRneXlob21yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU4NjA3MzcsImV4cCI6MjA2MTQzNjczN30.EYkKV5lzKocVmwdE21IX0xeHUkRIOz7Vx3beXVObwJ8";

// Validate that the required env variables are set
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error('Missing Supabase configuration. Check SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.');
  // Throw error to fail fast and prevent app from initializing with broken auth
  throw new Error('Missing Supabase configuration');
}

// Create and export a single client instance with explicit auth configuration
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    detectSessionInUrl: true,
    flowType: 'implicit',
  },
});

// Add debug logging to check client initialization
console.log('Supabase client initialized with URL:', SUPABASE_URL);

// Export a function to check if client is working
export const checkSupabaseConnection = async () => {
  try {
    console.log('Checking Supabase connection...');
    const { data, error } = await supabase.from('dealer_websites').select('count');
    
    if (error) {
      console.error('Supabase connection check failed:', error);
      return false;
    }
    
    console.log('Supabase connection successful, received data:', data);
    return true;
  } catch (e) {
    console.error('Supabase connection check exception:', e);
    return false;
  }
};

// Immediately check connection status
checkSupabaseConnection().then(isConnected => {
  console.log('Initial Supabase connection check result:', isConnected);
});
