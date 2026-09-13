import { requireUsuario } from '@/lib/auth/supabase';
import { getContactosPago, crearContactoPago } from '@/lib/mcp/mcp-client';
import { CORS_HEADERS, jsonResponse } from '@/lib/http/cors';

export const runtime = 'nodejs';

export function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

/**
 * Endpoint REST tradicional: ver/agregar contactos de pago -- ej. para
 * elegir a quién transferirle antes de llamar a POST /api/transferencias.
 */
export async function GET(req: Request) {
  const auth = await requireUsuario(req);
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(req.url);
  const nombre = searchParams.get('nombre') ?? undefined;
  const incluirInactivos = searchParams.get('incluirInactivos') === 'true';

  const contactos = await getContactosPago(auth.id, { nombre, incluirInactivos });

  return jsonResponse({ contactos });
}

export async function POST(req: Request) {
  const auth = await requireUsuario(req);
  if (auth instanceof Response) return auth;

  const { nombre, clabe } = (await req.json()) as { nombre?: string; clabe?: string };

  if (!nombre) {
    return jsonResponse({ error: 'nombre es requerido.' }, { status: 400 });
  }

  const contacto = await crearContactoPago(auth.id, nombre, clabe);

  return jsonResponse({ contacto }, { status: 201 });
}
