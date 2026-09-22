import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const requestOtp = async (email: string): Promise<string | null> => {
    if (!supabase) return 'Supabase non configuré.';
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    return error ? error.message : null;
  };

  const verifyOtp = async (email: string, code: string): Promise<string | null> => {
    if (!supabase) return 'Supabase non configuré.';
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
    return error ? error.message : null;
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  return { user, loading, isSupabaseConfigured, requestOtp, verifyOtp, signOut };
}
