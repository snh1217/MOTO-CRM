import type { NextRequest } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';
import { phoneRegex, validateRequired } from '@/lib/validation';
import { normalizeVehicleNumber } from '@/lib/normalizeVehicleNumber';
import { getStorageInfoFromUrl, getStoragePathFromUrl } from '@/lib/storagePath';
import {
  createRequestId,
  jsonErrorResponse,
  jsonResponse,
  serializeSupabaseError
} from '@/lib/apiUtils';

const LEGACY_BUCKET = process.env.SUPABASE_VIN_ENGINE_BUCKET ?? 'vin-engine';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const requestId = createRequestId();
  console.log(`[receipts][GET:ID] requestId=${requestId}`);
  const isAdmin = await requireAdmin(request);
  if (!isAdmin) {
    return jsonErrorResponse('?몄쬆 ?꾩슂', requestId, { status: 401 });
  }

  const supabaseServer = getSupabaseServer();
  const { data, error } = await supabaseServer
    .from('receipts')
    .select('*')
    .eq('id', params.id)
    .eq('center_id', isAdmin.center_id)
    .single();

  if (error) {
    console.error(`[receipts][GET:ID] requestId=${requestId} error`, error);
    return jsonErrorResponse('議고쉶 ?ㅽ뙣', requestId, { status: 500 }, serializeSupabaseError(error));
  }

  return jsonResponse({ data }, { status: 200 }, requestId);
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const requestId = createRequestId();
  console.log(`[receipts][PATCH] requestId=${requestId}`);
  const isAdmin = await requireAdmin(request);
  if (!isAdmin) {
    return jsonErrorResponse('?몄쬆 ?꾩슂', requestId, { status: 401 });
  }

  try {
    const supabaseServer = getSupabaseServer();
    const { data: existing, error: existingError } = await supabaseServer
      .from('receipts')
      .select('*')
      .eq('id', params.id)
      .eq('center_id', isAdmin.center_id)
      .single();

    if (existingError || !existing) {
      console.error(`[receipts][PATCH] requestId=${requestId} fetch error`, existingError);
      return jsonErrorResponse(
        '湲곗〈 ?묒닔 ?뺣낫瑜?遺덈윭?ㅼ? 紐삵뻽?듬땲??',
        requestId,
        { status: 500 },
        serializeSupabaseError(existingError)
      );
    }

    const formData = await request.formData();
    const vehicleName = String(formData.get('vehicle_name') ?? '');
    const vehicleNumber = String(formData.get('vehicle_number') ?? '');
    const mileageRaw = String(formData.get('mileage_km') ?? '');
    const customerName = String(formData.get('customer_name') ?? '').trim();
    const phone = String(formData.get('phone') ?? '').trim();
    const purchaseDate = String(formData.get('purchase_date') ?? '').trim();
    const symptom = String(formData.get('symptom') ?? '').trim();
    const serviceDetail = String(formData.get('service_detail') ?? '').trim();

    const deleteVin = String(formData.get('delete_vin_image') ?? '') === 'true';
    const deleteEngine = String(formData.get('delete_engine_image') ?? '') === 'true';
    const vinImage = formData.get('vin_image') as File | null;
    const engineImage = formData.get('engine_image') as File | null;

    const missing = validateRequired({
      vehicle_name: vehicleName,
      vehicle_number: vehicleNumber,
      mileage_km: mileageRaw
    });

    if (missing.length > 0) {
      return jsonErrorResponse(`?꾩닔 媛??꾨씫: ${missing.join(', ')}`, requestId, { status: 400 });
    }

    if (phone && !phoneRegex.test(phone)) {
      return jsonErrorResponse('?꾪솕踰덊샇 ?뺤떇???щ컮瑜댁? ?딆뒿?덈떎.', requestId, { status: 400 });
    }

    const mileageKm = Number(mileageRaw);
    if (Number.isNaN(mileageKm) || mileageKm < 0) {
      return jsonErrorResponse('二쇳뻾嫄곕━ 媛믪쓣 ?뺤씤??二쇱꽭??', requestId, { status: 400 });
    }

    let vinUrl = existing.vin_image_url as string | null;
    let engineUrl = existing.engine_image_url as string | null;

    if (deleteVin) {
      const info = getStorageInfoFromUrl(vinUrl);
      const vinPath = info?.path ?? getStoragePathFromUrl(vinUrl, LEGACY_BUCKET);
      const bucket = info?.bucket ?? LEGACY_BUCKET;
      if (vinPath) {
        await supabaseServer.storage.from(bucket).remove([vinPath]);
      }
      vinUrl = null;
    }

    if (deleteEngine) {
      const info = getStorageInfoFromUrl(engineUrl);
      const enginePath = info?.path ?? getStoragePathFromUrl(engineUrl, LEGACY_BUCKET);
      const bucket = info?.bucket ?? LEGACY_BUCKET;
      if (enginePath) {
        await supabaseServer.storage.from(bucket).remove([enginePath]);
      }
      engineUrl = null;
    }

    if (vinImage) {
      const vinPath = `${crypto.randomUUID()}-${vinImage.name}`;
      const vinBucket = process.env.SUPABASE_VIN_BUCKET ?? process.env.SUPABASE_VIN_ENGINE_BUCKET ?? 'vincode';
      const vinUpload = await supabaseServer.storage.from(vinBucket).upload(vinPath, vinImage, {
        contentType: vinImage.type
      });

      if (vinUpload.error) {
        console.error(`[receipts][PATCH] requestId=${requestId} vin upload error`, vinUpload.error);
        return jsonErrorResponse(
          'VIN ?낅줈???ㅽ뙣',
          requestId,
          { status: 500 },
          serializeSupabaseError(vinUpload.error),
          'vin_upload'
        );
      }

      vinUrl = supabaseServer.storage.from(vinBucket).getPublicUrl(vinPath).data.publicUrl;
    }

    if (engineImage) {
      const enginePath = `${crypto.randomUUID()}-${engineImage.name}`;
      const engineBucket = process.env.SUPABASE_ENGINE_BUCKET ?? process.env.SUPABASE_VIN_ENGINE_BUCKET ?? 'enginecode';
      const engineUpload = await supabaseServer.storage.from(engineBucket).upload(enginePath, engineImage, {
        contentType: engineImage.type
      });

      if (engineUpload.error) {
        console.error(
          `[receipts][PATCH] requestId=${requestId} engine upload error`,
          engineUpload.error
        );
        return jsonErrorResponse(
          '?붿쭊 ?낅줈???ㅽ뙣',
          requestId,
          { status: 500 },
          serializeSupabaseError(engineUpload.error),
          'engine_upload'
        );
      }

      engineUrl = supabaseServer.storage.from(engineBucket).getPublicUrl(enginePath).data.publicUrl;
    }

    const { data: updated, error } = await supabaseServer
      .from('receipts')
      .update({
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
      .eq('id', params.id)
      .eq('center_id', isAdmin.center_id)
      .select()
      .single();

    if (error) {
      console.error(`[receipts][PATCH] requestId=${requestId} db update error`, error);
      return jsonErrorResponse(
        '?섏젙 ????ㅽ뙣',
        requestId,
        { status: 500 },
        serializeSupabaseError(error),
        'db_update'
      );
    }

    const vehicleNumberNorm = normalizeVehicleNumber(vehicleNumber);
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
      console.error(`[receipts][PATCH] requestId=${requestId} profile upsert error`, profileError);
      return jsonErrorResponse(
        '?꾨줈??理쒖떊???ㅽ뙣',
        requestId,
        { status: 500 },
        serializeSupabaseError(profileError),
        'profile_upsert'
      );
    }

    return jsonResponse(
      {
        message: '?섏젙???꾨즺?섏뿀?듬땲??',
        data: updated
      },
      { status: 200 },
      requestId
    );
  } catch (error) {
    console.error(`[receipts][PATCH] requestId=${requestId} unexpected error`, error);
    return jsonErrorResponse('?쒕쾭 ?ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.', requestId, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const requestId = createRequestId();
  console.log(`[receipts][DELETE] requestId=${requestId}`);
  const isAdmin = await requireAdmin(request);
  if (!isAdmin) {
    return jsonErrorResponse('?몄쬆 ?꾩슂', requestId, { status: 401 });
  }

  const supabaseServer = getSupabaseServer();
  const { data: existing, error: fetchError } = await supabaseServer
    .from('receipts')
    .select('id, vin_image_url, engine_image_url')
    .eq('id', params.id)
    .eq('center_id', isAdmin.center_id)
    .single();

  if (fetchError || !existing) {
    console.error(`[receipts][DELETE] requestId=${requestId} fetch error`, fetchError);
    return jsonErrorResponse(
      '??젣???묒닔瑜?李얠쓣 ???놁뒿?덈떎.',
      requestId,
      { status: 404 },
      serializeSupabaseError(fetchError)
    );
  }

  const removals = [existing.vin_image_url, existing.engine_image_url]
    .map((url) => {
      const info = getStorageInfoFromUrl(url);
      if (info) return info;
      const path = getStoragePathFromUrl(url, LEGACY_BUCKET);
      return path ? { bucket: LEGACY_BUCKET, path } : null;
    })
    .filter((item): item is { bucket: string; path: string } => Boolean(item?.bucket && item?.path));

  if (removals.length > 0) {
    const byBucket = removals.reduce<Record<string, string[]>>((acc, item) => {
      acc[item.bucket] = acc[item.bucket] ?? [];
      acc[item.bucket].push(item.path);
      return acc;
    }, {});

    for (const [bucket, paths] of Object.entries(byBucket)) {
      const { error: storageError } = await supabaseServer.storage.from(bucket).remove(paths);
      if (storageError) {
        console.error(`[receipts][DELETE] requestId=${requestId} storage error`, storageError);
        return jsonErrorResponse(
          '?ㅽ넗由ъ? ?뚯씪 ??젣 ?ㅽ뙣',
          requestId,
          { status: 500 },
          serializeSupabaseError(storageError)
        );
      }
    }
  }
  const { error: deleteError } = await supabaseServer
    .from('receipts')
    .delete()
    .eq('id', params.id)
    .eq('center_id', isAdmin.center_id);

  if (deleteError) {
    console.error(`[receipts][DELETE] requestId=${requestId} delete error`, deleteError);
    return jsonErrorResponse('??젣 ?ㅽ뙣', requestId, { status: 500 }, serializeSupabaseError(deleteError));
  }

  return jsonResponse({ message: '??젣 ?꾨즺', id: params.id }, { status: 200 }, requestId);
}
