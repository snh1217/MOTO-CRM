import type { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSupabaseServer } from '@/lib/supabase';
import { requireSuperAdmin } from '@/lib/admin';
import { createRequestId, jsonErrorResponse, jsonResponse, serializeSupabaseError } from '@/lib/apiUtils';

export async function GET(request: NextRequest) {
  const requestId = createRequestId();
  console.log(`[admin][USERS][GET] requestId=${requestId}`);
  const admin = await requireSuperAdmin(request);
  if (!admin) {
    return jsonErrorResponse('권한이 없습니다.', requestId, { status: 403 });
  }

  const supabaseServer = getSupabaseServer();
  const { data, error } = await supabaseServer
    .from('admin_users')
    .select('id, email, username, center_id, is_active, is_superadmin, created_at, centers ( name, code )')
    .eq('center_id', admin.center_id)
    .order('created_at', { ascending: false });

  if (error) {
    return jsonErrorResponse('사용자 조회에 실패했습니다.', requestId, { status: 500 }, serializeSupabaseError(error));
  }

  return jsonResponse({ data }, { status: 200 }, requestId);
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  console.log(`[admin][USERS][POST] requestId=${requestId}`);
  const admin = await requireSuperAdmin(request);
  if (!admin) {
    return jsonErrorResponse('권한이 없습니다.', requestId, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email && !username) {
    return jsonErrorResponse('이메일 또는 사용자명이 필요합니다.', requestId, { status: 400 });
  }

  if (!password) {
    return jsonErrorResponse('비밀번호가 필요합니다.', requestId, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const supabaseServer = getSupabaseServer();
  const { data, error } = await supabaseServer
    .from('admin_users')
    .insert({
      email: email || null,
      username: username || null,
      password_hash: passwordHash,
      center_id: admin.center_id,
      is_active: true,
      is_superadmin: false
    })
    .select('id, email, username, center_id, is_active, is_superadmin, created_at')
    .single();

  if (error) {
    return jsonErrorResponse('사용자 생성에 실패했습니다.', requestId, { status: 500 }, serializeSupabaseError(error));
  }

  return jsonResponse({ data }, { status: 201 }, requestId);
}
