import { StyleSheet, Text, View } from 'react-native';
import { colores, espacio, radio, tipografia } from '../../lib/ui/theme';
import { pesos } from '../../lib/ui/formato';
import { PieDeAccion } from './PieDeAccion';
import type { PropsDeAccion } from './tipos';

export interface RenglonPlan {
  /** "Mes 1", "Nov", lo que haya decidido el servidor. */
  periodo: string;
  /** Cuánto se lleva acumulado al cerrar ese periodo. */
  acumulado: number;
}

export interface PropuestaAhorroProps extends PropsDeAccion {
  titulo: string;
  /** Nombre de la meta a la que aplica el plan. */
  meta: string;
  /** Aportación por periodo. La calcula el servidor con datos del MCP. */
  aportacion: number;
  periodos: number;
  objetivo: number;
  /** Lo que ya lleva ahorrado, para que el avance del plan tenga sentido. */
  actual: number;
  calendario: RenglonPlan[];
  mensajeAgente: string;
}

/**
 * Propuesta de plan de ahorro: cuánto apartar por periodo y cómo se vería
 * el avance, con la opción de aceptarla.
 *
 * Es un bloque de ACCIÓN (ver `tipos.ts`): vive en el chat, no en el
 * tablero, y la respuesta del usuario vuelve al agente.
 *
 * Ninguna cifra de aquí la escribió el modelo. `aportacion`, `calendario`,
 * `objetivo` y `actual` los calcula la tool `proponerPlanAhorro` en
 * `server/` a partir de las metas y transacciones reales del MCP; el modelo
 * solo elige la meta, el plazo y redacta los textos (constitution.md 4.2).
 */
export function PropuestaAhorro({
  idAccion,
  etiqueta,
  // Un plan de ahorro es verde salvo que el agente diga otra cosa: es el
  // caso de uso del bloque, no una excepción.
  intencion = 'ahorro',
  titulo,
  meta,
  aportacion,
  periodos,
  objetivo,
  actual,
  calendario,
  mensajeAgente,
}: PropuestaAhorroProps) {
  return (
    <View style={styles.card}>
      <View style={styles.encabezado}>
        <Text style={styles.etiquetaTipo}>Propuesta</Text>
        <Text style={styles.titulo}>{titulo}</Text>
        <Text style={styles.meta}>Para: {meta}</Text>
      </View>

      <View style={styles.destacado}>
        <View>
          <Text style={styles.destacadoEtiqueta}>Apartas</Text>
          <Text style={styles.destacadoMonto}>{pesos(aportacion)}</Text>
        </View>
        <View style={styles.destacadoDerecha}>
          <Text style={styles.destacadoEtiqueta}>Durante</Text>
          <Text style={styles.destacadoPlazo}>
            {periodos} {periodos === 1 ? 'mes' : 'meses'}
          </Text>
        </View>
      </View>

      <View style={styles.tabla}>
        <View style={styles.tablaEncabezado}>
          <Text style={[styles.celdaEncabezado, styles.colPeriodo]}>Periodo</Text>
          <Text style={[styles.celdaEncabezado, styles.colAvance]}>Avance</Text>
          <Text style={[styles.celdaEncabezado, styles.colMonto]}>Acumulado</Text>
        </View>

        {calendario.map((r) => {
          const avance = Math.min(100, Math.round((r.acumulado / objetivo) * 100));
          return (
            <View key={r.periodo} style={styles.renglon}>
              <Text style={[styles.celda, styles.colPeriodo]} numberOfLines={1}>
                {r.periodo}
              </Text>
              <View style={[styles.colAvance, styles.pista]}>
                <View style={[styles.relleno, { width: `${avance}%` }]} />
              </View>
              <Text style={[styles.celda, styles.colMonto, styles.montoFuerte]}>
                {pesos(r.acumulado)}
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.pieTabla}>
        Hoy llevas {pesos(actual)} de {pesos(objetivo)}.
      </Text>

      <Text style={styles.mensaje}>{mensajeAgente}</Text>

      <PieDeAccion
        idAccion={idAccion}
        etiqueta={etiqueta}
        intencion={intencion}
        textoAceptar="Aceptar plan"
        resultado="Plan aceptado. Queda registrado en esta sesión; todavía no se programa ningún movimiento real."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde,
    backgroundColor: colores.superficie,
    padding: espacio.lg,
  },

  encabezado: { gap: 2 },
  etiquetaTipo: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: colores.marca,
  },
  titulo: { fontSize: 15, fontWeight: '700', color: colores.texto },
  meta: { ...tipografia.pie },

  destacado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: espacio.md,
    marginTop: espacio.md,
    borderRadius: radio.sm,
    backgroundColor: colores.marcaSuave,
    paddingHorizontal: espacio.lg,
    paddingVertical: espacio.md,
  },
  destacadoDerecha: { alignItems: 'flex-end' },
  destacadoEtiqueta: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colores.textoApoyo,
  },
  destacadoMonto: { fontSize: 22, fontWeight: '700', color: colores.marca },
  destacadoPlazo: { fontSize: 15, fontWeight: '700', color: colores.texto },

  tabla: { marginTop: espacio.lg },
  tablaEncabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
    paddingBottom: espacio.sm,
    borderBottomWidth: 1,
    borderBottomColor: colores.borde,
  },
  celdaEncabezado: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colores.textoApoyo,
  },
  renglon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
    paddingVertical: espacio.sm,
    borderBottomWidth: 1,
    borderBottomColor: colores.bordeSutil,
  },
  celda: { fontSize: 12, color: colores.textoSecundario },
  montoFuerte: { fontWeight: '600', color: colores.texto, textAlign: 'right' },
  colPeriodo: { width: 58 },
  colAvance: { flex: 1 },
  colMonto: { width: 84 },
  pista: {
    height: 6,
    borderRadius: radio.completo,
    backgroundColor: colores.marcaSuave,
    overflow: 'hidden',
  },
  relleno: { height: '100%', borderRadius: radio.completo, backgroundColor: colores.marca },

  pieTabla: { ...tipografia.pie, marginTop: espacio.sm },
  mensaje: { ...tipografia.pie, marginTop: espacio.md, color: colores.textoApoyo },
});
