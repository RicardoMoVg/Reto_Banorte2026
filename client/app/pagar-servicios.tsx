import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CampoMarca } from '../components/ui/CampoMarca';
import { PantallaMarca } from '../components/ui/PantallaMarca';
import { colores, espacio, radio, vidrio } from '../lib/ui/theme';

/* ─── Proveedores ───────────────────────────────────────────────────── */

interface Proveedor {
  id: string;
  nombre: string;
  icono: keyof typeof Ionicons.glyphMap;
  /** Color de fondo del icono (semántico, no decorativo). */
  tinte: string;
}

const PROVEEDORES: Proveedor[] = [
  { id: 'cfe', nombre: 'CFE', icono: 'flash-outline', tinte: '#F59E0B' },
  { id: 'telmex', nombre: 'Telmex', icono: 'call-outline', tinte: '#3B82F6' },
  { id: 'agua', nombre: 'Agua y Drenaje', icono: 'water-outline', tinte: '#06B6D4' },
  { id: 'naturgy', nombre: 'Naturgy', icono: 'flame-outline', tinte: '#EF4444' },
  { id: 'telcel', nombre: 'Telcel', icono: 'phone-portrait-outline', tinte: '#8B5CF6' },
  { id: 'izzi', nombre: 'Izzi', icono: 'wifi-outline', tinte: '#10B981' },
];

/**
 * Pagar Servicios — flujo tradicional.
 *
 * Barra de búsqueda + grid de proveedores. Al seleccionar uno se expande
 * un formulario para capturar referencia y monto. Interfaz dummy para
 * contrastar con la velocidad de Mosaico.
 */
