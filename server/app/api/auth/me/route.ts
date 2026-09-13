import { requireUsuario } from '@/lib/auth/supabase';
import { actualizarPerfil, getUsuario } from '@/lib/mcp/mcp-client';
import { CORS_HEADERS, jsonResponse } from '@/lib/http/cors';

export const runtime = 'nodejs';

export function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function GET(req: Request) {
  const auth = await requireUsuario(req);
  if (auth instanceof Response) return auth;

  const perfil = await getUsuario(auth.id);

  return jsonResponse({
    id: auth.id,
    email: auth.email,
    nombre: perfil?.nombre ?? null,
    usuario: perfil?.usuario ?? null,
    telefono: perfil?.telefono ?? null,
    fechaNacimiento: perfil?.fechaNacimiento ?? null,
    creadoEn: perfil?.creadoEn ?? null,
  });
}

/** Edita los campos del perfil que en verdad viven en Postgres (no el correo -- ese lo maneja Supabase Auth). */
export async function PUT(req: Request) {
  const auth = await requireUsuario(req);
  if (auth instanceof Response) return auth;

  const { nombre, usuario, telefono, fechaNacimiento } = (await req.json()) as {
    nombre?: string;
    usuario?: string;
    telefono?: string;
    fechaNacimiento?: string;
  };

  const resultado = await actualizarPerfil(auth.id, { nombre, usuario, telefono, fechaNacimiento });
  if ('error' in resultado) return jsonResponse({ error: resultado.error }, { status: 400 });

  return jsonResponse({
    id: auth.id,
    email: auth.email,
    nombre: resultado.nombre,
    usuario: resultado.usuario,
    telefono: resultado.telefono,
    fechaNacimiento: resultado.fechaNacimiento,
    creadoEn: resultado.creadoEn,
  });
}
