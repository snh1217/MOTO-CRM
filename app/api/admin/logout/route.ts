import { clearAdminCookie } from '@/lib/auth';
import { createRequestId, jsonResponse } from '@/lib/apiUtils';

export async function POST() {
  const requestId = createRequestId();
  console.log(`[admin][LOGOUT] requestId=${requestId}`);
  const response = jsonResponse({ message: '로그아웃되었습니다.' }, { status: 200 }, requestId);
  response.cookies.set(clearAdminCookie());
  return response;
}
