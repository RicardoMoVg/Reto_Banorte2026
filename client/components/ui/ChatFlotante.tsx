import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef } from 'react';
import { useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
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
import { PropuestaDeAnclaje } from '../chat/PropuestaDeAnclaje';
import { SurfaceRenderer } from '../../lib/a2ui/SurfaceRenderer';
import { useAgent } from '../../lib/a2ui/AgentProvider';
import { useChatPanel } from '../../lib/ui/ChatPanelProvider';
import { colores, espacio, radio, tipografia } from '../../lib/ui/theme';

/** Fracción de la pantalla que ocupa el panel. */
const PANEL_RATIO = 0.72;
/** Alto del tab bar — el panel queda encima de él. */
const ALTO_TAB_BAR = 64;
/** Duración de la animación de entrada/salida en ms. */
const DURACION = 280;

/**
 * Panel flotante de chat con Mosaico, estilo Messenger.
 *
 * Se desliza desde abajo y ocupa ~72 % de la pantalla, dejando la barra de
 * pestañas y una franja del dashboard visibles debajo de un overlay
 * semitransparente. El usuario puede cerrarlo tocando fuera, pulsando la X
 * o el botón flotante de nuevo.
 *
 * Sustituye la ruta `/chat` que antes era un modal full-screen. El
 * componente se monta siempre en `(tabs)/_layout.tsx` pero solo se muestra
 * cuando `useChatPanel().abierto` es true. La animación usa `Animated` nativo
 * para no depender de reanimated.
 */
/**
 * El driver nativo de animaciones no existe en web: ahi RN avisa que se
 * cae a animacion por JS. Se activa solo en nativo, que es donde si
 * aporta (saca la animacion del hilo de JS) -- en web el resultado visual
 * es el mismo, nomas sin la advertencia en consola.
 */
const USAR_DRIVER_NATIVO = Platform.OS !== 'web';

export function ChatFlotante() {
  const { abierto, cerrar } = useChatPanel();
  const { mensajes, cargando, enviar } = useAgent();
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  const windowHeight = Dimensions.get('window').height;
  const panelHeight = windowHeight * PANEL_RATIO;

  // Animación de slide-up / slide-down.
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: abierto ? 1 : 0,
      duration: DURACION,
      useNativeDriver: USAR_DRIVER_NATIVO,
    }).start();
  }, [abierto]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [panelHeight + ALTO_TAB_BAR, 0],
  });

  const overlayOpacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  function handleEnviar() {
    const texto = input.trim();
    if (!texto || cargando) return;
    setInput('');
    enviar(texto);
  }

  // No desmontamos el componente para conservar el estado del scroll y los
  // mensajes; solo lo sacamos de la vista con pointerEvents.
  return (
    <>
      {/* Overlay semitransparente — toque para cerrar */}
      <Animated.View
        // `pointerEvents` va en el style, no como prop: react-native-web
        // marca el prop como deprecado. Cerrado, el overlay no debe
        // interceptar toques de la pantalla de atras.
        style={[
          styles.overlay,
          { opacity: overlayOpacity, pointerEvents: abierto ? 'auto' : 'none' },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar chat"
          style={StyleSheet.absoluteFill}
          onPress={cerrar}
        />
      </Animated.View>

      {/* Panel de chat */}
      <Animated.View
        style={[
          styles.panel,
          {
            height: panelHeight,
            bottom: ALTO_TAB_BAR,
            transform: [{ translateY }],
            pointerEvents: abierto ? 'auto' : 'none',
          },
        ]}
      >
        {/* Handle decorativo + encabezado */}
        <View style={styles.handleZone}>
          <View style={styles.handle} />
        </View>

        <View style={styles.encabezado}>
          <View style={styles.encabezadoInfo}>
            <View style={styles.avatarMosaico}>
              <Ionicons name="sparkles" size={14} color={colores.textoSobreAcento} />
            </View>
            <View>
              <Text style={styles.titulo}>Mosaico</Text>
              <Text style={styles.subtitulo}>Tu asistente financiero</Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar conversación"
            hitSlop={espacio.md}
            onPress={cerrar}
            style={({ pressed }) => [styles.cerrar, pressed && styles.botonPresionado]}
          >
            <Ionicons name="chevron-down" size={20} color={colores.texto} />
          </Pressable>
        </View>

        {/* Contenido: mensajes + input */}
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={windowHeight - panelHeight + insets.top}
        >
          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={styles.lista}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {mensajes.length === 0 && (
              <View style={styles.vacioContainer}>
                <Ionicons name="chatbubble-ellipses-outline" size={32} color={colores.textoTenue} />
                <Text style={styles.vacio}>
                  Pregunta algo como{'\n'}«¿cómo voy con mi fondo de emergencia?»
                </Text>
              </View>
            )}

            {mensajes.map((m) =>
              m.tipo === 'surface' ? (
                <View key={m.id}>
                  <SurfaceRenderer mensaje={m} />
                  {m.props.agregarAInicio === true ? (
                    <PropuestaDeAnclaje
                      bloque={{ id: m.id, nombre: m.nombre, props: m.props }}
                    />
                  ) : null}
                </View>
              ) : (
                <View
                  key={m.id}
                  style={[
                    styles.burbuja,
                    m.rol === 'user' ? styles.burbujaUser : styles.burbujaAsistente,
                    m.esError && styles.burbujaError,
                  ]}
                >
                  {m.esError ? (
                    <Ionicons name="alert-circle" size={14} color={colores.texto} />
                  ) : null}
                  <Text style={styles.burbujaTexto}>{m.contenido}</Text>
                </View>
              ),
            )}

            {cargando && <ActivityIndicator color={colores.marca} style={styles.cargando} />}
          </ScrollView>

          <View style={[styles.inputFila, { paddingBottom: espacio.md }]}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="¿Cómo voy con mis metas?"
              placeholderTextColor={colores.textoTenue}
              onSubmitEditing={handleEnviar}
              returnKeyType="send"
              editable={!cargando}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Enviar mensaje"
              onPress={handleEnviar}
              disabled={!input.trim() || cargando}
              style={({ pressed }) => [
                styles.botonEnviar,
                (!input.trim() || cargando) && styles.botonInactivo,
                pressed && styles.botonPresionado,
              ]}
            >
              <Ionicons name="arrow-up" size={18} color={colores.textoInverso} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },

  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: colores.superficie,
    borderTopLeftRadius: radio.lg + 4,
    borderTopRightRadius: radio.lg + 4,
    // Sombra para despegar visualmente del contenido.
    // `boxShadow` en vez de los `shadow*` sueltos: react-native-web los
    // marca como deprecados, y aqui SI hay reemplazo tipado en RN 0.86
    // (a diferencia de textShadow, que todavia no lo tiene). `elevation`
    // se queda para la arquitectura vieja de Android, donde boxShadow aun
    // no aplica.
    boxShadow: '0px -8px 24px rgba(0, 0, 0, 0.2)',
    elevation: 16,
    overflow: 'hidden',
  },

  handleZone: { alignItems: 'center', paddingTop: espacio.sm },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radio.completo,
    backgroundColor: colores.bordeSutil,
  },

  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espacio.lg,
    paddingTop: espacio.sm,
    paddingBottom: espacio.md,
    borderBottomWidth: 1,
    borderBottomColor: colores.bordeSutil,
  },
  encabezadoInfo: { flexDirection: 'row', alignItems: 'center', gap: espacio.md },
  avatarMosaico: {
    width: 32,
    height: 32,
    borderRadius: radio.completo,
    backgroundColor: colores.acento,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: { fontSize: 16, fontWeight: '700', color: colores.texto },
  subtitulo: { fontSize: 11, color: colores.textoApoyo },

  cerrar: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radio.completo,
    backgroundColor: colores.superficieSutil,
  },

  lista: { gap: espacio.md, paddingHorizontal: espacio.lg, paddingVertical: espacio.md },

  vacioContainer: { alignItems: 'center', gap: espacio.md, paddingVertical: espacio.xxl },
  vacio: { ...tipografia.pie, color: colores.textoTenue, textAlign: 'center' },

  burbuja: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espacio.sm,
    maxWidth: '85%',
    borderRadius: radio.md,
    paddingHorizontal: espacio.md,
    paddingVertical: espacio.sm,
  },
  burbujaUser: { alignSelf: 'flex-end', backgroundColor: colores.superficieSutil },
  burbujaAsistente: { alignSelf: 'flex-start', backgroundColor: colores.marcaSuave },
  burbujaError: {
    alignSelf: 'flex-start',
    backgroundColor: colores.superficieSutil,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  burbujaTexto: { flexShrink: 1, fontSize: 13, lineHeight: 18, color: colores.texto },
  cargando: { alignSelf: 'flex-start', marginTop: espacio.xs },

  inputFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
    paddingHorizontal: espacio.lg,
    paddingTop: espacio.md,
    borderTopWidth: 1,
    borderTopColor: colores.bordeSutil,
    backgroundColor: colores.superficie,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.completo,
    paddingHorizontal: espacio.lg,
    paddingVertical: espacio.sm + 2,
    fontSize: 13,
    color: colores.texto,
    backgroundColor: colores.superficie,
  },
  botonEnviar: {
    width: 38,
    height: 38,
    borderRadius: radio.completo,
    backgroundColor: colores.marca,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonInactivo: { opacity: 0.35 },
  botonPresionado: { opacity: 0.75 },
});
