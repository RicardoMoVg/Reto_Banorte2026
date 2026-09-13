import { requireUsuario } from '@/lib/auth/supabase';
import { diferirAMsi } from '@/lib/mcp/mcp-client';
import { CORS_HEADERS, jsonResponse } from '@/lib/http/cors';

export const runtime = 'nodejs';

export function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

/** Difiere una compra ya hecha a meses sin intereses (MSI). */
export async function POST(req: Request) {
  const auth = await requireUsuario(req);
  if (auth instanceof Response) return auth;

  const { compraId, mesesMsi } = (await req.json()) as { compraId?: string; mesesMsi?: number };

  if (!compraId || !mesesMsi || mesesMsi <= 0) {
    return jsonResponse({ error: 'compraId y mesesMsi (positivo) son requeridos.' }, { status: 400 });
  }

  const resultado = await diferirAMsi(auth.id, compraId, mesesMsi);

  if ('error' in resultado) {
    return jsonResponse({ error: resultado.error }, { status: 400 });
  }

  return jsonResponse({ compra: resultado });
}
