import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';
import { createRequestId, jsonErrorResponse, jsonResponse, serializeSupabaseError } from '@/lib/apiUtils';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const requestId = createRequestId();
  const startedAt = performance.now();
  const authStart = performance.now();
  const isAdmin = await requireAdmin(request);
  const authMs = performance.now() - authStart;
  if (!isAdmin) {
    return jsonErrorResponse('인증 필요', requestId, { status: 401 });
  }

  const dbStart = performance.now();
  const supabaseServer = getSupabaseServer();
  const { data, error } = await supabaseServer
    .from('inquiries')
    .select('id, created_at, customer_name, phone, content, contacted, note, note_updated_at')
    .eq('id', params.id)
    .single();
  const dbMs = performance.now() - dbStart;

  if (error) {
    console.error(`[inquiries][DETAIL] requestId=${requestId} error`, error);
    return jsonErrorResponse(
      '조회 실패',
      requestId,
      { status: 500 },
      serializeSupabaseError(error)
    );
  }

  const serializeStart = performance.now();
  const payloadBytes = JSON.stringify(data ?? {}).length;
  const serializeMs = performance.now() - serializeStart;
  const totalMs = performance.now() - startedAt;
  const debug = request.nextUrl.searchParams.get('debug') === '1';
  const timings = {
    t_total_ms: Math.round(totalMs),
    t_auth_ms: Math.round(authMs),
    t_db_ms: Math.round(dbMs),
    t_serialize_ms: Math.round(serializeMs)
  };

  console.log(
    `[inquiries][DETAIL] requestId=${requestId} total=${timings.t_total_ms} auth=${timings.t_auth_ms} db=${timings.t_db_ms} serialize=${timings.t_serialize_ms} count=${data ? 1 : 0} bytes=${payloadBytes}`
  );

  const responseBody = debug
    ? { requestId, data, timings }
    : { requestId, data };
  const response = NextResponse.json(responseBody, { status: 200 });
  response.headers.set('x-request-id', requestId);
  response.headers.set(
    'x-server-timing',
    `total;dur=${timings.t_total_ms}, auth;dur=${timings.t_auth_ms}, db;dur=${timings.t_db_ms}, serialize;dur=${timings.t_serialize_ms}`
  );
  response.headers.set('x-payload-bytes', String(payloadBytes));
  return response;
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const requestId = createRequestId();
  console.log(`[inquiries][PATCH] requestId=${requestId}`);
  const isAdmin = await requireAdmin(request);
  if (!isAdmin) {
    return jsonErrorResponse('인증 필요', requestId, { status: 401 });
  }

  const body = await request.json();
  const updates: { contacted?: boolean; note?: string; note_updated_at?: string } = {};

  if (Object.prototype.hasOwnProperty.call(body, 'contacted')) {
    updates.contacted = Boolean(body.contacted);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'note')) {
    updates.note = typeof body.note === 'string' ? body.note : String(body.note ?? '');
    updates.note_updated_at = new Date().toISOString();
  }

  if (Object.keys(updates).length === 0) {
    return jsonErrorResponse('No fields to update.', requestId, { status: 400 });
  }

  const supabaseServer = getSupabaseServer();
  const { data, error } = await supabaseServer
    .from('inquiries')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    console.error(`[inquiries][PATCH] requestId=${requestId} error`, error);
    return jsonErrorResponse(
      '업데이트 실패',
      requestId,
      { status: 500 },
      serializeSupabaseError(error)
    );
  }

  return jsonResponse({ message: '업데이트 완료', data }, { status: 200 }, requestId);
}
