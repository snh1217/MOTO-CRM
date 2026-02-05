import type { NextRequest } from 'next/server';
import { createRequestId, jsonErrorResponse, jsonResponse, serializeSupabaseError } from '@/lib/apiUtils';
import { getSupabaseServer } from '@/lib/supabase';
import { requireSuperAdmin } from '@/lib/admin';

export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
  const requestId = createRequestId();
  const admin = await requireSuperAdmin(request);
  if (!admin) {
    return jsonErrorResponse('권한이 없습니다.', requestId, { status: 403 });
  }

  try {
    const { id } = context.params;
    const body = await request.json().catch(() => ({}));
    const action = String(body.action ?? '').toLowerCase();
    const centerId = String(body.center_id ?? '').trim();

    if (!id) {
      return jsonErrorResponse('요청 ID가 필요합니다.', requestId, { status: 400 });
    }

    const supabaseServer = getSupabaseServer();
    const { data: requestRow, error: requestError } = await supabaseServer
      .from('admin_requests')
      .select('id, username, password_hash, status')
      .eq('id', id)
      .single();

    if (requestError || !requestRow) {
      return jsonErrorResponse('요청을 찾을 수 없습니다.', requestId, { status: 404 }, serializeSupabaseError(requestError));
    }

    if (requestRow.status !== 'pending') {
      return jsonErrorResponse('이미 처리된 요청입니다.', requestId, { status: 409 });
    }

    if (action === 'approve') {
      if (!centerId) {
        return jsonErrorResponse('센터를 선택해 주세요.', requestId, { status: 400 });
      }

      const { data: existing } = await supabaseServer
        .from('admin_users')
        .select('id')
        .eq('username', requestRow.username)
        .maybeSingle();

      if (existing) {
        return jsonErrorResponse('이미 존재하는 사용자명입니다.', requestId, { status: 409 });
      }

      const { data: insertedUser, error: insertError } = await supabaseServer
        .from('admin_users')
        .insert({
          username: requestRow.username,
          password_hash: requestRow.password_hash,
          center_id: centerId,
          is_active: true
        })
        .select('id, username, center_id, created_at')
        .single();

      if (insertError) {
        return jsonErrorResponse(
          '관리자 계정을 생성하지 못했습니다.',
          requestId,
          { status: 500 },
          serializeSupabaseError(insertError)
        );
      }

      const { data: updatedRequest, error: updateError } = await supabaseServer
        .from('admin_requests')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: admin.id,
          center_id: centerId
        })
        .eq('id', id)
        .select('id, username, status, approved_at, center_id')
        .single();

      if (updateError) {
        return jsonErrorResponse(
          '요청 상태 업데이트에 실패했습니다.',
          requestId,
          { status: 500 },
          serializeSupabaseError(updateError)
        );
      }

      return jsonResponse({ data: updatedRequest, user: insertedUser }, { status: 200 }, requestId);
    }

    if (action === 'reject') {
      const { data: updatedRequest, error: updateError } = await supabaseServer
        .from('admin_requests')
        .update({
          status: 'rejected',
          approved_at: new Date().toISOString(),
          approved_by: admin.id
        })
        .eq('id', id)
        .select('id, username, status, approved_at')
        .single();

      if (updateError) {
        return jsonErrorResponse(
          '요청 상태 업데이트에 실패했습니다.',
          requestId,
          { status: 500 },
          serializeSupabaseError(updateError)
        );
      }

      return jsonResponse({ data: updatedRequest }, { status: 200 }, requestId);
    }

    return jsonErrorResponse('지원하지 않는 작업입니다.', requestId, { status: 400 });
  } catch (error) {
    return jsonErrorResponse('서버 오류가 발생했습니다.', requestId, { status: 500 });
  }
}
