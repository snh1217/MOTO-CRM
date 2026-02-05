import type { NextRequest } from 'next/server';
import { createRequestId, jsonErrorResponse, jsonResponse } from '@/lib/apiUtils';
import { requireAdmin } from '@/lib/admin';

export async function GET(request: NextRequest) {
  const requestId = createRequestId();
  const admin = await requireAdmin(request);
  if (!admin) {
    return jsonErrorResponse('로그인이 필요합니다.', requestId, { status: 401 });
  }

  return jsonResponse(
    {
      data: {
        id: admin.id,
        email: admin.email,
        username: admin.username,
        center_id: admin.center_id,
        is_superadmin: Boolean(admin.is_superadmin)
      }
    },
    { status: 200 },
    requestId
  );
}
