import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured, isAdminEmail } from '../lib/supabase';

const AuthContext = createContext(null);

/**
 * AuthProvider
 * Handles email+password auth via Supabase.
 * Falls back to local demo mode when Supabase is not configured.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);         // Supabase auth user
  const [profile, setProfile] = useState(null);    // profiles table row
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const configured = isSupabaseConfigured();

  // Fetch or create profile from the profiles table
  const fetchProfile = useCallback(async (authUser) => {
    if (!supabase || !authUser) return null;

    // Try to get existing profile
    const { data, error: fetchErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (data) return data;

    // Profile doesn't exist yet — create it
    if (fetchErr?.code === 'PGRST116') {
      const role = isAdminEmail(authUser.email) ? 'admin' : 'worker';
      const name = authUser.user_metadata?.name || authUser.email.split('@')[0];
      const newProfile = {
        id: authUser.id,
        email: authUser.email,
        name,
        role,
        phone: '',
        avatar: name.charAt(0),
        roles: ['שוטף'],
        eligible_shifts: [],
        quota: 5,
        active: true,
      };

      const { data: created, error: createErr } = await supabase
        .from('profiles')
        .insert(newProfile)
        .select()
        .single();

      if (createErr) {
        console.error('Error creating profile:', createErr);
        return null;
      }
      return created;
    }

    console.error('Error fetching profile:', fetchErr);
    return null;
  }, []);

  // Initialize auth state
  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        const prof = await fetchProfile(session.user);
        setProfile(prof);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          const prof = await fetchProfile(session.user);
          setProfile(prof);
          setError(null);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [configured, fetchProfile]);

  // Sign up with email + password
  const signUp = useCallback(async (email, password, name) => {
    if (!supabase) return { error: { message: 'Supabase not configured' } };
    setError(null);

    const { data, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: window.location.origin,
      },
    });

    if (signUpErr) {
      setError(signUpErr.message);
      return { error: signUpErr };
    }

    return { data };
  }, []);

  // Sign in with email + password
  const signIn = useCallback(async (email, password) => {
    if (!supabase) return { error: { message: 'Supabase not configured' } };
    setError(null);

    const { data, error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInErr) {
      setError(signInErr.message);
      return { error: signInErr };
    }

    return { data };
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  // Update profile
  const updateProfile = useCallback(async (updates) => {
    if (!supabase || !user) return;
    const { data, error: updateErr } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (updateErr) {
      console.error('Error updating profile:', updateErr);
      return;
    }
    setProfile(data);
  }, [user]);

  // Refresh profile from DB
  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const prof = await fetchProfile(user);
    setProfile(prof);
  }, [user, fetchProfile]);

  const isAdmin = profile?.role === 'admin';

  const value = {
    user,
    profile,
    isAdmin,
    loading,
    error,
    configured,
    signUp,
    signIn,
    signOut,
    updateProfile,
    refreshProfile,
    setError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
