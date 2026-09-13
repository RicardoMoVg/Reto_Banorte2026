/**
 * Props que TODO bloque A2UI comparte. Cada bloque las extiende con sus
 * propios campos de datos.
 */
export interface PropsBloque {
  /** Contexto humano y breve que aporta el agente sobre este bloque. */
  mensajeAgente: string;
  /**
   * Handler de anclado. El agente NO puede pasarlo (las funciones no cruzan
   * el límite RSC); llega por PinContext. Queda para uso directo/tests.
   */
  onPin?: (tipoComponente: string, datos: any) => void;
  /** false = modo dashboard (ya anclado): se renderiza sin botón de Pin. */
  anclable?: boolean;
  className?: string;
}
