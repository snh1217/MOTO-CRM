import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import ExcelJS from 'exceljs';
import { supabaseServer } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';

export async function GET(request: NextRequest) {
  const isAdmin = await requireAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ message: '인증 필요' }, { status: 401 });
  }

  const { data, error } = await supabaseServer
    .from('inquiries')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ message: `엑셀 생성 실패: ${error.message}` }, { status: 500 });
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
  return new NextResponse(buffer, {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="inquiries.xlsx"'
    }
  });
}
