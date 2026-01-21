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

export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabase();

    // Delete all contacts
    const { error } = await supabase
      .from('contacts')
      .delete()
      .neq('id', ''); // This deletes all rows

    if (error) {
      console.error('Error clearing leads:', error);
      return NextResponse.json(
        { error: 'Failed to clear leads' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'All leads cleared' });
  } catch (error) {
    console.error('Error in DELETE /api/leads/clear:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
