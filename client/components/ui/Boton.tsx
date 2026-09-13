import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { colores, espacio, radio } from '../../lib/ui/theme';

export interface BotonProps {
  titulo: string;
  onPress: () => void;
  /** `secundario` = contorno sin relleno, para acciones no principales. */
  variante?: 'primario' | 'secundario';
  deshabilitado?: boolean;
  style?: ViewStyle;
}

export function Boton({
  titulo,
  onPress,
  variante = 'primario',
  deshabilitado = false,
  style,
}: BotonProps) {
  const esPrimario = variante === 'primario';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: deshabilitado }}
      onPress={onPress}
      disabled={deshabilitado}
      style={({ pressed }) => [
        styles.base,
        esPrimario ? styles.primario : styles.secundario,
        pressed && styles.presionado,
        deshabilitado && styles.deshabilitado,
        style,
      ]}
    >
      <Text style={[styles.texto, esPrimario ? styles.textoPrimario : styles.textoSecundario]}>
        {titulo}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radio.sm,
    paddingHorizontal: espacio.lg,
    paddingVertical: espacio.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  primario: { backgroundColor: colores.marca, borderColor: colores.marca },
  secundario: { backgroundColor: 'transparent', borderColor: colores.borde },
  presionado: { opacity: 0.75 },
  deshabilitado: { opacity: 0.4 },
  texto: { fontSize: 13, fontWeight: '600' },
  textoPrimario: { color: colores.textoInverso },
  textoSecundario: { color: colores.texto },
});
