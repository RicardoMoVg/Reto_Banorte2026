import { requireUsuario } from '@/lib/auth/supabase';
import { cancelarTransferencia } from '@/lib/mcp/mcp-client';
import { CORS_HEADERS, jsonResponse } from '@/lib/http/cors';

export const runtime = 'nodejs';

export function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function POST(req: Request) {
  const auth = await requireUsuario(req);
  if (auth instanceof Response) return auth;

  const { transferenciaId } = (await req.json()) as { transferenciaId?: string };

  if (!transferenciaId) {
    return jsonResponse({ error: 'transferenciaId es requerido.' }, { status: 400 });
  }

  const resultado = await cancelarTransferencia(auth.id, transferenciaId);

  if ('error' in resultado) {
    return jsonResponse({ error: resultado.error }, { status: 400 });
  }

  return jsonResponse({ transferencia: resultado });
}
