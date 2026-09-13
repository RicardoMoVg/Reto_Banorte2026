import { requireUsuario } from '@/lib/auth/supabase';
import { getMetasUsuario, crearMeta } from '@/lib/mcp/mcp-client';
import { CORS_HEADERS, jsonResponse } from '@/lib/http/cors';

export const runtime = 'nodejs';

export function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

/**
 * Endpoint REST tradicional (banca tradicional, `constitution.md` 3.3):
 * ver metas y crear una nueva sin pasar por el chat.
 */
export async function GET(req: Request) {
  const auth = await requireUsuario(req);
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(req.url);
  const incluirArchivadas = searchParams.get('incluirArchivadas') === 'true';

  const metas = await getMetasUsuario(auth.id, incluirArchivadas);

  return jsonResponse({ metas });
}

export async function POST(req: Request) {
  const auth = await requireUsuario(req);
  if (auth instanceof Response) return auth;

  const { titulo, montoObjetivo, montoInicial } = (await req.json()) as {
    titulo?: string;
    montoObjetivo?: number;
    montoInicial?: number;
  };

  if (!titulo || !montoObjetivo || montoObjetivo <= 0) {
    return jsonResponse({ error: 'titulo y montoObjetivo (positivo) son requeridos.' }, { status: 400 });
  }

  const meta = await crearMeta(auth.id, titulo, montoObjetivo, montoInicial);

  return jsonResponse({ meta }, { status: 201 });
}
