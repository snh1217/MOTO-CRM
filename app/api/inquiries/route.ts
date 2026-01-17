import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase';
import { phoneRegex, validateRequired } from '@/lib/validation';
import { requireAdmin } from '@/lib/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const customerName = String(body.customer_name ?? '');
    const phone = String(body.phone ?? '');
    const content = String(body.content ?? '');

    const missing = validateRequired({
      customer_name: customerName,
      phone,
      content
    });

    if (missing.length > 0) {
      return NextResponse.json({ message: `필수 값 누락: ${missing.join(', ')}` }, { status: 400 });
    }

    if (!phoneRegex.test(phone)) {
      return NextResponse.json({ message: '전화번호 형식이 올바르지 않습니다.' }, { status: 400 });
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
      return NextResponse.json({ message: `저장 실패: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ message: '문의가 등록되었습니다.', data });
  } catch (error) {
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const isAdmin = await requireAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ message: '인증 필요' }, { status: 401 });
  }

  const supabaseServer = getSupabaseServer();
  const { data, error } = await supabaseServer
    .from('inquiries')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ message: `조회 실패: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ data });
}
