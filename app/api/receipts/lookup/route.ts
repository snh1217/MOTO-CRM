import type { NextRequest } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase';
import { normalizeVehicleNumber } from '@/lib/normalizeVehicleNumber';
import { createRequestId, jsonErrorResponse, jsonResponse, serializeSupabaseError } from '@/lib/apiUtils';

const MIN_LENGTH = 4;

export async function GET(request: NextRequest) {
  const requestId = createRequestId();
  const { searchParams } = new URL(request.url);
  const vehicleNumber = String(searchParams.get('vehicle_number') ?? '');
  const normalized = normalizeVehicleNumber(vehicleNumber);

  if (normalized.length < MIN_LENGTH) {
    return jsonResponse({ found: false }, { status: 200 }, requestId);
  }

  const supabaseServer = getSupabaseServer();
  const { data, error } = await supabaseServer
    .from('vehicle_profiles')
    .select('vehicle_number_raw, vehicle_name, mileage_km, customer_name, phone, purchase_date')
    .eq('vehicle_number_norm', normalized)
    .maybeSingle();

  if (error) {
    console.error(`[receipts][LOOKUP] requestId=${requestId} error`, error);
    return jsonErrorResponse(
      '조회 실패',
      requestId,
      { status: 500 },
      serializeSupabaseError(error)
    );
  }

  if (!data) {
    return jsonResponse({ found: false }, { status: 200 }, requestId);
  }

  return jsonResponse(
    {
      found: true,
      data
    },
    { status: 200 },
    requestId
  );
}
