import { useState } from 'react';
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
import { useAgentStream } from './lib/a2ui/useAgentStream';
import { SurfaceRenderer } from './lib/a2ui/SurfaceRenderer';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function App() {
  const [input, setInput] = useState('');
  const { mensajes, cargando, enviar } = useAgentStream(API_URL);

  function handleEnviar() {
    const texto = input.trim();
    if (!texto || cargando) return;
    setInput('');
    enviar(texto);
  }

  return (
    <View style={styles.pantalla}>
      <Text style={styles.encabezado}>Mosaico</Text>

      <ScrollView style={styles.lista} contentContainerStyle={styles.listaContenido}>
        {mensajes.length === 0 && (
          <Text style={styles.vacio}>
            Pregunta algo como «¿cómo voy con mi fondo de emergencia?»
          </Text>
        )}
        {mensajes.map((m) =>
          m.tipo === 'surface' ? (
            <SurfaceRenderer key={m.id} mensaje={m} />
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
          onSubmitEditing={handleEnviar}
        />
        <Pressable style={styles.boton} onPress={handleEnviar} disabled={!input.trim() || cargando}>
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
