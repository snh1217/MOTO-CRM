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
    .from('receipts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ message: `엑셀 생성 실패: ${error.message}` }, { status: 500 });
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Receipts');

  sheet.columns = [
    { header: '등록일', key: 'created_at', width: 20 },
    { header: '차명', key: 'vehicle_name', width: 20 },
    { header: '차량번호', key: 'vehicle_number', width: 18 },
    { header: '주행거리(km)', key: 'mileage_km', width: 15 },
    { header: '성명', key: 'customer_name', width: 14 },
    { header: '전화번호', key: 'phone', width: 16 },
    { header: '구입일자', key: 'purchase_date', width: 14 },
    { header: '차대번호 이미지', key: 'vin_image_url', width: 30 },
    { header: '엔진번호 이미지', key: 'engine_image_url', width: 30 },
    { header: '증상', key: 'symptom', width: 30 },
    { header: '정비내용', key: 'service_detail', width: 30 }
  ];

  data?.forEach((receipt) => {
    sheet.addRow({
      ...receipt,
      created_at: new Date(receipt.created_at).toLocaleString('ko-KR')
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="receipts.xlsx"'
    }
  });
}
