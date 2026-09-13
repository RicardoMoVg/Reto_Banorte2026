import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAcciones } from '../../lib/a2ui/AccionesProvider';
import { textoSobre } from '../../lib/ui/contraste';
import { COLOR_INTENCION, colores, espacio, radio, type Intencion } from '../../lib/ui/theme';
import { AcuseDeAccion } from './AcuseDeAccion';

export interface PieDeAccionProps {
  idAccion: string;
  etiqueta: string;
  /**
   * Qué está en juego. Tiñe el botón de ejecución; el resto de la tarjeta
   * no cambia. Por defecto `neutral`: un bloque que no la declare se ve
   * sobrio, nunca "de alerta" por accidente.
   */
  intencion?: Intencion;
  /** Texto del botón afirmativo. Por defecto "Aceptar". */
  textoAceptar?: string;
  /** Qué queda configurado al aceptar. Se muestra ya resuelta la decisión. */
  resultado: string;
}

/**
 * Pie compartido de los bloques de acción: los dos botones mientras está
 * pendiente, y el acuse cuando ya se decidió.
 *
 * Es la plantilla base de los componentes transaccionales — `PropuestaAhorro`
 * y `ConfirmarAccion` delegan aquí toda la decisión. Vive aparte porque el
 * estado resuelto tiene que verse IGUAL en todos: si cada bloque lo pintara
 * a su manera, el usuario no sabría de un vistazo cuáles propuestas ya
 * contestó al revisar el historial del chat.
 *
 * ## Patrón de intenciones semánticas
 *
 * El agente no elige un color: elige una INTENCIÓN (`alerta`, `ahorro`,
 * `inversion`, `neutral`) y el cliente la traduce con `COLOR_INTENCION`.
 * Esa indirección es deliberada y es lo que hace que siga siendo A2UI —
 * si el modelo mandara `'#EB0029'`, el servidor estaría decidiendo diseño y
 * un cambio de paleta obligaría a reentrenar el prompt en vez de editar un
 * archivo. También acota el daño: el modelo no puede inventar un color
 * ilegible o fuera de marca, solo puede escoger de cuatro.
 *
 * El botón secundario NO se tiñe nunca. Si ambos botones compitieran por
 * atención, la tarjeta empujaría a aceptar — y en una acción de `alerta`
 * (un cargo que quizá sea fraude) rechazar debe ser igual de fácil que
 * aceptar.
 */
export function PieDeAccion({
  idAccion,
  etiqueta,
  intencion = 'neutral',
  textoAceptar = 'Aceptar',
  resultado,
}: PieDeAccionProps) {
  const acciones = useAcciones();
  const estado = acciones?.estadoDe(idAccion) ?? 'pendiente';

  const fondoAccion = COLOR_INTENCION[intencion];
  // Calculado, no fijo: ver el comentario de COLOR_INTENCION. El verde de
  // ahorro necesita texto oscuro; los otros tres, blanco.
  const textoAccion = textoSobre(fondoAccion);

  if (estado !== 'pendiente') {
    return <AcuseDeAccion estado={estado} resultado={resultado} />;
  }

  // Sin provider (no hay a quién responder) la tarjeta queda informativa.
  if (!acciones) return null;

  return (
    <View style={styles.botones}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={textoAceptar}
        onPress={() => acciones.responder(idAccion, 'aceptada', etiqueta)}
        style={({ pressed }) => [
          styles.boton,
          { backgroundColor: fondoAccion, borderColor: fondoAccion },
          pressed && styles.presionado,
        ]}
      >
        <Text style={[styles.botonTexto, { color: textoAccion }]}>{textoAceptar}</Text>
      </Pressable>

      {/* Constante en las cuatro intenciones: ver el comentario de arriba. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ahora no"
        onPress={() => acciones.responder(idAccion, 'rechazada', etiqueta)}
        style={({ pressed }) => [styles.boton, styles.rechazar, pressed && styles.presionado]}
      >
        <Text style={[styles.botonTexto, styles.rechazarTexto]}>Ahora no</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  botones: { flexDirection: 'row', gap: espacio.sm, marginTop: espacio.md },
  boton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radio.sm,
    paddingVertical: espacio.md,
    borderWidth: 1,
  },
  botonTexto: { fontSize: 13, fontWeight: '700' },
  rechazar: { backgroundColor: 'transparent', borderColor: colores.borde },
  rechazarTexto: { fontWeight: '600', color: colores.textoSecundario },
  presionado: { opacity: 0.75 },
});
