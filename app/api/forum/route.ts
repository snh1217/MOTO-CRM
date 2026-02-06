import type { NextRequest } from 'next/server';
import { createRequestId, jsonErrorResponse, jsonResponse, serializeSupabaseError } from '@/lib/apiUtils';
import { getSupabaseServer } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';

const BUCKET = process.env.SUPABASE_FORUM_BUCKET ?? 'vin-engine';

type ForumPostRow = {
  id: string;
  author_name: string;
  author_user_id: string;
  content: string;
  created_at: string;
  updated_at?: string | null;
  center_id: string;
  centers?: { name: string } | null;
};

export async function GET(request: NextRequest) {
  const requestId = createRequestId();
  const admin = await requireAdmin(request);
  if (!admin) {
    return jsonErrorResponse('로그인이 필요합니다.', requestId, { status: 401 });
  }

  const supabaseServer = getSupabaseServer();
  const { data: posts, error } = await supabaseServer
    .from('forum_posts')
    .select('id, author_name, author_user_id, content, created_at, updated_at, center_id, centers(name)')
    .eq('center_id', admin.center_id)
    .order('created_at', { ascending: false });

  if (error) {
    return jsonErrorResponse('게시글을 불러오지 못했습니다.', requestId, { status: 500 }, serializeSupabaseError(error));
  }

  const postIds = posts?.map((post) => post.id) ?? [];
  let media: any[] = [];
  let comments: any[] = [];

  if (postIds.length > 0) {
    const mediaRes = await supabaseServer
      .from('forum_post_media')
      .select('id, post_id, url, mime_type, created_at')
      .in('post_id', postIds)
      .order('created_at', { ascending: true });

    if (!mediaRes.error) {
      media = mediaRes.data ?? [];
    }

    const commentRes = await supabaseServer
      .from('forum_comments')
      .select('id, post_id, author_name, author_user_id, content, created_at')
      .in('post_id', postIds)
      .order('created_at', { ascending: true });

    if (!commentRes.error) {
      comments = commentRes.data ?? [];
    }
  }

  const mediaByPost = media.reduce<Record<string, any[]>>((acc, item) => {
    acc[item.post_id] = acc[item.post_id] ?? [];
    acc[item.post_id].push(item);
    return acc;
  }, {});

  const commentsByPost = comments.reduce<Record<string, any[]>>((acc, item) => {
    acc[item.post_id] = acc[item.post_id] ?? [];
    acc[item.post_id].push(item);
    return acc;
  }, {});

  const list = (posts as ForumPostRow[] | null)?.map((post) => ({
    ...post,
    center_name: post.centers?.name ?? '',
    media: mediaByPost[post.id] ?? [],
    comments: commentsByPost[post.id] ?? []
  })) ?? [];

  return jsonResponse({ data: list }, { status: 200 }, requestId);
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  const admin = await requireAdmin(request);
  if (!admin) {
    return jsonErrorResponse('로그인이 필요합니다.', requestId, { status: 401 });
  }

  try {
    const contentType = request.headers.get('content-type') ?? '';
    let content = '';
    let files: File[] = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      content = String(formData.get('content') ?? '').trim();
      files = (formData.getAll('media') as File[]) ?? [];
    } else {
      const body = await request.json().catch(() => ({}));
      content = String(body.content ?? '').trim();
    }

    if (!content) {
      return jsonErrorResponse('내용을 입력해 주세요.', requestId, { status: 400 });
    }

    const authorName = admin.username || admin.email || '관리자';
    const supabaseServer = getSupabaseServer();
    const { data: centerInfo } = await supabaseServer
      .from('centers')
      .select('name')
      .eq('id', admin.center_id)
      .maybeSingle();
    const centerName = centerInfo?.name ?? '';
    const { data: post, error } = await supabaseServer
      .from('forum_posts')
      .insert({
        center_id: admin.center_id,
        author_user_id: admin.id,
        author_name: authorName,
        content
      })
      .select('id, author_name, author_user_id, content, created_at, updated_at, center_id')
      .single();

    if (error || !post) {
      return jsonErrorResponse('게시글 저장에 실패했습니다.', requestId, { status: 500 }, serializeSupabaseError(error));
    }

    const mediaRows: any[] = [];
    if (files.length > 0) {
      for (const file of files) {
        if (!file || typeof file.arrayBuffer !== 'function') continue;
        const path = `forum/${admin.center_id}/${post.id}/${crypto.randomUUID()}-${file.name}`;
        const upload = await supabaseServer.storage.from(BUCKET).upload(path, file, {
          contentType: file.type
        });

        if (upload.error) {
          return jsonErrorResponse(
            '미디어 업로드에 실패했습니다.',
            requestId,
            { status: 500 },
            serializeSupabaseError(upload.error),
            'media_upload'
          );
        }

        const publicUrl = supabaseServer.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
        const { data: mediaRow, error: mediaError } = await supabaseServer
          .from('forum_post_media')
          .insert({
            post_id: post.id,
            center_id: admin.center_id,
            path,
            url: publicUrl,
            mime_type: file.type || 'application/octet-stream'
          })
          .select('id, post_id, url, mime_type, created_at')
          .single();

        if (mediaError) {
          return jsonErrorResponse('미디어 저장에 실패했습니다.', requestId, { status: 500 }, serializeSupabaseError(mediaError));
        }

        mediaRows.push(mediaRow);
      }
    }

    await supabaseServer.from('forum_notifications').insert({
      center_id: admin.center_id,
      type: 'post',
      post_id: post.id,
      message: `${authorName}님이 게시글을 등록했습니다.`
    });

    return jsonResponse(
      {
        data: {
          ...post,
          center_name: centerName,
          media: mediaRows,
          comments: []
        }
      },
      { status: 201 },
      requestId
    );
  } catch (error) {
    return jsonErrorResponse('서버 오류가 발생했습니다.', requestId, { status: 500 });
  }
}
