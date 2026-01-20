import type { NextRequest } from 'next/server';
import ExcelJS from 'exceljs';
import { getSupabaseServer } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';
import { createRequestId, jsonErrorResponse, serializeSupabaseError } from '@/lib/apiUtils';

export async function GET(request: NextRequest) {
  const requestId = createRequestId();
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
    console.error(`[inquiries][EXPORT] requestId=${requestId} error`, error);
    return jsonErrorResponse(
      '엑셀 생성 실패',
      requestId,
      { status: 500 },
      serializeSupabaseError(error)
    );
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Inquiries');

  sheet.columns = [
    { header: '등록일', key: 'created_at', width: 20 },
    { header: '성명', key: 'customer_name', width: 16 },
    { header: '전화번호', key: 'phone', width: 16 },
    { header: '문의내용', key: 'content', width: 40 },
    { header: '연락유무', key: 'contacted', width: 12 }
  ];

  data?.forEach((inquiry) => {
    sheet.addRow({
      ...inquiry,
      created_at: new Date(inquiry.created_at).toLocaleString('ko-KR'),
      contacted: inquiry.contacted ? '완료' : '미연락'
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="inquiries.xlsx"',
      'x-request-id': requestId
    }
  });
}
