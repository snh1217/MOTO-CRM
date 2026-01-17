import type { NextRequest } from 'next/server';
import { getTokenFromRequest, verifyAdminToken } from './auth';

export async function requireAdmin(request: NextRequest) {
  const token = getTokenFromRequest(request);
  if (!token) {
    return false;
  }
  try {
    return await verifyAdminToken(token);
  } catch (error) {
    return false;
  }
}
