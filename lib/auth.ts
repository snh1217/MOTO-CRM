import { SignJWT, jwtVerify } from 'jose';
import type { NextRequest } from 'next/server';

const TOKEN_COOKIE = 'admin_session';
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;
const TOKEN_REMEMBER_TTL_SECONDS = 60 * 60 * 24 * 30;

type AdminTokenPayload = {
  role: 'admin';
  userId: string;
  centerId: string;
};

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET is required');
  }
  return new TextEncoder().encode(secret);
}

export async function signAdminToken(payload: AdminTokenPayload) {
  const secret = getSecretKey();
  return new SignJWT(payload)
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
  if (payload.role !== 'admin') {
    throw new Error('Invalid role');
  }
  return payload as AdminTokenPayload;
}

export function getTokenFromRequest(request: NextRequest) {
  return request.cookies.get(TOKEN_COOKIE)?.value;
}

export function buildAdminCookie(token: string, remember?: boolean) {
  const cookie = {
    name: TOKEN_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/'
  } as const;

  if (remember) {
    return { ...cookie, maxAge: TOKEN_REMEMBER_TTL_SECONDS };
  }

  return cookie;
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
