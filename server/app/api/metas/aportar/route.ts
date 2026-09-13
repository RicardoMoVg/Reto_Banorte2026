import { requireUsuario } from '@/lib/auth/supabase';
import { aportarAMeta } from '@/lib/mcp/mcp-client';
import { CORS_HEADERS, jsonResponse } from '@/lib/http/cors';

export const runtime = 'nodejs';

export function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function POST(req: Request) {
  const auth = await requireUsuario(req);
  if (auth instanceof Response) return auth;

  const { metaId, monto } = (await req.json()) as { metaId?: string; monto?: number };

  if (!metaId || !monto || monto <= 0) {
    return jsonResponse({ error: 'metaId y monto (positivo) son requeridos.' }, { status: 400 });
  }

  const resultado = await aportarAMeta(auth.id, metaId, monto);

  if ('error' in resultado) {
    return jsonResponse({ error: resultado.error }, { status: 400 });
  }

  return jsonResponse({ meta: resultado });
}
