import { useState } from 'react';
import { fetch } from 'expo/fetch';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { RastreadorMetas, type RastreadorMetasProps } from './components/RastreadorMetas';

/**
 * Paso 2 del plan de migración: probar la cadena completa
 * (RN -> HTTP -> streamText -> MCP -> NDJSON -> RN) con UN solo bloque,
 * renderizado directo (sin catálogo/mini-SDK genérico todavía).
 */
type Mensaje =
  | { id: string; tipo: 'texto'; rol: 'user' | 'asistente'; contenido: string }
  | { id: string; tipo: 'surface'; rol: 'asistente'; nombre: string; props: RastreadorMetasProps };

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

/** crypto.randomUUID() no existe en Hermes/Android nativo (sí en web) — id simple en su lugar. */
function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function App() {
  const [input, setInput] = useState('');
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [cargando, setCargando] = useState(false);

  async function enviar() {
    const texto = input.trim();
    if (!texto || cargando) return;

    setInput('');
    setCargando(true);
    setMensajes((prev) => [
      ...prev,
      { id: uid(), tipo: 'texto', rol: 'user', contenido: texto },
    ]);

    try {
      const resp = await fetch(`${API_URL}/api/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: texto }),
      });

      if (!resp.body) throw new Error('La respuesta no trae body (sin streaming).');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lineas = buffer.split('\n');
        buffer = lineas.pop() ?? '';

        for (const linea of lineas) {
          if (!linea.trim()) continue;
          const evento = JSON.parse(linea);

          if (evento.type === 'surface' && evento.tipo === 'RastreadorMetas') {
            setMensajes((prev) => [
              ...prev,
              {
                id: uid(),
                tipo: 'surface',
                rol: 'asistente',
                nombre: evento.tipo,
                props: evento.props,
              },
            ]);
          } else if (evento.type === 'text' && evento.content) {
            setMensajes((prev) => [
              ...prev,
              { id: uid(), tipo: 'texto', rol: 'asistente', contenido: evento.content },
            ]);
          } else if (evento.type === 'error') {
            setMensajes((prev) => [
              ...prev,
              { id: uid(), tipo: 'texto', rol: 'asistente', contenido: `⚠️ ${evento.message}` },
            ]);
          }
        }
      }
    } catch (err) {
      setMensajes((prev) => [
        ...prev,
        {
          id: uid(),
          tipo: 'texto',
          rol: 'asistente',
          contenido: `⚠️ Error de red: ${String(err)}`,
        },
      ]);
    } finally {
      setCargando(false);
    }
  }

  return (
    <View style={styles.pantalla}>
      <Text style={styles.encabezado}>Mosaico (mobile — Paso 2)</Text>

      <ScrollView style={styles.lista} contentContainerStyle={styles.listaContenido}>
        {mensajes.length === 0 && (
          <Text style={styles.vacio}>
            Pregunta algo como «¿cómo voy con mi fondo de emergencia?»
          </Text>
        )}
        {mensajes.map((m) =>
          m.tipo === 'surface' ? (
            <RastreadorMetas key={m.id} {...m.props} />
          ) : (
            <Text
              key={m.id}
              style={[styles.burbuja, m.rol === 'user' ? styles.burbujaUser : styles.burbujaAsistente]}
            >
              {m.contenido}
            </Text>
          ),
        )}
        {cargando && <ActivityIndicator style={{ marginTop: 8 }} />}
      </ScrollView>

      <View style={styles.inputFila}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="¿Cómo voy con mis metas?"
          onSubmitEditing={enviar}
        />
        <Pressable style={styles.boton} onPress={enviar} disabled={!input.trim() || cargando}>
          <Text style={styles.botonTexto}>Enviar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 16 : 16,
  },
  encabezado: { fontSize: 16, fontWeight: '700', marginBottom: 12, color: '#171717' },
  lista: { flex: 1 },
  listaContenido: { gap: 12, paddingBottom: 12 },
  vacio: { fontSize: 12, color: '#a3a3a3' },
  burbuja: { fontSize: 13, padding: 10, borderRadius: 10, maxWidth: '85%' },
  burbujaUser: { alignSelf: 'flex-end', backgroundColor: '#f5f5f5', color: '#171717' },
  burbujaAsistente: { alignSelf: 'flex-start', backgroundColor: '#fff0f1', color: '#171717' },
  inputFila: { flexDirection: 'row', gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  boton: { backgroundColor: '#EB0029', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  botonTexto: { color: '#ffffff', fontWeight: '600', fontSize: 13 },
});
