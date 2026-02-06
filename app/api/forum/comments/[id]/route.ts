import type { NextRequest } from 'next/server';
import { createRequestId, jsonErrorResponse, jsonResponse, serializeSupabaseError } from '@/lib/apiUtils';
import { getSupabaseServer } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';

export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  const requestId = createRequestId();
  const admin = await requireAdmin(request);
  if (!admin) {
    return jsonErrorResponse('로그인이 필요합니다.', requestId, { status: 401 });
  }

  try {
    const { id } = context.params;
    const supabaseServer = getSupabaseServer();
    const { data: comment, error: commentError } = await supabaseServer
      .from('forum_comments')
      .select('id, author_user_id, center_id')
      .eq('id', id)
      .single();

    if (commentError || !comment) {
      return jsonErrorResponse('댓글을 찾을 수 없습니다.', requestId, { status: 404 }, serializeSupabaseError(commentError));
    }

    if (comment.center_id !== admin.center_id) {
      return jsonErrorResponse('접근 권한이 없습니다.', requestId, { status: 403 });
    }

    if (!admin.is_superadmin && comment.author_user_id !== admin.id) {
      return jsonErrorResponse('작성자만 삭제할 수 있습니다.', requestId, { status: 403 });
    }

    const { error } = await supabaseServer.from('forum_comments').delete().eq('id', id);
    if (error) {
      return jsonErrorResponse('댓글 삭제에 실패했습니다.', requestId, { status: 500 }, serializeSupabaseError(error));
    }

    return jsonResponse({ message: '삭제 완료' }, { status: 200 }, requestId);
  } catch (error) {
    return jsonErrorResponse('서버 오류가 발생했습니다.', requestId, { status: 500 });
  }
}
