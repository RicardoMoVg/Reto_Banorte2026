import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { actualizarPerfil as actualizarPerfilApi, fijarToken, login, logout, registrar, type UsuarioApi } from '../api/rest';
import type { Perfil } from './perfilDemo';

export interface Sesion {
  /** Correo con el que se entró. */
  correo: string;
}

interface ContextoSesion {
  sesion: Sesion | null;
  /** Datos del titular. `null` mientras no hay sesión. */
  perfil: Perfil | null;
  /** Mientras hay una petición de auth en vuelo (login/registro/logout). */
  cargando: boolean;
  /** Lanza `ErrorApi` si Supabase rechaza las credenciales. */
  iniciarSesion: (correo: string, contrasena: string) => Promise<void>;
  /**
   * Si el proyecto de Supabase pide confirmar el correo, regresa
   * `{ requiereConfirmacion: true }` y NO abre sesión -- no hay token
   * todavía. La pantalla debe avisarle al usuario que revise su correo.
   */
  registrarse: (correo: string, contrasena: string, nombre?: string) => Promise<{ requiereConfirmacion: boolean }>;
  cerrarSesion: () => Promise<void>;
  /**
   * Aplica solo los campos que vengan; el resto se queda como estaba.
   * Persiste en Postgres (`PUT /api/auth/me`) -- lanza `ErrorApi` si falla,
   * y en ese caso el estado local NO cambia (para no mentir que se guardó).
   */
  actualizarPerfil: (cambios: { nombre?: string; usuario?: string; telefono?: string; nacimiento?: string }) => Promise<void>;
}

const SesionContext = createContext<ContextoSesion | null>(null);

/**
 * Estado de sesión de la app y datos del titular.
 *
 * `iniciarSesion`/`registrarse` llaman a Supabase Auth de verdad (vía
 * `server/app/api/auth/*`, ver `constitution.md` 3.3) y guardan el
 * `accessToken` con `fijarToken()` para que el resto de llamadas REST
 * (`lib/api/rest.ts`) viajen autenticadas. `cerrarSesion` revoca ese token
 * en Supabase antes de limpiar el estado local.
 *
 * **La sesión vive solo en memoria** — al recargar la app se vuelve al
 * login. Persistirla implicaría `expo-secure-store`; mientras nadie lo
 * pida, "recordar sesión" no vale el dependency nuevo. El perfil (nombre,
 * usuario, teléfono, fecha de nacimiento) sí vive en Postgres desde que
 * inicia sesión -- `login`/`registrar` ya regresan el perfil completo, y
 * `actualizarPerfil` persiste los cambios ahí mismo.
 */
function aPerfil(usuario: UsuarioApi): Perfil {
  return {
    nombre: usuario.nombre ?? '',
    usuario: usuario.usuario,
    correo: usuario.email ?? '',
    nacimiento: usuario.fechaNacimiento,
    telefono: usuario.telefono,
    clienteDesde: usuario.creadoEn ?? new Date().toISOString(),
  };
}

export function SesionProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [tokens, setTokens] = useState<{ access: string; refresh: string } | null>(null);
  const [cargando, setCargando] = useState(false);

  function abrirSesion(usuario: UsuarioApi, accessToken: string, refreshToken: string) {
    fijarToken(accessToken);
    setTokens({ access: accessToken, refresh: refreshToken });
    setSesion({ correo: usuario.email ?? '' });
    setPerfil(aPerfil(usuario));
  }

  const valor = useMemo<ContextoSesion>(
    () => ({
      sesion,
      perfil,
      cargando,
      iniciarSesion: async (correo: string, contrasena: string) => {
        setCargando(true);
        try {
          const { usuario, session } = await login(correo, contrasena);
          abrirSesion(usuario, session.accessToken, session.refreshToken);
        } finally {
          setCargando(false);
        }
      },
      registrarse: async (correo: string, contrasena: string, nombre?: string) => {
        setCargando(true);
        try {
          const { usuario, session, requiereConfirmacion } = await registrar(correo, contrasena, nombre);
          if (session) {
            abrirSesion(usuario, session.accessToken, session.refreshToken);
          }
          return { requiereConfirmacion };
        } finally {
          setCargando(false);
        }
      },
      cerrarSesion: async () => {
        setCargando(true);
        try {
          if (tokens) {
            // Best-effort: si Supabase ya no reconoce el token (expiró, o
            // ya se cerró sesión en otro lado) igual se limpia el estado
            // local -- no tiene caso dejar al usuario atorado en la app.
            await logout(tokens.access, tokens.refresh).catch(() => {});
          }
        } finally {
          fijarToken(null);
          setTokens(null);
          setSesion(null);
          setPerfil(null);
          setCargando(false);
        }
      },
      actualizarPerfil: async (cambios) => {
        const usuario = await actualizarPerfilApi({
          nombre: cambios.nombre,
          usuario: cambios.usuario,
          telefono: cambios.telefono,
          fechaNacimiento: cambios.nacimiento,
        });
        setPerfil(aPerfil(usuario));
      },
    }),
    [sesion, perfil, cargando, tokens],
  );

  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

export function useSesion(): ContextoSesion {
  const contexto = useContext(SesionContext);
  if (!contexto) {
    throw new Error('useSesion() se usó fuera de <SesionProvider> (ver app/_layout.tsx).');
  }
  return contexto;
}
