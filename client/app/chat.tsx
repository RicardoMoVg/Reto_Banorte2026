import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pantalla } from '../components/ui/Pantalla';
import { PropuestaDeAnclaje } from '../components/chat/PropuestaDeAnclaje';
import { SurfaceRenderer } from '../lib/a2ui/SurfaceRenderer';
import { useAgent } from '../lib/a2ui/AgentProvider';
import { colores, espacio, radio, tipografia } from '../lib/ui/theme';

/**
 * La conversación con el agente.
 *
 * Se presenta como MODAL (ver el `presentation: 'modal'` de
 * app/_layout.tsx), no como pestaña: se abre encima de la ventana en la
 * que estabas y se cierra para volver ahí mismo, como una conversación de
 * Messenger. Por eso vive fuera de `(tabs)/` — una pantalla no puede ser
 * pestaña y modal a la vez.
 *
 * Consecuencia de diseño: al cerrar, el usuario regresa al contexto que
 * tenía (Inicio o Perfil) en vez de quedarse en una pestaña aparte; el
 * bloque que acaba de generar ya está en su tablero.
 *
 * Cambios respecto a esa versión: el estado del stream ahora vive en
 * <AgentProvider> (para compartirlo con Inicio), y se agregó scroll
 * automático al último mensaje + KeyboardAvoidingView para que el teclado
 * no tape el input en iOS.
 *
 * Sigue sin saber qué componentes existen: recibe `nombre` + `props` y
 * SurfaceRenderer resuelve contra el catálogo (lib/a2ui/catalog.ts).
 */
export default function Chat() {
  const [input, setInput] = useState('');
  const { mensajes, cargando, enviar } = useAgent();
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  function handleEnviar() {
    const texto = input.trim();
    if (!texto || cargando) return;
    setInput('');
    enviar(texto);
  }

  return (
    <Pantalla
      titulo="Mosaico"
      subtitulo="Tu asistente financiero."
      accion={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar conversación"
          hitSlop={espacio.md}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.cerrar, pressed && styles.botonPresionado]}
        >
          <Ionicons name="close" size={20} color={colores.texto} />
        </Pressable>
      }
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + espacio.xxl}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.lista}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {mensajes.length === 0 && (
            <Text style={styles.vacio}>
              Pregunta algo como «¿cómo voy con mi fondo de emergencia?»
            </Text>
          )}

          {mensajes.map((m) =>
            m.tipo === 'surface' ? (
                <View key={m.id}>
                  <SurfaceRenderer mensaje={m} />
                  {m.props.agregarAInicio === true ? (
                    <PropuestaDeAnclaje
                      bloque={{ id: m.id, nombre: m.nombre, props: m.props, tool: m.tool, parametros: m.parametros }}
                    />
                  ) : null}
                </View>
            ) : (
              <View
                key={m.id}
                style={[
                  styles.burbuja,
                  m.rol === 'user' ? styles.burbujaUser : styles.burbujaAsistente,
                  // El tinte de la burbuja del asistente es menta: sobre él,
                  // un error se lee como confirmación. Va aparte.
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

        <View style={styles.inputFila}>
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
              styles.boton,
              (!input.trim() || cargando) && styles.botonInactivo,
              pressed && styles.botonPresionado,
            ]}
          >
            <Ionicons name="arrow-up" size={18} color={colores.textoInverso} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  lista: { gap: espacio.md, paddingHorizontal: espacio.lg, paddingBottom: espacio.md },
  vacio: { ...tipografia.pie, color: colores.textoTenue },
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
    paddingBottom: espacio.md,
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
  boton: {
    width: 38,
    height: 38,
    borderRadius: radio.completo,
    backgroundColor: colores.marca,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cerrar: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radio.completo,
    backgroundColor: colores.superficieSutil,
  },
  botonInactivo: { opacity: 0.35 },
  botonPresionado: { opacity: 0.75 },
});
