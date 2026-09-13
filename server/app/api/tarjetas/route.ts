import { requireUsuario } from '@/lib/auth/supabase';
import { actualizarEstadoTarjeta, getTarjetasCredito, getTarjetasDebito } from '@/lib/mcp/mcp-client';
import { CORS_HEADERS, jsonResponse } from '@/lib/http/cors';

export const runtime = 'nodejs';

export function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

/**
 * Endpoint REST tradicional (constitution.md 3.3): la pantalla de
 * Tarjetas (Billetera) lee sus dos tipos de plástico sin pasar por el
 * LLM. Antes esta pantalla mostraba TARJETAS_DEMO hardcodeado en el
 * cliente -- esto la conecta de verdad al MCP.
 */
export async function GET(req: Request) {
  const auth = await requireUsuario(req);
  if (auth instanceof Response) return auth;

  const [credito, debito] = await Promise.all([
    getTarjetasCredito(auth.id),
    getTarjetasDebito(auth.id),
  ]);

  return jsonResponse({ credito, debito });
}

/** Enciende/apaga el plástico. No toca límite ni saldo -- solo si se puede usar para pagar. */
export async function POST(req: Request) {
  const auth = await requireUsuario(req);
  if (auth instanceof Response) return auth;

  const { id, tipo, activa } = (await req.json()) as {
    id?: string;
    tipo?: 'credito' | 'debito';
    activa?: boolean;
  };

  if (!id || (tipo !== 'credito' && tipo !== 'debito') || typeof activa !== 'boolean') {
    return jsonResponse({ error: 'id, tipo (credito|debito) y activa son requeridos.' }, { status: 400 });
  }

  const resultado = await actualizarEstadoTarjeta(auth.id, id, tipo, activa);
  if ('error' in resultado) return jsonResponse({ error: resultado.error }, { status: 400 });

  return jsonResponse(resultado);
}
