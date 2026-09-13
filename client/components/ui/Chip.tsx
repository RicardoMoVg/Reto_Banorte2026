import { Pressable, StyleSheet, Text } from 'react-native';
import { colores, espacio, radio } from '../../lib/ui/theme';

export interface ChipProps {
  texto: string;
  onPress: () => void;
}

/**
 * Sugerencia tocable. Se usa para proponerle al usuario preguntas que el
 * agente sí sabe responder con un bloque — es la forma más barata de
 * enseñar qué puede hacer la app sin un tutorial.
 */
export function Chip({ texto, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.chip, pressed && styles.presionado]}
    >
      <Text style={styles.texto}>{texto}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radio.completo,
    borderWidth: 1,
    borderColor: colores.borde,
    backgroundColor: colores.superficie,
    paddingHorizontal: espacio.md,
    paddingVertical: espacio.sm,
  },
  presionado: { backgroundColor: colores.marcaSuave, borderColor: colores.marca },
  texto: { fontSize: 12, color: colores.textoSecundario },
});
