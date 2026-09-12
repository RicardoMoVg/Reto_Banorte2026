import { StyleSheet, Text, View } from 'react-native';

export interface TarjetaSaldoProps {
  titulo: string;
  /** Monto en pesos. Puede ser negativo. */
  monto: number;
  mensajeAgente: string;
}

const formatoMXN = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

/**
 * Reescritura nativa (Paso 3 del plan de migración) del bloque web
 * components/generative/TarjetaSaldo.tsx (ya retirado). Mismo contrato de
 * props (output de la tool `mostrarSaldo`), sin framer-motion/Tailwind.
 */
export function TarjetaSaldo({ titulo, monto, mensajeAgente }: TarjetaSaldoProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.titulo}>{titulo}</Text>
      <Text style={styles.monto}>{formatoMXN.format(monto)}</Text>
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
    borderColor: '#e5e5e5',
    backgroundColor: '#ffffff',
    padding: 16,
  },
  titulo: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#737373',
    marginBottom: 12,
  },
  monto: {
    fontSize: 26,
    fontWeight: '700',
    color: '#171717',
  },
  mensaje: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 16,
    color: '#737373',
  },
});
