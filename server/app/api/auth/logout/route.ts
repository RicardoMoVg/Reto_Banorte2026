import { getSupabaseClient } from '@/lib/auth/supabase';
import { CORS_HEADERS, jsonResponse } from '@/lib/http/cors';

export const runtime = 'nodejs';

export function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

/**
 * Revoca la sesión del lado de Supabase. Necesita accessToken +
 * refreshToken en el body porque este cliente no persiste sesión entre
 * requests (cada request es un cliente nuevo con la anon key) -- sin
 * `setSession` primero, `signOut()` no tendría sobre qué sesión operar.
 * No requiere la service role key.
 */
export async function POST(req: Request) {
  const { accessToken, refreshToken } = (await req.json()) as {
    accessToken?: string;
    refreshToken?: string;
  };

  if (!accessToken || !refreshToken) {
    return jsonResponse({ error: 'accessToken y refreshToken son requeridos.' }, { status: 400 });
  }

  const supabase = getSupabaseClient();
  await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  const { error } = await supabase.auth.signOut();

  if (error) {
    return jsonResponse({ error: error.message }, { status: 400 });
  }

  return jsonResponse({ ok: true });
}
