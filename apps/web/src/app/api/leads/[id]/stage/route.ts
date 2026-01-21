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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { stage } = body;

    // Validate stage
    if (!stage || !VALID_STAGES.includes(stage)) {
      return NextResponse.json(
        { error: 'Invalid stage. Must be one of: ' + VALID_STAGES.join(', ') },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Update the contact's relationship stage
    const { data, error } = await supabase
      .from('contacts')
      .update({ 
        relationship_stage: stage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating lead stage:', error);
      return NextResponse.json(
        { error: 'Failed to update lead stage' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in PATCH /api/leads/[id]/stage:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
