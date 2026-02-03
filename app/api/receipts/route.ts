import type { NextRequest } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase';
import { phoneRegex, validateRequired } from '@/lib/validation';
import { requireAdmin } from '@/lib/admin';
import { normalizeVehicleNumber } from '@/lib/normalizeVehicleNumber';
import { resolveCenterId } from '@/lib/centers';
import {
  createRequestId,
  jsonErrorResponse,
  jsonResponse,
  serializeSupabaseError
} from '@/lib/apiUtils';

const BUCKET = process.env.SUPABASE_VIN_ENGINE_BUCKET ?? 'vin-engine';

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  console.log(`[receipts][POST] requestId=${requestId}`);

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
        `?„ìˆ˜ ê°??„ë½: ${missing.join(', ')}`,
        requestId,
        { status: 400 }
      );
    }

    if (phone && !phoneRegex.test(phone)) {
      return jsonErrorResponse('?„í™”ë²ˆí˜¸ ?•ì‹???¬ë°”ë¥´ì? ?ŠìŠµ?ˆë‹¤.', requestId, { status: 400 });
    }

    const mileageKm = Number(mileageRaw);
    if (Number.isNaN(mileageKm) || mileageKm < 0) {
      return jsonErrorResponse('ì£¼í–‰ê±°ë¦¬ ê°’ì„ ?•ì¸?´ì£¼?¸ìš”.', requestId, { status: 400 });
    }

    const supabaseServer = getSupabaseServer();
    const centerId = await resolveCenterId(request);
    if (!centerId) {
      return jsonErrorResponse('¼¾ÅÍ Á¤º¸¸¦ È®ÀÎÇÒ ¼ö ¾ø½À´Ï´Ù.', requestId, { status: 400 });
    }

    let vinUrl: string | null = null;
    let engineUrl: string | null = null;

    if (vinImage) {
      const vinPath = `${crypto.randomUUID()}-${vinImage.name}`;
      const vinUpload = await supabaseServer.storage.from(BUCKET).upload(vinPath, vinImage, {
        contentType: vinImage.type
      });

      if (vinUpload.error) {
        console.error(`[receipts][POST] requestId=${requestId} vin upload error`, vinUpload.error);
        return jsonErrorResponse(
          'ì°¨ë?ë²ˆí˜¸ ?…ë¡œ???¤íŒ¨',
          requestId,
          { status: 500 },
          serializeSupabaseError(vinUpload.error),
          'vin_upload'
        );
      }

      vinUrl = supabaseServer.storage.from(BUCKET).getPublicUrl(vinPath).data.publicUrl;
    }

    if (engineImage) {
      const enginePath = `${crypto.randomUUID()}-${engineImage.name}`;
      const engineUpload = await supabaseServer
        .storage
        .from(BUCKET)
        .upload(enginePath, engineImage, {
          contentType: engineImage.type
        });

      if (engineUpload.error) {
        console.error(
          `[receipts][POST] requestId=${requestId} engine upload error`,
          engineUpload.error
        );
        return jsonErrorResponse(
          '?”ì§„ë²ˆí˜¸ ?…ë¡œ???¤íŒ¨',
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
      .from('receipts')
      .insert({
        center_id: centerId,
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
      console.error(`[receipts][POST] requestId=${requestId} db insert error`, error);
      return jsonErrorResponse(
        '?€???¤íŒ¨',
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
      console.error(
        `[receipts][POST] requestId=${requestId} profile upsert error`,
        profileError
      );
      return jsonErrorResponse(
        '?„ë¡œ??ìµœì‹ ???¤íŒ¨',
        requestId,
        { status: 500 },
        serializeSupabaseError(profileError),
        'profile_upsert'
      );
    }

    return jsonResponse(
      {
        message: '?‘ìˆ˜ê°€ ?±ë¡?˜ì—ˆ?µë‹ˆ?? ê³ ê°/ì°¨ëŸ‰ ?•ë³´ê°€ ìµœì‹ ?¼ë¡œ ?€?¥ë˜?ˆìŠµ?ˆë‹¤.',
        data
      },
      { status: 200 },
      requestId
    );
  } catch (error) {
    console.error(`[receipts][POST] requestId=${requestId} unexpected error`, error);
    return jsonErrorResponse('?œë²„ ?¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.', requestId, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const requestId = createRequestId();
  console.log(`[receipts][GET] requestId=${requestId}`);
  const isAdmin = await requireAdmin(request);
  if (!isAdmin) {
    return jsonErrorResponse('?¸ì¦ ?„ìš”', requestId, { status: 401 });
  }

  const supabaseServer = getSupabaseServer();
  const { data, error } = await supabaseServer
    .from('receipts')
    .select('*')
    .eq('center_id', isAdmin.center_id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(`[receipts][GET] requestId=${requestId} error`, error);
    return jsonErrorResponse(
      'ì¡°íšŒ ?¤íŒ¨',
      requestId,
      { status: 500 },
      serializeSupabaseError(error)
    );
  }

  return jsonResponse({ data }, { status: 200 }, requestId);
}
