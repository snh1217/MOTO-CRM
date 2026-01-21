import type { NextRequest } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';
import { createRequestId, jsonErrorResponse, jsonResponse, serializeSupabaseError } from '@/lib/apiUtils';

const DEFAULT_EXPIRES_SECONDS = 180;

export async function GET(request: NextRequest) {
  const requestId = createRequestId();
  console.log(`[storage][SIGNED_URL] requestId=${requestId}`);
  const isAdmin = await requireAdmin(request);
  if (!isAdmin) {
    return jsonErrorResponse('인증 필요', requestId, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const bucket = String(searchParams.get('bucket') ?? '').trim();
  const path = String(searchParams.get('path') ?? '').trim();
  const expiresInRaw = Number(searchParams.get('expiresIn') ?? DEFAULT_EXPIRES_SECONDS);
  const expiresIn = Number.isFinite(expiresInRaw) ? expiresInRaw : DEFAULT_EXPIRES_SECONDS;

  if (!bucket || !path) {
    return jsonErrorResponse('bucket/path가 필요합니다.', requestId, { status: 400 });
  }

  const supabaseServer = getSupabaseServer();
  const { data, error } = await supabaseServer.storage.from(bucket).createSignedUrl(path, expiresIn);

  if (error || !data?.signedUrl) {
    console.error(`[storage][SIGNED_URL] requestId=${requestId} error`, error);
    return jsonErrorResponse(
      'signed url 생성 실패',
      requestId,
      { status: 500 },
      serializeSupabaseError(error)
    );
  }

  return jsonResponse({ signedUrl: data.signedUrl }, { status: 200 }, requestId);
}
