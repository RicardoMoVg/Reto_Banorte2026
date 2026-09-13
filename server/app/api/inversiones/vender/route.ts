import { requireUsuario } from '@/lib/auth/supabase';
import { venderPosicion } from '@/lib/mcp/mcp-client';
import { CORS_HEADERS, jsonResponse } from '@/lib/http/cors';

export const runtime = 'nodejs';

export function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function POST(req: Request) {
  const auth = await requireUsuario(req);
  if (auth instanceof Response) return auth;

  const { posicionId, cantidad } = (await req.json()) as { posicionId?: string; cantidad?: number };

  if (!posicionId) {
    return jsonResponse({ error: 'posicionId es requerido.' }, { status: 400 });
  }

  const resultado = await venderPosicion(auth.id, posicionId, cantidad);

  if ('error' in resultado) {
    return jsonResponse({ error: resultado.error }, { status: 400 });
  }

  return jsonResponse({ posicion: resultado });
}
