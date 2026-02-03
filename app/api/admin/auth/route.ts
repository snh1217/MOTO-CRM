import type { NextRequest } from 'next/server';
import { createRequestId, jsonErrorResponse } from '@/lib/apiUtils';

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  console.log(`[admin][AUTH] requestId=${requestId}`);
  return jsonErrorResponse('Deprecated endpoint. Use /api/admin/login.', requestId, { status: 410 });
}
