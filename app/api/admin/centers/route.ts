import type { NextRequest } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';
import { createRequestId, jsonErrorResponse, jsonResponse, serializeSupabaseError } from '@/lib/apiUtils';

export async function GET(request: NextRequest) {
  const requestId = createRequestId();
  console.log(`[admin][CENTERS][GET] requestId=${requestId}`);
  const admin = await requireAdmin(request);
  if (!admin) {
    return jsonErrorResponse('Unauthorized', requestId, { status: 401 });
  }

  const supabaseServer = getSupabaseServer();
  const { data, error } = await supabaseServer
    .from('centers')
    .select('id, name, code')
    .eq('id', admin.center_id);

  if (error) {
    return jsonErrorResponse('Fetch failed', requestId, { status: 500 }, serializeSupabaseError(error));
  }

  return jsonResponse({ data }, { status: 200 }, requestId);
}
