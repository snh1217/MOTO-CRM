import type { NextRequest } from 'next/server';
import { createRequestId, jsonErrorResponse, jsonResponse, serializeSupabaseError } from '@/lib/apiUtils';
import { getSupabaseServer } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';

export async function GET(request: NextRequest) {
  const requestId = createRequestId();
  const admin = await requireAdmin(request);
  if (!admin) {
    return jsonErrorResponse('로그인이 필요합니다.', requestId, { status: 401 });
  }

  const supabaseServer = getSupabaseServer();
  const { data, error } = await supabaseServer
    .from('forum_posts')
    .select('id, author_name, content, created_at')
    .eq('center_id', admin.center_id)
    .order('created_at', { ascending: false });

  if (error) {
    return jsonErrorResponse('게시글을 불러오지 못했습니다.', requestId, { status: 500 }, serializeSupabaseError(error));
  }

  return jsonResponse({ data }, { status: 200 }, requestId);
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  const admin = await requireAdmin(request);
  if (!admin) {
    return jsonErrorResponse('로그인이 필요합니다.', requestId, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const content = String(body.content ?? '').trim();

    if (!content) {
      return jsonErrorResponse('내용을 입력해 주세요.', requestId, { status: 400 });
    }

    const authorName = admin.username || admin.email || '관리자';
    const supabaseServer = getSupabaseServer();
    const { data, error } = await supabaseServer
      .from('forum_posts')
      .insert({
        center_id: admin.center_id,
        author_user_id: admin.id,
        author_name: authorName,
        content
      })
      .select('id, author_name, content, created_at')
      .single();

    if (error) {
      return jsonErrorResponse('게시글 저장에 실패했습니다.', requestId, { status: 500 }, serializeSupabaseError(error));
    }

    return jsonResponse({ data }, { status: 201 }, requestId);
  } catch (error) {
    return jsonErrorResponse('서버 오류가 발생했습니다.', requestId, { status: 500 });
  }
}
