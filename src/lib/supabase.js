import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Admin emails — these users are automatically assigned admin role
export const ADMIN_EMAILS = [
  'iritspitzer@gmail.com',
  'n12comp004@gmail.com',
  'anaellheymann@gmail.com',
];

export const isAdminEmail = (email) => {
  return ADMIN_EMAILS.includes(email?.toLowerCase?.());
};

// Check if Supabase is configured
export const isSupabaseConfigured = () => {
  return (
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'https://your-project.supabase.co' &&
    supabaseAnonKey !== 'your-anon-key-here'
  );
};

// Create client (or null if not configured)
export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
