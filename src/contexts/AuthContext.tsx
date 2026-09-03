import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAnonymous: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  signInAnonymously: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAnonymous = user?.is_anonymous ?? false;

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);

        // Seed demo data for new anonymous users
        if (event === 'SIGNED_IN' && session?.user?.is_anonymous) {
          setTimeout(() => {
            seedDemoData(session.user.id);
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const seedDemoData = async (userId: string) => {
    try {
      // Check if user already has data to prevent duplicate seeding
      const { data: existingClients } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (existingClients && existingClients.length > 0) {
        return; // User already has data
      }

      // Insert demo clients
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .insert([
          {
            user_id: userId,
            name: 'John Smith',
            company: 'Acme Corporation',
            email: 'john@acmecorp.com',
            address: '123 Tech Park, San Francisco, CA 94107',
          },
          {
            user_id: userId,
            name: 'Sarah Johnson',
            company: 'Summit Studios',
            email: 'sarah@summitstudios.com',
            address: '456 Creative Ave, Los Angeles, CA 90028',
          },
        ])
        .select();

      if (clientsError || !clients) {
        console.error('Error seeding clients:', clientsError);
        return;
      }

      // Insert demo invoices
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      const fifteenDaysAgo = new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000);
      const inFifteenDays = new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000);

      await supabase.from('invoices').insert([
        {
          user_id: userId,
          client_id: clients[0].id,
          status: 'paid',
          invoice_number: 'INV-001',
          issue_date: thirtyDaysAgo.toISOString().split('T')[0],
          due_date: fifteenDaysAgo.toISOString().split('T')[0],
          currency: 'USD',
          total_amount: 3200,
          subtotal: 3000,
          tax_rate: 10,
          discount_rate: 5,
          items: [
            { id: '1', description: 'Website Design', quantity: 1, rate: 2000 },
            { id: '2', description: 'Logo Design', quantity: 1, rate: 1000 },
          ],
          business_details: {
            name: 'Your Business',
            email: 'contact@yourbusiness.com',
            phone: '+1 (555) 123-4567',
            address: '789 Main St, New York, NY 10001',
          },
          client_details: {
            name: 'John Smith',
            company: 'Acme Corporation',
            email: 'john@acmecorp.com',
            address: '123 Tech Park, San Francisco, CA 94107',
          },
          payment_terms: 'Payment is due within 30 days of invoice date.',
        },
        {
          user_id: userId,
          client_id: clients[1].id,
          status: 'pending',
          invoice_number: 'INV-002',
          issue_date: fifteenDaysAgo.toISOString().split('T')[0],
          due_date: inFifteenDays.toISOString().split('T')[0],
          currency: 'USD',
          total_amount: 2800,
          subtotal: 2800,
          tax_rate: 0,
          discount_rate: 0,
          items: [
            { id: '1', description: 'Brand Strategy Consultation', quantity: 4, rate: 500 },
            { id: '2', description: 'Market Research Report', quantity: 1, rate: 800 },
          ],
          business_details: {
            name: 'Your Business',
            email: 'contact@yourbusiness.com',
            phone: '+1 (555) 123-4567',
            address: '789 Main St, New York, NY 10001',
          },
          client_details: {
            name: 'Sarah Johnson',
            company: 'Summit Studios',
            email: 'sarah@summitstudios.com',
            address: '456 Creative Ave, Los Angeles, CA 90028',
          },
          payment_terms: 'Payment is due within 30 days of invoice date.',
        },
        {
          user_id: userId,
          client_id: clients[0].id,
          status: 'draft',
          invoice_number: 'INV-003',
          issue_date: today.toISOString().split('T')[0],
          due_date: inFifteenDays.toISOString().split('T')[0],
          currency: 'USD',
          total_amount: 1500,
          subtotal: 1500,
          tax_rate: 0,
          discount_rate: 0,
          items: [
            { id: '1', description: 'Mobile App UI Design', quantity: 1, rate: 1500 },
          ],
          business_details: {
            name: 'Your Business',
            email: 'contact@yourbusiness.com',
            phone: '+1 (555) 123-4567',
            address: '789 Main St, New York, NY 10001',
          },
          client_details: {
            name: 'John Smith',
            company: 'Acme Corporation',
            email: 'john@acmecorp.com',
            address: '123 Tech Park, San Francisco, CA 94107',
          },
          payment_terms: 'Payment is due within 30 days of invoice date.',
        },
      ]);
    } catch (error) {
      console.error('Error seeding demo data:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, name: string) => {
    // The confirmation link must land on /auth/callback, which turns the code in the
    // URL into a session and THEN forwards to the app. Pointing it straight at a
    // protected route races ProtectedRoute and bounces the user back to /signin.
    const redirectUrl = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: name },
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const signInAnonymously = async () => {
    const { data, error } = await supabase.auth.signInAnonymously();
    
    // Wait for seeding to complete BEFORE returning, ensuring dashboard has data
    if (!error && data.user?.is_anonymous) {
      await seedDemoData(data.user.id);
    }
    
    return { error: error as Error | null };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAnonymous,
        signIn,
        signUp,
        signOut,
        signInAnonymously,
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
