import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'creator' | 'brand';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  phone: string | null;
  tiktok_handle: string | null;
  payout_provider: 'mtn_momo' | 'airtel_money' | null;
  payout_number: string | null;
  id_verification_status: string;
  company_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface SignUpExtras {
  tiktok_handle?: string;
  payout_provider?: string;
  payout_number?: string;
  company_name?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAnonymous: boolean;
  profile: Profile | null;
  refreshProfile: () => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string, role: UserRole, extras?: SignUpExtras) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  signInAnonymously: () => Promise<{ error: Error | null }>;
  switchDemoRole: (role: UserRole) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAnonymous = user?.is_anonymous ?? false;

  const refreshProfile = useCallback(async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      setProfile(null);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .maybeSingle();
    setProfile((data as Profile) ?? null);
  }, []);

  // Create the profile on first sign-in if missing, using metadata captured
  // at signup. Demo (anonymous) accounts are seeded with sample data.
  const ensureProfile = useCallback(async (currentUser: User) => {
    const { data: existing } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .maybeSingle();

    if (!existing) {
      const meta = currentUser.user_metadata ?? {};
      const { data: created, error } = await supabase
        .from('profiles')
        .insert({
          id: currentUser.id,
          role: meta.role === 'brand' ? 'brand' : 'creator',
          full_name: meta.full_name ?? null,
          tiktok_handle: meta.tiktok_handle ?? null,
          payout_provider: meta.payout_provider ?? null,
          payout_number: meta.payout_number ?? null,
          company_name: meta.company_name ?? null,
        })
        .select()
        .maybeSingle();
      if (!error && created) setProfile(created as Profile);
    } else {
      setProfile(existing as Profile);
    }

    if (currentUser.is_anonymous) {
      await supabase.rpc('seed_demo_data', { p_user_id: currentUser.id });
      await refreshProfile();
    }
  }, [refreshProfile]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setIsLoading(false);

        if (event === 'SIGNED_IN' && newSession?.user) {
          setTimeout(() => {
            ensureProfile(newSession.user);
          }, 0);
        }
        if (event === 'SIGNED_OUT') {
          setProfile(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      setIsLoading(false);
      if (existingSession?.user) {
        setTimeout(() => {
          ensureProfile(existingSession.user);
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [ensureProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (
    email: string,
    password: string,
    name: string,
    role: UserRole,
    extras?: SignUpExtras
  ) => {
    // The confirmation link must land on /auth/callback, which turns the code in the
    // URL into a session and THEN forwards to the app. Pointing it straight at a
    // protected route races ProtectedRoute and bounces the user back to /signin.
    const redirectUrl = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: name,
          role,
          tiktok_handle: extras?.tiktok_handle,
          payout_provider: extras?.payout_provider,
          payout_number: extras?.payout_number,
          company_name: extras?.company_name,
        },
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const signInAnonymously = async () => {
    const { error } = await supabase.auth.signInAnonymously();
    return { error: error as Error | null };
  };

  const switchDemoRole = async (role: UserRole) => {
    if (!user) return { error: new Error('Not signed in') };
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', user.id);
    if (!error) {
      setProfile((prev) => (prev ? { ...prev, role } : prev));
    }
    return { error: error as Error | null };
  };

  const updateProfile = async (patch: Partial<Profile>) => {
    if (!user) return { error: new Error('Not signed in') };
    const { error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', user.id);
    if (!error) await refreshProfile();
    return { error: error as Error | null };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAnonymous,
        profile,
        refreshProfile,
        updateProfile,
        signIn,
        signUp,
        signOut,
        signInAnonymously,
        switchDemoRole,
      }}
    >
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

export const roleHome = (role: UserRole | null | undefined) =>
  role === 'brand' ? '/brand' : '/creator';
