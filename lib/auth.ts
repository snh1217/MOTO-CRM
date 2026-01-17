import { SignJWT, jwtVerify } from 'jose';
import type { NextRequest } from 'next/server';

const TOKEN_COOKIE = 'admin_session';
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET is required');
  }
  return new TextEncoder().encode(secret);
}

export async function signAdminToken() {
  const secret = getSecretKey();
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .sign(secret);
}

export async function verifyAdminToken(token: string) {
  const secret = getSecretKey();
  const { payload } = await jwtVerify(token, secret, {
    algorithms: ['HS256']
  });
  return payload.role === 'admin';
}

export function getTokenFromRequest(request: NextRequest) {
  return request.cookies.get(TOKEN_COOKIE)?.value;
}

export function buildAdminCookie(token: string) {
  return {
    name: TOKEN_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: TOKEN_TTL_SECONDS
  };
}

export function clearAdminCookie() {
  return {
    name: TOKEN_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0
  };
}
