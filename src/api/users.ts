import { supabase } from '@/lib/supabase';
import type { UserRow } from '@/lib/types';

export async function listUsers(includeInactive = true): Promise<UserRow[]> {
  let q = supabase.from('users').select('*').order('created_at');
  if (!includeInactive) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) throw error;
  return data as UserRow[];
}

export async function updateUser(
  id: string, input: Partial<Pick<UserRow, 'name' | 'email' | 'is_active'>>,
): Promise<UserRow> {
  const { data, error } = await supabase.from('users').update(input).eq('id', id).select().single();
  if (error) throw error;
  return data as UserRow;
}

/**
 * Adding a user creates the profile row; the matching Supabase Auth login is
 * created by an admin in the Supabase dashboard (no public signup — 4 named
 * logins per the architecture). The auth trigger links by email on first login.
 */
export async function addUserProfile(name: string, email: string): Promise<UserRow> {
  const { data, error } = await supabase
    .from('users').insert({ id: crypto.randomUUID(), name, email }).select().single();
  if (error) throw error;
  return data as UserRow;
}
