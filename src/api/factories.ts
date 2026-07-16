import { supabase } from '@/lib/supabase';
import type { Factory } from '@/lib/types';

export async function listFactories(): Promise<Factory[]> {
  const { data, error } = await supabase.from('factories').select('*').order('name');
  if (error) throw error;
  return data as Factory[];
}

export type FactoryInput = Omit<Factory, 'id' | 'created_at' | 'created_by'>;

export async function createFactory(input: FactoryInput, userId: string): Promise<Factory> {
  const { data, error } = await supabase
    .from('factories').insert({ ...input, created_by: userId }).select().single();
  if (error) throw error;
  return data as Factory;
}

export async function updateFactory(id: string, input: Partial<FactoryInput>): Promise<Factory> {
  const { data, error } = await supabase
    .from('factories').update(input).eq('id', id).select().single();
  if (error) throw error;
  return data as Factory;
}

/** Application-layer guard mirrors the DB's ON DELETE RESTRICT with a clear message. */
export async function deleteFactory(id: string): Promise<void> {
  const { count, error: countErr } = await supabase
    .from('products').select('id', { count: 'exact', head: true }).eq('factory_id', id);
  if (countErr) throw countErr;
  if ((count ?? 0) > 0) throw new Error('Remove or reassign this factory’s products first.');
  const { error } = await supabase.from('factories').delete().eq('id', id);
  if (error) throw error;
}
