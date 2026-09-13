import { requireUsuario } from '@/lib/auth/supabase';
import { getAportacionesProgramadas, crearAportacionProgramada } from '@/lib/mcp/mcp-client';
import { CORS_HEADERS, jsonResponse } from '@/lib/http/cors';

export const runtime = 'nodejs';

export function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

/**
 * Endpoint REST tradicional: ver/crear un plan de aportación periódica a
 * una meta (ej. "$634/mes por 6 meses") sin pasar por el chat. No ejecuta
 * aportaciones -- eso lo sigue haciendo POST /api/metas/aportar.
 */
export async function GET(req: Request) {
  const auth = await requireUsuario(req);
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(req.url);
  const metaId = searchParams.get('metaId') ?? undefined;
  const incluirCanceladas = searchParams.get('incluirCanceladas') === 'true';

  const aportaciones = await getAportacionesProgramadas(auth.id, { metaId, incluirCanceladas });

  return jsonResponse({ aportaciones });
}

export async function POST(req: Request) {
  const auth = await requireUsuario(req);
  if (auth instanceof Response) return auth;

  const { metaId, monto, periodicidad, fechaInicio } = (await req.json()) as {
    metaId?: string;
    monto?: number;
    periodicidad?: 'semanal' | 'quincenal' | 'mensual';
    fechaInicio?: string;
  };

  if (!metaId || !monto || monto <= 0 || !periodicidad || !fechaInicio) {
    return jsonResponse(
      { error: 'metaId, monto (positivo), periodicidad y fechaInicio son requeridos.' },
      { status: 400 },
    );
  }

  const resultado = await crearAportacionProgramada(auth.id, metaId, monto, periodicidad, fechaInicio);

  if ('error' in resultado) {
    return jsonResponse({ error: resultado.error }, { status: 400 });
  }

  return jsonResponse({ aportacion: resultado }, { status: 201 });
}
