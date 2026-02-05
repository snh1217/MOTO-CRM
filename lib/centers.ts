import type { NextRequest } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase';

const DEFAULT_CENTER_CODE = process.env.DEFAULT_CENTER_CODE ?? 'default';

export async function getCenterIdByCode(code: string) {
  const supabaseServer = getSupabaseServer();
  const { data, error } = await supabaseServer
    .from('centers')
    .select('id')
    .eq('code', code)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.id as string;
}

export async function resolveCenterId(request: NextRequest, adminCenterId?: string | null) {
  if (adminCenterId) {
    return adminCenterId;
  }

  const codeParam = request.nextUrl.searchParams.get('center');
  const centerCode = (codeParam ?? '').trim();
  if (centerCode) {
    const byParam = await getCenterIdByCode(centerCode);
    if (byParam) return byParam;
  }

  if (DEFAULT_CENTER_CODE) {
    const byDefault = await getCenterIdByCode(DEFAULT_CENTER_CODE);
    if (byDefault) return byDefault;
  }

  // 최후 폴백: 센터가 1개뿐인 경우 첫 센터를 사용
  const supabaseServer = getSupabaseServer();
  const { data } = await supabaseServer
    .from('centers')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}
