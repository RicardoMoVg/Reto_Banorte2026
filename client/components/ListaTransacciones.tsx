import { StyleSheet, Text, View } from 'react-native';
import { colores } from '../lib/ui/theme';

export interface Transaccion {
  descripcion: string;
  /** Negativo = gasto, positivo = ingreso. */
  monto: number;
  categoria?: string;
}

export interface ListaTransaccionesProps {
  titulo: string;
  transacciones: Transaccion[];
  mensajeAgente: string;
}

const formatoMXN = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

/**
 * Reescritura nativa (Paso 3 del plan de migración) del bloque web
 * components/generative/ListaTransacciones.tsx (ya retirado). Mismo
 * contrato de props (output de la tool `mostrarTransacciones`).
 */
export function ListaTransacciones({ titulo, transacciones, mensajeAgente }: ListaTransaccionesProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.titulo}>{titulo}</Text>

      <View style={styles.lista}>
        {transacciones.map((t, i) => (
          <View key={i} style={styles.fila}>
            <View style={styles.filaTexto}>
              <Text style={styles.descripcion} numberOfLines={1}>
                {t.descripcion}
              </Text>
              {t.categoria && <Text style={styles.categoria}>{t.categoria}</Text>}
            </View>
            <Text style={[styles.monto, t.monto >= 0 ? styles.montoPositivo : styles.montoNegativo]}>
              {t.monto >= 0 ? '+' : ''}
              {formatoMXN.format(t.monto)}
            </Text>
          </View>
        ))}
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
  titulo: {
    fontSize: 14,
    fontWeight: '600',
    color: colores.texto,
    marginBottom: 8,
  },
  lista: {
    borderTopWidth: 1,
    borderTopColor: colores.bordeSutil,
  },
  fila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colores.bordeSutil,
  },
  filaTexto: { flexShrink: 1 },
  descripcion: { fontSize: 13, color: colores.texto },
  categoria: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colores.textoTenue,
    marginTop: 2,
  },
  monto: { fontSize: 13, fontWeight: '600' },
  montoPositivo: { color: colores.positivo },
  montoNegativo: { color: colores.texto },
  mensaje: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 16,
    color: colores.textoApoyo,
  },
});
