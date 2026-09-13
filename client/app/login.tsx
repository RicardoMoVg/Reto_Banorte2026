import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState, type ReactNode, type Ref } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PantallaMarca } from '../components/ui/PantallaMarca';
import { CORREO_VALIDO } from '../lib/sesion/perfilDemo';
import { useSesion } from '../lib/sesion/SesionProvider';
import { ANCHO_FORMULARIO, colores, espacio, radio, vidrio } from '../lib/ui/theme';

/**
 * Nombre del producto. Ojo con la convención, que se presta a confusión:
 * **Banortech es la app**, **Mosaico es el agente de IA que vive dentro**.
 * Por eso esta pantalla dice Banortech y la de conversación dice Mosaico.
 */
const MARCA = 'BANORTECH';
const LEMA = 'La app bancaria hecha para ti.';

/**
 * Ventana de inicio de sesión.
 *
 * Puerta de entrada visual a la app: `app/_layout.tsx` la protege con
 * `<Stack.Protected>`, así que es lo único alcanzable mientras no haya
 * sesión. Cualquier credencial con forma válida entra — ver
 * `lib/sesion/SesionProvider.tsx` para por qué esto no es (ni pretende
 * ser) autenticación.
 *
 * Dos desviaciones conscientes respecto al mockup, ambas por contraste:
 * el texto del botón va en azul profundo y no en blanco (blanco sobre
 * menta da 1.5:1, ilegible), y el logotipo lleva una sombra suave para
 * despegarse del menta del degradado.
 */
export default function Login() {
  const { iniciarSesion } = useSesion();
  const insets = useSafeAreaInsets();
  const refContrasena = useRef<TextInput>(null);

  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [verContrasena, setVerContrasena] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  function handleEntrar() {
    setAviso(null);

    if (!CORREO_VALIDO.test(correo.trim())) {
      setError('Escribe un correo electrónico válido.');
      return;
    }
    if (!contrasena) {
      setError('Escribe tu contraseña.');
      return;
    }

    setError(null);
    // Solo viaja el correo: la contraseña se queda en este estado local y
    // se descarta cuando la pantalla se desmonta.
    iniciarSesion(correo.trim());
  }

  return (
    <PantallaMarca ancho={ANCHO_FORMULARIO}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: espacio.xxl, paddingBottom: insets.bottom + espacio.xl },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.columna}>
            <View style={styles.logotipo}>
              <Text style={styles.marca}>{MARCA}</Text>
              <Text style={styles.lema}>{LEMA}</Text>
            </View>

            <View style={styles.tarjeta}>
              <Campo
                etiqueta="Correo electrónico:"
                value={correo}
                onChangeText={setCorreo}
                placeholder="tucorreo@ejemplo.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
                onSubmitEditing={() => refContrasena.current?.focus()}
              />

              <Campo
                ref={refContrasena}
                etiqueta="Contraseña:"
                value={contrasena}
                onChangeText={setContrasena}
                placeholder="Tu contraseña"
                secureTextEntry={!verContrasena}
                autoCapitalize="none"
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={handleEntrar}
                accesorio={
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={verContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    hitSlop={espacio.sm}
                    onPress={() => setVerContrasena((v) => !v)}
                  >
                    <Ionicons
                      name={verContrasena ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={vidrio.textoTenue}
                    />
                  </Pressable>
                }
              />

              {error ? (
                <View style={styles.error} accessibilityLiveRegion="polite">
                  <Ionicons name="alert-circle-outline" size={14} color={colores.textoInverso} />
                  <Text style={styles.errorTexto}>{error}</Text>
                </View>
              ) : null}

              <Pressable
                accessibilityRole="button"
                // Sin esto el botón llega al árbol de accesibilidad sin
                // nombre: react-native-web no deriva la etiqueta del <Text>
                // hijo cuando el Pressable trae un `style` como función.
                accessibilityLabel="Iniciar sesión"
                onPress={handleEntrar}
                style={({ pressed }) => [styles.boton, pressed && styles.botonPresionado]}
              >
                <Text style={styles.botonTexto}>Iniciar Sesión</Text>
              </Pressable>

              <View style={styles.pie}>
                <Text style={styles.pieTexto}>¿No tienes cuenta? </Text>
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel="Regístrate"
                  hitSlop={espacio.sm}
                  onPress={() => {
                    setError(null);
                    setAviso('El registro llega en la siguiente iteración.');
                  }}
                >
                  <Text style={styles.pieEnlace}>Regístrate</Text>
                </Pressable>
              </View>

              {aviso ? (
                <Text style={styles.aviso} accessibilityLiveRegion="polite">
                  {aviso}
                </Text>
              ) : null}
            </View>

            <Text style={styles.demo}>
              Demo del Reto Banorte × Tec 2026. No se conecta a ninguna cuenta real ni se envían
              tus datos a ningún servidor.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </PantallaMarca>
  );
}

