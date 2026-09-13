import { requireUsuario } from '@/lib/auth/supabase';
import { getUsuario } from '@/lib/mcp/mcp-client';
import { CORS_HEADERS, jsonResponse } from '@/lib/http/cors';

export const runtime = 'nodejs';

export function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function GET(req: Request) {
  const auth = await requireUsuario(req);
  if (auth instanceof Response) return auth;

  const perfil = await getUsuario(auth.id);

  return jsonResponse({ id: auth.id, email: auth.email, nombre: perfil?.nombre ?? null });
}
