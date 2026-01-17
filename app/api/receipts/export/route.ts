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
    .from('receipts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error(`[receipts][EXPORT] requestId=${requestId} error`, error);
    return jsonErrorResponse(
      '엑셀 생성 실패',
      requestId,
      { status: 500 },
      serializeSupabaseError(error)
    );
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
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="receipts.xlsx"',
      'x-request-id': requestId
    }
  });
}
