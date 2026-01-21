import type { NextRequest } from 'next/server';
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
  console.log(`[inquiries][GET] requestId=${requestId}`);
  const isAdmin = await requireAdmin(request);
  if (!isAdmin) {
    return jsonErrorResponse('인증 필요', requestId, { status: 401 });
  }

  const supabaseServer = getSupabaseServer();
  const { data, error } = await supabaseServer
    .from('inquiries')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error(`[inquiries][GET] requestId=${requestId} error`, error);
    return jsonErrorResponse(
      '조회 실패',
      requestId,
      { status: 500 },
      serializeSupabaseError(error)
    );
  }

  return jsonResponse({ data }, { status: 200 }, requestId);
}
