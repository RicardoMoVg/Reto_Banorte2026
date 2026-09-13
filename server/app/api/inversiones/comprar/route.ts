import { requireUsuario } from '@/lib/auth/supabase';
import { comprarPosicion } from '@/lib/mcp/mcp-client';
import { CORS_HEADERS, jsonResponse } from '@/lib/http/cors';

export const runtime = 'nodejs';

export function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function POST(req: Request) {
  const auth = await requireUsuario(req);
  if (auth instanceof Response) return auth;

  const { instrumentoId, cantidad, precioCompra } = (await req.json()) as {
    instrumentoId?: string;
    cantidad?: number;
    precioCompra?: number;
  };

  if (!instrumentoId || !cantidad || cantidad <= 0 || !precioCompra || precioCompra <= 0) {
    return jsonResponse(
      { error: 'instrumentoId, cantidad (positiva) y precioCompra (positivo) son requeridos.' },
      { status: 400 },
    );
  }

  const posicion = await comprarPosicion(auth.id, instrumentoId, cantidad, precioCompra);

  return jsonResponse({ posicion }, { status: 201 });
}
