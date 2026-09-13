import { requireUsuario } from '@/lib/auth/supabase';
import { desanclarWidget } from '@/lib/mcp/mcp-client';
import { CORS_HEADERS, jsonResponse } from '@/lib/http/cors';

export const runtime = 'nodejs';

export function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function POST(req: Request) {
  const auth = await requireUsuario(req);
  if (auth instanceof Response) return auth;

  const { id } = (await req.json()) as { id?: string };

  if (!id) {
    return jsonResponse({ error: 'id es requerido.' }, { status: 400 });
  }

  const resultado = await desanclarWidget(auth.id, id);

  if ('error' in resultado) {
    return jsonResponse({ error: resultado.error }, { status: 400 });
  }

  return jsonResponse({ id: resultado.id });
}
