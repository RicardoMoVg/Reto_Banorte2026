import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PantallaMarca } from '../../components/ui/PantallaMarca';
import { colores, espacio, radio, tipografia, vidrio } from '../../lib/ui/theme';

/**
 * Dato de una tarjeta del titular. Cuando venga del MCP será un tipo
 * compartido; por ahora vive aquí como dato estático de demostración
 * (permitido por constitution.md 4.2 porque es formato, no monto).
 */
interface DatoTarjeta {
  id: string;
  tipo: 'crédito' | 'débito';
  numero: string;
  vencimiento: string;
  marca: string;
  activa: boolean;
}

const TARJETAS_DEMO: DatoTarjeta[] = [
  {
    id: 'tc-4321',
    tipo: 'crédito',
    numero: '4000 1234 5678 4321',
    vencimiento: '09/28',
    marca: 'Visa',
    activa: true,
  },
  {
    id: 'td-2045',
    tipo: 'débito',
    numero: '5200 3344 5566 2045',
    vencimiento: '03/29',
    marca: 'Mastercard',
    activa: true,
  },
];

/**
 * CVV de ejemplo. En producción esto vendría del MCP con un TTL corto
 * (CVV dinámico), no hardcodeado.
 */
const CVV_DEMO: Record<string, string> = {
  'tc-4321': '847',
  'td-2045': '312',
};

/**
 * Pantalla de Tarjetas (Billetera).
 *
 * Zona de máxima seguridad y acceso rápido: ver datos de la tarjeta
 * digital, consultar el CVV dinámico para compras en línea, y
 * prender/apagar los plásticos físicos.
 */
export default function Tarjetas() {
  const insets = useSafeAreaInsets();
  const [tarjetas, setTarjetas] = useState(TARJETAS_DEMO);
  const [cvvVisible, setCvvVisible] = useState<Record<string, boolean>>({});

  function toggleActiva(id: string) {
    setTarjetas((prev) =>
      prev.map((t) => (t.id === id ? { ...t, activa: !t.activa } : t)),
    );
  }

  function toggleCvv(id: string) {
    setCvvVisible((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <PantallaMarca titulo="Tarjetas">
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 96 }]}
        showsVerticalScrollIndicator={false}
      >
        {tarjetas.map((t) => (
          <View key={t.id} style={styles.tarjeta}>
            {/* — Encabezado de la tarjeta — */}
            <View style={styles.encabezado}>
              <View style={styles.marcaRow}>
                <Ionicons
                  name={t.tipo === 'crédito' ? 'card-outline' : 'wallet-outline'}
                  size={20}
                  color={colores.acento}
                />
                <Text style={styles.marcaTexto}>{t.marca}</Text>
              </View>
              <View style={styles.tipoBadge}>
                <Text style={styles.tipoTexto}>{t.tipo}</Text>
              </View>
            </View>

            {/* — Número — */}
            <Text style={styles.numero}>
              •••• •••• •••• {t.numero.slice(-4)}
            </Text>

            {/* — Vencimiento — */}
            <View style={styles.fila}>
              <Text style={styles.etiqueta}>Vencimiento</Text>
              <Text style={styles.valor}>{t.vencimiento}</Text>
            </View>

            {/* — CVV dinámico — */}
            <View style={styles.fila}>
              <Text style={styles.etiqueta}>CVV</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={cvvVisible[t.id] ? 'Ocultar CVV' : 'Mostrar CVV'}
                onPress={() => toggleCvv(t.id)}
                style={({ pressed }) => [styles.cvvBoton, pressed && styles.presionado]}
              >
                <Text style={styles.cvvTexto}>
                  {cvvVisible[t.id] ? CVV_DEMO[t.id] ?? '—' : '•••'}
                </Text>
                <Ionicons
                  name={cvvVisible[t.id] ? 'eye-off-outline' : 'eye-outline'}
                  size={16}
                  color={colores.acento}
                />
              </Pressable>
            </View>

            {/* — Switch encender/apagar plástico — */}
            <View style={[styles.fila, styles.switchFila]}>
              <View style={styles.switchInfo}>
                <Ionicons
                  name={t.activa ? 'shield-checkmark-outline' : 'shield-outline'}
                  size={18}
                  color={t.activa ? colores.positivo : colores.textoTenue}
                />
                <Text style={[styles.switchTexto, !t.activa && styles.inactiva]}>
                  Plástico {t.activa ? 'activo' : 'apagado'}
                </Text>
              </View>
              <Switch
                value={t.activa}
                onValueChange={() => toggleActiva(t.id)}
                trackColor={{ false: '#767577', true: colores.acento }}
                thumbColor={colores.superficie}
                accessibilityLabel={`${t.activa ? 'Apagar' : 'Encender'} tarjeta •• ${t.numero.slice(-4)}`}
              />
            </View>
          </View>
        ))}

        <Text style={styles.nota}>
          El CVV dinámico cambia con cada consulta en producción. Aquí se muestra un valor
          estático de demostración.
        </Text>
      </ScrollView>
    </PantallaMarca>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: espacio.lg, gap: espacio.lg },

  tarjeta: {
    borderRadius: radio.lg,
    borderWidth: 1,
    borderColor: vidrio.campoBorde,
    backgroundColor: vidrio.campo,
    padding: espacio.lg,
    gap: espacio.md,
  },

  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  marcaRow: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm },
  marcaTexto: { fontSize: 16, fontWeight: '700', color: colores.textoInverso },

  tipoBadge: {
    borderRadius: radio.completo,
    borderWidth: 1,
    borderColor: vidrio.borde,
    backgroundColor: vidrio.fondo,
    paddingHorizontal: espacio.md,
    paddingVertical: espacio.xs,
  },
  tipoTexto: {
    fontSize: 11,
    fontWeight: '600',
    color: colores.acento,
    textTransform: 'capitalize',
  },

  numero: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 2,
    color: colores.textoInverso,
    paddingVertical: espacio.sm,
  },

  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: espacio.xs,
  },
  etiqueta: { fontSize: 12, color: vidrio.textoTenue },
  valor: { fontSize: 14, fontWeight: '600', color: colores.textoInverso },

  cvvBoton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
    borderRadius: radio.sm,
    borderWidth: 1,
    borderColor: vidrio.borde,
    paddingHorizontal: espacio.md,
    paddingVertical: espacio.xs,
  },
  cvvTexto: { fontSize: 14, fontWeight: '700', color: colores.textoInverso },
  presionado: { opacity: 0.7 },

  switchFila: {
    borderTopWidth: 1,
    borderTopColor: vidrio.borde,
    paddingTop: espacio.md,
    marginTop: espacio.xs,
  },
  switchInfo: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm },
  switchTexto: { fontSize: 13, fontWeight: '600', color: colores.textoInverso },
  inactiva: { color: vidrio.textoTenue },

  nota: {
    fontSize: 11,
    lineHeight: 16,
    color: vidrio.textoTenue,
    paddingHorizontal: espacio.xs,
  },
});
