import { NextResponse } from 'next/server';

type SupabaseErrorShape = {
  message?: string;
  code?: string;
  status?: number;
  hint?: string | null;
  details?: string | null;
};

export function createRequestId() {
  return crypto.randomUUID();
}

export function serializeSupabaseError(error: SupabaseErrorShape | null | undefined) {
  if (!error) return null;
  return {
    message: error.message,
    code: error.code,
    status: error.status,
    hint: error.hint,
    details: error.details
  };
}

export function jsonResponse<T extends Record<string, unknown>>(
  data: T,
  init: ResponseInit,
  requestId: string
) {
  return NextResponse.json({ requestId, ...data }, init);
}

export function jsonErrorResponse(
  message: string,
  requestId: string,
  init: ResponseInit,
  details?: Record<string, unknown> | null,
  stage?: string
) {
  return NextResponse.json(
    {
      requestId,
      error: message,
      details: details ?? undefined,
      stage
    },
    init
  );
}
