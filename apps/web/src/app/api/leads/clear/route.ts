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
    
    let totalDeleted = 0;
    const batchSize = 100;
    
    // Delete in batches to avoid rate limits
    while (true) {
      // Get a batch of IDs to delete
      const { data: batch, error: fetchError } = await supabase
        .from('contacts')
        .select('id')
        .limit(batchSize);
      
      if (fetchError) {
        console.error('Error fetching batch:', fetchError);
        break;
      }
      
      if (!batch || batch.length === 0) {
        break; // No more records to delete
      }
      
      const ids = batch.map(row => row.id);
      
      // Delete this batch
      const { error: deleteError } = await supabase
        .from('contacts')
        .delete()
        .in('id', ids);
      
      if (deleteError) {
        console.error('Error deleting batch:', deleteError);
        return NextResponse.json(
          { error: 'Failed to clear leads', deleted: totalDeleted },
          { status: 500 }
        );
      }
      
      totalDeleted += ids.length;
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return NextResponse.json({ success: true, message: `Cleared ${totalDeleted} leads` });
  } catch (error) {
    console.error('Error in DELETE /api/leads/clear:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
