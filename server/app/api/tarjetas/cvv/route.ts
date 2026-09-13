import { requireUsuario } from '@/lib/auth/supabase';
import { getTarjetasCredito, getTarjetasDebito } from '@/lib/mcp/mcp-client';
import { CORS_HEADERS, jsonResponse } from '@/lib/http/cors';

export const runtime = 'nodejs';

export function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

/**
 * CVV dinámico: se genera al momento, nunca se guarda en ningún lado (ni
 * en Postgres ni en memoria) -- constitution.md 3.2 aplica igual que a un
 * bloque A2UI, "receta, no snapshot": lo único persistente es la tarjeta,
 * el CVV se recalcula en cada consulta. Por eso no pasa por el MCP -- no
 * hay nada que leer ni escribir, solo autorizar y generar.
 */
export async function POST(req: Request) {
  const auth = await requireUsuario(req);
  if (auth instanceof Response) return auth;

  const { id, tipo } = (await req.json()) as { id?: string; tipo?: 'credito' | 'debito' };
  if (!id || (tipo !== 'credito' && tipo !== 'debito')) {
    return jsonResponse({ error: 'id y tipo (credito|debito) son requeridos.' }, { status: 400 });
  }

  // Confirma que la tarjeta es del usuario antes de generar nada --
  // aunque el CVV en sí no revela un monto, no hay razón para regresarle
  // algo sobre una tarjeta que no es suya.
  const tarjetas = tipo === 'credito' ? await getTarjetasCredito(auth.id) : await getTarjetasDebito(auth.id);
  if (!tarjetas.some((t) => t.id === id)) {
    return jsonResponse({ error: 'Tarjeta no encontrada o no pertenece al usuario.' }, { status: 404 });
  }

  const cvv = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return jsonResponse({ cvv });
}
