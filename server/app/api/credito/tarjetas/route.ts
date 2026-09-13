import { requireUsuario } from '@/lib/auth/supabase';
import { getTarjetasCredito } from '@/lib/mcp/mcp-client';
import { CORS_HEADERS, jsonResponse } from '@/lib/http/cors';

export const runtime = 'nodejs';

export function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function GET(req: Request) {
  const auth = await requireUsuario(req);
  if (auth instanceof Response) return auth;

  const tarjetas = await getTarjetasCredito(auth.id);

  return jsonResponse({ tarjetas });
}
