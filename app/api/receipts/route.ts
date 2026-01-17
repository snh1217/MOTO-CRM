import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase';
import { phoneRegex, validateRequired } from '@/lib/validation';
import { requireAdmin } from '@/lib/admin';
import { normalizeVehicleNumber } from '@/lib/normalizeVehicleNumber';

const BUCKET = process.env.SUPABASE_VIN_ENGINE_BUCKET ?? 'vin-engine';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const vehicleName = String(formData.get('vehicle_name') ?? '');
    const vehicleNumber = String(formData.get('vehicle_number') ?? '');
    const mileageRaw = String(formData.get('mileage_km') ?? '');
    const customerName = String(formData.get('customer_name') ?? '');
    const phone = String(formData.get('phone') ?? '');
    const purchaseDate = String(formData.get('purchase_date') ?? '');
    const symptom = String(formData.get('symptom') ?? '');
    const serviceDetail = String(formData.get('service_detail') ?? '');

    const vinImage = formData.get('vin_image') as File | null;
    const engineImage = formData.get('engine_image') as File | null;

    const missing = validateRequired({
      vehicle_name: vehicleName,
      vehicle_number: vehicleNumber,
      mileage_km: mileageRaw,
      customer_name: customerName,
      phone,
      purchase_date: purchaseDate,
      symptom,
      service_detail: serviceDetail
    });

    if (missing.length > 0) {
      return NextResponse.json({ message: `필수 값 누락: ${missing.join(', ')}` }, { status: 400 });
    }

    if (!phoneRegex.test(phone)) {
      return NextResponse.json({ message: '전화번호 형식이 올바르지 않습니다.' }, { status: 400 });
    }

    if (!vinImage || !engineImage) {
      return NextResponse.json({ message: '차대번호/엔진번호 사진이 필요합니다.' }, { status: 400 });
    }

    const mileageKm = Number(mileageRaw);
    if (Number.isNaN(mileageKm) || mileageKm < 0) {
      return NextResponse.json({ message: '주행거리 값을 확인해주세요.' }, { status: 400 });
    }

    const vinPath = `${crypto.randomUUID()}-${vinImage.name}`;
    const enginePath = `${crypto.randomUUID()}-${engineImage.name}`;

    const supabaseServer = getSupabaseServer();
    const vinUpload = await supabaseServer.storage.from(BUCKET).upload(vinPath, vinImage, {
      contentType: vinImage.type
    });

    if (vinUpload.error) {
      return NextResponse.json({ message: `차대번호 업로드 실패: ${vinUpload.error.message}` }, { status: 500 });
    }

    const engineUpload = await supabaseServer.storage.from(BUCKET).upload(enginePath, engineImage, {
      contentType: engineImage.type
    });

    if (engineUpload.error) {
      return NextResponse.json({ message: `엔진번호 업로드 실패: ${engineUpload.error.message}` }, { status: 500 });
    }

    const vinUrl = supabaseServer.storage.from(BUCKET).getPublicUrl(vinPath).data.publicUrl;
    const engineUrl = supabaseServer.storage.from(BUCKET).getPublicUrl(enginePath).data.publicUrl;

    const vehicleNumberNorm = normalizeVehicleNumber(vehicleNumber);

    const { data, error } = await supabaseServer
      .from('receipts')
      .insert({
        vehicle_name: vehicleName,
        vehicle_number: vehicleNumber,
        mileage_km: mileageKm,
        customer_name: customerName,
        phone,
        purchase_date: purchaseDate,
        vin_image_url: vinUrl,
        engine_image_url: engineUrl,
        symptom,
        service_detail: serviceDetail
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ message: `저장 실패: ${error.message}` }, { status: 500 });
    }

    const { error: profileError } = await supabaseServer
      .from('vehicle_profiles')
      .upsert(
        {
          vehicle_number_norm: vehicleNumberNorm,
          vehicle_number_raw: vehicleNumber,
          vehicle_name: vehicleName,
          mileage_km: mileageKm,
          customer_name: customerName,
          phone,
          purchase_date: purchaseDate,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'vehicle_number_norm' }
      );

    if (profileError) {
      return NextResponse.json(
        { message: `프로필 최신화 실패: ${profileError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: '접수가 등록되었습니다. 고객/차량 정보가 최신으로 저장되었습니다.',
      data
    });
  } catch (error) {
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const isAdmin = await requireAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ message: '인증 필요' }, { status: 401 });
  }

  const supabaseServer = getSupabaseServer();
  const { data, error } = await supabaseServer
    .from('receipts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ message: `조회 실패: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ data });
}
