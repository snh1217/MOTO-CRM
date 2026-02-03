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
    return jsonErrorResponse('?몄쬆 ?꾩슂', requestId, { status: 401 });
  }

  const supabaseServer = getSupabaseServer();
  const { data, error } = await supabaseServer
    .from('as_receipts')
    .select('*')
    .eq('center_id', isAdmin.center_id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(`[as][EXPORT] requestId=${requestId} error`, error);
    return jsonErrorResponse(
      '?묒? ?앹꽦 ?ㅽ뙣',
      requestId,
      { status: 500 },
      serializeSupabaseError(error)
    );
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('AS');
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  sheet.columns = [
    { header: '?묒닔??, key: 'created_at', width: 18 },
    { header: '釉뚮옖??, key: 'brand', width: 12 },
    { header: '紐⑤뜽', key: 'model', width: 18 },
    { header: '李⑤웾踰덊샇', key: 'vehicle_number', width: 16 },
    { header: '二쇳뻾嫄곕━(km)', key: 'mileage_km', width: 14 },
    { header: '利앹긽', key: 'symptom', width: 24 },
    { header: '?뺣퉬?댁슜', key: 'service_detail', width: 24 },
    { header: '?깅챸', key: 'customer_name', width: 14 },
    { header: '?꾪솕踰덊샇', key: 'phone', width: 16 },
    { header: '援ъ엯?쇱옄', key: 'purchase_date', width: 14 },
    { header: 'VIN ?ъ쭊 URL', key: 'vin_image_url', width: 30 },
    { header: '?붿쭊踰덊샇 ?ъ쭊 URL', key: 'engine_image_url', width: 30 }
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
      'Content-Disposition': `attachment; filename="MOTO-CRM_AS?댁뿭_${today}.xlsx"`,
      'x-request-id': requestId
    }
  });
}

