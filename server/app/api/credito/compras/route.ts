import { requireUsuario } from '@/lib/auth/supabase';
import { getComprasTarjeta, crearCompraTarjeta } from '@/lib/mcp/mcp-client';
import { CORS_HEADERS, jsonResponse } from '@/lib/http/cors';

export const runtime = 'nodejs';

export function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function GET(req: Request) {
  const auth = await requireUsuario(req);
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(req.url);
  const tarjetaId = searchParams.get('tarjetaId') ?? undefined;

  const compras = await getComprasTarjeta(auth.id, tarjetaId);

  return jsonResponse({ compras });
}

export async function POST(req: Request) {
  const auth = await requireUsuario(req);
  if (auth instanceof Response) return auth;

  const { tarjetaId, descripcion, monto } = (await req.json()) as {
    tarjetaId?: string;
    descripcion?: string;
    monto?: number;
  };

  if (!tarjetaId || !descripcion || !monto || monto <= 0) {
    return jsonResponse({ error: 'tarjetaId, descripcion y monto (positivo) son requeridos.' }, { status: 400 });
  }

  const resultado = await crearCompraTarjeta(auth.id, tarjetaId, descripcion, monto);

  if ('error' in resultado) {
    return jsonResponse({ error: resultado.error }, { status: 400 });
  }

  return jsonResponse({ compra: resultado }, { status: 201 });
}
