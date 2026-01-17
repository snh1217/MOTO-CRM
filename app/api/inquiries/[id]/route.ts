import type { NextRequest } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';
import { createRequestId, jsonErrorResponse, jsonResponse, serializeSupabaseError } from '@/lib/apiUtils';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const requestId = createRequestId();
  const isAdmin = await requireAdmin(request);
  if (!isAdmin) {
    return jsonErrorResponse('인증 필요', requestId, { status: 401 });
  }

  const body = await request.json();
  const contacted = Boolean(body.contacted);

  const supabaseServer = getSupabaseServer();
  const { data, error } = await supabaseServer
    .from('inquiries')
    .update({ contacted })
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    console.error(`[inquiries][PATCH] requestId=${requestId} error`, error);
    return jsonErrorResponse(
      '업데이트 실패',
      requestId,
      { status: 500 },
      serializeSupabaseError(error)
    );
  }

  return jsonResponse({ message: '업데이트 완료', data }, { status: 200 }, requestId);
}
