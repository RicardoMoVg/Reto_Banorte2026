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
import { ErrorApi } from '../lib/api/rest';
import { CORREO_VALIDO } from '../lib/sesion/perfilDemo';
import { useSesion } from '../lib/sesion/SesionProvider';
import { ANCHO_FORMULARIO, colores, espacio, radio, vidrio } from '../lib/ui/theme';

/**
 * Ventana de registro.
 *
 * Mismo look que `login.tsx` (misma `PantallaMarca`, misma paleta `vidrio`)
 * pero como ventana propia y no un formulario alterno dentro del login: es
 * más fácil de navegar y deja `login.tsx` con una sola responsabilidad.
 *
 * Vive bajo el mismo guard que login (`app/_layout.tsx`,
 * `<Stack.Protected guard={!sesion}>`) — si `registrarse` abre sesión de
 * inmediato (Supabase sin "Confirm email"), el guard deja de cumplirse
 * mientras esta pantalla sigue montada y expo-router la saca solo hacia
 * `(tabs)`, sin que haga falta un `router.replace` manual aquí.
 *
 * Usa `CampoMarca` (no una copia local como hacía `login.tsx` antes de que
 * existiera): es justo el campo que `login.tsx` dejó comentado para
 * promover "cuando exista una segunda pantalla de este estilo".
 */
export default function Registro() {
  const { registrarse, cargando } = useSesion();
  const insets = useSafeAreaInsets();
  const refContrasena = useRef<TextInput>(null);
  const refConfirmar = useRef<TextInput>(null);

  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [verContrasena, setVerContrasena] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  function editar(fijar: (valor: string) => void) {
    return (valor: string) => {
      if (error) setError(null);
      fijar(valor);
    };
  }

  function mensajeDeError(err: unknown): string {
    if (err instanceof ErrorApi) return err.message;
    return 'No se pudo conectar con el servidor. Intenta de nuevo.';
  }

  async function handleRegistro() {
    setAviso(null);

    if (!CORREO_VALIDO.test(correo.trim())) {
      setError('Escribe un correo electrónico válido.');
      return;
    }
    if (contrasena.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (contrasena !== confirmar) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setError(null);
    try {
      const { requiereConfirmacion } = await registrarse(correo.trim(), contrasena, nombre.trim() || undefined);
      if (requiereConfirmacion) {
        // Sin sesión abierta todavía: el guard de _layout.tsx no nos saca
        // solo, así que el aviso se queda en pantalla hasta que decida
        // volver al login a mano.
        setAviso('Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.');
      }
      // Si no requiere confirmación, registrarse() ya abrió la sesión y el
      // guard de _layout.tsx saca de aquí solo.
    } catch (err) {
      setError(mensajeDeError(err));
    }
  }

  return (
    <PantallaMarca ancho={ANCHO_FORMULARIO} titulo="Crear cuenta" alVolver={() => router.back()}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + espacio.xl }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.columna}>
            <View style={styles.tarjeta}>
              <CampoMarca
                etiqueta="Nombre (opcional):"
                value={nombre}
                onChangeText={editar(setNombre)}
                placeholder="Tu nombre"
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                returnKeyType="next"
              />

              <CampoMarca
                etiqueta="Correo electrónico:"
                value={correo}
                onChangeText={editar(setCorreo)}
                placeholder="tucorreo@ejemplo.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
                onSubmitEditing={() => refContrasena.current?.focus()}
              />

              <CampoMarca
                ref={refContrasena}
                etiqueta="Contraseña:"
                value={contrasena}
                onChangeText={editar(setContrasena)}
                placeholder="Mínimo 6 caracteres"
                secureTextEntry={!verContrasena}
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="next"
                onSubmitEditing={() => refConfirmar.current?.focus()}
                accesorio={
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={verContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    hitSlop={espacio.sm}
                    onPress={() => setVerContrasena((v) => !v)}
                  >
                    <Text style={styles.toggleContrasena}>{verContrasena ? 'Ocultar' : 'Mostrar'}</Text>
                  </Pressable>
                }
              />

              <CampoMarca
                ref={refConfirmar}
                etiqueta="Confirmar contraseña:"
                value={confirmar}
                onChangeText={editar(setConfirmar)}
                placeholder="Repite tu contraseña"
                secureTextEntry={!verContrasena}
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="go"
                onSubmitEditing={handleRegistro}
              />

              {error ? (
                <View style={styles.error} accessibilityLiveRegion="polite">
                  <Text style={styles.errorTexto}>{error}</Text>
                </View>
              ) : null}

              {aviso ? (
                <Text style={styles.aviso} accessibilityLiveRegion="polite">
                  {aviso}
                </Text>
              ) : null}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Crear cuenta"
                disabled={cargando}
                onPress={handleRegistro}
                style={({ pressed }) => [
                  styles.boton,
                  pressed && styles.botonPresionado,
                  cargando && styles.botonDeshabilitado,
                ]}
              >
                <Text style={styles.botonTexto}>{cargando ? 'Creando cuenta…' : 'Crear cuenta'}</Text>
              </Pressable>

              <View style={styles.pie}>
                <Text style={styles.pieTexto}>¿Ya tienes cuenta? </Text>
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel="Inicia sesión"
                  hitSlop={espacio.sm}
                  onPress={() => router.back()}
                >
                  <Text style={styles.pieEnlace}>Inicia sesión</Text>
                </Pressable>
              </View>
            </View>

            <Text style={styles.demo}>
              Demo del Reto Banorte × Tec 2026. No es un banco real ni está afiliada a Banorte.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </PantallaMarca>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: espacio.lg,
    paddingTop: espacio.xl,
  },
  columna: { width: '100%', gap: espacio.xl },

  tarjeta: {
    gap: espacio.lg,
    borderRadius: radio.lg,
    borderWidth: 1,
    borderColor: vidrio.borde,
    backgroundColor: vidrio.fondo,
    padding: espacio.xl,
  },

  toggleContrasena: { fontSize: 12, fontWeight: '700', color: colores.acento },

  error: { flexDirection: 'row', alignItems: 'center', gap: espacio.xs },
  errorTexto: { flexShrink: 1, fontSize: 12, lineHeight: 16, color: colores.textoInverso },

  boton: {
    alignSelf: 'center',
    minWidth: 200,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radio.md,
    backgroundColor: colores.acento,
    paddingHorizontal: espacio.xl,
    paddingVertical: espacio.md,
  },
  botonPresionado: { opacity: 0.85 },
  botonDeshabilitado: { opacity: 0.6 },
  botonTexto: { fontSize: 15, fontWeight: '700', color: colores.textoSobreAcento },

  pie: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' },
  pieTexto: { fontSize: 12, color: colores.textoInverso, opacity: 0.85 },
  pieEnlace: { fontSize: 12, fontWeight: '700', color: colores.acento },
  aviso: { fontSize: 12, textAlign: 'center', color: colores.acento },

  demo: {
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'center',
    color: vidrio.textoTenue,
  },
});
