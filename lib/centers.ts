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
  const centerCode = (codeParam ?? '').trim() || DEFAULT_CENTER_CODE;
  return getCenterIdByCode(centerCode);
}
