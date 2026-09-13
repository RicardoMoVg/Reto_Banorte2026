import { requireUsuario } from '@/lib/auth/supabase';
import { getPerfilInversion, actualizarPerfilInversion } from '@/lib/mcp/mcp-client';
import { CORS_HEADERS, jsonResponse } from '@/lib/http/cors';

export const runtime = 'nodejs';

export function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function GET(req: Request) {
  const auth = await requireUsuario(req);
  if (auth instanceof Response) return auth;

  const perfil = await getPerfilInversion(auth.id);

  return jsonResponse({ perfil });
}

export async function POST(req: Request) {
  const auth = await requireUsuario(req);
  if (auth instanceof Response) return auth;

  const { toleranciaRiesgo, horizonteAnios } = (await req.json()) as {
    toleranciaRiesgo?: string;
    horizonteAnios?: number;
  };

  if (!toleranciaRiesgo || !horizonteAnios || horizonteAnios <= 0) {
    return jsonResponse({ error: 'toleranciaRiesgo y horizonteAnios (positivo) son requeridos.' }, { status: 400 });
  }

  const perfil = await actualizarPerfilInversion(auth.id, toleranciaRiesgo, horizonteAnios);

  return jsonResponse({ perfil });
}
