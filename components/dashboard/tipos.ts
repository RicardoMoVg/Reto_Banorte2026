/**
 * Contrato del "Dashboard Componible": lo que se guarda cuando el usuario
 * ancla un bloque generado por el agente.
 *
 * Clave del diseño: NO guardamos el nodo de React — guardamos JSON plano
 * (`tipo` + `datos`). Eso es lo que permite que mañana esto se persista en
 * Postgres vía MCP y se rehidrate al recargar la página. Un ReactNode no se
 * puede serializar; un `{ tipo, datos }` sí.
 */
export type TipoWidget = 'RastreadorMetas';

export interface WidgetAnclado {
  id: string;
  tipo: TipoWidget | string;
  /** Props del componente, tal cual se le pasarán al rehidratarlo. */
  datos: any;
  /** ISO string — útil para ordenar y para el futuro INSERT en la BD. */
  ancladoEn: string;
}

/** Firma del handler de anclado que viaja por el PinContext. */
export type PinHandler = (tipoComponente: string, datos: any) => void;
