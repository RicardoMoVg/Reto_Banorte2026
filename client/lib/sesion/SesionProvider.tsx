import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { PERFIL_DEMO, type Perfil } from './perfilDemo';

export interface Sesion {
  /** Correo con el que se entró. Es lo único que se conserva del formulario. */
  correo: string;
}

interface ContextoSesion {
  sesion: Sesion | null;
  /** Datos del titular. `null` mientras no hay sesión. */
  perfil: Perfil | null;
  iniciarSesion: (correo: string) => void;
  cerrarSesion: () => void;
  /** Aplica solo los campos que vengan; el resto se queda como estaba. */
  actualizarPerfil: (cambios: Partial<Perfil>) => void;
}

const SesionContext = createContext<ContextoSesion | null>(null);

/**
 * Estado de sesión de la app y datos del titular.
 *
 * ⚠️ Esto NO es autenticación. El backend no tiene auth: `server/app/api/
 * agent/route.ts` usa un `USER_ID` fijo (`'demo-user'`), el mismo que
 * siembra `mcp-server/src/seed.ts`. Cualquier credencial abre la app, y
 * nada de lo que se escriba en el formulario sale de este dispositivo.
 *
 * Tres decisiones deliberadas, no pendientes por flojera:
 *
 * 1. **La contraseña nunca se guarda** — ni en este estado, ni en
 *    AsyncStorage, ni en SQLite. Entra al handler del formulario, se valida
 *    que no esté vacía, y se descarta. Guardar una credencial en claro en
 *    el dispositivo para una demo no tiene ninguna ventaja y sí un riesgo
 *    real si alguien copia el patrón a producción.
 * 2. **La sesión vive solo en memoria** — al recargar la app se vuelve al
 *    login. Persistirla implicaría `expo-secure-store` y un token de
 *    verdad; mientras el backend no emita uno, "recordar sesión" sería
 *    puro teatro.
 * 3. **El perfil editado tampoco se persiste** — se reinicia a
 *    `PERFIL_DEMO` en cada sesión, y la ventana de edición lo dice. Es la
 *    misma razón: sin backend que lo reciba, guardarlo en disco daría la
 *    falsa impresión de que el cambio viajó a algún lado.
 *
 * Cuando exista auth real, esto es lo que cambia: `iniciarSesion` llama al
 * backend y guarda el token en `expo-secure-store`, `actualizarPerfil`
 * hace el PATCH correspondiente, y el `userId` deja de estar hardcodeado
 * en `server/`. Las ventanas no se tocan.
 */
export function SesionProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);

  const valor = useMemo<ContextoSesion>(
    () => ({
      sesion,
      perfil,
      iniciarSesion: (correo: string) => {
        setSesion({ correo });
        // El correo real gana sobre el de ejemplo: es el único dato del
        // titular que el usuario sí escribió.
        setPerfil({ ...PERFIL_DEMO, correo });
      },
      cerrarSesion: () => {
        setSesion(null);
        setPerfil(null);
      },
      actualizarPerfil: (cambios: Partial<Perfil>) =>
        setPerfil((previo) => (previo ? { ...previo, ...cambios } : previo)),
    }),
    [sesion, perfil],
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
