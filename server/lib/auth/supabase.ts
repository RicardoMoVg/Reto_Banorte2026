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
/**
 * Usuario que se asume cuando la peticion llega SIN token.
 *
 * Apagado por omision: si la variable no esta en el .env, todo endpoint
 * protegido sigue respondiendo 401 igual que antes. Existe para que las
 * pantallas tradicionales (Movimientos, Inicio) puedan leer datos reales
 * mientras el login de verdad no emite tokens -- sin esto la unica salida
 * era dejarlas con constantes escritas a mano, que es peor: se ven bonitas
 * y mienten.
 *
 * ⚠️ QUITAR cuando el login emita tokens. Con esto puesto, cualquiera que
 * alcance el servidor lee y escribe como ese usuario.
 */
const USUARIO_SIN_TOKEN = process.env.AUTH_USUARIO_SIN_TOKEN;
let yaAvisamos = false;

export async function requireUsuario(req: Request): Promise<UsuarioAutenticado | Response> {
  let usuario: UsuarioAutenticado | null;

  try {
    usuario = await getUsuarioDeRequest(req);
  } catch (error) {
    /**
     * `getSupabaseClient()` truena si faltan SUPABASE_URL o
     * SUPABASE_ANON_KEY. Sin este catch, CUALQUIER endpoint autenticado
     * respondia 500 con un stack trace y sin pista de que la causa era el
     * .env -- costaba un rato darse cuenta, y le pasa igual a los 30
     * endpoints. 500 sigue siendo el codigo correcto (es falla del
     * servidor, no del cliente), pero ahora el mensaje dice que revisar.
     */
    console.error('[auth] no se pudo verificar el token:', error);
    return jsonResponse(
      {
        error:
          'Auth no esta configurado en el servidor. Falta SUPABASE_URL o ' +
          'SUPABASE_ANON_KEY en server/.env (ver server/.env.example).',
      },
      { status: 500 },
    );
  }

  if (!usuario && USUARIO_SIN_TOKEN) {
    if (!yaAvisamos) {
      console.warn(
        `[auth] AUTH_USUARIO_SIN_TOKEN activo: las peticiones sin token se ` +
          `atienden como "${USUARIO_SIN_TOKEN}". Quitar esta variable cuando el ` +
          `login emita tokens.`,
      );
      yaAvisamos = true;
    }
    return { id: USUARIO_SIN_TOKEN, email: null };
  }

  if (!usuario) {
    return jsonResponse({ error: 'No autenticado.' }, { status: 401 });
  }
  return usuario;
}
