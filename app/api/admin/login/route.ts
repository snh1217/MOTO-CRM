import type { NextRequest } from 'next/server';
import { buildAdminCookie, signAdminToken } from '@/lib/auth';
import { createRequestId, jsonErrorResponse, jsonResponse, serializeSupabaseError } from '@/lib/apiUtils';
import { getSupabaseServer } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  try {
    const body = await request.json().catch(() => ({}));
    const identifier = String(body.identifier ?? '').trim();
    const password = String(body.password ?? '');

    if (!identifier || !password) {
      return jsonErrorResponse('아이디와 비밀번호를 입력해 주세요.', requestId, { status: 400 });
    }

    const supabaseServer = getSupabaseServer();
    const { data, error } = await supabaseServer
      .from('admin_users')
      .select('id, email, username, password_hash, center_id, is_active')
      .or(`email.eq.${identifier},username.eq.${identifier}`)
      .maybeSingle();

    if (error) {
      return jsonErrorResponse('로그인 처리 중 오류가 발생했습니다.', requestId, { status: 500 }, serializeSupabaseError(error));
    }

    if (!data || !data.is_active) {
      return jsonErrorResponse('아이디 또는 비밀번호가 올바르지 않습니다.', requestId, { status: 401 });
    }

    const valid = await bcrypt.compare(password, data.password_hash);
    if (!valid) {
      return jsonErrorResponse('아이디 또는 비밀번호가 올바르지 않습니다.', requestId, { status: 401 });
    }

    const token = await signAdminToken({ role: 'admin', userId: data.id, centerId: data.center_id });
    const response = jsonResponse(
      {
        message: '로그인 성공',
        user: {
          id: data.id,
          email: data.email,
          username: data.username,
          center_id: data.center_id
        }
      },
      { status: 200 },
      requestId
    );
    response.cookies.set(buildAdminCookie(token));
    return response;
  } catch (error) {
    return jsonErrorResponse('서버 오류가 발생했습니다.', requestId, { status: 500 });
  }
}
