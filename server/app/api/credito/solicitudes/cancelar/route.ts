import { requireUsuario } from '@/lib/auth/supabase';
import { cancelarSolicitudCredito } from '@/lib/mcp/mcp-client';
import { CORS_HEADERS, jsonResponse } from '@/lib/http/cors';

export const runtime = 'nodejs';

export function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function POST(req: Request) {
  const auth = await requireUsuario(req);
  if (auth instanceof Response) return auth;

  const { solicitudId } = (await req.json()) as { solicitudId?: string };

  if (!solicitudId) {
    return jsonResponse({ error: 'solicitudId es requerido.' }, { status: 400 });
  }

  const resultado = await cancelarSolicitudCredito(auth.id, solicitudId);

  if ('error' in resultado) {
    return jsonResponse({ error: resultado.error }, { status: 400 });
  }

  return jsonResponse({ solicitud: resultado });
}
