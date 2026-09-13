import { requireUsuario } from '@/lib/auth/supabase';
import {
  getCuentasUsuario,
  getSaldoUsuario,
  getTransaccionesRecientes,
  crearTransaccion,
} from '@/lib/mcp/mcp-client';
import { CORS_HEADERS, jsonResponse } from '@/lib/http/cors';

export const runtime = 'nodejs';

export function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

/**
 * Tope de la pagina. Lo impone el schema Zod de `get_transacciones` en
 * `mcp-server/`: pedir mas hace que el MCP rechace la llamada entera, y
 * con mocks no se nota porque los mocks no validan.
 */
const MAX_LIMITE = 50;

/**
 * Endpoint REST tradicional (banca tradicional, `constitution.md` 3.3):
 * la pantalla de Movimientos lista los movimientos del usuario sin pasar
 * por el LLM. Reusa exactamente las mismas funciones de
 * `lib/mcp/mcp-client.ts` que usa el agente -- el dato sigue saliendo solo
 * de MCP, nomas que el "operador" es una pantalla, no el chat.
 *
 * Devuelve tambien el saldo en la misma respuesta: una pantalla de
 * movimientos casi siempre muestra los dos juntos, y salen de la misma
 * tabla. Ahorra un viaje de red en movil, que es donde se nota.
 *
 * El userId NUNCA se toma del body ni del query -- siempre del token
 * verificado por `requireUsuario`, para no romper las validaciones de
 * dueño que ya tienen las tools de MCP.
 */
export async function GET(req: Request) {
  const auth = await requireUsuario(req);
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(req.url);
  const limiteParam = Number(searchParams.get('limite'));
  const categoria = searchParams.get('categoria') ?? undefined;
  const desde = searchParams.get('desde') ?? undefined;
  const hasta = searchParams.get('hasta') ?? undefined;

  const limite =
    Number.isFinite(limiteParam) && limiteParam > 0 ? Math.min(limiteParam, MAX_LIMITE) : MAX_LIMITE;

  const [transacciones, saldo] = await Promise.all([
    getTransaccionesRecientes(auth.id, { limite, categoria, desde, hasta }),
    getSaldoUsuario(auth.id),
  ]);

  return jsonResponse({ transacciones, saldo });
}

/**
 * Registra un movimiento a mano (un gasto en efectivo, un ingreso que el
 * banco no ve). Monto negativo = gasto, positivo = ingreso, igual que en
 * la tabla.
 *
 * Ojo: esto NO es el camino para transferencias. Una transferencia se
 * crea con `POST /api/transferencias`, que ademas de su fila en
 * `transferencias` inserta el movimiento correspondiente -- las dos cosas
 * en una transaccion de base de datos. Registrar aqui el movimiento "a
 * mano" dejaria la transferencia sin su registro y el saldo cuadraria por
 * accidente.
 */
export async function POST(req: Request) {
  const auth = await requireUsuario(req);
  if (auth instanceof Response) return auth;

  const { descripcion, monto, categoria, cuentaId } = (await req.json()) as {
    descripcion?: string;
    monto?: number;
    categoria?: string;
    cuentaId?: string;
  };

  if (!descripcion || typeof monto !== 'number' || monto === 0) {
    return jsonResponse(
      { error: 'descripcion y monto (distinto de cero) son requeridos.' },
      { status: 400 },
    );
  }

  // Todo movimiento cuelga de una cuenta. Si el cliente no dice cual, se
  // usa la primera del usuario -- que es lo que espera quien solo quiere
  // registrar un gasto y no sabe que tiene varias cuentas.
  let cuenta = cuentaId;
  if (!cuenta) {
    const cuentas = await getCuentasUsuario(auth.id);
    if (cuentas.length === 0) {
      return jsonResponse(
        { error: 'El usuario no tiene ninguna cuenta a la cual asociar el movimiento.' },
        { status: 400 },
      );
    }
    cuenta = cuentas[0].id;
  }

  const transaccion = await crearTransaccion(auth.id, cuenta, descripcion, monto, categoria);

  return jsonResponse({ transaccion }, { status: 201 });
}
