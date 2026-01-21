// Prevent prerendering - database queries at runtime only
export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import { KanbanBoard } from './kanban-board';

// Server-side Supabase client
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    throw new Error('Missing Supabase credentials');
  }
  
  return createClient(url, key);
}

export interface Lead {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  company: string | null;
  job_title: string | null;
  relationship_stage: string | null;
  lead_score: number | null;
  source: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

async function getLeads(): Promise<Lead[]> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, email, phone, company, job_title, relationship_stage, lead_score, source, notes, created_at, updated_at')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching leads:', error);
    return [];
  }

  return (data || []) as Lead[];
}

export default async function LeadsPage() {
  const leads = await getLeads();

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Lead Management</h1>
        <p className="text-sm md:text-base text-gray-500">
          Drag and drop leads between stages to update their status
        </p>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 min-h-0">
        <KanbanBoard initialLeads={leads} />
      </div>
    </div>
  );
}
