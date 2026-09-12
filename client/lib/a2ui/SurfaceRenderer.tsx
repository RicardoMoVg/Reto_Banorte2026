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

  return <Componente {...mensaje.props} />;
}
