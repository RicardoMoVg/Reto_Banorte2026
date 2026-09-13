import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import { colores, espacio, radio, tipografia } from '../../lib/ui/theme';
import type { EstadoAccion } from '../../lib/a2ui/AccionesProvider';

export interface AcuseDeAccionProps {
  estado: Exclude<EstadoAccion, 'pendiente'>;
  /** Qué quedó configurado. Solo se usa cuando `estado` es "aceptada". */
  resultado: string;
}

/**
 * Cómo se ve una acción ya resuelta.
 *
 * Vive aparte porque lo comparten `PieDeAccion` y `ActionCardSelector`, y
 * el estado resuelto tiene que verse IGUAL en todos los bloques de acción:
 * al recorrer el historial del chat, el usuario necesita distinguir de un
 * vistazo cuáles propuestas ya contestó, sin leer cada tarjeta.
 */
export function AcuseDeAccion({ estado, resultado }: AcuseDeAccionProps) {
  if (estado === 'aceptada') {
    return (
      <View style={[styles.acuse, styles.acuseOk]}>
        <Ionicons name="checkmark-circle" size={16} color={colores.positivo} />
        <Text style={styles.texto}>{resultado}</Text>
      </View>
    );
  }

  return (
    <View style={styles.acuse}>
      <Ionicons name="close-circle-outline" size={16} color={colores.textoApoyo} />
      <Text style={styles.texto}>No aceptaste esta propuesta.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  acuse: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
    marginTop: espacio.md,
    borderRadius: radio.sm,
    backgroundColor: colores.superficieSutil,
    paddingHorizontal: espacio.md,
    paddingVertical: espacio.sm,
  },
  acuseOk: { backgroundColor: colores.marcaSuave },
  texto: { ...tipografia.pie, flexShrink: 1, color: colores.textoSecundario },
});
