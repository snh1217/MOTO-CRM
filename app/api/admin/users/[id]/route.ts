import type { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
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
    const password = typeof body.password === 'string' ? body.password : null;
    const isSuperAdmin = typeof body.is_superadmin === 'boolean' ? body.is_superadmin : null;

    if (!id) {
      return jsonErrorResponse('사용자 ID가 필요합니다.', requestId, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (password) {
      updates.password_hash = await bcrypt.hash(password, 10);
    }
    if (isSuperAdmin !== null) {
      updates.is_superadmin = isSuperAdmin;
    }

    if (Object.keys(updates).length === 0) {
      return jsonErrorResponse('업데이트할 항목이 없습니다.', requestId, { status: 400 });
    }

    const supabaseServer = getSupabaseServer();
    const { data, error } = await supabaseServer
      .from('admin_users')
      .update(updates)
      .eq('id', id)
      .select('id, email, username, center_id, is_active, is_superadmin, created_at')
      .single();

    if (error) {
      return jsonErrorResponse('사용자 업데이트에 실패했습니다.', requestId, { status: 500 }, serializeSupabaseError(error));
    }

    return jsonResponse({ data }, { status: 200 }, requestId);
  } catch (error) {
    return jsonErrorResponse('서버 오류가 발생했습니다.', requestId, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  const requestId = createRequestId();
  const admin = await requireSuperAdmin(request);
  if (!admin) {
    return jsonErrorResponse('권한이 없습니다.', requestId, { status: 403 });
  }

  try {
    const { id } = context.params;
    if (!id) {
      return jsonErrorResponse('사용자 ID가 필요합니다.', requestId, { status: 400 });
    }

    const supabaseServer = getSupabaseServer();
    const { error } = await supabaseServer.from('admin_users').delete().eq('id', id);

    if (error) {
      return jsonErrorResponse('사용자 삭제에 실패했습니다.', requestId, { status: 500 }, serializeSupabaseError(error));
    }

    return jsonResponse({ message: '삭제 완료' }, { status: 200 }, requestId);
  } catch (error) {
    return jsonErrorResponse('서버 오류가 발생했습니다.', requestId, { status: 500 });
  }
}
