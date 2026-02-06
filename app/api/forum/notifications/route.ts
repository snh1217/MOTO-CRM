import type { NextRequest } from 'next/server';
import { createRequestId, jsonErrorResponse, jsonResponse } from '@/lib/apiUtils';
import { getSupabaseServer } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';

export async function GET(request: NextRequest) {
  const requestId = createRequestId();
  const admin = await requireAdmin(request);
  if (!admin) {
    return jsonErrorResponse('로그인이 필요합니다.', requestId, { status: 401 });
  }

  const supabaseServer = getSupabaseServer();
  const { data: notifications, error } = await supabaseServer
    .from('forum_notifications')
    .select('id, type, message, created_at, is_read, post_id, comment_id')
    .eq('center_id', admin.center_id)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    return jsonErrorResponse('알림을 불러오지 못했습니다.', requestId, { status: 500 });
  }

  const unreadCount = notifications?.filter((item) => !item.is_read).length ?? 0;

  return jsonResponse({ data: notifications ?? [], unreadCount }, { status: 200 }, requestId);
}

export async function PATCH(request: NextRequest) {
  const requestId = createRequestId();
  const admin = await requireAdmin(request);
  if (!admin) {
    return jsonErrorResponse('로그인이 필요합니다.', requestId, { status: 401 });
  }

  const supabaseServer = getSupabaseServer();
  const { error } = await supabaseServer
    .from('forum_notifications')
    .update({ is_read: true })
    .eq('center_id', admin.center_id)
    .eq('is_read', false);

  if (error) {
    return jsonErrorResponse('알림 상태 업데이트에 실패했습니다.', requestId, { status: 500 });
  }

  return jsonResponse({ message: 'ok' }, { status: 200 }, requestId);
}
