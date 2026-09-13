/**
 * Cliente de los endpoints REST tradicionales de `server/`.
 *
 * Es la otra mitad de `constitution.md` 3.3: el chat habla con el agente
 * por `/api/agent`, y las pantallas tradicionales (Movimientos, Inicio,
 * Tarjetas) piden sus datos por REST, sin LLM de por medio. Los dos
 * caminos terminan en las mismas funciones de `mcp-client.ts`, así que el
 * dato sigue saliendo solo del MCP.
 *
 * Por qué no reusar el `fetch` de `expo/fetch` que usa useAgentStream: ese
 * existe para leer respuestas en streaming. Aquí son respuestas JSON
 * normales y el `fetch` global basta.
 */
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

/**
 * Token del usuario, cuando exista login real.
 *
 * Hoy siempre es null: el login es una puerta demo que no emite token, y
 * el servidor atiende las peticiones sin `Authorization` como `demo-user`
 * (ver AUTH_USUARIO_SIN_TOKEN en server/.env). Cuando el login emita
 * tokens, esto se llena al iniciar sesión y deja de haber excepción.
 */
let token: string | null = null;

export function fijarToken(nuevo: string | null) {
  token = nuevo;
}

export class ErrorApi extends Error {
  constructor(
    mensaje: string,
    readonly estado: number,
  ) {
    super(mensaje);
  }
}

async function pedir<T>(ruta: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(`${API_URL}${ruta}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : null),
      ...init?.headers,
    },
  });

  const cuerpo = await resp.json().catch(() => null);

  if (!resp.ok) {
    // El servidor manda `{ error }` en todos sus endpoints; si no llegó,
    // se usa el código para no mostrar un "undefined" en pantalla.
    throw new ErrorApi(cuerpo?.error ?? `El servidor respondió ${resp.status}.`, resp.status);
  }

  return cuerpo as T;
}

export interface TransaccionApi {
  id: string;
  descripcion: string;
  monto: number;
  fecha: string;
  categoria: string;
}

/** Movimientos del usuario y su saldo, en una sola llamada. */
export function getTransacciones(opciones: { limite?: number; categoria?: string } = {}) {
  const params = new URLSearchParams();
  if (opciones.limite) params.set('limite', String(opciones.limite));
  if (opciones.categoria) params.set('categoria', opciones.categoria);

  const query = params.toString();
  return pedir<{ transacciones: TransaccionApi[]; saldo: number }>(
    `/api/transacciones${query ? `?${query}` : ''}`,
  );
}
