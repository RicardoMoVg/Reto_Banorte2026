import { requireUsuario } from '@/lib/auth/supabase';
import { getInstrumentos } from '@/lib/mcp/mcp-client';
import { CORS_HEADERS, jsonResponse } from '@/lib/http/cors';

export const runtime = 'nodejs';

export function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

/**
 * Catálogo de instrumentos disponibles (no lo que ya tiene el usuario) --
 * requiere sesión aunque el dato sea "público" del catálogo, para evitar
 * que quede como un endpoint sin auth explotable para DoS barato.
 */
export async function GET(req: Request) {
  const auth = await requireUsuario(req);
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get('tipo') ?? undefined;
  const riesgo = searchParams.get('riesgo') ?? undefined;

  const instrumentos = await getInstrumentos({ tipo, riesgo });

  return jsonResponse({ instrumentos });
}
