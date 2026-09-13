import { StyleSheet, Text, View } from 'react-native';
import { colores } from '../lib/ui/theme';

export interface CategoriaGasto {
  nombre: string;
  monto: number;
}

export interface ComparativoGastosProps {
  titulo: string;
  categorias: CategoriaGasto[];
  mensajeAgente: string;
}

const formatoMXN = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});


/**
 * Reescritura nativa (Paso 3 del plan de migración) del bloque web
 * components/generative/ComparativoGastos.tsx (ya retirado). Barras
 * horizontales con ancho estático (sin framer-motion): la animación de
 * entrada queda para cuando se agregue react-native-reanimated, no es
 * necesaria para probar el flujo.
 */
export function ComparativoGastos({ titulo, categorias, mensajeAgente }: ComparativoGastosProps) {
  const maximo = Math.max(...categorias.map((c) => Math.abs(c.monto)), 1);

  return (
    <View style={styles.card}>
      <Text style={styles.titulo}>{titulo}</Text>

      <View style={styles.barras}>
        {categorias.map((c) => {
          const ancho = (Math.abs(c.monto) / maximo) * 100;
          return (
            <View key={c.nombre} style={styles.fila}>
              <View style={styles.filaEncabezado}>
                <Text style={styles.nombreCategoria} numberOfLines={1}>
                  {c.nombre}
                </Text>
                <Text style={styles.montoCategoria}>{formatoMXN.format(Math.abs(c.monto))}</Text>
              </View>
              <View style={styles.trackFondo}>
                <View style={[styles.trackRelleno, { width: `${ancho}%` }]} />
              </View>
            </View>
          );
        })}
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
    marginBottom: 12,
  },
  barras: { gap: 10 },
  fila: {},
  filaEncabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 4,
  },
  nombreCategoria: { flexShrink: 1, fontSize: 12, color: colores.textoSecundario },
  montoCategoria: { fontSize: 12, fontWeight: '600', color: colores.texto },
  trackFondo: {
    height: 8,
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
    marginTop: 12,
    fontSize: 12,
    lineHeight: 16,
    color: colores.textoApoyo,
  },
});
