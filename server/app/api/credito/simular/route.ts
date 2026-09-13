import { requireUsuario } from '@/lib/auth/supabase';
import { simularPlanPago } from '@/lib/mcp/mcp-client';
import { CORS_HEADERS, jsonResponse } from '@/lib/http/cors';

export const runtime = 'nodejs';

export function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

/**
 * Simula la mensualidad de un crédito para un monto/plazo cualquiera
 * (amortización francesa) -- cálculo puro, no toca datos del usuario, pero
 * igual requiere sesión (mismo criterio que /api/inversiones/simular).
 */
export async function POST(req: Request) {
  const auth = await requireUsuario(req);
  if (auth instanceof Response) return auth;

  const { monto, plazoMeses, tasaAnual } = (await req.json()) as {
    monto?: number;
    plazoMeses?: number;
    tasaAnual?: number;
  };

  if (!monto || monto <= 0 || !plazoMeses || plazoMeses <= 0) {
    return jsonResponse({ error: 'monto (positivo) y plazoMeses (positivo) son requeridos.' }, { status: 400 });
  }

  const simulacion = await simularPlanPago(monto, plazoMeses, tasaAnual);

  return jsonResponse({ simulacion });
}
