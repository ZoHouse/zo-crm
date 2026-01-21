import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Server-side Supabase client
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    throw new Error('Missing Supabase credentials');
  }
  
  return createClient(url, key);
}

const VALID_STAGES = ['lead', 'contact', 'engaged', 'partner', 'vip', 'inactive'];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { first_name, last_name, email, company, job_title, phone, stage } = body;

    // Validate required fields
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate stage if provided
    const relationship_stage = stage && VALID_STAGES.includes(stage) ? stage : 'lead';

    const supabase = getSupabase();
    const now = new Date().toISOString();

    // Create new lead
    const { data, error } = await supabase
      .from('contacts')
      .insert({
        id: crypto.randomUUID(),
        first_name: first_name || null,
        last_name: last_name || null,
        email,
        company: company || null,
        job_title: job_title || null,
        phone: phone || null,
        relationship_stage,
        source: 'manual',
        lead_score: 0,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating lead:', error);
      return NextResponse.json(
        { error: 'Failed to create lead' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in POST /api/leads:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
