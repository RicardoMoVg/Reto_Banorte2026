import { requireUsuario } from '@/lib/auth/supabase';
import { desactivarContactoPago } from '@/lib/mcp/mcp-client';
import { CORS_HEADERS, jsonResponse } from '@/lib/http/cors';

export const runtime = 'nodejs';

export function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function POST(req: Request) {
  const auth = await requireUsuario(req);
  if (auth instanceof Response) return auth;

  const { contactoId } = (await req.json()) as { contactoId?: string };

  if (!contactoId) {
    return jsonResponse({ error: 'contactoId es requerido.' }, { status: 400 });
  }

  const resultado = await desactivarContactoPago(auth.id, contactoId);

  if ('error' in resultado) {
    return jsonResponse({ error: resultado.error }, { status: 400 });
  }

  return jsonResponse({ contacto: resultado });
}
