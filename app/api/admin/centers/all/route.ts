import type { NextRequest } from 'next/server';
import { createRequestId, jsonErrorResponse, jsonResponse, serializeSupabaseError } from '@/lib/apiUtils';
import { getSupabaseServer } from '@/lib/supabase';
import { requireSuperAdmin } from '@/lib/admin';

export async function GET(request: NextRequest) {
  const requestId = createRequestId();
  const admin = await requireSuperAdmin(request);
  if (!admin) {
    return jsonErrorResponse('권한이 없습니다.', requestId, { status: 403 });
  }

  const supabaseServer = getSupabaseServer();
  const { data, error } = await supabaseServer
    .from('centers')
    .select('id, name, code')
    .order('name', { ascending: true });

  if (error) {
    return jsonErrorResponse('센터 목록을 불러오지 못했습니다.', requestId, { status: 500 }, serializeSupabaseError(error));
  }

  return jsonResponse({ data }, { status: 200 }, requestId);
}
