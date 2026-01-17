import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const isAdmin = await requireAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ message: '인증 필요' }, { status: 401 });
  }

  const body = await request.json();
  const contacted = Boolean(body.contacted);

  const { data, error } = await supabaseServer
    .from('inquiries')
    .update({ contacted })
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ message: `업데이트 실패: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ message: '업데이트 완료', data });
}