export default function PagarServicios() {
  const insets = useSafeAreaInsets();
  const [busqueda, setBusqueda] = useState('');
  const [seleccionado, setSeleccionado] = useState<Proveedor | null>(null);
  const [referencia, setReferencia] = useState('');
  const [monto, setMonto] = useState('');
  const [pagado, setPagado] = useState(false);

  const proveedoresFiltrados = PROVEEDORES.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()),
  );

  function handlePagar() {
    if (!referencia.trim() || !monto.trim()) return;
    setPagado(true);
  }

  function handleReset() {
    setSeleccionado(null);
    setReferencia('');
    setMonto('');
    setPagado(false);
  }

  return (
    <PantallaMarca titulo="Pagar Servicios" alVolver={() => router.back()}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + espacio.xxl }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Barra de búsqueda */}
          <View style={styles.busquedaCaja}>
            <Ionicons name="search-outline" size={18} color={vidrio.textoTenue} />
            <TextInput
              style={styles.busquedaInput}
              placeholder="Buscar proveedor..."
              placeholderTextColor={vidrio.textoTenue}
              value={busqueda}
              onChangeText={setBusqueda}
              selectionColor={colores.acento}
            />
            {busqueda.length > 0 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Limpiar búsqueda"
                onPress={() => setBusqueda('')}
              >
                <Ionicons name="close-circle" size={18} color={vidrio.textoTenue} />
              </Pressable>
            )}
          </View>

          {/* Grid de proveedores */}
          {!seleccionado && (
            <View style={styles.grid}>
              {proveedoresFiltrados.map((p) => (
                <Pressable
                  key={p.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Pagar ${p.nombre}`}
                  onPress={() => setSeleccionado(p)}
                  style={({ pressed }) => [styles.provCard, pressed && styles.presionado]}
                >
                  <View style={[styles.provIcono, { backgroundColor: `${p.tinte}18` }]}>
                    <Ionicons name={p.icono} size={24} color={p.tinte} />
                  </View>
                  <Text style={styles.provNombre}>{p.nombre}</Text>
                </Pressable>
              ))}

              {proveedoresFiltrados.length === 0 && (
                <View style={styles.vacio}>
                  <Ionicons name="search-outline" size={28} color={vidrio.textoTenue} />
                  <Text style={styles.vacioTexto}>No se encontró ese proveedor</Text>
                </View>
              )}
            </View>
          )}

          {/* Formulario de pago */}
          {seleccionado && !pagado && (
            <View style={styles.formulario}>
              <View style={styles.provSeleccionado}>
                <View style={[styles.provIconoGrande, { backgroundColor: `${seleccionado.tinte}18` }]}>
                  <Ionicons name={seleccionado.icono} size={28} color={seleccionado.tinte} />
                </View>
                <View>
                  <Text style={styles.provNombreGrande}>{seleccionado.nombre}</Text>
                  <Pressable onPress={handleReset}>
                    <Text style={styles.cambiar}>Cambiar proveedor</Text>
                  </Pressable>
                </View>
              </View>

              <CampoMarca
                etiqueta="Número de referencia / contrato:"
                value={referencia}
                onChangeText={setReferencia}
                placeholder="Ej. 123456789012"
                keyboardType="number-pad"
                returnKeyType="next"
              />

              <CampoMarca
                etiqueta="Monto a pagar:"
                value={monto}
                onChangeText={setMonto}
                placeholder="$0.00"
                keyboardType="decimal-pad"
                returnKeyType="done"
              />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Pagar servicio"
                accessibilityState={{ disabled: !referencia.trim() || !monto.trim() }}
                disabled={!referencia.trim() || !monto.trim()}
                onPress={handlePagar}
                style={({ pressed }) => [
                  styles.botonPrimario,
                  (!referencia.trim() || !monto.trim()) && styles.inactivo,
                  pressed && styles.presionado,
                ]}
              >
                <Text style={styles.botonPrimarioTexto}>Pagar</Text>
              </Pressable>
            </View>
          )}

          {/* Estado de éxito */}
          {pagado && seleccionado && (
            <View style={styles.exito}>
              <View style={styles.exitoIcono}>
                <Ionicons name="checkmark-circle" size={48} color={colores.positivo} />
              </View>
              <Text style={styles.exitoTitulo}>Pago simulado</Text>
              <Text style={styles.exitoDetalle}>
                ${Number(monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })} a {seleccionado.nombre}
              </Text>
              <Text style={styles.exitoNota}>
                Referencia: {referencia}{'\n'}
                Esto es solo la interfaz de demostración.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.back()}
                style={({ pressed }) => [styles.botonPrimario, pressed && styles.presionado]}
              >
                <Text style={styles.botonPrimarioTexto}>Regresar</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </PantallaMarca>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: espacio.lg, gap: espacio.xl },

  busquedaCaja: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
    borderRadius: radio.completo,
    borderWidth: 1,
    borderColor: vidrio.campoBorde,
    backgroundColor: vidrio.campo,
    paddingHorizontal: espacio.lg,
    paddingVertical: espacio.sm + 2,
  },
  busquedaInput: {
    flex: 1,
    fontSize: 14,
    color: colores.textoInverso,
    outlineColor: colores.acento,
    outlineOffset: 2,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacio.md,
  },
  provCard: {
    width: '47%',
    alignItems: 'center',
    gap: espacio.sm,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: vidrio.campoBorde,
    backgroundColor: vidrio.campo,
    paddingVertical: espacio.lg,
    paddingHorizontal: espacio.md,
  },
  provIcono: {
    width: 48,
    height: 48,
    borderRadius: radio.completo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  provNombre: { fontSize: 13, fontWeight: '600', color: colores.textoInverso, textAlign: 'center' },

  formulario: { gap: espacio.lg },
  provSeleccionado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: vidrio.campoBorde,
    backgroundColor: vidrio.campo,
    padding: espacio.md,
  },
  provIconoGrande: {
    width: 52,
    height: 52,
    borderRadius: radio.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  provNombreGrande: { fontSize: 16, fontWeight: '700', color: colores.textoInverso },
  cambiar: { fontSize: 12, fontWeight: '600', color: colores.acento, marginTop: 2 },

  botonPrimario: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radio.md,
    backgroundColor: colores.acento,
    paddingVertical: espacio.lg,
  },
  botonPrimarioTexto: { fontSize: 16, fontWeight: '700', color: colores.textoSobreAcento },
  inactivo: { opacity: 0.35 },
  presionado: { opacity: 0.8 },

  vacio: { width: '100%', alignItems: 'center', gap: espacio.md, paddingVertical: espacio.xxl },
  vacioTexto: { fontSize: 13, color: vidrio.textoTenue },

  exito: { alignItems: 'center', gap: espacio.md, paddingVertical: espacio.xl },
  exitoIcono: { marginBottom: espacio.sm },
  exitoTitulo: { fontSize: 20, fontWeight: '700', color: colores.textoInverso },
  exitoDetalle: { fontSize: 15, fontWeight: '600', color: colores.acento },
  exitoNota: {
    fontSize: 12,
    lineHeight: 17,
    color: vidrio.textoTenue,
    textAlign: 'center',
    maxWidth: 280,
  },
});
