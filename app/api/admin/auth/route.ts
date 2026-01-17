import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { buildAdminCookie, signAdminToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const { code } = await request.json();
  const adminCode = process.env.ADMIN_CODE;

  if (!adminCode) {
    return NextResponse.json({ message: 'ADMIN_CODE is not set' }, { status: 500 });
  }

  if (!code || code !== adminCode) {
    return NextResponse.json({ message: '코드가 올바르지 않습니다.' }, { status: 401 });
  }

  const token = await signAdminToken();
  const response = NextResponse.json({ message: '인증되었습니다.' });
  response.cookies.set(buildAdminCookie(token));
  return response;
}
