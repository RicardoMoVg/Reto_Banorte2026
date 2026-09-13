import { requireUsuario } from '@/lib/auth/supabase';
import { getSolicitudesCredito, crearSolicitudCredito } from '@/lib/mcp/mcp-client';
import { CORS_HEADERS, jsonResponse } from '@/lib/http/cors';

export const runtime = 'nodejs';

export function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function GET(req: Request) {
  const auth = await requireUsuario(req);
  if (auth instanceof Response) return auth;

  const solicitudes = await getSolicitudesCredito(auth.id);

  return jsonResponse({ solicitudes });
}

export async function POST(req: Request) {
  const auth = await requireUsuario(req);
  if (auth instanceof Response) return auth;

  const { tipo, montoSolicitado } = (await req.json()) as {
    tipo?: 'personal' | 'hipotecario' | 'automotriz' | 'tarjeta';
    montoSolicitado?: number;
  };

  if (!tipo || !montoSolicitado || montoSolicitado <= 0) {
    return jsonResponse({ error: 'tipo y montoSolicitado (positivo) son requeridos.' }, { status: 400 });
  }

  const solicitud = await crearSolicitudCredito(auth.id, tipo, montoSolicitado);

  return jsonResponse({ solicitud }, { status: 201 });
}
