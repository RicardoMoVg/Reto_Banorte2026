import type { ComponentType } from 'react';
import { RastreadorMetas } from '../../components/RastreadorMetas';
import { TarjetaSaldo } from '../../components/TarjetaSaldo';
import { ListaTransacciones } from '../../components/ListaTransacciones';
import { ComparativoGastos } from '../../components/ComparativoGastos';
import { ActionCardSelector } from '../../components/chat/ActionCardSelector';
import { ConfirmarAccion } from '../../components/chat/ConfirmarAccion';
import { PropuestaAhorro } from '../../components/chat/PropuestaAhorro';
import { Confirmacion } from '../../components/Confirmacion';
import { GraphSpline } from '../../components/GraphSpline';
import { ListaDatos } from '../../components/ListaDatos';
import { GraficoBarras_H } from '../../components/GraphBar_H';
import { GraficoBarras_V } from '../../components/GraphBar_V';
import { GraphCircle } from '../../components/GraphCircle';
import { GraphSemiCircle } from '../../components/GraphSemiCircle';
import { WidgetCompromiso } from '../../components/WidgetCompromiso';
import { AccesoRapido } from '../../components/AccesoRapido';
import { AjusteTablero } from '../../components/AjusteTablero';
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
  Confirmacion,
  // Lista generica: un componente para los ocho dominios que el usuario
  // "tiene" (contactos, transferencias, tarjetas, portafolio, polizas,
  // solicitudes, aportaciones, habitos). Lo alimenta `mostrarListado`.
  ListaDatos,

  // Graficas registradas DOS veces a proposito. Los nombres crudos
  // (GraphSpline, GraficoBarras_H) los emiten las tools de la rama de
  // datos; los semanticos (GraficaPay, GraficaBarras...) los emite
  // `mostrarGrafica`, donde el MODELO elige la forma. Mismo componente,
  // dos llaves -- quitar cualquiera rompe una de las dos tools.
  GraphSpline,
  GraficoBarras_H,
  GraficaPay: GraphCircle,
  GraficaDona: GraphSemiCircle,
  GraficaBarras: GraficoBarras_V,
  GraficaBarrasH: GraficoBarras_H,
  GraficaLineas: GraphSpline,

  // Atajo de un toque que el usuario fija en su Inicio. Lo crea
  // `crearAccesoRapido`; al tocarse manda su peticion a la conversacion
  // (no ejecuta nada por su cuenta) -- ver components/AccesoRapido.tsx.
  AccesoRapido,
  // Acuse de un reacomodo del tablero, y quien lo aplica: lo manda
  // `acomodarTablero` y el componente escribe en <TableroProvider>.
  AjusteTablero,

  // De acción (components/chat/): el usuario acepta o rechaza, y su
  // respuesta vuelve al agente. Contrato en components/chat/tipos.ts.
  PropuestaAhorro,
  ConfirmarAccion,
  ActionCardSelector,
  // Componible: el agente arma la tarjeta con piezas (chat/elementos.tsx).
  TarjetaAccion,

  // Destino de la "metamorfosis": lo que queda de una tarjeta de accion
  // aplicada, ya fijado en Inicio. No lo manda el agente -- lo crea el
  // cliente al aplicar (ver ActionCardSelector).
  WidgetCompromiso,
};
