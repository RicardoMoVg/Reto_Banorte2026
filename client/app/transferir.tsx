import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
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

/** Bancos comunes para el dropdown simulado. */
const BANCOS = [
  'BBVA México',
  'Banorte',
  'Santander',
  'Citibanamex',
  'HSBC',
  'Scotiabank',
  'Banco Azteca',
  'Inbursa',
];

/**
 * Transferir — flujo tradicional.
 *
 * Formulario clásico de transferencia bancaria: cuenta destino, banco,
 * monto, concepto. Es intencionalmente lento y manual — el contraste con
 * hacerlo vía Mosaico es parte de la propuesta de valor.
 *
 * No hace nada real: los datos no salen del dispositivo.
 */
export default function Transferir() {
  const insets = useSafeAreaInsets();

  const refMonto = useRef<TextInput>(null);
  const refConcepto = useRef<TextInput>(null);

  const [clabe, setClabe] = useState('');
  const [bancoAbierto, setBancoAbierto] = useState(false);
  const [banco, setBanco] = useState('');
  const [monto, setMonto] = useState('');
  const [concepto, setConcepto] = useState('');
  const [enviado, setEnviado] = useState(false);

  const valido = clabe.length >= 10 && banco !== '' && monto.length > 0;

  function handleContinuar() {
    if (!valido) return;
    setEnviado(true);
  }

  return (
    <PantallaMarca titulo="Transferir" alVolver={() => router.back()}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + espacio.xxl }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Encabezado visual */}
          <View style={styles.hero}>
            <View style={styles.heroIcono}>
              <Ionicons name="swap-horizontal" size={28} color={colores.textoSobreAcento} />
            </View>
            <Text style={styles.heroTexto}>
              Envía dinero a cualquier cuenta bancaria en México.
            </Text>
          </View>

          {enviado ? (
            <View style={styles.exito}>
              <View style={styles.exitoIcono}>
                <Ionicons name="checkmark-circle" size={48} color={colores.positivo} />
              </View>
              <Text style={styles.exitoTitulo}>Transferencia simulada</Text>
              <Text style={styles.exitoDetalle}>
                ${Number(monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })} a {banco}
              </Text>
              <Text style={styles.exitoNota}>
                Esto es solo la interfaz de demostración — ningún movimiento real se ha realizado.
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
              <View style={styles.formulario}>
                {/* Cuenta / CLABE destino */}
                <CampoMarca
                  etiqueta="Cuenta / CLABE destino:"
                  value={clabe}
                  onChangeText={setClabe}
                  placeholder="Ej. 0123 4567 8901 234567"
                  keyboardType="number-pad"
                  maxLength={18}
                  returnKeyType="next"
                  onSubmitEditing={() => setBancoAbierto(true)}
                />

                {/* Dropdown simulado de banco */}
                <View style={styles.campo}>
                  <Text style={styles.etiqueta}>Banco destino:</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Seleccionar banco"
                    onPress={() => setBancoAbierto((v) => !v)}
                    style={[styles.dropdown, bancoAbierto && styles.dropdownAbierto]}
                  >
                    <Text style={banco ? styles.dropdownValor : styles.dropdownPlaceholder}>
                      {banco || 'Selecciona un banco'}
                    </Text>
                    <Ionicons
                      name={bancoAbierto ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={vidrio.textoTenue}
                    />
                  </Pressable>

                  {bancoAbierto && (
                    <View style={styles.dropdownLista}>
                      {BANCOS.map((b) => (
                        <Pressable
                          key={b}
                          accessibilityRole="button"
                          onPress={() => {
                            setBanco(b);
                            setBancoAbierto(false);
                            refMonto.current?.focus();
                          }}
                          style={({ pressed }) => [
                            styles.dropdownItem,
                            b === banco && styles.dropdownItemActivo,
                            pressed && styles.presionado,
                          ]}
                        >
                          <Text style={[
                            styles.dropdownItemTexto,
                            b === banco && styles.dropdownItemTextoActivo,
                          ]}>
                            {b}
                          </Text>
                          {b === banco && (
                            <Ionicons name="checkmark" size={16} color={colores.acento} />
                          )}
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>

                {/* Monto */}
                <CampoMarca
                  ref={refMonto}
                  etiqueta="Monto:"
                  value={monto}
                  onChangeText={setMonto}
                  placeholder="$0.00"
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                  onSubmitEditing={() => refConcepto.current?.focus()}
                />

                {/* Concepto */}
                <CampoMarca
                  ref={refConcepto}
                  etiqueta="Concepto (opcional):"
                  value={concepto}
                  onChangeText={setConcepto}
                  placeholder="Ej. Renta septiembre"
                  returnKeyType="done"
                />
              </View>

              {/* Botón Continuar */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Continuar con la transferencia"
                accessibilityState={{ disabled: !valido }}
                disabled={!valido}
                onPress={handleContinuar}
                style={({ pressed }) => [
                  styles.botonPrimario,
                  !valido && styles.inactivo,
                  pressed && styles.presionado,
                ]}
              >
                <Text style={styles.botonPrimarioTexto}>Continuar</Text>
              </Pressable>

              <Text style={styles.nota}>
                Este formulario es solo la interfaz visual de demostración.{'\n'}
                No se realiza ningún movimiento real.
              </Text>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </PantallaMarca>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
  },

  formulario: { gap: espacio.lg },
  campo: { gap: espacio.sm },
  etiqueta: { fontSize: 13, fontWeight: '600', color: colores.textoInverso },

  /* Dropdown simulado */
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radio.sm,
    borderWidth: 1,
    borderColor: vidrio.campoBorde,
    backgroundColor: vidrio.campo,
    paddingHorizontal: espacio.md,
    paddingVertical: espacio.md,
  },
  dropdownAbierto: { borderColor: colores.acento },
  dropdownValor: { fontSize: 14, color: colores.textoInverso },
  dropdownPlaceholder: { fontSize: 14, color: vidrio.textoTenue },
  dropdownLista: {
    borderRadius: radio.sm,
    borderWidth: 1,
    borderColor: vidrio.campoBorde,
    backgroundColor: vidrio.campo,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espacio.md,
    paddingVertical: espacio.md,
    borderBottomWidth: 1,
    borderBottomColor: vidrio.campoBorde,
  },
  dropdownItemActivo: { backgroundColor: 'rgba(65, 255, 167, 0.12)' },
  dropdownItemTexto: { fontSize: 13, color: colores.textoInverso },
  dropdownItemTextoActivo: { fontWeight: '700', color: colores.acento },

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

  nota: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    color: vidrio.textoTenue,
  },
});
