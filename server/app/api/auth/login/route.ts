import { getSupabaseClient } from '@/lib/auth/supabase';
import { getUsuario } from '@/lib/mcp/mcp-client';
import { CORS_HEADERS, jsonResponse } from '@/lib/http/cors';

export const runtime = 'nodejs';

export function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function POST(req: Request) {
  const { email, password } = (await req.json()) as { email?: string; password?: string };

  if (!email || !password) {
    return jsonResponse({ error: 'email y password son requeridos.' }, { status: 400 });
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.session || !data.user) {
    return jsonResponse({ error: error?.message ?? 'Credenciales inválidas.' }, { status: 401 });
  }

  const perfil = await getUsuario(data.user.id);

  return jsonResponse({
    usuario: { id: data.user.id, email: data.user.email, nombre: perfil?.nombre ?? null },
    session: { accessToken: data.session.access_token, refreshToken: data.session.refresh_token },
  });
}
