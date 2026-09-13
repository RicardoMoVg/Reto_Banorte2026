import { requireUsuario } from '@/lib/auth/supabase';
import { getProductosCredito } from '@/lib/mcp/mcp-client';
import { CORS_HEADERS, jsonResponse } from '@/lib/http/cors';

export const runtime = 'nodejs';

export function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

/** Catálogo de productos de crédito que ofrece el banco (no lo que ya tiene el usuario). */
export async function GET(req: Request) {
  const auth = await requireUsuario(req);
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get('tipo') ?? undefined;

  const productos = await getProductosCredito(tipo);

  return jsonResponse({ productos });
}
