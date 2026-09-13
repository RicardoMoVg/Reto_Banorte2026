import { requireUsuario } from '@/lib/auth/supabase';
import { archivarMeta } from '@/lib/mcp/mcp-client';
import { CORS_HEADERS, jsonResponse } from '@/lib/http/cors';

export const runtime = 'nodejs';

export function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function POST(req: Request) {
  const auth = await requireUsuario(req);
  if (auth instanceof Response) return auth;

  const { metaId } = (await req.json()) as { metaId?: string };

  if (!metaId) {
    return jsonResponse({ error: 'metaId es requerido.' }, { status: 400 });
  }

  const resultado = await archivarMeta(auth.id, metaId);

  if ('error' in resultado) {
    return jsonResponse({ error: resultado.error }, { status: 400 });
  }

  return jsonResponse({ meta: resultado });
}
