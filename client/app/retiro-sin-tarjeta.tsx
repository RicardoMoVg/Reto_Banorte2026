import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PantallaMarca } from '../components/ui/PantallaMarca';
import { colores, espacio, radio, vidrio } from '../lib/ui/theme';

const CUENTAS = [
  { id: 'debito', nombre: 'Débito •• 2045', saldo: '$13,496.00' },
  { id: 'ahorro', nombre: 'Ahorro •• 7821', saldo: '$45,200.00' },
];

const MONTOS_RAPIDOS = [100, 200, 500, 1000, 2000];

/**
 * Retiro sin Tarjeta — flujo tradicional.
 *
 * Selector de cuenta origen, input numérico grande con botones rápidos
 * y un botón para generar un código de retiro. Interfaz dummy.
 */
export default function RetiroSinTarjeta() {
  const insets = useSafeAreaInsets();
  const [cuentaSel, setCuentaSel] = useState(CUENTAS[0].id);
  const [monto, setMonto] = useState('');
  const [codigoGenerado, setCodigoGenerado] = useState(false);

  const codigoDemo = '847 291';

  function handleGenerar() {
    if (!monto || Number(monto) <= 0) return;
    setCodigoGenerado(true);
  }

  return (
    <PantallaMarca titulo="Retiro sin Tarjeta" alVolver={() => router.back()}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + espacio.xxl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Encabezado */}
        <View style={styles.hero}>
          <View style={styles.heroIcono}>
            <Ionicons name="phone-portrait" size={28} color={colores.textoSobreAcento} />
          </View>
          <Text style={styles.heroTexto}>
            Genera un código para retirar efectivo en cualquier cajero Banorte sin necesidad de
            tu tarjeta física.
          </Text>
        </View>

        {codigoGenerado ? (
          /* ── Estado de éxito con código ── */
          <View style={styles.exito}>
            <Text style={styles.exitoLabel}>Tu código de retiro</Text>
            <View style={styles.codigoBox}>
              <Text style={styles.codigoTexto}>{codigoDemo}</Text>
            </View>
            <Text style={styles.exitoMonto}>
              ${Number(monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </Text>

            <View style={styles.exitoInfo}>
              <View style={styles.exitoInfoFila}>
                <Ionicons name="time-outline" size={16} color={colores.acento} />
                <Text style={styles.exitoInfoTexto}>Válido por 30 minutos</Text>
              </View>
              <View style={styles.exitoInfoFila}>
                <Ionicons name="location-outline" size={16} color={colores.acento} />
                <Text style={styles.exitoInfoTexto}>Cualquier cajero Banorte</Text>
              </View>
              <View style={styles.exitoInfoFila}>
                <Ionicons name="shield-checkmark-outline" size={16} color={colores.acento} />
                <Text style={styles.exitoInfoTexto}>Código de un solo uso</Text>
              </View>
            </View>

            <Text style={styles.exitoNota}>
              Esto es solo la interfaz de demostración — ningún código real se ha generado.
            </Text>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.back()}
              style={({ pressed }) => [styles.botonPrimario, pressed && styles.presionado]}
            >
              <Text style={styles.botonPrimarioTexto}>Regresar</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* ── Selector de cuenta ── */}
            <View style={styles.seccion}>
              <Text style={styles.seccionTitulo}>Cuenta origen</Text>
              <View style={styles.cuentas}>
                {CUENTAS.map((c) => (
                  <Pressable
                    key={c.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${c.nombre}, saldo ${c.saldo}`}
                    accessibilityState={{ selected: c.id === cuentaSel }}
                    onPress={() => setCuentaSel(c.id)}
                    style={[styles.cuenta, c.id === cuentaSel && styles.cuentaActiva]}
                  >
                    <View style={styles.cuentaInfo}>
                      <Ionicons
                        name="wallet-outline"
                        size={18}
                        color={c.id === cuentaSel ? colores.acento : vidrio.textoTenue}
                      />
                      <Text style={styles.cuentaNombre}>{c.nombre}</Text>
                    </View>
                    <Text style={[
                      styles.cuentaSaldo,
                      c.id === cuentaSel && styles.cuentaSaldoActivo,
                    ]}>
                      {c.saldo}
                    </Text>
                    {c.id === cuentaSel && (
                      <View style={styles.radioActivo}>
                        <View style={styles.radioPunto} />
                      </View>
                    )}
                    {c.id !== cuentaSel && <View style={styles.radio} />}
                  </Pressable>
                ))}
              </View>
            </View>

            {/* ── Input de monto ── */}
            <View style={styles.seccion}>
              <Text style={styles.seccionTitulo}>¿Cuánto quieres retirar?</Text>
              <View style={styles.montoBox}>
                <Text style={styles.montoPrefijo}>$</Text>
                <TextInput
                  style={styles.montoInput}
                  value={monto}
                  onChangeText={setMonto}
                  placeholder="0"
                  placeholderTextColor={vidrio.textoTenue}
                  keyboardType="number-pad"
                  selectionColor={colores.acento}
                />
              </View>

              {/* Botones rápidos */}
              <View style={styles.rapidosFila}>
                {MONTOS_RAPIDOS.map((m) => (
                  <Pressable
                    key={m}
                    accessibilityRole="button"
                    accessibilityLabel={`$${m}`}
                    onPress={() => setMonto(String(m))}
                    style={({ pressed }) => [
                      styles.rapido,
                      monto === String(m) && styles.rapidoActivo,
                      pressed && styles.presionado,
                    ]}
                  >
                    <Text style={[
                      styles.rapidoTexto,
                      monto === String(m) && styles.rapidoTextoActivo,
                    ]}>
                      ${m.toLocaleString('es-MX')}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Botón generar */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Generar código de retiro"
              accessibilityState={{ disabled: !monto || Number(monto) <= 0 }}
              disabled={!monto || Number(monto) <= 0}
              onPress={handleGenerar}
              style={({ pressed }) => [
                styles.botonPrimario,
                (!monto || Number(monto) <= 0) && styles.inactivo,
                pressed && styles.presionado,
              ]}
            >
              <Ionicons name="qr-code-outline" size={20} color={colores.textoSobreAcento} />
              <Text style={styles.botonPrimarioTexto}>Generar Código</Text>
            </Pressable>

            <Text style={styles.nota}>
              El código tiene una vigencia de 30 minutos y es de un solo uso.{'\n'}
              Interfaz de demostración — no genera códigos reales.
            </Text>
          </>
        )}
      </ScrollView>
    </PantallaMarca>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: espacio.lg, gap: espacio.xl },

  hero: { alignItems: 'center', gap: espacio.md, paddingVertical: espacio.sm },
  heroIcono: {
    width: 56,
    height: 56,
    borderRadius: radio.completo,
    backgroundColor: colores.acento,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTexto: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.75)',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 300,
  },

  seccion: { gap: espacio.md },
  seccionTitulo: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: 'rgba(255, 255, 255, 0.7)',
  },

  cuentas: { gap: espacio.sm },
  cuenta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: vidrio.campoBorde,
    backgroundColor: vidrio.campo,
    paddingHorizontal: espacio.lg,
    paddingVertical: espacio.md,
  },
  cuentaActiva: { borderColor: colores.acento },
  cuentaInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: espacio.sm },
  cuentaNombre: { fontSize: 14, fontWeight: '600', color: colores.textoInverso },
  cuentaSaldo: { fontSize: 13, fontWeight: '700', color: vidrio.textoTenue },
  cuentaSaldoActivo: { color: colores.acento },
  radio: {
    width: 20,
    height: 20,
    borderRadius: radio.completo,
    borderWidth: 2,
    borderColor: vidrio.campoBorde,
  },
  radioActivo: {
    width: 20,
    height: 20,
    borderRadius: radio.completo,
    borderWidth: 2,
    borderColor: colores.acento,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioPunto: {
    width: 10,
    height: 10,
    borderRadius: radio.completo,
    backgroundColor: colores.acento,
  },

  montoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: vidrio.campoBorde,
    backgroundColor: vidrio.campo,
    paddingHorizontal: espacio.xl,
    paddingVertical: espacio.lg,
  },
  montoPrefijo: { fontSize: 32, fontWeight: '700', color: vidrio.textoTenue },
  montoInput: {
    fontSize: 32,
    fontWeight: '700',
    color: colores.textoInverso,
    minWidth: 60,
    textAlign: 'center',
    outlineColor: colores.acento,
    outlineOffset: 2,
  },

  rapidosFila: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.sm },
  rapido: {
    borderRadius: radio.completo,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: espacio.md,
    paddingVertical: espacio.xs + 2,
  },
  rapidoActivo: { backgroundColor: 'rgba(255, 255, 255, 0.85)', borderColor: 'rgba(255, 255, 255, 0.85)' },
  rapidoTexto: { fontSize: 12, fontWeight: '600', color: 'rgba(255, 255, 255, 0.8)' },
  rapidoTextoActivo: { color: colores.marca },

  botonPrimario: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacio.sm,
    borderRadius: radio.md,
    backgroundColor: colores.acento,
    paddingVertical: espacio.lg,
  },
  botonPrimarioTexto: { fontSize: 16, fontWeight: '700', color: colores.textoSobreAcento },
  inactivo: { opacity: 0.35 },
  presionado: { opacity: 0.8 },

  exito: { alignItems: 'center', gap: espacio.md, paddingVertical: espacio.lg },
  exitoLabel: { fontSize: 13, fontWeight: '600', color: vidrio.textoTenue },
  codigoBox: {
    borderRadius: radio.lg,
    borderWidth: 2,
    borderColor: colores.acento,
    borderStyle: 'dashed',
    paddingHorizontal: espacio.xxl,
    paddingVertical: espacio.lg,
    backgroundColor: 'rgba(65, 255, 167, 0.08)',
  },
  codigoTexto: {
    fontSize: 36,
    fontWeight: '800',
    color: colores.textoInverso,
    letterSpacing: 6,
  },
  exitoMonto: { fontSize: 18, fontWeight: '700', color: colores.acento },
  exitoInfo: { gap: espacio.sm, paddingVertical: espacio.md },
  exitoInfoFila: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm },
  exitoInfoTexto: { fontSize: 13, color: colores.textoInverso },
  exitoNota: {
    fontSize: 12,
    lineHeight: 17,
    color: vidrio.textoTenue,
    textAlign: 'center',
    maxWidth: 280,
  },

  nota: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    color: vidrio.textoTenue,
  },
});
