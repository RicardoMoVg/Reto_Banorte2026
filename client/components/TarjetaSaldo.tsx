import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colores } from '../lib/ui/theme';

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
function TarjetaSaldoBase({ titulo, monto, mensajeAgente }: TarjetaSaldoProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.titulo}>{titulo}</Text>
      <Text style={styles.monto}>{formatoMXN.format(monto)}</Text>
      <Text style={styles.mensaje}>{mensajeAgente}</Text>
    </View>
  );
}

/**
 * Memoizado: con el texto llegando en fragmentos, `mensajes` cambia muchas
 * veces por respuesta. Sin esto, cada fragmento repinta todas las tarjetas
 * del historial aunque sus props sean identicas.
 */
export const TarjetaSaldo = memo(TarjetaSaldoBase);

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
  titulo: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colores.textoApoyo,
    marginBottom: 12,
  },
  monto: {
    fontSize: 26,
    fontWeight: '700',
    color: colores.texto,
  },
  mensaje: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 16,
    color: colores.textoApoyo,
  },
});
