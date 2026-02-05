import type { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
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
    .from('admin_requests')
    .select('id, username, center_name, status, requested_at, approved_at, center_id')
    .order('requested_at', { ascending: false });

  if (error) {
    return jsonErrorResponse(
      '계정 요청 목록을 불러오지 못했습니다.',
      requestId,
      { status: 500 },
      serializeSupabaseError(error)
    );
  }

  return jsonResponse({ data }, { status: 200 }, requestId);
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  try {
    const body = await request.json().catch(() => ({}));
    const username = String(body.username ?? '').trim();
    const password = String(body.password ?? '');
    const centerName = String(body.center_name ?? '').trim();

    if (!username || !password || !centerName) {
      return jsonErrorResponse('센터명, 사용자명, 비밀번호를 입력해 주세요.', requestId, { status: 400 });
    }

    const supabaseServer = getSupabaseServer();
    const { data: existing } = await supabaseServer
      .from('admin_users')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (existing) {
      return jsonErrorResponse('이미 사용 중인 사용자명입니다.', requestId, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const { data, error } = await supabaseServer
      .from('admin_requests')
      .insert({
        username,
        password_hash: passwordHash,
        center_name: centerName,
        status: 'pending'
      })
      .select('id, username, center_name, status, requested_at')
      .single();

    if (error) {
      return jsonErrorResponse(
        '계정 생성 요청에 실패했습니다.',
        requestId,
        { status: 500 },
        serializeSupabaseError(error)
      );
    }

    return jsonResponse({ data }, { status: 201 }, requestId);
  } catch (error) {
    return jsonErrorResponse('서버 오류가 발생했습니다.', requestId, { status: 500 });
  }
}
