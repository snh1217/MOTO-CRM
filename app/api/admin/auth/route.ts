import type { NextRequest } from 'next/server';
import { buildAdminCookie, signAdminToken } from '@/lib/auth';
import { createRequestId, jsonErrorResponse, jsonResponse } from '@/lib/apiUtils';

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  console.log(`[admin][AUTH] requestId=${requestId}`);
  try {
    const { code } = await request.json();
    const adminCode = process.env.ADMIN_CODE;

    if (!adminCode) {
      return jsonErrorResponse('ADMIN_CODE is not set', requestId, { status: 500 });
    }

    if (!code || code !== adminCode) {
      return jsonErrorResponse('코드가 올바르지 않습니다.', requestId, { status: 401 });
    }

    const token = await signAdminToken();
    const response = jsonResponse({ message: '인증되었습니다.' }, { status: 200 }, requestId);
    response.cookies.set(buildAdminCookie(token));
    return response;
  } catch (error) {
    console.error(`[admin][AUTH] requestId=${requestId} error`, error);
    return jsonErrorResponse('서버 오류가 발생했습니다.', requestId, { status: 500 });
  }
}
