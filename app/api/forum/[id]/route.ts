import type { NextRequest } from 'next/server';
import { createRequestId, jsonErrorResponse, jsonResponse, serializeSupabaseError } from '@/lib/apiUtils';
import { getSupabaseServer } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';

const BUCKET = process.env.SUPABASE_FORUM_BUCKET ?? 'forum-media';

export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
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
      return jsonErrorResponse('내용을 입력해 주세요.', requestId, { status: 400 });
    }

    const supabaseServer = getSupabaseServer();
    const { data: post, error: postError } = await supabaseServer
      .from('forum_posts')
      .select('id, author_user_id, center_id')
      .eq('id', id)
      .single();

    if (postError || !post) {
      return jsonErrorResponse('게시글을 찾을 수 없습니다.', requestId, { status: 404 }, serializeSupabaseError(postError));
    }

    if (post.center_id !== admin.center_id) {
      return jsonErrorResponse('접근 권한이 없습니다.', requestId, { status: 403 });
    }

    if (!admin.is_superadmin && post.author_user_id !== admin.id) {
      return jsonErrorResponse('작성자만 수정할 수 있습니다.', requestId, { status: 403 });
    }

    const { data, error } = await supabaseServer
      .from('forum_posts')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, author_name, author_user_id, content, created_at, updated_at, center_id')
      .single();

    if (error) {
      return jsonErrorResponse('게시글 수정에 실패했습니다.', requestId, { status: 500 }, serializeSupabaseError(error));
    }

    return jsonResponse({ data }, { status: 200 }, requestId);
  } catch (error) {
    return jsonErrorResponse('서버 오류가 발생했습니다.', requestId, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  const requestId = createRequestId();
  const admin = await requireAdmin(request);
  if (!admin) {
    return jsonErrorResponse('로그인이 필요합니다.', requestId, { status: 401 });
  }

  try {
    const { id } = context.params;
    const supabaseServer = getSupabaseServer();
    const { data: post, error: postError } = await supabaseServer
      .from('forum_posts')
      .select('id, author_user_id, center_id')
      .eq('id', id)
      .single();

    if (postError || !post) {
      return jsonErrorResponse('게시글을 찾을 수 없습니다.', requestId, { status: 404 }, serializeSupabaseError(postError));
    }

    if (post.center_id !== admin.center_id) {
      return jsonErrorResponse('접근 권한이 없습니다.', requestId, { status: 403 });
    }

    if (!admin.is_superadmin && post.author_user_id !== admin.id) {
      return jsonErrorResponse('작성자만 삭제할 수 있습니다.', requestId, { status: 403 });
    }

    const { data: mediaRows } = await supabaseServer
      .from('forum_post_media')
      .select('path')
      .eq('post_id', id);

    const paths = mediaRows?.map((row) => row.path).filter(Boolean) as string[];
    if (paths && paths.length > 0) {
      await supabaseServer.storage.from(BUCKET).remove(paths);
    }

    const { error } = await supabaseServer.from('forum_posts').delete().eq('id', id);
    if (error) {
      return jsonErrorResponse('게시글 삭제에 실패했습니다.', requestId, { status: 500 }, serializeSupabaseError(error));
    }

    return jsonResponse({ message: '삭제 완료' }, { status: 200 }, requestId);
  } catch (error) {
    return jsonErrorResponse('서버 오류가 발생했습니다.', requestId, { status: 500 });
  }
}
