import type { NextRequest } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase';
import { phoneRegex, validateRequired } from '@/lib/validation';
import { requireAdmin } from '@/lib/admin';
import { normalizeVehicleNumber } from '@/lib/normalizeVehicleNumber';
import {
  createRequestId,
  jsonErrorResponse,
  jsonResponse,
  serializeSupabaseError
} from '@/lib/apiUtils';

const BUCKET = process.env.SUPABASE_VIN_ENGINE_BUCKET ?? 'vin-engine';

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  console.log(`[as][POST] requestId=${requestId}`);

  try {
    const formData = await request.formData();
    const vehicleName = String(formData.get('vehicle_name') ?? '');
    const vehicleNumber = String(formData.get('vehicle_number') ?? '');
    const mileageRaw = String(formData.get('mileage_km') ?? '');
    const customerName = String(formData.get('customer_name') ?? '').trim();
    const phone = String(formData.get('phone') ?? '').trim();
    const purchaseDate = String(formData.get('purchase_date') ?? '').trim();
    const symptom = String(formData.get('symptom') ?? '').trim();
    const serviceDetail = String(formData.get('service_detail') ?? '').trim();

    const vinImage = formData.get('vin_image') as File | null;
    const engineImage = formData.get('engine_image') as File | null;

    const missing = validateRequired({
      vehicle_name: vehicleName,
      vehicle_number: vehicleNumber,
      mileage_km: mileageRaw
    });

    if (missing.length > 0) {
      return jsonErrorResponse(
        `필수 값 누락: ${missing.join(', ')}`,
        requestId,
        { status: 400 }
      );
    }

    if (phone && !phoneRegex.test(phone)) {
      return jsonErrorResponse('전화번호 형식이 올바르지 않습니다.', requestId, { status: 400 });
    }

    const mileageKm = Number(mileageRaw);
    if (Number.isNaN(mileageKm) || mileageKm < 0) {
      return jsonErrorResponse('주행거리 값을 확인해주세요.', requestId, { status: 400 });
    }

    const supabaseServer = getSupabaseServer();
    let vinUrl: string | null = null;
    let engineUrl: string | null = null;

    if (vinImage) {
      const vinPath = `as/vin/${crypto.randomUUID()}-${vinImage.name}`;
      const vinUpload = await supabaseServer.storage.from(BUCKET).upload(vinPath, vinImage, {
        contentType: vinImage.type
      });

      if (vinUpload.error) {
        console.error(`[as][POST] requestId=${requestId} vin upload error`, vinUpload.error);
        return jsonErrorResponse(
          'VIN 업로드 실패',
          requestId,
          { status: 500 },
          serializeSupabaseError(vinUpload.error),
          'vin_upload'
        );
      }

      vinUrl = supabaseServer.storage.from(BUCKET).getPublicUrl(vinPath).data.publicUrl;
    }

    if (engineImage) {
      const enginePath = `as/engine/${crypto.randomUUID()}-${engineImage.name}`;
      const engineUpload = await supabaseServer.storage.from(BUCKET).upload(enginePath, engineImage, {
        contentType: engineImage.type
      });

      if (engineUpload.error) {
        console.error(`[as][POST] requestId=${requestId} engine upload error`, engineUpload.error);
        return jsonErrorResponse(
          '엔진 업로드 실패',
          requestId,
          { status: 500 },
          serializeSupabaseError(engineUpload.error),
          'engine_upload'
        );
      }

      engineUrl = supabaseServer.storage.from(BUCKET).getPublicUrl(enginePath).data.publicUrl;
    }

    const vehicleNumberNorm = normalizeVehicleNumber(vehicleNumber);

    const { data, error } = await supabaseServer
      .from('as_receipts')
      .insert({
        vehicle_name: vehicleName,
        vehicle_number: vehicleNumber,
        mileage_km: mileageKm,
        customer_name: customerName || null,
        phone: phone || null,
        purchase_date: purchaseDate || null,
        vin_image_url: vinUrl,
        engine_image_url: engineUrl,
        symptom: symptom || null,
        service_detail: serviceDetail || null
      })
      .select()
      .single();

    if (error) {
      console.error(`[as][POST] requestId=${requestId} db insert error`, error);
      return jsonErrorResponse(
        '저장 실패',
        requestId,
        { status: 500 },
        serializeSupabaseError(error),
        'db_insert'
      );
    }

    const profilePayload: Record<string, string | number | null> = {
      vehicle_number_norm: vehicleNumberNorm,
      vehicle_number_raw: vehicleNumber,
      vehicle_name: vehicleName,
      mileage_km: mileageKm,
      updated_at: new Date().toISOString()
    };

    if (customerName) profilePayload.customer_name = customerName;
    if (phone) profilePayload.phone = phone;
    if (purchaseDate) profilePayload.purchase_date = purchaseDate;

    const { error: profileError } = await supabaseServer
      .from('vehicle_profiles')
      .upsert(profilePayload, { onConflict: 'vehicle_number_norm' });

    if (profileError) {
      console.error(`[as][POST] requestId=${requestId} profile upsert error`, profileError);
      return jsonErrorResponse(
        '차량 정보 최신화 실패',
        requestId,
        { status: 500 },
        serializeSupabaseError(profileError),
        'profile_upsert'
      );
    }

    return jsonResponse(
      {
        message: 'A/S 접수가 등록되었습니다. 고객/차량 정보가 최신으로 저장됩니다.',
        data
      },
      { status: 200 },
      requestId
    );
  } catch (error) {
    console.error(`[as][POST] requestId=${requestId} unexpected error`, error);
    return jsonErrorResponse('서버 오류가 발생했습니다.', requestId, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const requestId = createRequestId();
  console.log(`[as][GET] requestId=${requestId}`);
  const isAdmin = await requireAdmin(request);
  if (!isAdmin) {
    return jsonErrorResponse('인증 필요', requestId, { status: 401 });
  }

  const supabaseServer = getSupabaseServer();
  const { data, error } = await supabaseServer
    .from('as_receipts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error(`[as][GET] requestId=${requestId} error`, error);
    return jsonErrorResponse(
      '조회 실패',
      requestId,
      { status: 500 },
      serializeSupabaseError(error)
    );
  }

  return jsonResponse({ data }, { status: 200 }, requestId);
}
