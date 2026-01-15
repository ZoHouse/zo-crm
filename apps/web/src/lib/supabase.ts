import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our CRM tables
export interface Contact {
  id?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  company?: string;
  company_id?: string;
  job_title?: string;
  relationship_stage?: 'lead' | 'engaged' | 'partner' | 'vip' | 'inactive';
  lead_score?: number;
  last_contacted_at?: string;
  next_followup_at?: string;
  source?: string;
  source_detail?: string;
  telegram?: string;
  twitter?: string;
  linkedin?: string;
  whatsapp?: string;
  instagram?: string;
  eth_address?: string;
  solana_address?: string;
  luma_user_id?: string;
  events_attended?: number;
  total_spent?: number;
  notes?: string;
  custom_fields?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface Company {
  id?: string;
  name: string;
  domain?: string;
  industry?: string;
  size?: string;
  website?: string;
  linkedin?: string;
  location?: string;
  notes?: string;
  contact_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Tag {
  id?: string;
  name: string;
  color?: string;
  description?: string;
  contact_count?: number;
  created_at?: string;
}

export interface Activity {
  id?: string;
  contact_id: string;
  type: 'note' | 'call' | 'email' | 'meeting' | 'whatsapp' | 'telegram' | 'task' | 'other';
  title?: string;
  content?: string;
  due_at?: string;
  completed_at?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

export interface Import {
  id?: string;
  file_name?: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  total_rows?: number;
  imported_count?: number;
  duplicate_count?: number;
  error_count?: number;
  column_mapping?: Record<string, string>;
  errors?: Array<{ row: number; error: string }>;
  created_at?: string;
  completed_at?: string;
}

// Helper functions
export async function getContacts(options?: {
  limit?: number;
  offset?: number;
  stage?: string;
  source?: string;
  search?: string;
}) {
  let query = supabase
    .from('contacts')
    .select('*')
    .order('created_at', { ascending: false });

  if (options?.stage) {
    query = query.eq('relationship_stage', options.stage);
  }
  if (options?.source) {
    query = query.eq('source', options.source);
  }
  if (options?.search) {
    query = query.or(`email.ilike.%${options.search}%,first_name.ilike.%${options.search}%,last_name.ilike.%${options.search}%,company.ilike.%${options.search}%`);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Contact[];
}

export async function getContactById(id: string) {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data as Contact;
}

export async function upsertContact(contact: Contact) {
  const { data, error } = await supabase
    .from('contacts')
    .upsert(contact, { onConflict: 'email' })
    .select()
    .single();
  
  if (error) throw error;
  return data as Contact;
}

export async function upsertContacts(contacts: Contact[]) {
  const { data, error } = await supabase
    .from('contacts')
    .upsert(contacts, { onConflict: 'email' })
    .select();
  
  if (error) throw error;
  return data as Contact[];
}

export async function getTags() {
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data as Tag[];
}

export async function getContactTags(contactId: string) {
  const { data, error } = await supabase
    .from('contact_tags')
    .select('tag_id, tags(id, name, color)')
    .eq('contact_id', contactId);
  
  if (error) throw error;
  return data;
}

export async function addTagToContact(contactId: string, tagId: string) {
  const { error } = await supabase
    .from('contact_tags')
    .insert({ contact_id: contactId, tag_id: tagId });
  
  if (error) throw error;
}

export async function removeTagFromContact(contactId: string, tagId: string) {
  const { error } = await supabase
    .from('contact_tags')
    .delete()
    .eq('contact_id', contactId)
    .eq('tag_id', tagId);
  
  if (error) throw error;
}

export async function addActivity(activity: Omit<Activity, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('activities')
    .insert(activity)
    .select()
    .single();
  
  if (error) throw error;
  return data as Activity;
}

export async function getContactActivities(contactId: string) {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data as Activity[];
}

export async function getContactsCount() {
  const { count, error } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true });
  
  if (error) throw error;
  return count || 0;
}

export async function getContactsStats() {
  const [total, leads, engaged, partners, vips] = await Promise.all([
    supabase.from('contacts').select('*', { count: 'exact', head: true }),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('relationship_stage', 'lead'),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('relationship_stage', 'engaged'),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('relationship_stage', 'partner'),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('relationship_stage', 'vip'),
  ]);

  return {
    total: total.count || 0,
    leads: leads.count || 0,
    engaged: engaged.count || 0,
    partners: partners.count || 0,
    vips: vips.count || 0,
  };
}
