import type { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSupabaseServer } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';
import { createRequestId, jsonErrorResponse, jsonResponse, serializeSupabaseError } from '@/lib/apiUtils';

export async function GET(request: NextRequest) {
  const requestId = createRequestId();
  console.log(`[admin][USERS][GET] requestId=${requestId}`);
  const admin = await requireAdmin(request);
  if (!admin) {
    return jsonErrorResponse('Unauthorized', requestId, { status: 401 });
  }

  const supabaseServer = getSupabaseServer();
  const { data, error } = await supabaseServer
    .from('admin_users')
    .select('id, email, username, center_id, is_active, created_at, centers ( name, code )')
    .eq('center_id', admin.center_id)
    .order('created_at', { ascending: false });

  if (error) {
    return jsonErrorResponse('Fetch failed', requestId, { status: 500 }, serializeSupabaseError(error));
  }

  return jsonResponse({ data }, { status: 200 }, requestId);
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  console.log(`[admin][USERS][POST] requestId=${requestId}`);
  const admin = await requireAdmin(request);
  if (!admin) {
    return jsonErrorResponse('Unauthorized', requestId, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email && !username) {
    return jsonErrorResponse('Email or username is required.', requestId, { status: 400 });
  }

  if (!password) {
    return jsonErrorResponse('Password is required.', requestId, { status: 400 });
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
      is_active: true
    })
    .select('id, email, username, center_id, is_active, created_at')
    .single();

  if (error) {
    return jsonErrorResponse('Create failed', requestId, { status: 500 }, serializeSupabaseError(error));
  }

  return jsonResponse({ data }, { status: 201 }, requestId);
}
