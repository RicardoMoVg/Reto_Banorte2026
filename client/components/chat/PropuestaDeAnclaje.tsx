import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTablero, type BloqueAnclado } from '../../lib/a2ui/TableroProvider';
import { colores, espacio, radio, tipografia } from '../../lib/ui/theme';

/**
 * Barra de "¿lo agrego a tu Inicio?" debajo de un bloque del chat.
 *
 * Solo se pinta cuando el AGENTE lo propuso, es decir cuando el usuario
 * pidió que el componente se agregara ("ponme mis gastos en el inicio") y
 * el modelo marcó `agregarAInicio: true` en el bloque. Una consulta de paso
 * ("¿en qué gasté?") no la muestra y no ensucia el tablero.
 *
 * Es una VALIDACIÓN, no un anclaje automático: el agente propone, el
 * usuario confirma. Mismo principio que las tarjetas de acción — nada que
 * cambie el estado de la app ocurre sin un toque explícito.
 */
export function PropuestaDeAnclaje({ bloque }: { bloque: BloqueAnclado }) {
  const { anclado, anclar } = useTablero();

  if (anclado(bloque.id)) {
    return (
      <View style={[styles.barra, styles.hecho]}>
        <Ionicons name="checkmark-circle" size={16} color={colores.positivo} />
        <Text style={styles.hechoTexto}>Agregado a tu Inicio</Text>
      </View>
    );
  }

  return (
    <View style={styles.barra}>
      <Text style={styles.pregunta} numberOfLines={2}>
        ¿Lo dejo fijo en tu Inicio?
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Aceptar componente"
        onPress={() => anclar(bloque)}
        style={({ pressed }) => [styles.boton, pressed && styles.presionado]}
      >
        <Ionicons name="add" size={16} color={colores.textoInverso} />
        <Text style={styles.botonTexto}>Aceptar componente</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * Se apila en vertical, no en horizontal.
   *
   * En fila, dentro del panel flotante (mucho mas angosto que la pantalla),
   * el texto empujaba al boton fuera del area visible: el usuario veia la
   * pregunta y ningun boton que tocar. Apilado entra siempre, sin importar
   * el ancho del contenedor.
   */
  barra: {
    gap: espacio.sm,
    width: '100%',
    maxWidth: 420,
    marginTop: -espacio.sm,
    borderBottomLeftRadius: radio.md,
    borderBottomRightRadius: radio.md,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colores.borde,
    backgroundColor: colores.superficieSutil,
    paddingHorizontal: espacio.lg,
    paddingVertical: espacio.md,
  },
  hecho: { flexDirection: 'row', alignItems: 'center', backgroundColor: colores.marcaSuave },
  hechoTexto: { ...tipografia.pie, color: colores.textoSecundario },
  pregunta: { ...tipografia.pie, flexShrink: 1 },
  boton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    gap: espacio.xs,
    borderRadius: radio.sm,
    backgroundColor: colores.marca,
    paddingHorizontal: espacio.md,
    paddingVertical: espacio.sm,
  },
  botonTexto: { fontSize: 12, fontWeight: '700', color: colores.textoInverso },
  presionado: { opacity: 0.8 },
});
