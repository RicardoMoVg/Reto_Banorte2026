/**
 * CORS abierto, mismo criterio que `app/api/agent/route.ts`: en dev, el
 * cliente RN corre en otro origen (Expo web en su propio puerto). Endurecer
 * antes de exponer estos endpoints fuera de la red del equipo.
 *
 * Se agrega `Authorization` a los headers permitidos porque los endpoints
 * REST de banca tradicional (`constitution.md` 3.3) lo usan para el token
 * de sesión de Supabase Auth -- `/api/agent` no lo necesita, por eso no lo
 * tenía.
 */
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export function jsonResponse(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);

  return new Response(JSON.stringify(data), { ...init, headers });
}
