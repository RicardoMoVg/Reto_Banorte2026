import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import { colores, espacio, radio, tipografia } from '../../lib/ui/theme';
import { PieDeAccion } from './PieDeAccion';
import type { PropsDeAccion } from './tipos';

export interface RenglonResumen {
  etiqueta: string;
  /**
   * Ya viene formateado como texto desde `server/`. Es string y no number a
   * propósito: aquí caben montos, fechas y categorías por igual, y el
   * formato de cada uno lo decide quien tiene el dato real.
   */
  valor: string;
}

export interface ConfirmarAccionProps extends PropsDeAccion {
  titulo: string;
  resumen: RenglonResumen[];
  /** Texto del botón afirmativo, ej. "Activar alerta". */
  textoAceptar?: string;
  /** Qué queda configurado al aceptar. Se muestra tras aceptar. */
  resultado: string;
  /** Advertencia opcional: algo que conviene saber ANTES de aceptar. */
  advertencia?: string;
  mensajeAgente: string;
}

/**
 * Confirmación genérica de una acción propuesta por el agente: un título,
 * un resumen de qué va a pasar, y los botones.
 *
 * Es el equivalente "de acción" a los bloques genéricos que describe
 * `constitution.md` 4.4: sirve para cualquier dominio (activar una alerta,
 * mover dinero a una meta, cambiar un límite) sin escribir un componente
 * por caso. Una sola tool lo alimenta.
 *
 * Los valores de `resumen` los inyecta el servidor por referencia
 * (`idDato`), no los escribe el modelo — misma regla de 4.4.
 */
export function ConfirmarAccion({
  idAccion,
  etiqueta,
  intencion,
  titulo,
  resumen,
  textoAceptar,
  resultado,
  advertencia,
  mensajeAgente,
}: ConfirmarAccionProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.etiquetaTipo}>Requiere tu confirmación</Text>
      <Text style={styles.titulo}>{titulo}</Text>

      <View style={styles.resumen}>
        {resumen.map((r) => (
          <View key={r.etiqueta} style={styles.renglon}>
            <Text style={styles.renglonEtiqueta} numberOfLines={1}>
              {r.etiqueta}
            </Text>
            <Text style={styles.renglonValor} numberOfLines={1}>
              {r.valor}
            </Text>
          </View>
        ))}
      </View>

      {advertencia ? (
        <View style={styles.advertencia}>
          <Ionicons name="alert-circle-outline" size={15} color={colores.textoSecundario} />
          <Text style={styles.advertenciaTexto}>{advertencia}</Text>
        </View>
      ) : null}

      <Text style={styles.mensaje}>{mensajeAgente}</Text>

      <PieDeAccion
        idAccion={idAccion}
        etiqueta={etiqueta}
        intencion={intencion}
        textoAceptar={textoAceptar}
        resultado={resultado}
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
  etiquetaTipo: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: colores.marca,
  },
  titulo: { fontSize: 15, fontWeight: '700', color: colores.texto, marginTop: 2 },

  resumen: {
    marginTop: espacio.md,
    borderRadius: radio.sm,
    backgroundColor: colores.superficieSutil,
    paddingHorizontal: espacio.md,
    paddingVertical: espacio.xs,
  },
  renglon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espacio.md,
    paddingVertical: espacio.sm,
  },
  renglonEtiqueta: { flexShrink: 1, fontSize: 12, color: colores.textoSecundario },
  renglonValor: { flexShrink: 1, fontSize: 13, fontWeight: '600', color: colores.texto },

  advertencia: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espacio.sm,
    marginTop: espacio.md,
  },
  advertenciaTexto: {
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 16,
    color: colores.textoSecundario,
  },

  mensaje: { ...tipografia.pie, marginTop: espacio.md, color: colores.textoApoyo },
});
