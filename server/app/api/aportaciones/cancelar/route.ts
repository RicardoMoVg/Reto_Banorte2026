import { requireUsuario } from '@/lib/auth/supabase';
import { cancelarAportacionProgramada } from '@/lib/mcp/mcp-client';
import { CORS_HEADERS, jsonResponse } from '@/lib/http/cors';

export const runtime = 'nodejs';

export function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function POST(req: Request) {
  const auth = await requireUsuario(req);
  if (auth instanceof Response) return auth;

  const { aportacionId } = (await req.json()) as { aportacionId?: string };

  if (!aportacionId) {
    return jsonResponse({ error: 'aportacionId es requerido.' }, { status: 400 });
  }

  const resultado = await cancelarAportacionProgramada(auth.id, aportacionId);

  if ('error' in resultado) {
    return jsonResponse({ error: resultado.error }, { status: 400 });
  }

  return jsonResponse({ aportacion: resultado });
}