interface CampoProps extends TextInputProps {
  etiqueta: string;
  /** Control opcional dentro del campo, a la derecha (ej. mostrar/ocultar). */
  accesorio?: ReactNode;
  ref?: Ref<TextInput>;
}

/**
 * Campo etiquetado del formulario. Vive aquí y no en `components/ui/`
 * porque usa la paleta `vidrio`, que solo es legible encima del degradado
 * de marca. Cuando exista una segunda pantalla de este estilo (registro,
 * onboarding) se promueve tal cual.
 *
 * `ref` va como prop normal: en React 19 ya no hace falta forwardRef.
 */
function Campo({ etiqueta, accesorio, ref, ...props }: CampoProps) {
  return (
    <View style={styles.campo}>
      <Text style={styles.campoEtiqueta}>{etiqueta}</Text>
      <View style={styles.campoCaja}>
        <TextInput
          ref={ref}
          accessibilityLabel={etiqueta.replace(':', '')}
          placeholderTextColor={vidrio.textoTenue}
          selectionColor={colores.acento}
          style={styles.campoInput}
          {...props}
        />
        {accesorio}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: espacio.lg,
  },
  // El ancho máximo y el centrado los pone <PantallaMarca ancho={...} />.
  columna: { width: '100%', gap: espacio.xl },

  logotipo: { alignItems: 'center', gap: espacio.sm },
  marca: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 1,
    color: colores.textoInverso,
    // El menta del degradado es muy claro: sin esta sombra el logotipo
    // blanco queda por debajo del contraste mínimo legible.
    //
    // react-native-web marca estos tres props como deprecados a favor del
    // shorthand `textShadow`, pero los tipos de react-native 0.86 todavía
    // no lo declaran — migrar hoy obligaría a un cast. Se cambia cuando el
    // tipo exista; mientras, la advertencia es solo de desarrollo.
    textShadowColor: 'rgba(6, 7, 97, 0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  lema: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    color: colores.textoInverso,
    opacity: 0.9,
  },

  tarjeta: {
    gap: espacio.lg,
    borderRadius: radio.lg,
    borderWidth: 1,
    borderColor: vidrio.borde,
    backgroundColor: vidrio.fondo,
    padding: espacio.xl,
  },

  campo: { gap: espacio.sm },
  campoEtiqueta: { fontSize: 13, fontWeight: '600', color: colores.textoInverso },
  campoCaja: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
    borderRadius: radio.sm,
    borderWidth: 1,
    borderColor: vidrio.campoBorde,
    backgroundColor: vidrio.campo,
    paddingHorizontal: espacio.md,
  },
  campoInput: {
    flex: 1,
    paddingVertical: espacio.md,
    fontSize: 14,
    color: colores.textoInverso,
    // En web el navegador pinta un anillo de foco encimado con el borde de
    // la caja. Se separa y se tiñe de menta en vez de apagarlo: quitarlo
    // dejaría sin indicador visible a quien navega con teclado.
    outlineColor: colores.acento,
    outlineOffset: 2,
  },

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
