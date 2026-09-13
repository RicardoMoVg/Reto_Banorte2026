import type { ComponentType } from 'react';
import { RastreadorMetas } from '../../components/RastreadorMetas';
import { TarjetaSaldo } from '../../components/TarjetaSaldo';
import { ListaTransacciones } from '../../components/ListaTransacciones';
import { ComparativoGastos } from '../../components/ComparativoGastos';
import { GraficoBarras_H } from '../../components/GraphBar_H';
import { GraficoBarras_V } from '../../components/GraphBar_V';
import { GraphCircle } from '../../components/GraphCircle';
import { GraphSemiCircle } from '../../components/GraphSemiCircle';
import { GraphSpline } from '../../components/GraphSpline';
import { WidgetCompromiso } from '../../components/WidgetCompromiso';
import { ActionCardSelector } from '../../components/chat/ActionCardSelector';
import { ConfirmarAccion } from '../../components/chat/ConfirmarAccion';
import { PropuestaAhorro } from '../../components/chat/PropuestaAhorro';
import { TarjetaAccion } from '../../components/chat/TarjetaAccion';

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
  // Informativos (components/): el agente los manda y ahí termina.
  RastreadorMetas,
  TarjetaSaldo,
  ListaTransacciones,
  ComparativoGastos,

  // Graficas genericas: todas reciben la MISMA forma de props
  // ({titulo, mensajeAgente, categorias}), que es lo que permite que una
  // sola tool (`mostrarGrafica`) alimente a las cinco -- el prerrequisito
  // de constitution.md 4.4. El modelo elige cual, no el codigo.
  GraficaPay: GraphCircle,
  GraficaDona: GraphSemiCircle,
  GraficaBarras: GraficoBarras_V,
  GraficaBarrasH: GraficoBarras_H,
  GraficaLineas: GraphSpline,

  // De acción (components/chat/): el usuario acepta o rechaza, y su
  // respuesta vuelve al agente. Contrato en components/chat/tipos.ts.
  PropuestaAhorro,
  ConfirmarAccion,
  ActionCardSelector,

  // Destino de la "metamorfosis": lo que queda de una tarjeta de accion
  // aplicada, ya fijado en Inicio. No es un bloque que el agente mande --
  // lo crea el cliente al aplicar (ver ActionCardSelector).
  WidgetCompromiso,
  // Componible: el agente arma la tarjeta con piezas (components/chat/elementos.tsx).
  TarjetaAccion,
};
