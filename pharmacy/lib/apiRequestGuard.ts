import { NextResponse } from 'next/server';
import { AiProvider } from '@/types/pharmacy';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

const MAX_BODY_BYTES = 64 * 1024;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;

export type AuthenticatedAiRequest = { uid: string };

export async function authenticateAiRequest(request: Request): Promise<AuthenticatedAiRequest | NextResponse> {
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return errorResponse('Sign in is required to use AI features.', 401);
  try {
    const decoded = await adminAuth().verifyIdToken(token);
    return { uid: decoded.uid };
  } catch {
    return errorResponse('Your session is invalid or expired. Please sign in again.', 401);
  }
}

export async function parseGuardedJson(
  request: Request,
  routeName: string,
  uid: string
): Promise<{ body: Record<string, unknown> } | { response: NextResponse }> {
  const rateLimitResponse = await enforceRateLimit(routeName, uid);
  if (rateLimitResponse) return { response: rateLimitResponse };

  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return { response: errorResponse('Request body is too large', 413) };
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return { response: errorResponse('Invalid request body', 400) };
  }

  if (!rawBody || new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return {
      response: errorResponse(rawBody ? 'Request body is too large' : 'Invalid request body', rawBody ? 413 : 400),
    };
  }

  try {
    const parsed: unknown = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { response: errorResponse('Request body must be a JSON object', 400) };
    }
    return { body: parsed as Record<string, unknown> };
  } catch {
    return { response: errorResponse('Invalid request body', 400) };
  }
}

export function parseAiProvider(value: unknown): AiProvider | null {
  return value === 'gemini' || value === 'groq' || value === 'xai' ? value : null;
}

export function cleanString(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

export function publicAiError(error: unknown, fallback: string): string {
  if (error instanceof Error && /کلید .* تنظیم نشده است/.test(error.message)) return error.message;
  return fallback;
}

async function enforceRateLimit(routeName: string, uid: string): Promise<NextResponse | null> {
  const now = Date.now();
  const bucket = Math.floor(now / RATE_LIMIT_WINDOW_MS);
  const ref = adminDb().collection('_aiRateLimits').doc(`${routeName}:${uid}:${bucket}`);
  try {
    const allowed = await adminDb().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      const count = snapshot.exists ? Number(snapshot.data()?.count || 0) : 0;
      if (count >= RATE_LIMIT_MAX_REQUESTS) return false;
      transaction.set(ref, { count: count + 1, expiresAt: new Date((bucket + 2) * RATE_LIMIT_WINDOW_MS) }, { merge: true });
      return true;
    });
    return allowed ? null : NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429, headers: { 'Retry-After': '60' } });
  } catch {
    return errorResponse('AI service is temporarily unavailable. Please try again later.', 503);
  }
}

function errorResponse(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
