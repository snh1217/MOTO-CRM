import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase';
import { normalizeVehicleNumber } from '@/lib/normalizeVehicleNumber';

const MIN_LENGTH = 4;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const vehicleNumber = String(searchParams.get('vehicle_number') ?? '');
  const normalized = normalizeVehicleNumber(vehicleNumber);

  if (normalized.length < MIN_LENGTH) {
    return NextResponse.json({ found: false }, { status: 200 });
  }

  const supabaseServer = getSupabaseServer();
  const { data, error } = await supabaseServer
    .from('vehicle_profiles')
    .select(
      'vehicle_number_raw, vehicle_name, mileage_km, customer_name, phone, purchase_date'
    )
    .eq('vehicle_number_norm', normalized)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ message: `조회 실패: ${error.message}` }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ found: false });
  }

  return NextResponse.json({
    found: true,
    data
  });
}
