import { getSupabaseClient } from '@/lib/auth/supabase';
import { crearUsuario } from '@/lib/mcp/mcp-client';
import { CORS_HEADERS, jsonResponse } from '@/lib/http/cors';

export const runtime = 'nodejs';

export function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

/**
 * Registro de un usuario nuevo. No pasa por MCP -- Supabase Auth crea la
 * identidad (email/password), y solo después usamos ese mismo id (uuid)
 * para crear su fila en `usuarios` (Postgres, vía MCP). Ver
 * `constitution.md` 3.3.
 */
export async function POST(req: Request) {
  const { email, password, nombre } = (await req.json()) as {
    email?: string;
    password?: string;
    nombre?: string;
  };

  if (!email || !password) {
    return jsonResponse({ error: 'email y password son requeridos.' }, { status: 400 });
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error || !data.user) {
    return jsonResponse({ error: error?.message ?? 'No se pudo registrar el usuario.' }, { status: 400 });
  }

  const perfil = await crearUsuario(data.user.id, nombre?.trim() || email.split('@')[0]);

  return jsonResponse(
    {
      usuario: { id: data.user.id, email: data.user.email, nombre: perfil.nombre },
      // Si el proyecto de Supabase pide confirmar el correo, session viene
      // null hasta que el usuario confirme -- el cliente debe manejar
      // ambos casos.
      session: data.session
        ? { accessToken: data.session.access_token, refreshToken: data.session.refresh_token }
        : null,
      requiereConfirmacion: !data.session,
    },
    { status: 201 },
  );
}
