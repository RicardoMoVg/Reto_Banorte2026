import { LimiteDeError } from '../../components/ui/LimiteDeError';
import type { Mensaje } from './types';
import { catalogoA2ui } from './catalog';

/**
 * Busca en el catálogo el componente que corresponde a `mensaje.nombre` y
 * lo renderiza con `mensaje.props`. Reemplaza el `renderBloque()`/`switch`
 * a mano del Paso 3 — agregar un bloque nuevo no toca este archivo.
 */
export function SurfaceRenderer({ mensaje }: { mensaje: Extract<Mensaje, { tipo: 'surface' }> }) {
  const Componente = catalogoA2ui[mensaje.nombre];

  if (!Componente) {
    if (__DEV__) {
      console.warn(`[SurfaceRenderer] "${mensaje.nombre}" no está en el catálogo (catalog.ts).`);
    }
    return null;
  }

  /**
   * El límite va aquí y no en cada bloque: este es el único punto por el
   * que pasan TODOS los bloques del catálogo, así que ninguno se puede
   * olvidar de protegerse. Los `props` llegan como JSON sin validar (ver
   * LimiteDeError), y una tarjeta mal formada no debe llevarse el chat.
   */
  return (
    <LimiteDeError nombre={mensaje.nombre}>
      <Componente {...mensaje.props} />
    </LimiteDeError>
  );
}
