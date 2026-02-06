import type { NextRequest } from 'next/server';
import { createRequestId, jsonErrorResponse, jsonResponse, serializeSupabaseError } from '@/lib/apiUtils';
import { getSupabaseServer } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  const requestId = createRequestId();
  const admin = await requireAdmin(request);
  if (!admin) {
    return jsonErrorResponse('로그인이 필요합니다.', requestId, { status: 401 });
  }

  try {
    const { id } = context.params;
    const body = await request.json().catch(() => ({}));
    const content = String(body.content ?? '').trim();

    if (!content) {
      return jsonErrorResponse('댓글 내용을 입력해 주세요.', requestId, { status: 400 });
    }

    const supabaseServer = getSupabaseServer();
    const { data: post, error: postError } = await supabaseServer
      .from('forum_posts')
      .select('id, center_id')
      .eq('id', id)
      .single();

    if (postError || !post) {
      return jsonErrorResponse('게시글을 찾을 수 없습니다.', requestId, { status: 404 }, serializeSupabaseError(postError));
    }

    if (post.center_id !== admin.center_id) {
      return jsonErrorResponse('접근 권한이 없습니다.', requestId, { status: 403 });
    }

    const authorName = admin.username || admin.email || '관리자';
    const { data, error } = await supabaseServer
      .from('forum_comments')
      .insert({
        post_id: id,
        center_id: admin.center_id,
        author_user_id: admin.id,
        author_name: authorName,
        content
      })
      .select('id, post_id, author_name, author_user_id, content, created_at')
      .single();

    if (error) {
      return jsonErrorResponse('댓글 저장에 실패했습니다.', requestId, { status: 500 }, serializeSupabaseError(error));
    }

    await supabaseServer.from('forum_notifications').insert({
      center_id: admin.center_id,
      type: 'comment',
      post_id: id,
      comment_id: data.id,
      message: `${authorName}님이 댓글을 등록했습니다.`
    });

    return jsonResponse({ data }, { status: 201 }, requestId);
  } catch (error) {
    return jsonErrorResponse('서버 오류가 발생했습니다.', requestId, { status: 500 });
  }
}
