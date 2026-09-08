import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { usePrivy } from '@privy-io/react-auth';
import { supabase } from '@/integrations/supabase/client';
import { peekPendingSignup, takePendingSignup } from '@/lib/pending-signup';
import { edgeFunctionErrorMessage } from '@/lib/edge-errors';

export type UserRole = 'creator' | 'brand' | 'moderator' | 'admin';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone: string | null;
  tiktok_handle: string | null;
  instagram_handle?: string | null;
  tiktok_connected_at?: string | null;
  instagram_connected_at?: string | null;
  payout_provider: 'mtn_momo' | 'airtel_money' | null;
  payout_number: string | null;
  id_verification_status: string;
  company_name: string | null;
  city?: string | null;
  country?: string | null;
  continent?: string | null;
  avatar_url?: string | null;
  logo_dark_url?: string | null;
  website?: string | null;
  brand_primary_color?: string | null;
  brand_secondary_color?: string | null;
  brand_socials?: Record<string, string> | null;
  plan?: string;
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
  profile: Profile | null;
  refreshProfile: () => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<{ error: Error | null }>;
  /** Legacy email/password — prefer Privy login. Kept for existing accounts. */
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string, role: UserRole, extras?: SignUpExtras) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  /** Exchange current Privy session for a Supabase session. */
  syncPrivyToSupabase: () => Promise<{ error: Error | null }>;
  /** Last Privy → Supabase exchange failure (e.g. undeployed privy-exchange). */
  authSyncError: string | null;
  clearAuthSyncError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { ready, authenticated, user: privyUser, getAccessToken, logout: privyLogout } = usePrivy();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authSyncError, setAuthSyncError] = useState<string | null>(null);
  const syncing = useRef(false);
  const lastPrivyId = useRef<string | null>(null);
  /** True after Privy has been authenticated on this origin (so we can clear Supabase on logout). */
  const privySeenAuthed = useRef(false);

  // Restore Supabase session when arriving from another subdomain (hash handoff).
  useEffect(() => {
    const raw = window.location.hash.replace(/^#/, '');
    if (!raw) return;
    const params = new URLSearchParams(raw);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (!access_token || !refresh_token) return;

    void supabase.auth
      .setSession({ access_token, refresh_token })
      .finally(() => {
        const clean = `${window.location.pathname}${window.location.search}`;
        window.history.replaceState(null, '', clean);
      });
  }, []);

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

  const ensureProfile = useCallback(async (currentUser: User) => {
    const { data: existing } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .maybeSingle();

    if (!existing) {
      const meta = currentUser.user_metadata ?? {};
      const pending = peekPendingSignup();
      const { data: created, error } = await supabase
        .from('profiles')
        .insert({
          id: currentUser.id,
          role: pending?.role === 'brand' || meta.role === 'brand' ? 'brand' : 'creator',
          full_name: pending?.fullName ?? meta.full_name ?? null,
          tiktok_handle: pending?.tiktokHandle ?? meta.tiktok_handle ?? null,
          company_name: pending?.companyName ?? meta.company_name ?? null,
        })
        .select()
        .maybeSingle();
      if (!error && created) setProfile(created as Profile);
    } else {
      setProfile(existing as Profile);
    }
  }, []);

  const syncPrivyToSupabase = useCallback(async () => {
    if (syncing.current) return { error: null };
    syncing.current = true;
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        return { error: new Error('No Privy access token') };
      }

      const pending = peekPendingSignup();
      const { data, error } = await supabase.functions.invoke('privy-exchange', {
        body: {
          accessToken,
          role: pending?.role,
          fullName: pending?.fullName,
          tiktokHandle: pending?.tiktokHandle,
          companyName: pending?.companyName,
        },
      });

      if (error) {
        return { error: new Error(edgeFunctionErrorMessage(error, data)) };
      }
      if (data?.error) {
        return { error: new Error(String(data.error)) };
      }
      if (!data?.access_token || !data?.refresh_token) {
        return { error: new Error('Invalid exchange response') };
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      if (sessionError) return { error: sessionError as Error };

      takePendingSignup();
      return { error: null };
    } catch (e) {
      return { error: e as Error };
    } finally {
      syncing.current = false;
    }
  }, [getAccessToken]);

  // Supabase session listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (event === 'SIGNED_IN' && newSession?.user) {
          setTimeout(() => {
            void ensureProfile(newSession.user);
          }, 0);
        }
        if (event === 'SIGNED_OUT') {
          setProfile(null);
        }
      },
    );

    void supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      if (existingSession?.user) {
        setTimeout(() => {
          void ensureProfile(existingSession.user);
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [ensureProfile]);

  // When Privy authenticates, exchange for Supabase session
  useEffect(() => {
    if (!ready) return;

    if (!authenticated || !privyUser) {
      lastPrivyId.current = null;
      // Only clear Supabase when Privy logged out on this origin.
      // Do not wipe a handoff session on creator./brand. when Privy localStorage is empty.
      if (!authenticated && privySeenAuthed.current) {
        privySeenAuthed.current = false;
        void supabase.auth.getSession().then(({ data: { session: s } }) => {
          if (s) void supabase.auth.signOut();
        });
      }
      setIsLoading(false);
      return;
    }

    privySeenAuthed.current = true;

    if (lastPrivyId.current === privyUser.id) {
      setIsLoading(false);
      return;
    }

    lastPrivyId.current = privyUser.id;
    setIsLoading(true);
    setAuthSyncError(null);
    void syncPrivyToSupabase().then(({ error }) => {
      if (error) {
        setAuthSyncError(error.message);
        // Allow retry on next effect / manual sync
        lastPrivyId.current = null;
      } else {
        setAuthSyncError(null);
      }
    }).finally(() => setIsLoading(false));
  }, [ready, authenticated, privyUser, syncPrivyToSupabase]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (
    email: string,
    password: string,
    name: string,
    role: UserRole,
    extras?: SignUpExtras,
  ) => {
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
    lastPrivyId.current = null;
    privySeenAuthed.current = false;
    try {
      await privyLogout();
    } catch {
      // ignore
    }
    await supabase.auth.signOut();
    setProfile(null);
  };

  const updateProfile = async (patch: Partial<Profile>) => {
    if (!user) return { error: new Error('Not signed in') };
    // Never allow client to escalate role/plan — DB trigger also blocks this
    const { role: _r, plan: _p, id: _id, ...safe } = patch as Partial<Profile> & {
      plan?: string;
    };
    const { error } = await supabase
      .from('profiles')
      .update(safe)
      .eq('id', user.id);
    if (!error) await refreshProfile();
    return { error: error as Error | null };
  };

  // Still loading until Privy is ready AND (not authenticated OR supabase user present)
  const loading =
    isLoading ||
    !ready ||
    (authenticated && !user && syncing.current);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading: loading,
        profile,
        refreshProfile,
        updateProfile,
        signIn,
        signUp,
        signOut,
        syncPrivyToSupabase,
        authSyncError,
        clearAuthSyncError: () => setAuthSyncError(null),
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

export const roleHome = (role: UserRole | null | undefined) => {
  if (role === 'brand') return '/brand';
  if (role === 'moderator' || role === 'admin') return '/admin';
  return '/creator';
};
