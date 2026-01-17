import { NextResponse } from 'next/server';
import { clearAdminCookie } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json({ message: '로그아웃되었습니다.' });
  response.cookies.set(clearAdminCookie());
  return response;
}
