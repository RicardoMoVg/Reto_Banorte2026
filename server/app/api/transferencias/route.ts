import { requireUsuario } from '@/lib/auth/supabase';
import { getTransferenciasRecientes, crearTransferencia } from '@/lib/mcp/mcp-client';
import { CORS_HEADERS, jsonResponse } from '@/lib/http/cors';

export const runtime = 'nodejs';

export function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

/**
 * Endpoint REST tradicional (banca tradicional, `constitution.md` 3.3):
 * la misma acción de "transferir dinero" que puede pedirse por chat
 * (`mostrarComparativoGastos` etc. en a2ui-tools.ts) también existe aquí
 * como un formulario normal, sin LLM de por medio. Reusa exactamente las
 * mismas funciones de `lib/mcp/mcp-client.ts` -- el dato sigue viniendo
 * solo de MCP, nomás que el "operador" es un formulario, no el agente.
 *
 * El userId NUNCA se toma del body -- siempre del token verificado por
 * `requireUsuario`, para no romper las validaciones de dueño que ya tienen
 * las tools de MCP (ver constitution.md, gotcha de ownership).
 */
export async function GET(req: Request) {
  const auth = await requireUsuario(req);
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get('tipo') as 'enviada' | 'recibida' | undefined;
  const estatus = searchParams.get('estatus') as
    | 'pendiente'
    | 'completada'
    | 'fallida'
    | 'cancelada'
    | undefined;
  const limiteParam = searchParams.get('limite');

  const transferencias = await getTransferenciasRecientes(auth.id, {
    tipo: tipo ?? undefined,
    estatus: estatus ?? undefined,
    limite: limiteParam ? Number(limiteParam) : undefined,
  });

  return jsonResponse({ transferencias });
}

export async function POST(req: Request) {
  const auth = await requireUsuario(req);
  if (auth instanceof Response) return auth;

  const { contactoId, monto, concepto, tipo } = (await req.json()) as {
    contactoId?: string;
    monto?: number;
    concepto?: string;
    tipo?: 'enviada' | 'recibida';
  };

  if (!contactoId || !monto || monto <= 0) {
    return jsonResponse({ error: 'contactoId y monto (positivo) son requeridos.' }, { status: 400 });
  }

  const resultado = await crearTransferencia(auth.id, contactoId, monto, concepto, tipo);

  if ('error' in resultado) {
    return jsonResponse({ error: resultado.error }, { status: 400 });
  }

  return jsonResponse({ transferencia: resultado }, { status: 201 });
}
