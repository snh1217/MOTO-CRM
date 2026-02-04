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

function splitVehicleName(vehicleName: string | null) {
  if (!vehicleName) return { brand: '', model: '' };
  const tokens = vehicleName.trim().split(/\s+/);
  if (tokens.length === 0) return { brand: '', model: '' };
  return {
    brand: tokens[0],
    model: tokens.slice(1).join(' ')
  };
}

export async function GET(request: NextRequest) {
  const requestId = createRequestId();
  console.log(`[as][EXPORT] requestId=${requestId}`);
  const isAdmin = await requireAdmin(request);
  if (!isAdmin) {
    return jsonErrorResponse('인증 필요', requestId, { status: 401 });
  }

  const supabaseServer = getSupabaseServer();
  const { data, error } = await supabaseServer
    .from('as_receipts')
    .select('*')
    .eq('center_id', isAdmin.center_id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(`[as][EXPORT] requestId=${requestId} error`, error);
    return jsonErrorResponse('엑셀 생성 실패', requestId, { status: 500 }, serializeSupabaseError(error));
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('AS');
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  sheet.columns = [
    { header: '접수일', key: 'created_at', width: 18 },
    { header: '브랜드', key: 'brand', width: 12 },
    { header: '모델', key: 'model', width: 18 },
    { header: '차량번호', key: 'vehicle_number', width: 16 },
    { header: '주행거리(km)', key: 'mileage_km', width: 14 },
    { header: '증상', key: 'symptom', width: 24 },
    { header: '정비내용', key: 'service_detail', width: 24 },
    { header: '성명', key: 'customer_name', width: 14 },
    { header: '전화번호', key: 'phone', width: 16 },
    { header: '구입일자', key: 'purchase_date', width: 14 },
    { header: 'VIN 사진 URL', key: 'vin_image_url', width: 30 },
    { header: '엔진번호 사진 URL', key: 'engine_image_url', width: 30 }
  ];

  sheet.getRow(1).font = { bold: true };

  data?.forEach((receipt) => {
    const vehicleInfo = splitVehicleName(receipt.vehicle_name ?? null);
    sheet.addRow({
      created_at: formatDateTime(receipt.created_at ?? null),
      brand: vehicleInfo.brand,
      model: vehicleInfo.model,
      vehicle_number: receipt.vehicle_number ?? '',
      mileage_km: receipt.mileage_km ?? '',
      symptom: receipt.symptom ?? '',
      service_detail: receipt.service_detail ?? '',
      customer_name: receipt.customer_name ?? '',
      phone: receipt.phone ?? '',
      purchase_date: formatDate(receipt.purchase_date ?? null),
      vin_image_url: receipt.vin_image_url ?? '',
      engine_image_url: receipt.engine_image_url ?? ''
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const today = formatDate(new Date());
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="MOTO-CRM_AS내역_${today}.xlsx"`,
      'x-request-id': requestId
    }
  });
}
