import type { ComponentType } from 'react';
import { RastreadorMetas } from '../../components/RastreadorMetas';
import { TarjetaSaldo } from '../../components/TarjetaSaldo';
import { ListaTransacciones } from '../../components/ListaTransacciones';
import { ComparativoGastos } from '../../components/ComparativoGastos';
import { Confirmacion } from '../../components/Confirmacion';

/**
 * Catálogo A2UI: mapea el `tipo` que manda el backend (ver
 * server/lib/ai/a2ui-tools.ts) al componente nativo que lo renderiza.
 *
 * Agregar un bloque nuevo = registrarlo aquí, una línea. Nada más cambia:
 * ni el parser del stream (useAgentStream.ts), ni el renderer
 * (SurfaceRenderer.tsx). Contrato de nombres en constitution.md 4.2/4.3 —
 * el string aquí debe ser IDÉNTICO al `tipo` que regresa la tool.
 */
export const catalogoA2ui: Record<string, ComponentType<any>> = {
  RastreadorMetas,
  TarjetaSaldo,
  ListaTransacciones,
  ComparativoGastos,
  Confirmacion,
};
