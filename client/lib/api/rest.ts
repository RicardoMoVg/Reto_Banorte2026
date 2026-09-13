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
 * Token del usuario. `SesionProvider.iniciarSesion`/`registrarse` lo llenan
 * con el `accessToken` real que regresa Supabase Auth; `cerrarSesion` lo
 * vuelve a poner en `null`.
 *
 * Mientras no haya sesión (recién abierta la app, o en pantallas que no
 * requieren login) sigue siendo `null` -- ahí el servidor solo responde si
 * tiene `AUTH_USUARIO_SIN_TOKEN` prendido en su `.env` (ver
 * server/lib/auth/supabase.ts), que ya se puede apagar en cuanto el login
 * esté probado.
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

export interface UsuarioApi {
  id: string;
  email: string | null;
  nombre: string | null;
  usuario: string | null;
  telefono: string | null;
  /** ISO `AAAA-MM-DD`, o `null` si no lo ha registrado. */
  fechaNacimiento: string | null;
  /** ISO. De aquí sale "cliente desde" -- se formatea al mostrarlo. */
  creadoEn: string | null;
}

export interface SesionApi {
  accessToken: string;
  refreshToken: string;
}

/** `POST /api/auth/login` -- credenciales inválidas llegan como `ErrorApi` (401). */
export function login(email: string, password: string) {
  return pedir<{ usuario: UsuarioApi; session: SesionApi }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

/**
 * `POST /api/auth/registro`. `session` viene `null` si el proyecto de
 * Supabase pide confirmar el correo -- en ese caso `requiereConfirmacion`
 * es `true` y todavía no hay con qué llamar `fijarToken`.
 */
export function registrar(email: string, password: string, nombre?: string) {
  return pedir<{ usuario: UsuarioApi; session: SesionApi | null; requiereConfirmacion: boolean }>(
    '/api/auth/registro',
    { method: 'POST', body: JSON.stringify({ email, password, nombre }) },
  );
}

/** `POST /api/auth/logout`. Los tokens van en el body -- ver la ruta en server/. */
export function logout(accessToken: string, refreshToken: string) {
  return pedir<{ ok: true }>('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ accessToken, refreshToken }),
  });
}

export interface CambiosPerfil {
  nombre?: string;
  usuario?: string;
  telefono?: string;
  /** ISO `AAAA-MM-DD`. */
  fechaNacimiento?: string;
}

/** `PUT /api/auth/me` -- persiste en Postgres. El correo no se edita aquí, lo maneja Supabase Auth. */
export function actualizarPerfil(cambios: CambiosPerfil) {
  return pedir<UsuarioApi>('/api/auth/me', { method: 'PUT', body: JSON.stringify(cambios) });
}

export interface WidgetDashboardApi {
  id: string;
  nombre: string;
  props: Record<string, unknown>;
  tool: string;
  parametros: Record<string, unknown>;
  mensajeAgente: string | null;
  orden: number;
  ancho: 'completo' | 'medio';
  lado: 'izquierda' | 'derecha';
}

/**
 * Rehidratación del tablero (constitution.md 3.2): trae los widgets
 * anclados ya resueltos con dato fresco -- el servidor re-ejecuta la tool
 * de cada uno, no regresa el valor que se guardó al anclar.
 */
export function getDashboard() {
  return pedir<{ widgets: WidgetDashboardApi[] }>('/api/dashboard');
}

export interface AnclarWidgetInput {
  id: string;
  componente: string;
  tool: string;
  parametros: Record<string, unknown>;
  mensajeAgente?: string;
  ancho?: 'completo' | 'medio';
  lado?: 'izquierda' | 'derecha';
}

export function anclarWidget(datos: AnclarWidgetInput) {
  return pedir<{ widget: unknown }>('/api/dashboard', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
}

export function desanclarWidget(id: string) {
  return pedir<{ id: string }>('/api/dashboard/desanclar', {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
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
