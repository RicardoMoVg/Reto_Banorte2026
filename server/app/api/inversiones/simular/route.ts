import { requireUsuario } from '@/lib/auth/supabase';
import { simularInversion } from '@/lib/mcp/mcp-client';
import { CORS_HEADERS, jsonResponse } from '@/lib/http/cors';

export const runtime = 'nodejs';

export function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

/**
 * Cálculo puro (interés compuesto sobre el catálogo) -- no toca datos del
 * usuario, pero igual requiere sesión (ver constitution.md 3.3): evita que
 * quede como endpoint público explotable para DoS barato.
 */
export async function POST(req: Request) {
  const auth = await requireUsuario(req);
  if (auth instanceof Response) return auth;

  const { instrumentoId, monto, anios } = (await req.json()) as {
    instrumentoId?: string;
    monto?: number;
    anios?: number;
  };

  if (!instrumentoId || !monto || monto <= 0 || !anios || anios <= 0) {
    return jsonResponse({ error: 'instrumentoId, monto (positivo) y anios (positivo) son requeridos.' }, { status: 400 });
  }

  const resultado = await simularInversion(instrumentoId, monto, anios);

  if ('error' in resultado) {
    return jsonResponse({ error: resultado.error }, { status: 400 });
  }

  return jsonResponse({ simulacion: resultado });
}
