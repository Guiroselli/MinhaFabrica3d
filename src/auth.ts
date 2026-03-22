import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  avatarUrl?: string | null;
  provider?: string | null;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  provider: string | null;
  created_at: string;
}

const SESSION_TIMEOUT_MS = 3500;
const PROFILE_TIMEOUT_MS = 3500;

function buildFallbackUser(user: User): AuthUser {
  const fallbackName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'Cliente';

  return {
    id: user.id,
    name: fallbackName,
    email: user.email || '',
    createdAt: user.created_at,
    avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
    provider: user.app_metadata?.provider || null,
  };
}

function withTimeout<T>(promise: Promise<T>, fallbackValue: T, timeoutMs: number): Promise<T> {
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => resolve(fallbackValue), timeoutMs);

    promise
      .then((value) => resolve(value))
      .catch(() => resolve(fallbackValue))
      .finally(() => clearTimeout(timeoutId));
  });
}

async function ensureProfile(user: User): Promise<AuthUser> {
  const supabase = getSupabaseClient();
  const fallbackUser = buildFallbackUser(user);

  const { error: upsertError } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      full_name: fallbackUser.name,
      email: fallbackUser.email,
      avatar_url: fallbackUser.avatarUrl,
      provider: fallbackUser.provider,
    },
    {
      onConflict: 'id',
    },
  );

  if (upsertError) {
    return fallbackUser;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url, provider, created_at')
    .eq('id', user.id)
    .single();

  if (error || !data) {
    return fallbackUser;
  }

  const profile = data as ProfileRow;

  return {
    id: profile.id,
    name: profile.full_name || fallbackUser.name,
    email: profile.email || fallbackUser.email,
    createdAt: profile.created_at || fallbackUser.createdAt,
    avatarUrl: profile.avatar_url,
    provider: profile.provider,
  };
}

async function getSession(): Promise<Session | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error('Nao foi possivel recuperar sua sessao no Supabase.');
  }

  return data.session;
}

async function resolveAuthUser(user: User): Promise<AuthUser> {
  const fallbackUser = buildFallbackUser(user);
  return withTimeout(ensureProfile(user), fallbackUser, PROFILE_TIMEOUT_MS);
}

export async function getSessionUser(): Promise<AuthUser | null> {
  try {
    const session = await withTimeout(getSession(), null, SESSION_TIMEOUT_MS);

    if (!session?.user) {
      return null;
    }

    return resolveAuthUser(session.user);
  } catch {
    return null;
  }
}

export function subscribeToAuthChanges(callback: (user: AuthUser | null) => void) {
  if (!isSupabaseConfigured()) {
    return () => {};
  }

  const supabase = getSupabaseClient();
  const { data } = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, session: Session | null) => {
    if (!session?.user) {
      callback(null);
      return;
    }

    const fallbackUser = buildFallbackUser(session.user);
    callback(fallbackUser);
    callback(await resolveAuthUser(session.user));
  });

  return () => {
    data.subscription.unsubscribe();
  };
}

export async function registerUser(payload: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthUser> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email: payload.email.trim(),
    password: payload.password,
    options: {
      data: {
        full_name: payload.name.trim(),
        name: payload.name.trim(),
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (data.session?.user) {
    return resolveAuthUser(data.session.user);
  }

  try {
    return await loginUser({
      email: payload.email,
      password: payload.password,
    });
  } catch {
    throw new Error('Conta criada. Confirme seu e-mail antes de entrar, se a verificacao estiver ativa no Supabase.');
  }
}

export async function loginUser(payload: {
  email: string;
  password: string;
}): Promise<AuthUser> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: payload.email.trim(),
    password: payload.password,
  });

  if (error || !data.user) {
    throw new Error(error?.message || 'Nao foi possivel entrar com este e-mail.');
  }

  return resolveAuthUser(data.user);
}

export async function loginWithGoogle() {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}?authView=account`,
    },
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function logoutUser(): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}
