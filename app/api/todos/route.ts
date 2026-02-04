import type { NextRequest } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';
import { createRequestId, jsonErrorResponse, jsonResponse, serializeSupabaseError } from '@/lib/apiUtils';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(dateValue: string) {
  return DATE_PATTERN.test(dateValue);
}

export async function GET(request: NextRequest) {
  const requestId = createRequestId();
  const startedAt = performance.now();
  console.log(`[todos][GET] requestId=${requestId}`);
  const isAdmin = await requireAdmin(request);
  if (!isAdmin) {
    return jsonErrorResponse('로그인이 필요합니다.', requestId, { status: 401 });
  }

  const date = request.nextUrl.searchParams.get('date') ?? '';
  if (!isValidDate(date)) {
    return jsonErrorResponse('잘못된 날짜 형식입니다.', requestId, { status: 400 });
  }

  const supabaseServer = getSupabaseServer();
  const { data, error } = await supabaseServer
    .from('todos')
    .select('date, items, updated_at')
    .eq('date', date)
    .eq('center_id', isAdmin.center_id)
    .maybeSingle();

  if (error) {
    console.error(`[todos][GET] requestId=${requestId} error`, error);
    return jsonErrorResponse('조회에 실패했습니다.', requestId, { status: 500 }, serializeSupabaseError(error));
  }

  const totalMs = Math.round(performance.now() - startedAt);
  console.log(`[todos][GET] requestId=${requestId} total=${totalMs}ms`);

  return jsonResponse(
    {
      data: {
        date,
        items: data?.items ?? []
      }
    },
    { status: 200 },
    requestId
  );
}

export async function PUT(request: NextRequest) {
  const requestId = createRequestId();
  const startedAt = performance.now();
  console.log(`[todos][PUT] requestId=${requestId}`);
  const isAdmin = await requireAdmin(request);
  if (!isAdmin) {
    return jsonErrorResponse('로그인이 필요합니다.', requestId, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const date = typeof body.date === 'string' ? body.date : '';
  const items = Array.isArray(body.items) ? body.items.map((item: unknown) => String(item)) : [];

  if (!isValidDate(date)) {
    return jsonErrorResponse('잘못된 날짜 형식입니다.', requestId, { status: 400 });
  }

  const supabaseServer = getSupabaseServer();
  const { data, error } = await supabaseServer
    .from('todos')
    .upsert({
      center_id: isAdmin.center_id,
      date,
      items,
      updated_at: new Date().toISOString()
    }, { onConflict: 'center_id,date' })
    .select('date, items')
    .single();

  if (error) {
    console.error(`[todos][PUT] requestId=${requestId} error`, error);
    return jsonErrorResponse('저장에 실패했습니다.', requestId, { status: 500 }, serializeSupabaseError(error));
  }

  const totalMs = Math.round(performance.now() - startedAt);
  console.log(`[todos][PUT] requestId=${requestId} total=${totalMs}ms`);

  return jsonResponse(
    {
      data: {
        date: data?.date ?? date,
        items: data?.items ?? items
      }
    },
    { status: 200 },
    requestId
  );
}
