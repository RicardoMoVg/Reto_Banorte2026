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

/**
 * DiMo (Dinero Móvil) — flujo tradicional.
 *
 * Formulario que pide número de celular (10 dígitos) y monto. Incluye
 * texto explicativo sobre el servicio de Banco de México. Interfaz dummy.
 */
export default function DiMo() {
  const insets = useSafeAreaInsets();
  const refMonto = useRef<TextInput>(null);

  const [celular, setCelular] = useState('');
  const [monto, setMonto] = useState('');
  const [enviado, setEnviado] = useState(false);

  const celularLimpio = celular.replace(/\D/g, '');
  const valido = celularLimpio.length === 10 && monto.length > 0 && Number(monto) > 0;

  /** Agrega espacios mientras se escribe: 81 1234 5678 */
  function formatearCelular(texto: string) {
    const digitos = texto.replace(/\D/g, '').slice(0, 10);
    if (digitos.length <= 2) return digitos;
    if (digitos.length <= 6) return `${digitos.slice(0, 2)} ${digitos.slice(2)}`;
    return `${digitos.slice(0, 2)} ${digitos.slice(2, 6)} ${digitos.slice(6)}`;
  }

  function handleEnviar() {
    if (!valido) return;
    setEnviado(true);
  }

  return (
    <PantallaMarca titulo="DiMo" alVolver={() => router.back()}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + espacio.xxl }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Encabezado */}
          <View style={styles.hero}>
            <View style={styles.heroIcono}>
              <Ionicons name="flash" size={28} color={colores.textoSobreAcento} />
            </View>
            <Text style={styles.heroTitulo}>Dinero Móvil</Text>
            <Text style={styles.heroTexto}>
              Envía y recibe dinero usando solo el número de celular del destinatario.
            </Text>
          </View>

          {/* Info sobre DiMo */}
          <View style={styles.infoBox}>
            <View style={styles.infoEncabezado}>
              <Ionicons name="information-circle-outline" size={18} color={colores.acento} />
              <Text style={styles.infoTitulo}>¿Qué es DiMo?</Text>
            </View>
            <Text style={styles.infoTexto}>
              DiMo (Dinero Móvil) es el servicio del Banco de México que permite enviar y recibir
              pagos entre cuentas bancarias usando únicamente el número de celular registrado.
              Las transferencias se procesan en segundos, las 24 horas del día, los 365 días del año.
            </Text>
            <View style={styles.infoDetalle}>
              <View style={styles.infoDetalleItem}>
                <Ionicons name="timer-outline" size={14} color={colores.acento} />
                <Text style={styles.infoDetalleTexto}>Instantáneo</Text>
              </View>
              <View style={styles.infoDetalleItem}>
                <Ionicons name="pricetag-outline" size={14} color={colores.acento} />
                <Text style={styles.infoDetalleTexto}>Sin comisión</Text>
              </View>
              <View style={styles.infoDetalleItem}>
                <Ionicons name="shield-checkmark-outline" size={14} color={colores.acento} />
                <Text style={styles.infoDetalleTexto}>Seguro</Text>
              </View>
            </View>
          </View>

          {enviado ? (
            <View style={styles.exito}>
              <View style={styles.exitoIconoWrap}>
                <Ionicons name="checkmark-circle" size={48} color={colores.positivo} />
              </View>
              <Text style={styles.exitoTitulo}>Envío simulado</Text>
              <Text style={styles.exitoMonto}>
                ${Number(monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </Text>
              <Text style={styles.exitoDestinatario}>
                al {formatearCelular(celular)}
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
            <View style={styles.formulario}>
              {/* Celular */}
              <CampoMarca
                etiqueta="Número de celular (10 dígitos):"
                value={celular}
                onChangeText={(t) => setCelular(formatearCelular(t))}
                placeholder="81 1234 5678"
                keyboardType="number-pad"
                maxLength={12}
                returnKeyType="next"
                onSubmitEditing={() => refMonto.current?.focus()}
              />

              {celularLimpio.length > 0 && celularLimpio.length < 10 && (
                <View style={styles.digitosInfo}>
                  <Text style={styles.digitosTexto}>
                    {celularLimpio.length}/10 dígitos
                  </Text>
                </View>
              )}

              {/* Monto */}
              <CampoMarca
                ref={refMonto}
                etiqueta="Monto a enviar:"
                value={monto}
                onChangeText={setMonto}
                placeholder="$0.00"
                keyboardType="decimal-pad"
                returnKeyType="done"
              />

              {/* Límite */}
              <View style={styles.limiteInfo}>
                <Ionicons name="alert-circle-outline" size={14} color={vidrio.textoTenue} />
                <Text style={styles.limiteTexto}>
                  Límite diario: $8,000.00 MXN por operación
                </Text>
              </View>

              {/* Botón Enviar */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Enviar DiMo"
                accessibilityState={{ disabled: !valido }}
                disabled={!valido}
                onPress={handleEnviar}
                style={({ pressed }) => [
                  styles.botonPrimario,
                  !valido && styles.inactivo,
                  pressed && styles.presionado,
                ]}
              >
                <Ionicons name="flash" size={20} color={colores.textoSobreAcento} />
                <Text style={styles.botonPrimarioTexto}>Enviar DiMo</Text>
              </Pressable>

              <Text style={styles.nota}>
                Interfaz de demostración — no se realiza ningún movimiento real.
              </Text>
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

  hero: { alignItems: 'center', gap: espacio.sm, paddingVertical: espacio.sm },
  heroIcono: {
    width: 56,
    height: 56,
    borderRadius: radio.completo,
    backgroundColor: colores.acento,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitulo: { fontSize: 20, fontWeight: '700', color: colores.textoInverso },
  heroTexto: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.75)',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 300,
  },

  infoBox: {
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: vidrio.campoBorde,
    backgroundColor: vidrio.campo,
    padding: espacio.lg,
    gap: espacio.md,
  },
  infoEncabezado: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm },
  infoTitulo: { fontSize: 14, fontWeight: '700', color: colores.textoInverso },
  infoTexto: { fontSize: 12, lineHeight: 18, color: 'rgba(255, 255, 255, 0.7)' },
  infoDetalle: { flexDirection: 'row', gap: espacio.lg },
  infoDetalleItem: { flexDirection: 'row', alignItems: 'center', gap: espacio.xs },
  infoDetalleTexto: { fontSize: 11, fontWeight: '600', color: colores.acento },

  formulario: { gap: espacio.lg },

  digitosInfo: { marginTop: -espacio.md },
  digitosTexto: { fontSize: 11, color: vidrio.textoTenue },

  limiteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
    borderRadius: radio.sm,
    borderWidth: 1,
    borderColor: vidrio.campoBorde,
    backgroundColor: 'rgba(6, 7, 97, 0.15)',
    paddingHorizontal: espacio.md,
    paddingVertical: espacio.sm,
  },
  limiteTexto: { flex: 1, fontSize: 11, lineHeight: 15, color: vidrio.textoTenue },

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

  exito: { alignItems: 'center', gap: espacio.md, paddingVertical: espacio.xl },
  exitoIconoWrap: { marginBottom: espacio.sm },
  exitoTitulo: { fontSize: 20, fontWeight: '700', color: colores.textoInverso },
  exitoMonto: { fontSize: 24, fontWeight: '800', color: colores.acento },
  exitoDestinatario: { fontSize: 14, color: colores.textoInverso },
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
