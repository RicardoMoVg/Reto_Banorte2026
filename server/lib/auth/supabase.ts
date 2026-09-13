import { createClient } from '@supabase/supabase-js';
import { jsonResponse } from '@/lib/http/cors';

/**
 * Puerta de entrada a Supabase Auth (registro/login/sesión). Separado a
 * propósito de `lib/mcp/mcp-client.ts`: auth NO es un dato financiero, no
 * pasa por MCP (ver `constitution.md` 3.3). El id del usuario autenticado
 * (`data.user.id`, un uuid) es el mismo valor que se guarda como
 * `usuarios.id` en Postgres para ligar ambas identidades.
 */
function getEnv(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(`Falta ${nombre} en server/.env (ver server/.env.example)`);
  }
  return valor;
}

export function getSupabaseClient() {
  return createClient(getEnv('SUPABASE_URL'), getEnv('SUPABASE_ANON_KEY'));
}

export interface UsuarioAutenticado {
  id: string;
  email: string | null;
}

/**
 * Verifica el header `Authorization: Bearer <access_token>` contra Supabase
 * Auth. No usa clave de service role -- basta la anon key para validar un
 * token ya emitido.
 */
export async function getUsuarioDeRequest(req: Request): Promise<UsuarioAutenticado | null> {
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
  if (!token) return null;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;

  return { id: data.user.id, email: data.user.email ?? null };
}

/**
 * Para usar al inicio de un route handler protegido:
 *
 *   const auth = await requireUsuario(req);
 *   if (auth instanceof Response) return auth;
 *   const { id: userId } = auth;
 */
export async function requireUsuario(req: Request): Promise<UsuarioAutenticado | Response> {
  const usuario = await getUsuarioDeRequest(req);
  if (!usuario) {
    return jsonResponse({ error: 'No autenticado.' }, { status: 401 });
  }
  return usuario;
}
