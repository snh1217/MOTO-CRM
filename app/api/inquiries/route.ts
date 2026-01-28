import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase';
import { phoneRegex, validateRequired } from '@/lib/validation';
import { requireAdmin } from '@/lib/admin';
import { createRequestId, jsonErrorResponse, jsonResponse, serializeSupabaseError } from '@/lib/apiUtils';

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  console.log(`[inquiries][POST] requestId=${requestId}`);
  try {
    const body = await request.json();
    const customerName = String(body.customer_name ?? '').trim();
    const phone = String(body.phone ?? '').trim();
    const content = String(body.content ?? '').trim();

    const missing = validateRequired({
      customer_name: customerName,
      phone,
      content
    });

    if (missing.length > 0) {
      return jsonErrorResponse(
        `필수 값 누락: ${missing.join(', ')}`,
        requestId,
        { status: 400 }
      );
    }

    if (!phoneRegex.test(phone)) {
      return jsonErrorResponse('전화번호 형식이 올바르지 않습니다.', requestId, { status: 400 });
    }

    const supabaseServer = getSupabaseServer();
    const { data, error } = await supabaseServer
      .from('inquiries')
      .insert({
        customer_name: customerName,
        phone,
        content,
        contacted: false
      })
      .select()
      .single();

    if (error) {
      console.error(`[inquiries][POST] requestId=${requestId} error`, error);
      return jsonErrorResponse(
        '저장 실패',
        requestId,
        { status: 500 },
        serializeSupabaseError(error)
      );
    }

    return jsonResponse({ message: '문의가 등록되었습니다.', data }, { status: 200 }, requestId);
  } catch (error) {
    console.error(`[inquiries][POST] requestId=${requestId} error`, error);
    return jsonErrorResponse('서버 오류가 발생했습니다.', requestId, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
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
    .select('id, created_at, customer_name, phone, contacted, note')
    .order('created_at', { ascending: false });
  const dbMs = performance.now() - dbStart;

  if (error) {
    console.error(`[inquiries][GET] requestId=${requestId} error`, error);
    return jsonErrorResponse(
      '조회 실패',
      requestId,
      { status: 500 },
      serializeSupabaseError(error)
    );
  }

  const serializeStart = performance.now();
  const list =
    data?.map((inquiry) => {
      const noteValue = typeof inquiry.note === 'string' ? inquiry.note.trim() : '';
      return {
        id: inquiry.id,
        created_at: inquiry.created_at,
        customer_name: inquiry.customer_name,
        phone: inquiry.phone,
        contacted: inquiry.contacted,
        note_exists: noteValue.length > 0,
        note_preview: noteValue ? noteValue.slice(0, 30) : ''
      };
    }) ?? [];
  const serializeMs = performance.now() - serializeStart;
  const totalMs = performance.now() - startedAt;
  const payloadBytes = JSON.stringify(list).length;
  const debug = request.nextUrl.searchParams.get('debug') === '1';
  const timings = {
    t_total_ms: Math.round(totalMs),
    t_auth_ms: Math.round(authMs),
    t_db_ms: Math.round(dbMs),
    t_serialize_ms: Math.round(serializeMs)
  };

  console.log(
    `[inquiries][GET] requestId=${requestId} total=${timings.t_total_ms} auth=${timings.t_auth_ms} db=${timings.t_db_ms} serialize=${timings.t_serialize_ms} count=${list.length} bytes=${payloadBytes}`
  );

  const responseBody = debug
    ? { requestId, data: list, timings }
    : { requestId, data: list };
  const response = NextResponse.json(responseBody, { status: 200 });
  response.headers.set('x-request-id', requestId);
  response.headers.set(
    'x-server-timing',
    `total;dur=${timings.t_total_ms}, auth;dur=${timings.t_auth_ms}, db;dur=${timings.t_db_ms}, serialize;dur=${timings.t_serialize_ms}`
  );
  response.headers.set('x-payload-bytes', String(payloadBytes));
  return response;
}
