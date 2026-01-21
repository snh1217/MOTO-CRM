import type { NextRequest } from 'next/server';
import ExcelJS from 'exceljs';
import { getSupabaseServer } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';
import { createRequestId, jsonErrorResponse, serializeSupabaseError } from '@/lib/apiUtils';

function pad(value: number) {
  return value.toString().padStart(2, '0');
}

function formatDate(dateValue: string | number | Date | null) {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDateTime(dateValue: string | number | Date | null) {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  return `${formatDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export async function GET(request: NextRequest) {
  const requestId = createRequestId();
  console.log(`[inquiries][EXPORT] requestId=${requestId}`);
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
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  sheet.columns = [
    { header: '문의일', key: 'created_at', width: 18 },
    { header: '성명', key: 'customer_name', width: 16 },
    { header: '전화번호', key: 'phone', width: 16 },
    { header: '문의내용', key: 'content', width: 40 },
    { header: '연락유무', key: 'contacted', width: 12 }
  ];

  sheet.getRow(1).font = { bold: true };

  data?.forEach((inquiry) => {
    sheet.addRow({
      created_at: formatDateTime(inquiry.created_at ?? null),
      customer_name: inquiry.customer_name ?? '',
      phone: inquiry.phone ?? '',
      content: inquiry.content ?? '',
      contacted: inquiry.contacted ? '완료' : '미연락'
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const today = formatDate(new Date());
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="MOTO-CRM_문의내역_${today}.xlsx"`,
      'x-request-id': requestId
    }
  });
}
