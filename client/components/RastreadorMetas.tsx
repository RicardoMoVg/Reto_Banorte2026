import { StyleSheet, Text, View } from 'react-native';
import { colores } from '../lib/ui/theme';

export interface RastreadorMetasProps {
  titulo: string;
  /** Porcentaje de avance de la meta, 0-100. */
  porcentaje: number;
  mensajeAgente: string;
}

/**
 * Reescritura nativa (Paso 2 del plan de migración) del bloque web
 * components/generative/RastreadorMetas.tsx. Mismo contrato de props (son
 * el output de la misma tool `mostrarProgresoMeta` del backend), sin
 * framer-motion/Tailwind: solo View/Text + StyleSheet para esta primera
 * pasada. Sin catálogo/mini-SDK todavía — ver Paso 4 del plan.
 */
export function RastreadorMetas({ titulo, porcentaje, mensajeAgente }: RastreadorMetasProps) {
  const pct = Math.min(100, Math.max(0, porcentaje));

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.titulo}>{titulo}</Text>
        <Text style={styles.porcentaje}>{pct}%</Text>
      </View>

      <View style={styles.trackFondo}>
        <View style={[styles.trackRelleno, { width: `${pct}%` }]} />
      </View>

      <Text style={styles.mensaje}>{mensajeAgente}</Text>
    </View>
  );
}


const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colores.borde,
    backgroundColor: colores.superficie,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 12,
  },
  titulo: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colores.texto,
  },
  porcentaje: {
    fontSize: 14,
    fontWeight: '700',
    color: colores.marca,
  },
  trackFondo: {
    height: 12,
    width: '100%',
    borderRadius: 999,
    backgroundColor: colores.marcaSuave,
    overflow: 'hidden',
  },
  trackRelleno: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colores.marca,
  },
  mensaje: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 16,
    color: colores.textoApoyo,
  },
});
